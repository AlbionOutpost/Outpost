/**
 * Decides how a Treasury 3D moment plays and loads the WebGL scene only when it will be used.
 * Reduced motion shows the result at once; without WebGL the CSS 3D version plays; otherwise
 * three.js is fetched (its own lazy chunk) the moment a flip or a reveal starts.
 */

export type StageMode = "webgl" | "css" | "instant";
export type SceneModule = typeof import("./economy-scene");

export function stageMode({ reducedMotion, webgl }: { reducedMotion: boolean; webgl: boolean }) {
  if (reducedMotion) return "instant" satisfies StageMode;
  return webgl ? ("webgl" satisfies StageMode) : ("css" satisfies StageMode);
}

let webglSupport: boolean | undefined;
/** Whether this browser can make a WebGL context (asked once, then released). */
export function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export function currentStage(): StageMode {
  if (typeof window === "undefined") return "instant";
  return stageMode({
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
  });
}

// `typeof window` is compiled away on the server, so three.js never enters the server bundle.
const importScene = (): Promise<SceneModule> =>
  typeof window === "undefined"
    ? Promise.reject(new Error("WebGL scenes run in the browser"))
    : import("./economy-scene");

/** The scene module when this stage plays in WebGL, or null (and nothing is fetched). */
export function loadScene(mode: StageMode, load: () => Promise<SceneModule> = importScene) {
  return mode === "webgl" ? load() : null;
}
