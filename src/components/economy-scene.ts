import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The Treasury's WebGL models: a minted silver coin and a wooden loot chest, built in code
 * (no model files) and lit by a soft room environment with one warm key light. Loaded only by
 * a dynamic import when a flip or a reveal plays (`economy-scene-loader.ts`); every outcome is
 * decided by the server and passed in, the animation only shows it.
 */

export type Side = "heads" | "tails";

/* ------------------------------------------------------------------------------------------ */
/* Shared setup                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Everything a scene owns that the GPU holds, released on dispose. */
class Bin {
  private items = new Set<{ dispose(): void }>();
  add<T extends { dispose(): void }>(item: T) {
    this.items.add(item);
    return item;
  }
  dispose() {
    this.items.forEach((item) => item.dispose());
    this.items.clear();
  }
}

/** A token colour from the page (the canvas inherits the theme), or a fallback. */
function token(el: Element, name: string, fallback: string) {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  try {
    return new Color(value || fallback);
  } catch {
    return new Color(fallback);
  }
}

function makeRenderer(canvas: HTMLCanvasElement, bin: Bin) {
  const renderer = bin.add(
    new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" }),
  );
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = bin.add(pmrem.fromScene(room, 0.04).texture);
  room.dispose();
  pmrem.dispose();
  return { renderer, environment };
}

/** Runs `frame` every animation frame until it returns false. */
function animate(frame: (now: number) => boolean) {
  let id = requestAnimationFrame(function tick(now) {
    id = frame(now) ? requestAnimationFrame(tick) : 0;
  });
  return () => cancelAnimationFrame(id);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number, p = 3) => 1 - Math.pow(1 - clamp01(t), p);
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** A hop of `height` over [a, b] (0 outside). */
const hop = (s: number, a: number, b: number, height: number) =>
  s <= a || s >= b ? 0 : 4 * height * ((s - a) / (b - a)) * (1 - (s - a) / (b - a));

function canvas2d(width: number, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, g: canvas.getContext("2d", { willReadFrequently: true })! };
}

function loadImage(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return image.decode().then(() => image);
}

/** A soft round shadow for the table, drawn once. */
function blobTexture(bin: Bin) {
  const { canvas, g } = canvas2d(128);
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.45, "rgba(0,0,0,.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return bin.add(new CanvasTexture(canvas));
}

/* ------------------------------------------------------------------------------------------ */
/* The coin model                                                                              */
/* ------------------------------------------------------------------------------------------ */

const R = 1; // radius
const H = 0.085; // half the thickness at the edge
const RIM = 0.05; // how far the rim stands above the field
const FIELD = 0.81; // radius of the struck field inside the rim
const DOME = 0.022; // how much each face bulges at its centre
const REEDS = 120;

/** Half the coin's height from its centre to the top of the rim. */
export const coinHalfHeight = H + RIM;

/** Rim and milled edge: a lathed profile, reeded by pushing the edge in and out. */
function rimGeometry(segments: number) {
  const p = (r: number, y: number) => new Vector2(r, y);
  const top = [
    p(FIELD - 0.012, H + 0.004),
    p(FIELD + 0.02, H + RIM * 0.82),
    p(FIELD + 0.05, H + RIM),
    p(FIELD + 0.05, H + RIM),
    p(0.955, H + RIM),
    p(0.955, H + RIM),
    p(0.99, H + RIM * 0.62),
    p(R, H + RIM * 0.2),
    p(R, H + RIM * 0.2),
    p(R, H),
  ];
  const edge = [p(R, H * 0.5), p(R, 0), p(R, -H * 0.5)];
  const profile = [...top.map((v) => p(v.x, -v.y)), ...edge.reverse(), ...top.slice().reverse()];
  const geometry = new LatheGeometry(profile, segments);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const r = Math.hypot(x, z);
    if (r < R - 0.001 || Math.abs(y) > H + 0.0005) continue;
    const phi = Math.atan2(x, z);
    const ridge = Math.pow(Math.abs(Math.cos((REEDS * phi) / 2)), 0.6);
    const k = (R - 0.016 * (1 - ridge)) / r;
    position.setXYZ(i, x * k, y, z * k);
  }
  geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  return geometry;
}

/** One domed face, in polar rings with flat (planar) UVs so the struck design maps straight. */
function faceGeometry(up: 1 | -1, rings = 20, segments = 96) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const radius = FIELD + 0.006;
  for (let ring = 0; ring <= rings; ring++) {
    const rr = ring / rings;
    const r = rr * radius;
    const y = up * (H + DOME * (1 - rr * rr));
    // Slope of the dome for a smooth normal.
    const slope = (2 * DOME * rr) / radius;
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      positions.push(x, y, z);
      const n = new Vector3(Math.cos(a) * slope, 1, Math.sin(a) * slope).normalize();
      normals.push(n.x, n.y * up, n.z);
      // Heads reads upright from the front; tails too once the coin is turned over on X.
      uvs.push(0.5 + x / (2 * radius), 0.5 + (up === 1 ? -z : z) / (2 * radius));
    }
  }
  const row = segments + 1;
  for (let ring = 0; ring < rings; ring++)
    for (let s = 0; s < segments; s++) {
      const a = ring * row + s;
      const b = a + row;
      if (up === 1) index.push(a, a + 1, b, b, a + 1, b + 1);
      else index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  return geometry;
}

