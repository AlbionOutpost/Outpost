import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Native Firefox BiDi keeps the browser's normal sandbox and avoids Playwright's
// patched Firefox. Never use a personal profile or expose the debugging listener.
const base = new URL(process.env.OUTPOST_FIREFOX_BASE || "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1", "albionoutpost.com"].includes(base.hostname));
if (base.hostname === "albionoutpost.com") assert.equal(base.protocol, "https:");
const folder = resolve(".qa/firefox-cutouts");
await mkdir(folder, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), "outpost-firefox-cutouts-"));
const profile = join(temporary, "profile");
await mkdir(profile);
// Native headless Firefox reports no physical pointing device. This isolated
// profile emulates a desktop mouse for hover queries; no global/profile policy changes.
await writeFile(
  join(profile, "user.js"),
  'user_pref("ui.primaryPointerCapabilities", 6);\nuser_pref("ui.allPointerCapabilities", 6);\n',
);
const browser = spawn(
  process.env.OUTPOST_FIREFOX_BIN || "firefox",
  ["--headless", "--no-remote", "--profile", profile, "--remote-debugging-port=0"],
  {
    env: {
      ...process.env,
      GSETTINGS_BACKEND: "memory",
      XDG_CACHE_HOME: join(temporary, "cache"),
      XDG_CONFIG_HOME: join(temporary, "config"),
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);
let stderr = "",
  socket,
  session = false,
  sequence = 0;
const pending = new Map();
const report = {
  checkedAt: new Date().toISOString(),
  status: "FAIL",
  scope:
    "Native Firefox100% zoom, fresh task-owned profile, normal sandbox settings, loopback-only BiDi. Anonymous UI only; not provider consent, all Firefox versions, or owner GPU certification.",
  results: [],
};
const command = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`BiDi timeout: ${method}`));
    }, 30000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Firefox did not open its loopback BiDi endpoint")),
      45000,
    );
    browser.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    browser.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/WebDriver BiDi listening on (ws:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1] + "/session");
      }
    });
    browser.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Firefox exited before connecting (${code})`));
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data),
      request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.type === "error") request.reject(new Error(`${message.error}: ${message.message}`));
    else request.resolve(message.result);
  };
  const info = await command("session.new", { capabilities: {} });
  session = true;
  report.browser = info.capabilities.browserName;
  report.version = info.capabilities.browserVersion;
  const { context } = await command("browsingContext.create", { type: "tab" });
  const evaluate = async (expression) => {
    const response = await command("script.evaluate", {
      expression: `(async()=>JSON.stringify(await (${expression})))()`,
      target: { context },
      awaitPromise: true,
    });
    if (response.type === "exception") throw new Error("Firefox page evaluation failed");
    return JSON.parse(response.result.value);
  };
  report.pointerEmulation =
    "Desktop mouse capability in a fresh task-owned profile; normal sandbox";
  for (const theme of ["dark", "light"]) {
    await command("browsingContext.navigate", { context, url: base.href, wait: "complete" });
    await evaluate(
      `(()=>{document.cookie='atlas-theme=${theme}; path=/; SameSite=Lax';return true;})()`,
    );
    for (const width of [1323, 390, 320]) {
      await command("browsingContext.setViewport", {
        context,
        viewport: { width, height: width === 1323 ? 900 : 844 },
        devicePixelRatio: 1,
      });
      await command("browsingContext.navigate", { context, url: base.href, wait: "complete" });
      await evaluate("(async()=>{await document.fonts.ready;return true;})()");
      for (const [selector, name] of [
        [".landing-cta-wrap", "supporter"],
        [".landing-activities", "activities"],
      ]) {
        const scroll = `(()=>{document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'});return true;})()`;
        await evaluate(scroll);
        await new Promise((resolve) => setTimeout(resolve, 1600));
        await evaluate(scroll);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const state = await evaluate(
          `(()=>{const n=document.querySelector('${selector}'),card=n.querySelector('.landing-cta'),h=n.querySelector('h2'),r=card?.getBoundingClientRect(),hr=h?.getBoundingClientRect();return{viewport:innerWidth,dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth,centerOffset:card?Math.abs((hr.left+hr.right-r.left-r.right)/2):null,bodyTop:card?parseFloat(getComputedStyle(card,'::before').top):null,mask:card?getComputedStyle(card.querySelector('.landing-cta-art img')).maskImage:null,surfaces:Array.from(n.querySelectorAll('.activity-artwork-link > span[aria-hidden="true"] > span')).map(s=>({backdrop:getComputedStyle(s).backdropFilter,filter:getComputedStyle(s).filter,image:getComputedStyle(s).backgroundImage}))};})()`,
        );
        assert.equal(state.viewport, width);
        assert.equal(state.dpr, 1);
        assert.equal(state.overflow, false);
        if (name === "supporter") {
          assert.ok(state.centerOffset < 2);
          assert.ok(state.bodyTop > 16);
          assert.match(state.mask, /crown-silhouette\.svg/);
        } else {
          assert.equal(state.surfaces.length, 18);
          for (const surface of state.surfaces) {
            assert.equal(surface.backdrop, "none");
            assert.match(surface.filter, /blur\(/);
            assert.match(surface.image, /albion\/activities\//);
          }
        }
        const screenshot = await command("browsingContext.captureScreenshot", {
          context,
          origin: "viewport",
          format: { type: "image/png" },
        });
        const file = `${theme}-${width}-${name}.png`;
        await writeFile(join(folder, file), Buffer.from(screenshot.data, "base64"));
        report.results.push({ theme, width, name, file, ...state });
      }
    }
    // Exercise real pointer hover, where the owner saw the Firefox edge return.
    await command("browsingContext.setViewport", {
      context,
      viewport: { width: 1323, height: 900 },
      devicePixelRatio: 1,
    });
    await command("browsingContext.navigate", {
      context,
      url: new URL("/builds/activities?region=europe", base).href,
      wait: "complete",
    });
    await evaluate(
      `(async()=>{await document.fonts.ready;const card=document.querySelector('.activity-artwork-card[data-activity="GANK_GROUP"]');card.scrollIntoView({block:'center',behavior:'instant'});await card.querySelector('img[data-activity-scene]').decode();return true;})()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const hoverState = () =>
      evaluate(
        `(()=>{const card=document.querySelector('.activity-artwork-card[data-activity="GANK_GROUP"] .activity-artwork-link'),r=card.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,hovered:card.matches(':hover'),pressed:card.matches(':active'),transform:getComputedStyle(card).transform,filter:getComputedStyle(card).filter,sceneFilter:getComputedStyle(card.querySelector('[data-activity-scene]')).filter,sceneWidth:card.querySelector('[data-activity-scene]').getBoundingClientRect().width,layers:Array.from(card.querySelectorAll(':scope > span[aria-hidden="true"]')).map(n=>({width:n.getBoundingClientRect().width,transform:getComputedStyle(n).transform})),light:getComputedStyle(card,'::before').opacity,overflow:document.documentElement.scrollWidth>innerWidth};})()`,
      );
    const move = async (x, y) =>
      command("input.performActions", {
        context,
        actions: [
          {
            type: "pointer",
            id: "outpost-hover",
            parameters: { pointerType: "mouse" },
            actions: [
              {
                type: "pointerMove",
                x: Math.round(x),
                y: Math.round(y),
                duration: 0,
                origin: "viewport",
              },
            ],
          },
        ],
      });
    await move(0, 0);
    const before = await hoverState();
    const files = [],
      states = [];
    const press = (down) =>
      command("input.performActions", {
        context,
        actions: [
          {
            type: "pointer",
            id: "outpost-hover",
            parameters: { pointerType: "mouse" },
            actions: [{ type: down ? "pointerDown" : "pointerUp", button: 0 }],
          },
        ],
      });
    for (const state of ["before", "hover", "press", "after"]) {
      if (state === "hover") await move(before.x + before.width / 2, before.y + before.height / 2);
      if (state === "press") await press(true);
      if (state === "after") {
        // Keep the normal pointer-up inside the link and suppress this probe's
        // navigation only; dragging the native link out starts Firefox's drag UI.
        await evaluate(
          "(()=>{document.querySelector('.activity-artwork-card[data-activity=\"GANK_GROUP\"] .activity-artwork-link').addEventListener('click',e=>e.preventDefault(),{once:true});return true;})()",
        );
        await press(false);
        await move(0, 0);
        await command("input.releaseActions", { context });
      }
      if (state === "hover" || state === "press") {
        // Flush the changed pseudo state so headless Gecko starts its transition
        // before the timed sample, rather than at the sampling read itself.
        await hoverState();
        await new Promise((resolve) => setTimeout(resolve, state === "hover" ? 80 : 25));
        const frame = await hoverState();
        assert.ok(frame.width / before.width >= 0.98 && frame.width / before.width <= 1.03);
        assert.ok(Math.abs(frame.sceneWidth - frame.width) < 0.5);
        for (const layer of frame.layers) assert.ok(Math.abs(layer.width - frame.width) < 0.5);
        const frameShot = await command("browsingContext.captureScreenshot", {
          context,
          origin: "viewport",
          format: { type: "image/png" },
        });
        const frameFile = `${theme}-1323-gallery-${state}-intermediate.png`;
        await writeFile(join(folder, frameFile), Buffer.from(frameShot.data, "base64"));
        states.push({ state: `${state}-intermediate`, ...frame });
        files.push(frameFile);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      await evaluate(
        `(async()=>{const n=document.querySelector('.activity-artwork-card[data-activity="GANK_GROUP"] .activity-artwork-link');await Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));return true;})()`,
      );
      const current = await hoverState();
      assert.equal(current.hovered, state === "hover" || state === "press");
      const expected = state === "hover" ? 1.025 : state === "press" ? 0.985 : 1;
      assert.ok(
        Math.abs(current.width / before.width - expected) < 0.002,
        JSON.stringify({ state, before, current, expected }),
      );
      assert.ok(Math.abs(current.sceneWidth - current.width) < 0.5);
      for (const layer of current.layers) {
        assert.ok(Math.abs(layer.width - current.width) < 0.5);
        assert.equal(layer.transform, "none");
      }
      assert.equal(current.sceneFilter, "none");
      assert.equal(current.filter, before.filter);
      if (state === "after")
        assert.ok(Math.abs(current.x - before.x) < 0.5 && Math.abs(current.y - before.y) < 0.5);
      assert.equal(current.overflow, false);
      if (state === "hover") assert.ok(Number(current.light) > 0.99, JSON.stringify(current));
      states.push({ state, ...current });
      const screenshot = await command("browsingContext.captureScreenshot", {
        context,
        origin: "viewport",
        format: { type: "image/png" },
      });
      const file = `${theme}-1323-gallery-${state}.png`;
      await writeFile(join(folder, file), Buffer.from(screenshot.data, "base64"));
      files.push(file);
    }
    report.results.push({
      theme,
      width: 1323,
      name: "gallery-hover",
      category: "GANK_GROUP",
      fullArtworkGrowth: true,
      pressAndReturn: true,
      nativePointer: true,
      files,
      states,
    });
  }
  report.status = "PASS";
} catch (error) {
  report.error = String(error.message || error).slice(0, 600);
  process.exitCode = 1;
} finally {
  if (session) {
    try {
      await command("session.end");
    } catch {}
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  const exited = new Promise((resolve) => {
    if (browser.exitCode !== null || browser.signalCode !== null) resolve();
    else browser.once("exit", resolve);
  });
  browser.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (browser.exitCode === null && browser.signalCode === null) browser.kill("SIGKILL");
  await exited;
  await writeFile(join(folder, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(join(folder, "browser.log"), stderr);
  await rm(temporary, { recursive: true, force: true });
  console.log(
    JSON.stringify({
      status: report.status,
      browser: report.browser,
      version: report.version,
      checks: report.results.length,
      error: report.error,
    }),
  );
}