/** The whole coin as one geometry with three groups: rim, heads, tails. */
function coinGeometry(detail: "full" | "small") {
  const full = detail === "full";
  const parts = [
    rimGeometry(full ? 480 : 120),
    faceGeometry(1, full ? 20 : 6, full ? 96 : 32),
    faceGeometry(-1, full ? 20 : 6, full ? 96 : 32),
  ];
  const merged = mergeGeometries(parts, true)!;
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Blurs a height field in place with a few box passes. */
function blur(field: Float32Array, size: number, radius: number, passes = 2) {
  const tmp = new Float32Array(field.length);
  for (let pass = 0; pass < passes; pass++) {
    for (const [src, dst, horizontal] of [
      [field, tmp, true],
      [tmp, field, false],
    ] as const)
      for (let line = 0; line < size; line++) {
        let sum = 0;
        const at = (i: number) => {
          const c = Math.min(size - 1, Math.max(0, i));
          return horizontal ? src[line * size + c] : src[c * size + line];
        };
        for (let i = -radius; i <= radius; i++) sum += at(i);
        for (let i = 0; i < size; i++) {
          dst[horizontal ? line * size + i : i * size + line] = sum / (radius * 2 + 1);
          sum += at(i + radius + 1) - at(i - radius);
        }
      }
  }
  return field;
}

/**
 * Turns a painted charge into a struck die: a height field from its silhouette and shading,
 * a beaded border, then a normal map, a roughness map (frosted relief on a bright field) and
 * a colour map with toning in the recesses so the design reads at any angle.
 */
function strikeFace(image: HTMLImageElement, bin: Bin) {
  const N = 512;
  const { canvas: work, g } = canvas2d(N);
  const box = N * 0.66;
  const scale = Math.min(box / image.width, box / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  g.drawImage(image, (N - w) / 2, (N - h) / 2 + N * 0.01, w, h);
  const pixels = g.getImageData(0, 0, N, N).data;
  const alpha = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const a = pixels[i * 4 + 3] / 255;
    const l = (pixels[i * 4] * 0.3 + pixels[i * 4 + 1] * 0.55 + pixels[i * 4 + 2] * 0.15) / 255;
    alpha[i] = a;
    height[i] = a * (0.2 + 0.8 * Math.pow(l, 1.4));
  }
  const mound = blur(alpha.slice(), N, 3);
  for (let i = 0; i < N * N; i++) height[i] = height[i] * 0.78 + mound[i] * 0.22;
  // The border: a raised line and a ring of beads just inside the rim.
  const beads = 72;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / (N / 2) - 1;
      const dy = (y + 0.5) / (N / 2) - 1;
      const r = Math.hypot(dx, dy);
      let extra = Math.max(0, 1 - Math.abs(r - 0.8) / 0.012) * 0.45;
      const a = Math.atan2(dy, dx);
      const nearest = (Math.round((a / (Math.PI * 2)) * beads) / beads) * Math.PI * 2;
      const bx = Math.cos(nearest) * 0.895 - dx;
      const by = Math.sin(nearest) * 0.895 - dy;
      const d = Math.hypot(bx, by) / 0.026;
      if (d < 1) extra = Math.max(extra, Math.sqrt(1 - d * d) * 0.6);
      height[y * N + x] = Math.max(height[y * N + x], extra);
    }
  blur(height, N, 1, 1);
  const soft = blur(height.slice(), N, 7);
  const normal = new ImageData(N, N);
  const rough = new ImageData(N, N);
  const color = new ImageData(N, N);
  const strength = 10;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const hx = height[y * N + Math.min(N - 1, x + 1)] - height[y * N + Math.max(0, x - 1)];
      const hy = height[Math.min(N - 1, y + 1) * N + x] - height[Math.max(0, y - 1) * N + x];
      const n = new Vector3(-hx * strength, hy * strength, 1).normalize();
      normal.data.set(
        [(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255],
        i * 4,
      );
      const relief = clamp01(height[i] * 2.2);
      const cavity = clamp01((soft[i] - height[i]) * 6);
      const roughness = 0.22 + relief * 0.2 + cavity * 0.3;
      rough.data.set([0, roughness * 255, 0, 255], i * 4);
      // Silver, toned darker where the die left recesses around the design.
      const tone = 1 - cavity * 0.75 - (1 - relief) * 0.08;
      color.data.set([217 * tone, 212 * tone, 202 * tone, 255], i * 4);
    }
  const texture = (data: ImageData, srgb = false) => {
    const { canvas, g: ctx } = canvas2d(N);
    ctx.putImageData(data, 0, 0);
    const t = bin.add(new CanvasTexture(canvas));
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  work.width = 0;
  return { normal: texture(normal), roughness: texture(rough), map: texture(color, true) };
}

type CoinLook = { materials: Material[]; geometry: BufferGeometry };

async function mintCoin(
  bin: Bin,
  environment: Texture,
  detail: "full" | "small",
): Promise<CoinLook> {
  const [crown, skull] = await Promise.all([
    loadImage("/albion/charges/crown.webp"),
    loadImage("/albion/charges/skull.webp"),
  ]);
  const silver = new Color(0xd9d4ca);
  const face = (image: HTMLImageElement) => {
    const maps = strikeFace(image, bin);
    return bin.add(
      new MeshStandardMaterial({
        color: 0xffffff,
        map: maps.map,
        metalness: 1,
        roughness: 1,
        roughnessMap: maps.roughness,
        normalMap: maps.normal,
        normalScale: new Vector2(1.1, 1.1),
        envMap: environment,
        envMapIntensity: 0.8,
      }),
    );
  };
  const rim = bin.add(
    new MeshStandardMaterial({
      color: silver,
      metalness: 1,
      roughness: 0.26,
      envMap: environment,
      envMapIntensity: 0.8,
    }),
  );
  return {
    materials: [rim, face(crown), face(skull)],
    geometry: bin.add(coinGeometry(detail)),
  };
}

/** How high a coin's centre sits when its lowest point touches the table, for its tilt. */
function restHeight(q: Quaternion, scale = 1) {
  const n = new Vector3(0, 1, 0).applyQuaternion(q);
  return (R * Math.sqrt(Math.max(0, 1 - n.y * n.y)) + coinHalfHeight * Math.abs(n.y)) * scale;
}

/* ------------------------------------------------------------------------------------------ */
/* Coin flip scene                                                                             */
/* ------------------------------------------------------------------------------------------ */

export type CoinScene = {
  /** Shows the coin at rest on `side` (one still frame). */
  place(side: Side): void;
  /** Throws the coin and lands it on `side`, the server's result. */
  toss(side: Side, onLanded: () => void): void;
  dispose(): void;
};

const TOSS_MS = 2500;
const TURNS = 5;
/** When the coin first meets the table, as a share of the throw. */
const LAND = 0.55;

/**
 * A silver coin on a table: thrown up in an arc toward the viewer, tumbling end over end with
 * a little precession and slowing, landing on its edge, bouncing twice and wobbling flat onto
 * the side it was given. Renders only while it moves.
 */
export async function createCoinScene(
  canvas: HTMLCanvasElement,
  { width, height }: { width: number; height: number },
): Promise<CoinScene> {
  const bin = new Bin();
  const { renderer, environment } = makeRenderer(canvas, bin);
  renderer.setSize(width, height, false);
  const look = await mintCoin(bin, environment, "full");
  const scene = new Scene();
  const camera = new PerspectiveCamera(28, width / height, 0.1, 60);
  // Coin diameter ≈ 40% of the canvas width at rest; the canvas has headroom for the arc.
  const distance = 11.2;
  const elevation = MathUtils.degToRad(52);
  camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
  camera.lookAt(0, 1.55, 0);

  const key = new DirectionalLight(
    token(canvas, "--warning", "#e6b35b").lerp(new Color(0xffffff), 0.4),
    3,
  );
  key.position.set(-3.5, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0008;
  const fill = new DirectionalLight(token(canvas, "--focus", "#82b9ff"), 0.35);
  fill.position.set(4, 2, -3);
  scene.add(key, fill);

  const table = new Mesh(
    bin.add(new PlaneGeometry(14, 14)),
    bin.add(new ShadowMaterial({ opacity: 0.38 })),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  const blob = new Mesh(
    bin.add(new PlaneGeometry(2.9, 2.9)),
    bin.add(
      new MeshBasicMaterial({
        map: blobTexture(bin),
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
      }),
    ),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  scene.add(table, blob);

  const coin = new Mesh(look.geometry, look.materials);
  coin.castShadow = true;
  scene.add(coin);

  let spin = 0; // end-over-end angle; heads is a multiple of 2π
  let stop = () => {};
  const q = new Quaternion();
  const axisX = new Vector3(1, 0, 0);
  const axisY = new Vector3(0, 1, 0);
  const axisZ = new Vector3(0, 0, 1);
  const part = new Quaternion();

  const pose = (
    angle: number,
    yaw: number,
    roll: number,
    wobble: number,
    wobbleDir: number,
    lift: number,
    x: number,
    z: number,
  ) => {
    q.setFromAxisAngle(new Vector3(Math.cos(wobbleDir), 0, Math.sin(wobbleDir)), wobble);
    q.multiply(part.setFromAxisAngle(axisY, yaw));
    q.multiply(part.setFromAxisAngle(axisZ, roll));
    q.multiply(part.setFromAxisAngle(axisX, angle));
    coin.quaternion.copy(q);
    coin.position.set(x, restHeight(q) + lift, z);
    const high = clamp01(lift / 2.6);
    blob.position.set(coin.position.x + lift * 0.18, 0.002, coin.position.z - lift * 0.08);
    blob.scale.setScalar(1 + high * 0.5);
    (blob.material as MeshBasicMaterial).opacity = 0.6 * (1 - high * 0.75);
  };
  const render = () => renderer.render(scene, camera);

  return {
    place(side) {
      stop();
      spin = side === "tails" ? Math.PI : 0;
      pose(spin, 0, 0, 0, 0, 0, 0, 0);
      render();
    },
    toss(side, onLanded) {
      stop();
      const from = spin;
      const to =
        Math.ceil(from / (Math.PI * 2) + 0.01) * Math.PI * 2 +
        TURNS * Math.PI * 2 +
        (side === "tails" ? Math.PI : 0);
      spin = to;
      const began = performance.now();
      const frame = (now: number) => {
        const s = clamp01((now - began) / TOSS_MS);
        let angle: number;
        if (s < LAND) {
          const u = s / LAND;
          // Fast off the thumb, slowing as it climbs and falls.
          angle = from + (to - 0.5 - from) * (0.55 * u + 0.45 * easeOut(u, 2));
        } else if (s < 0.7) angle = to - 0.5 + 0.72 * easeInOut((s - LAND) / 0.15);
        else if (s < 0.8) angle = to + 0.22 - 0.28 * easeInOut((s - 0.7) / 0.1);
        else angle = to - 0.06 + 0.06 * easeOut((s - 0.8) / 0.06);
        const flight = clamp01(s / LAND);
        const lift = hop(s, 0, LAND, 2.7) + hop(s, LAND, 0.7, 0.34) + hop(s, 0.7, 0.8, 0.07);
        const arc = Math.sin(Math.PI * flight);
        const yaw = 0.42 * arc * Math.sin(flight * 5.2);
        const roll = s < LAND ? 0.28 * Math.sin(flight * Math.PI * 2.6) * (1 - flight * 0.6) : 0;
        // Settling: the coin rings down flat, its tilt circling faster as it dies away.
        const u = clamp01((s - 0.8) / 0.2);
        const wobble =
          s > 0.8 ? 0.085 * Math.sin(Math.min(1, u * 5) * (Math.PI / 2)) * Math.pow(1 - u, 1.7) : 0;
        const wobbleDir = Math.PI * 2 * (2.2 * u + 3.4 * u * u);
        pose(angle, yaw, roll, wobble, wobbleDir, lift, -0.12 * arc, 0.9 * arc);
        render();
        if (s < 1) return true;
        pose(to, 0, 0, 0, 0, 0, 0, 0);
        render();
        onLanded();
        return false;
      };
      frame(began);
      stop = animate(frame);
    },
    dispose() {
      stop();
      bin.dispose();
    },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Loot chest scene                                                                            */
/* ------------------------------------------------------------------------------------------ */

/** Painted planks: a canvas wood grain with knots, tileable along the plank. */
function woodTextures(bin: Bin) {
  const W = 512;
  const Hh = 128;
  const { canvas, g } = canvas2d(W, Hh);
  const bump = canvas2d(W, Hh);
  const image = g.createImageData(W, Hh);
  const bumpImage = bump.g.createImageData(W, Hh);
  // Deterministic noise so every chest is the same chest.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const knots = Array.from({ length: 3 }, () => ({
    x: rand() * W,
    y: 20 + rand() * (Hh - 40),
    r: 6 + rand() * 8,
  }));
  const waves = Array.from({ length: 4 }, () => ({
    f: 1 + Math.floor(rand() * 3),
    p: rand() * 6.28,
    a: 2 + rand() * 4,
  }));
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      let yy = y;
      for (const w of waves) yy += Math.sin((x / W) * Math.PI * 2 * w.f + w.p) * w.a;
      for (const k of knots) {
        const dx = (x - k.x) / (k.r * 3);
        const dy = (y - k.y) / k.r;
        const d = dx * dx + dy * dy;
        if (d < 9) yy += (k.y > y ? -1 : 1) * k.r * Math.exp(-d) * 1.6;
      }
      const ring = Math.pow(
        0.5 + 0.5 * Math.sin(yy * 0.2 + Math.sin(yy * 0.05 + x * 0.004) * 2.5),
        3,
      );
      const fine = 0.5 + 0.5 * Math.sin(yy * 1.7 + x * 0.002);
      let grain = 0.8 + ring * 0.16 - fine * 0.05 + (rand() - 0.5) * 0.07;
      for (const k of knots) {
        const d = Math.hypot((x - k.x) / 1.6, y - k.y) / k.r;
        if (d < 1) grain *= 0.55 + 0.45 * d;
      }
      // Darker plank edges read as a bevel between boards.
      const edge = Math.min(y, Hh - 1 - y) / Hh;
      const shade = edge < 0.06 ? 0.55 + (edge / 0.06) * 0.45 : 1;
      const v = grain * shade;
      image.data.set([132 * v, 80 * v, 47 * v, 255], (y * W + x) * 4);
      const b = 255 * clamp01(ring * 0.7 + 0.3) * shade;
      bumpImage.data.set([b, b, b, 255], (y * W + x) * 4);
    }
  g.putImageData(image, 0, 0);
  bump.g.putImageData(bumpImage, 0, 0);
  const map = bin.add(new CanvasTexture(canvas));
  map.colorSpace = SRGBColorSpace;
  const bumpMap = bin.add(new CanvasTexture(bump.canvas));
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
  }
  return { map, bumpMap };
}

export type ChestTarget = { x: number; y: number };

export type ChestScene = {
  /**
   * Plays the reveal once. `targets(i)` gives card i's coin landing point in canvas pixels,
   * read when the burst starts; `onCoin(i, first)` fires as each coin reaches card i.
   */
  play(options: {
    cards: number;
    perCard: number;
    targets: () => ChestTarget[];
    onOpen: () => void;
    onCoin: (card: number, first: boolean) => void;
    onDone: () => void;
  }): void;
  resize(width: number, height: number, stage: { top: number; height: number }): void;
  dispose(): void;
};

export const chestCue = { drop: 380, open: 820, burst: 1080 };

/**
 * A wooden loot chest with iron bands, brass corners, a lock plate and rivets. It drops in,
 * shakes, its lid swings open on the back hinge with an overshoot, a warm light rises from
 * the coins inside and silver bursts out in spinning arcs to each member's card.
 */
export async function createChestScene(
  canvas: HTMLCanvasElement,
  {
    width,
    height,
    stage: band,
  }: { width: number; height: number; stage: { top: number; height: number } },
): Promise<ChestScene> {
  const bin = new Bin();
  const { renderer, environment } = makeRenderer(canvas, bin);
  const coinLook = await mintCoin(bin, environment, "small");
  const scene = new Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  const camera = new PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.set(0, 0, 18);
  const ember = token(canvas, "--accent", "#ee945a");
  const warm = token(canvas, "--warning", "#e6b35b");

  // World units per pixel on the z = 0 plane, and pixel → world on that plane.
  let size = { width, height };
  let stage = band;
  const unit = () =>
    (2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov / 2))) / size.height;
  const toWorld = (px: number, py: number) =>
    new Vector3((px - size.width / 2) * unit(), (size.height / 2 - py) * unit(), 0);

  const key = new DirectionalLight(warm.clone().lerp(new Color(0xffffff), 0.35), 2.2);
  key.position.set(-6, 9, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 40 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0006;
  const rimLight = new DirectionalLight(token(canvas, "--focus", "#82b9ff"), 0.4);
  rimLight.position.set(6, 3, -6);
  scene.add(key, key.target, rimLight);

  /* --- the chest model ------------------------------------------------------------------- */
  const wood = woodTextures(bin);
  const woodMaterial = (tint: number) =>
    bin.add(
      new MeshStandardMaterial({
        color: tint,
        map: wood.map,
        bumpMap: wood.bumpMap,
        bumpScale: 1.4,
        roughness: 0.78,
        metalness: 0,
      }),
    );
  const planks = woodMaterial(0xffffff);
  const darkPlanks = woodMaterial(0xa08c80);
  const iron = bin.add(
    new MeshStandardMaterial({
      color: 0x45403b,
      metalness: 0.9,
      roughness: 0.38,
      envMapIntensity: 1.6,
    }),
  );
  const brass = bin.add(
    new MeshStandardMaterial({ color: 0xd2a65a, metalness: 1, roughness: 0.3, envMapIntensity: 2 }),
  );
  const inside = bin.add(new MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 }));

  const W = 2.3; // width (x)
  const D = 1.45; // depth (z)
  const BH = 1.05; // body height
  const T = 0.09; // plank thickness
  const chest = new Group();
  const body = new Group();
  chest.add(body);
  const box = (w: number, h: number, d: number) => bin.add(new BoxGeometry(w, h, d));
  const add = (parent: Object3D, mesh: Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Three boards per wall, each with its own slice of the grain.
  const board = (geometry: BoxGeometry, offset: number, material = planks) => {
    const uv = geometry.getAttribute("uv");
    const copy = geometry.clone();
    const out = copy.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) out.setXY(i, uv.getX(i) * 0.7 + offset, uv.getY(i));
    bin.add(copy);
    return new Mesh(copy, material);
  };
  const rows = 3;
  const boardH = BH / rows;
  for (let r = 0; r < rows; r++) {
    const y = boardH * (r + 0.5);
    add(body, board(box(W, boardH - 0.012, T), r * 0.23), 0, y, D / 2 - T / 2);
    add(body, board(box(W, boardH - 0.012, T), 0.5 + r * 0.17, darkPlanks), 0, y, -D / 2 + T / 2);
    for (const side of [-1, 1]) {
      const plank = board(box(D - 2 * T, boardH - 0.012, T), r * 0.31 + (side > 0 ? 0.1 : 0.4));
      plank.rotation.y = Math.PI / 2;
      add(body, plank, side * (W / 2 - T / 2), y, 0);
    }
  }
  add(body, new Mesh(box(W - 0.02, T, D - 0.02), darkPlanks), 0, T / 2, 0);
  // The treasure: a dark well with a mound of coins that catches the inner light.
  add(body, new Mesh(box(W - 2 * T, 0.02, D - 2 * T), inside), 0, BH * 0.55, 0);
  const pile = new InstancedMesh(coinLook.geometry, coinLook.materials, 46);
  {
    const m = new Matrix4();
    const p = new Vector3();
    const r = new Quaternion();
    const e = new Vector3();
    let s = 11;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < pile.count; i++) {
      const x = (rand() - 0.5) * (W - 0.45);
      const z = (rand() - 0.5) * (D - 0.45);
      const mound = 1 - Math.min(1, Math.hypot(x / (W / 2), z / (D / 2)));
      p.set(x, BH * 0.58 + mound * 0.32 + rand() * 0.05, z);
      e.set(rand() - 0.5, rand(), rand() - 0.5).normalize();
      r.setFromAxisAngle(e, (rand() - 0.5) * 0.9);
      m.compose(p, r, new Vector3(0.17, 0.17, 0.17));
      pile.setMatrixAt(i, m);
    }
  }
  body.add(pile);

  // Iron bands, wrapping front, bottom and back.
  for (const x of [-W * 0.3, W * 0.3]) {
    add(body, new Mesh(box(0.16, BH + 0.02, 0.03), iron), x, BH / 2, D / 2 + 0.015);
    add(body, new Mesh(box(0.16, BH + 0.02, 0.03), iron), x, BH / 2, -D / 2 - 0.015);
    for (const side of [-1, 1])
      add(body, new Mesh(box(0.16, 0.03, D + 0.06), iron), x, side < 0 ? -0.01 : -0.01, 0);
  }
  // Brass corner brackets: an L on each vertical edge, top and bottom.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const y of [0.2, BH - 0.2]) {
        const a = add(
          body,
          new Mesh(box(0.3, 0.4, 0.035), brass),
          sx * (W / 2 - 0.13),
          y,
          sz * (D / 2 + 0.018),
        );
        const b = add(
          body,
          new Mesh(box(0.035, 0.4, 0.3), brass),
          sx * (W / 2 + 0.018),
          y,
          sz * (D / 2 - 0.13),
        );
        a.castShadow = b.castShadow = false;
      }

  // The lid: curved staves around a back hinge, half-disc ends, bands, a hasp.
  const hinge = new Group();
  hinge.position.set(0, BH, -D / 2);
  chest.add(hinge);
  const lid = new Group();
  lid.position.set(0, 0, D / 2); // lid's local origin = middle of the body's top
  hinge.add(lid);
  const LR = D / 2; // lid radius
  const staves = 6;
  for (let i = 0; i < staves; i++) {
    const a0 = (i / staves) * Math.PI;
    const a1 = ((i + 1) / staves) * Math.PI - 0.012;
    const shape = new Shape();
    shape.absarc(0, 0, LR, a0, a1, false);
    shape.absarc(0, 0, LR - T, a1, a0, true);
    const geometry = bin.add(
      new ExtrudeGeometry(shape, { depth: W - 0.02, bevelEnabled: false, curveSegments: 6 }),
    );
    geometry.translate(0, 0, -(W - 0.02) / 2);
    // Grain along the length of each stave.
    const uv = geometry.getAttribute("uv");
    const pos = geometry.getAttribute("position");
    for (let v = 0; v < uv.count; v++)
      uv.setXY(
        v,
        pos.getZ(v) * 0.4 + i * 0.13,
        (Math.atan2(pos.getY(v), pos.getX(v)) - a0) / (a1 - a0),
      );
    const stave = new Mesh(geometry, planks);
    stave.rotation.y = Math.PI / 2;
    add(lid, stave, 0, 0, 0);
  }
  for (const side of [-1, 1]) {
    const end = new Shape();
    end.absarc(0, 0, LR, 0, Math.PI, false);
    end.lineTo(LR, 0);
    const geometry = bin.add(
      new ExtrudeGeometry(end, { depth: T, bevelEnabled: false, curveSegments: 24 }),
    );
    geometry.translate(0, 0, -T / 2);
    const cap = new Mesh(geometry, planks);
    cap.rotation.y = Math.PI / 2;
    add(lid, cap, side * (W / 2 - T / 2), 0, 0);
  }
  const lidFloor = add(lid, new Mesh(box(W - 0.02, 0.025, D - 0.02), inside), 0, 0.012, 0);
  lidFloor.castShadow = false;
  const bandArc = (x: number) => {
    const shape = new Shape();
    shape.absarc(0, 0, LR + 0.03, 0, Math.PI, false);
    shape.absarc(0, 0, LR - 0.01, Math.PI, 0, true);
    const geometry = bin.add(
      new ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 32 }),
    );
    geometry.translate(0, 0, -0.08);
    const band = new Mesh(geometry, iron);
    band.rotation.y = Math.PI / 2;
    add(lid, band, x, 0, 0);
  };
  bandArc(-W * 0.3);
  bandArc(W * 0.3);
  // Brass trim along the lid's front and back edges.
  add(lid, new Mesh(box(W + 0.04, 0.07, 0.05), brass), 0, 0.035, LR + 0.01);
  add(lid, new Mesh(box(W + 0.04, 0.07, 0.05), brass), 0, 0.035, -LR - 0.01);
  add(body, new Mesh(box(W + 0.04, 0.07, 0.05), brass), 0, BH - 0.035, D / 2 + 0.02);

  // Lock plate on the body and the hasp hanging from the lid.
  const plate = new Shape();
  plate.moveTo(-0.24, 0.2);
  plate.lineTo(0.24, 0.2);
  plate.lineTo(0.24, -0.12);
  plate.quadraticCurveTo(0.2, -0.26, 0, -0.32);
  plate.quadraticCurveTo(-0.2, -0.26, -0.24, -0.12);
  plate.closePath();
  const keyhole = new Shape();
  keyhole.absarc(0, -0.02, 0.045, 0, Math.PI * 2, false);
  plate.holes.push(keyhole);
  const plateGeometry = bin.add(
    new ExtrudeGeometry(plate, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
    }),
  );
  add(body, new Mesh(plateGeometry, brass), 0, BH - 0.3, D / 2 + 0.02);
  add(
    body,
    new Mesh(bin.add(new BoxGeometry(0.035, 0.1, 0.03)), inside),
    0,
    BH - 0.38,
    D / 2 + 0.07,
  );
  add(lid, new Mesh(box(0.16, 0.26, 0.04), brass), 0, -0.06, LR + 0.04);

  // Rivets along every band and bracket.
  const rivetSpots: Vector3[] = [];
  const lidRivets: Vector3[] = [];
  for (const x of [-W * 0.3, W * 0.3]) {
    for (let k = 0; k < 4; k++) {
      rivetSpots.push(new Vector3(x, 0.15 + k * ((BH - 0.3) / 3), D / 2 + 0.035));
      rivetSpots.push(new Vector3(x, 0.15 + k * ((BH - 0.3) / 3), -D / 2 - 0.035));
    }
    for (let k = 1; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      lidRivets.push(new Vector3(x, Math.sin(a) * (LR + 0.04), Math.cos(a) * (LR + 0.04)));
    }
  }
  for (const sx of [-1, 1])
    for (const y of [0.2, BH - 0.2]) {
      rivetSpots.push(new Vector3(sx * (W / 2 - 0.08), y + 0.12, D / 2 + 0.04));
      rivetSpots.push(new Vector3(sx * (W / 2 - 0.08), y - 0.12, D / 2 + 0.04));
    }
  for (const [x, y] of [
    [-0.17, BH - 0.17],
    [0.17, BH - 0.17],
    [0, BH - 0.55],
  ])
    rivetSpots.push(new Vector3(x, y, D / 2 + 0.08));
  const rivetGeometry = bin.add(new SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  const rivets = (parent: Object3D, spots: Vector3[], center: Vector3 | null) => {
    const mesh = new InstancedMesh(rivetGeometry, brass, spots.length);
    const m = new Matrix4();
    const up = new Vector3(0, 1, 0);
    spots.forEach((spot, i) => {
      const normal = center
        ? spot.clone().sub(center.clone().setX(spot.x)).normalize()
        : new Vector3(0, 0, Math.sign(spot.z));
      m.compose(spot, new Quaternion().setFromUnitVectors(up, normal), new Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    parent.add(mesh);
  };
  rivets(body, rivetSpots, null);
  rivets(lid, lidRivets, new Vector3(0, 0, 0));

  // The glow: a warm point light in the chest and an additive halo over the mouth.
  const glow = new PointLight(ember.clone().lerp(warm, 0.5), 0, 6, 1.6);
  glow.position.set(0, BH + 0.25, 0.1);
  body.add(glow);
  const haloTexture = (() => {
    const { canvas: c, g } = canvas2d(128);
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,236,190,1)");
    gradient.addColorStop(0.3, "rgba(255,190,110,.55)");
    gradient.addColorStop(1, "rgba(255,150,70,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
    return bin.add(new CanvasTexture(c));
  })();
  const halo = new Mesh(
    bin.add(new PlaneGeometry(3.6, 2.2)),
    bin.add(
      new MeshBasicMaterial({
        map: haloTexture,
        color: warm,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  halo.position.set(0, BH + 0.55, 0);
  chest.add(halo);
  const beam = new Mesh(
    bin.add(new CylinderGeometry(0.7, 1, 2.2, 32, 1, true)),
    bin.add(
      new MeshBasicMaterial({
        map: haloTexture,
        color: warm,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  beam.position.set(0, BH + 1.1, 0);
  chest.add(beam);

  // The floor the chest stands on: shadows only, plus a soft contact blob.
  const floor = new Mesh(
    bin.add(new PlaneGeometry(14, 10)),
    bin.add(new ShadowMaterial({ opacity: 0.42 })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const blob = new Mesh(
    bin.add(new PlaneGeometry(W * 1.6, D * 1.9)),
    bin.add(
      new MeshBasicMaterial({
        map: blobTexture(bin),
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      }),
    ),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.003;
  const ground = new Group();
  ground.add(floor, blob, chest);
  // Seen from a little above and to the side.
  ground.rotation.set(MathUtils.degToRad(24), MathUtils.degToRad(-22), 0);
  scene.add(ground);

  // The flying coins.
  const flyingCount = 120;
  const flying = new InstancedMesh(coinLook.geometry, coinLook.materials, flyingCount);
  flying.instanceMatrix.setUsage(DynamicDrawUsage);
  flying.count = 0;
  flying.frustumCulled = false;
  scene.add(flying);

  // Place the chest so its feet sit on the bottom of the stage band, centred.
  const scale = new Vector3();
  const layout = () => {
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    const feet = toWorld(size.width / 2, stage.top + stage.height * 0.84);
    const s = Math.min((stage.height * 0.42 * unit()) / BH, (size.width * 0.4 * unit()) / W);
    ground.position.copy(feet);
    ground.scale.setScalar(s);
    scale.setScalar(s);
    key.target.position.copy(feet);
  };
  layout();
  const render = () => renderer.render(scene, camera);

  let stop = () => {};
  return {
    resize(w, h, s) {
      size = { width: w, height: h };
      stage = s;
      layout();
      render();
    },
    play({ cards, perCard, targets, onOpen, onCoin, onDone }) {
      const began = performance.now();
      type Flight = {
        card: number;
        first: boolean;
        start: number;
        end: number;
        from: Vector3;
        apex: Vector3;
        to: Vector3;
        axis: Vector3;
        turns: number;
        arrived: boolean;
      };
      let flights: Flight[] = [];
      let lastLand = Infinity;
      let opened = false;
      const m = new Matrix4();
      const q = new Quaternion();
      const p = new Vector3();
      const sc = new Vector3();
      const mouth = new Vector3();
      const plan = () => {
        mouth.set(0, BH + 0.3, 0);
        chest.localToWorld(mouth);
        const spots = targets();
        const coinScale = scale.x * 0.2;
        cards = Math.min(cards, Math.floor(flyingCount / perCard));
        for (let card = 0; card < cards; card++) {
          const spot = spots[card];
          if (!spot) continue;
          const to = toWorld(spot.x, spot.y);
          for (let c = 0; c < perCard; c++) {
            const seed = (card * 7 + c * 13) % 17;
            const start = chestCue.burst + card * 120 + c * 95 + (seed % 3) * 25;
            const duration = 980 + (seed % 4) * 90;
            const apex = new Vector3(
              mouth.x + (seed - 8) * 0.13 + (to.x - mouth.x) * 0.25,
              Math.max(mouth.y, to.y) + coinScale * (9 + (seed % 6) * 2.4),
              2.2 + (seed % 5) * 0.8,
            );
            flights.push({
              card,
              first: c === 0,
              start,
              end: start + duration,
              from: mouth.clone(),
              apex,
              to,
              axis: new Vector3((seed % 3) - 1, 1, (seed % 2) - 0.5).normalize(),
              turns: 2 + (seed % 4),
              arrived: false,
            });
          }
        }
        flights = flights.slice(0, flyingCount);
        lastLand = flights.reduce((t, f) => Math.max(t, f.end), chestCue.burst);
      };
      const settle = () => lastLand + 650;
      const frame = (now: number) => {
        const t = now - began;
        // Drop in and squash.
        const drop = clamp01(t / chestCue.drop);
        const fall = drop < 0.6 ? 1 - Math.pow(drop / 0.6, 2) : 0;
        const squash = drop >= 0.6 ? Math.sin(((drop - 0.6) / 0.4) * Math.PI) * 0.06 : 0;
        chest.position.y = fall * 2.4;
        chest.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
        (blob.material as MeshBasicMaterial).opacity = 0.75 * (1 - fall * 0.7);
        // A nervous shake before the lid gives.
        const shaking =
          t > chestCue.drop && t < chestCue.open
            ? (t - chestCue.drop) / (chestCue.open - chestCue.drop)
            : -1;
        chest.rotation.z =
          shaking >= 0 ? Math.sin(shaking * Math.PI * 7) * 0.05 * (1 - shaking * 0.4) : 0;
        chest.position.x = shaking >= 0 ? Math.sin(shaking * Math.PI * 9) * 0.03 : 0;
        if (shaking > 0.75)
          chest.position.y += Math.sin(((shaking - 0.75) / 0.25) * Math.PI) * 0.08;
        // The lid swings back on its hinge, overshoots and settles.
        const o = (t - chestCue.open) / 620;
        let lidAngle = 0;
        if (o > 0) {
          if (o < 0.12) lidAngle = -0.1 * (o / 0.12);
          else if (o < 0.62)
            lidAngle = -0.1 + (124 + 6) * easeInOut((o - 0.12) / 0.5) * (Math.PI / 180) + 0;
          else
            lidAngle = MathUtils.degToRad(
              124 - 14 * Math.sin(Math.min(1, (o - 0.62) / 0.38) * Math.PI * 0.5) - 0,
            );
          if (o >= 1) lidAngle = MathUtils.degToRad(110);
        }
        const late = t - settle();
        if (late > 0)
          lidAngle = MathUtils.degToRad(110 - 8 * Math.sin(Math.min(1, late / 520) * Math.PI));
        hinge.rotation.x = -lidAngle;
        if (!opened && t >= chestCue.open) {
          opened = true;
          onOpen();
        }
        // The light rises from the coins and steadies.
        const light = clamp01((t - chestCue.open - 60) / 440);
        const dim = late > 0 ? clamp01(late / 900) : 0;
        const level = easeOut(light) * (1 - dim * 0.4);
        glow.intensity = level * 9 * scale.x * scale.x;
        (halo.material as MeshBasicMaterial).opacity = level * 0.85;
        halo.scale.setScalar(0.6 + easeOut(light) * 0.5 - dim * 0.15);
        (beam.material as MeshBasicMaterial).opacity = level * 0.22 * (1 - dim * 0.5);
        beam.scale.set(1, Math.max(0.01, easeOut(light, 4)), 1);
        // The burst.
        if (t >= chestCue.burst && !flights.length && lastLand === Infinity) plan();
        let n = 0;
        for (const f of flights) {
          if (t < f.start) continue;
          const u = (t - f.start) / (f.end - f.start);
          if (u >= 1) {
            if (!f.arrived) {
              f.arrived = true;
              onCoin(f.card, f.first);
            }
            continue;
          }
          // A quadratic arc through the apex, quick out of the chest and easing into the card.
          const k = easeOut(u, 1.6);
          const a = (1 - k) * (1 - k);
          const b = 2 * (1 - k) * k;
          const c = k * k;
          p.set(
            a * f.from.x + b * f.apex.x + c * f.to.x,
            a * f.from.y + b * f.apex.y + c * f.to.y,
            a * f.from.z + b * f.apex.z + c * f.to.z,
          );
          q.setFromAxisAngle(f.axis, u * f.turns * Math.PI * 2);
          const grow = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1;
          sc.setScalar(
            scale.x *
              0.2 *
              (0.5 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.4))) *
              Math.max(0.05, grow),
          );
          m.compose(p, q, sc);
          flying.setMatrixAt(n++, m);
        }
        flying.count = n;
        flying.instanceMatrix.needsUpdate = true;
        render();
        if (t < settle() + 900) return true;
        onDone();
        return false;
      };
      frame(began);
      stop = animate(frame);
    },
    dispose() {
      stop();
      pile.dispose();
      flying.dispose();
      bin.dispose();
    },
  };
}
