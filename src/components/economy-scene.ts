import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  Path,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  ShadowMaterial,
  Shape,
  Sphere,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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
function rimGeometry(segments: number, reeded = true) {
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
    if (!reeded || r < R - 0.001 || Math.abs(y) > H + 0.0005) continue;
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
    full ? rimGeometry(480) : rimGeometry(28, false),
    faceGeometry(1, full ? 20 : 3, full ? 96 : 28),
    faceGeometry(-1, full ? 20 : 3, full ? 96 : 28),
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
  /** Jumps a throw to its end. */
  skip(): void;
  dispose(): void;
};

/** The flip's beats, in scene milliseconds; slow motion stretches the apex. */
export const flipCue = {
  flick: 420,
  land: 2300,
  bounce: 2580,
  rest: 2730,
  /** The result is shown from here, while the coin rings down. */
  landed: 2760,
  settle: 3350,
  slowFrom: 1120,
  slowTo: 1600,
  slowRate: 0.32,
};
const flipTime = (real: number) => {
  const { slowFrom, slowTo, slowRate } = flipCue;
  const span = (slowTo - slowFrom) / slowRate;
  if (real <= slowFrom) return real;
  if (real <= slowFrom + span) return slowFrom + (real - slowFrom) * slowRate;
  return slowTo + (real - slowFrom - span);
};
const TURNS = 7;
const TOSS_HEIGHT = 6.2;

/** A thin bright ring for the landing flash. */
function ringTexture(bin: Bin) {
  const { canvas, g } = canvas2d(128);
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0)");
  gradient.addColorStop(0.8, "rgba(255,255,255,1)");
  gradient.addColorStop(0.88, "rgba(255,255,255,.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return bin.add(new CanvasTexture(canvas));
}

/**
 * A silver coin on a table, flipped as a moment: a thumb flick, a big high toss the camera
 * tilts up to follow, spinning with blur and glints, slow motion at the apex, faces trading
 * on the way down, the last turn slowing to the side it was given, then a clinking bounce, a
 * puff of dust, a flash ring and sparkles in that side's colour. Renders only while it moves.
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
  const camera = new PerspectiveCamera(28, width / height, 0.1, 80);
  const restLook = 1.55;
  const distance = 11.2;
  const elevation = MathUtils.degToRad(52);
  const base = new Vector3(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
  const lookAt = new Vector3(0, restLook, 0);
  const aim = (coinY: number) => {
    // Tilt up to follow the coin once it is high, and ease back down as it falls.
    const follow = smooth(0.8, 3.2, coinY);
    lookAt.set(0, lerp(restLook, coinY - 0.3, follow * 0.78), 0);
    camera.position.copy(base);
    camera.position.y += follow * coinY * 0.35;
    camera.lookAt(lookAt);
  };
  aim(0);

  const warm = token(canvas, "--warning", "#e6b35b");
  const sideColor = {
    heads: warm.clone().lerp(new Color(0xffffff), 0.2),
    tails: token(canvas, "--focus", "#82b9ff").lerp(new Color(0xffffff), 0.2),
  };
  const key = new DirectionalLight(warm.clone().lerp(new Color(0xffffff), 0.4), 3);
  key.position.set(-3.5, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0008;
  const fill = new DirectionalLight(token(canvas, "--focus", "#82b9ff"), 0.35);
  fill.position.set(4, 2, -3);
  scene.add(key, fill);
  const lightDir = key.position.clone().normalize();

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
  const ring = new Mesh(
    bin.add(new PlaneGeometry(1, 1)),
    bin.add(
      new MeshBasicMaterial({
        map: ringTexture(bin),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(table, blob, ring);

  const coin = new Mesh(look.geometry, look.materials);
  coin.castShadow = true;
  scene.add(coin);
  // Motion blur: fading copies a little behind in the spin, only while it spins fast.
  const ghosts = [0.32, 0.2, 0.12, 0.06].map((opacity) => {
    const materials = look.materials.map((m) => {
      const copy = bin.add((m as MeshStandardMaterial).clone());
      copy.transparent = true;
      copy.opacity = opacity;
      copy.depthWrite = false;
      return copy;
    });
    const ghost = new Mesh(look.geometry, materials);
    ghost.visible = false;
    scene.add(ghost);
    return { ghost, materials, opacity };
  });
  const glint = new Sprite(
    bin.add(
      new SpriteMaterial({
        map: starTexture(bin),
        color: 0xfff4dc,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  const flash = new Sprite(
    bin.add(
      new SpriteMaterial({
        map: glowTexture(bin),
        color: 0xfff2d6,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  scene.add(glint, flash);
  const dust = new Particles(40, glowTexture(bin), false, bin);
  const sparks = new Particles(110, starTexture(bin), true, bin);
  scene.add(dust.points, sparks.points);
  {
    const buffer = new Vector2();
    renderer.getDrawingBufferSize(buffer);
    dust.setViewport(buffer.y);
    sparks.setViewport(buffer.y);
  }

  let spin = 0; // end-over-end angle; heads is a multiple of 2π
  let stop = () => {};
  let finish: (() => void) | null = null;
  const axisX = new Vector3(1, 0, 0);
  const axisY = new Vector3(0, 1, 0);
  const axisZ = new Vector3(0, 0, 1);
  const part = new Quaternion();
  const wobbleAxis = new Vector3();
  const normal = new Vector3();
  const view = new Vector3();

  type Pose = {
    angle: number;
    yaw: number;
    roll: number;
    wobble: number;
    wobbleDir: number;
    lift: number;
    x: number;
    z: number;
  };
  const still = (angle: number): Pose => ({
    angle,
    yaw: 0,
    roll: 0,
    wobble: 0,
    wobbleDir: 0,
    lift: 0,
    x: 0,
    z: 0,
  });
  const put = (target: Object3D, p: Pose) => {
    wobbleAxis.set(Math.cos(p.wobbleDir), 0, Math.sin(p.wobbleDir));
    target.quaternion.setFromAxisAngle(wobbleAxis, p.wobble);
    target.quaternion.multiply(part.setFromAxisAngle(axisY, p.yaw));
    target.quaternion.multiply(part.setFromAxisAngle(axisZ, p.roll));
    target.quaternion.multiply(part.setFromAxisAngle(axisX, p.angle));
    target.position.set(p.x, restHeight(target.quaternion) + p.lift, p.z);
  };
  const pose = (p: Pose) => {
    put(coin, p);
    const high = clamp01(p.lift / 4);
    blob.position.set(coin.position.x + p.lift * 0.12, 0.002, coin.position.z - p.lift * 0.05);
    blob.scale.setScalar(1 + high * 0.7);
    (blob.material as MeshBasicMaterial).opacity = 0.6 * (1 - high * 0.8);
    aim(coin.position.y);
  };
  const render = () => renderer.render(scene, camera);
  const clearFx = () => {
    ghosts.forEach((g) => (g.ghost.visible = false));
    (glint.material as SpriteMaterial).opacity = 0;
    (flash.material as SpriteMaterial).opacity = 0;
    (ring.material as MeshBasicMaterial).opacity = 0;
    dust.clear();
    sparks.clear();
  };

  return {
    place(side) {
      stop();
      finish = null;
      clearFx();
      spin = side === "tails" ? Math.PI : 0;
      pose(still(spin));
      render();
    },
    skip() {
      finish?.();
    },
    toss(side, onLanded) {
      stop();
      clearFx();
      const from = spin;
      const to =
        Math.ceil(from / (Math.PI * 2) + 0.01) * Math.PI * 2 +
        TURNS * Math.PI * 2 +
        (side === "tails" ? Math.PI : 0);
      spin = to;
      const color = sideColor[side];
      const r = seeded(Math.round(to * 1000) % 9973 || 5);
      const began = performance.now();
      let last = 0;
      let lastAngle = from;
      let told = false;
      const tell = () => {
        if (told) return;
        told = true;
        onLanded();
      };
      const burst = (count: number, strength: number) => {
        sparks.spawn(count, (p, v) => {
          const a = r() * Math.PI * 2;
          p.set(Math.cos(a) * 0.9, 0.1 + r() * 0.2, Math.sin(a) * 0.9);
          v.set(
            Math.cos(a) * (1 + r() * 2.4) * strength,
            (1.6 + r() * 3) * strength,
            Math.sin(a) * (1 + r() * 2) * strength,
          );
          return {
            life: 700 + r() * 800,
            size: 0.18 + r() * 0.26,
            color: color.clone().lerp(new Color(0xffffff), r() * 0.5),
          };
        });
      };
      const frame = (now: number) => {
        const t = flipTime(now - began);
        const dt = Math.max(1, t - last);
        last = t;
        const p = still(to);
        const { flick, land, bounce, rest, settle } = flipCue;
        if (t < flick) {
          // The thumb: the coin rocks back onto its edge and lifts a little.
          const u = t / flick;
          p.angle = from - 0.45 * easeInOut(u);
          p.lift = 0.22 * Math.sin(u * Math.PI * 0.5);
          p.roll = -0.06 * u;
        } else if (t < land) {
          const u = (t - flick) / (land - flick);
          // Fast off the thumb, slowing all the way so the last turn is suspenseful.
          p.angle = from - 0.45 + (to - 0.4 - (from - 0.45)) * (1 - Math.pow(1 - u, 3.1));
          p.lift = 0.22 * (1 - u) + 4 * TOSS_HEIGHT * u * (1 - u);
          const arc = Math.sin(Math.PI * u);
          p.x = -0.22 * arc;
          p.z = 0.45 * arc;
          p.yaw = 0.4 * arc * Math.sin(u * 5.4);
          p.roll = 0.24 * Math.sin(u * Math.PI * 2.4) * (1 - u * 0.7);
        } else if (t < bounce) {
          const u = (t - land) / (bounce - land);
          p.angle = to - 0.4 + 0.58 * easeInOut(u);
          p.lift = hop(u, 0, 1, 0.5);
        } else if (t < rest) {
          const u = (t - bounce) / (rest - bounce);
          p.angle = to + 0.18 - 0.23 * easeInOut(u);
          p.lift = hop(u, 0, 1, 0.12);
        } else {
          const u = clamp01((t - rest) / (settle - rest));
          p.angle = to - 0.05 + 0.05 * easeOut(u * 4);
          p.wobble = 0.09 * Math.sin(Math.min(1, u * 5) * (Math.PI / 2)) * Math.pow(1 - u, 1.7);
          p.wobbleDir = Math.PI * 2 * (2.2 * u + 3.6 * u * u);
        }
        pose(p);
        // Blur and glints while it spins fast.
        const omega = Math.abs(p.angle - lastAngle) / (dt / 1000);
        lastAngle = p.angle;
        const blur = smooth(10, 30, omega);
        ghosts.forEach((g, i) => {
          g.ghost.visible = blur > 0.02;
          if (!g.ghost.visible) return;
          put(g.ghost, { ...p, angle: p.angle - Math.sign(to - from) * (i + 1) * 0.16 * blur });
          g.ghost.position.copy(coin.position);
          g.materials.forEach((m) => (m.opacity = g.opacity * blur));
        });
        normal.set(0, 1, 0).applyQuaternion(coin.quaternion);
        view.subVectors(camera.position, coin.position).normalize();
        const half = lightDir.clone().add(view).normalize();
        const spec = Math.pow(Math.abs(normal.dot(half)), 60);
        const glintAmount = t > flick && t < land ? spec : 0;
        (glint.material as SpriteMaterial).opacity = glintAmount;
        glint.position
          .copy(coin.position)
          .addScaledVector(view, 0.4)
          .add(tmpUp.set(-0.35, 0.35, 0));
        glint.scale.setScalar(0.8 + glintAmount * 1.6);
        glint.material.rotation = t / 300;
        // Landing: flash ring, dust puff and sparkles.
        if (t >= land && t - dt < land) {
          burst(60, 1);
          dust.spawn(28, (pp, v) => {
            const a = r() * Math.PI * 2;
            pp.set(Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.9);
            v.set(
              Math.cos(a) * (1.2 + r() * 1.6),
              0.3 + r() * 0.8,
              Math.sin(a) * (1.2 + r() * 1.6),
            );
            return { life: 600 + r() * 500, size: 0.6 + r() * 0.6, color: new Color(0x8a7563) };
          });
        }
        if (t >= bounce && t - dt < bounce) burst(16, 0.6);
        const ringT = (t - land) / 520;
        const ringOn = ringT > 0 && ringT < 1;
        (ring.material as MeshBasicMaterial).opacity = ringOn ? Math.pow(1 - ringT, 1.5) : 0;
        (ring.material as MeshBasicMaterial).color.copy(color);
        ring.scale.setScalar(1.4 + easeOut(clamp01(ringT)) * 4.2);
        const flashT = (t - land) / 300;
        (flash.material as SpriteMaterial).opacity =
          flashT > 0 && flashT < 1 ? Math.pow(1 - flashT, 2) * 0.8 : 0;
        flash.position.copy(coin.position);
        flash.scale.setScalar(2 + flashT * 3);
        dust.step(dt, -0.6, 0.1, (u) => 0.45 * Math.pow(1 - u, 1.5));
        sparks.step(
          dt,
          -2.5,
          0.4,
          (u, i) => Math.pow(1 - u, 1.3) * (0.6 + 0.4 * Math.sin(t / 40 + i)),
        );
        if (t >= flipCue.landed) tell();
        render();
        return t < settle || sparks.live > 0 || dust.live > 0;
      };
      finish = () => {
        stop();
        finish = null;
        clearFx();
        pose(still(to));
        render();
        tell();
      };
      frame(began);
      stop = animate((now) => {
        if (frame(now)) return true;
        finish?.();
        return false;
      });
    },
    dispose() {
      stop();
      finish = null;
      bin.dispose();
    },
  };
}
const tmpUp = new Vector3();

/* ------------------------------------------------------------------------------------------ */
/* Loot chest scene                                                                            */
/* ------------------------------------------------------------------------------------------ */

const seeded = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** A tangent-space normal map from a height field; it wraps, so tiling maps stay seamless. */
function normalsFrom(height: Float32Array, w: number, h: number, strength: number) {
  const data = new ImageData(w, h);
  const at = (x: number, y: number) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = -(at(x + 1, y) - at(x - 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(nx, ny, 1);
      data.data.set(
        [(nx / l / 2 + 0.5) * 255, (ny / l / 2 + 0.5) * 255, (1 / l / 2 + 0.5) * 255, 255],
        (y * w + x) * 4,
      );
    }
  return data;
}

function textureOf(data: ImageData, bin: Bin, srgb = false) {
  const { canvas, g } = canvas2d(data.width, data.height);
  g.putImageData(data, 0, 0);
  const texture = bin.add(new CanvasTexture(canvas));
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Painted planks: grain rings that wander around a few knots, open pores, a colour, a
 * normal and a roughness map from one height field. The grain runs along U.
 */
function woodMaps(bin: Bin) {
  const W = 512;
  const H = 128;
  const rand = seeded(7);
  const knots = Array.from({ length: 3 }, () => ({
    x: rand() * W,
    y: 24 + rand() * (H - 48),
    r: 5 + rand() * 7,
  }));
  const waves = Array.from({ length: 4 }, () => ({
    f: 1 + Math.floor(rand() * 3),
    p: rand() * 6.28,
    a: 2 + rand() * 4,
  }));
  const height = new Float32Array(W * H);
  const color = new ImageData(W, H);
  const rough = new ImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let yy = y;
      for (const w of waves) yy += Math.sin((x / W) * Math.PI * 2 * w.f + w.p) * w.a;
      for (const k of knots) {
        const dx = Math.min(Math.abs(x - k.x), W - Math.abs(x - k.x)) / (k.r * 3);
        const dy = (y - k.y) / k.r;
        const d = dx * dx + dy * dy;
        if (d < 9) yy += (k.y > y ? -1 : 1) * k.r * Math.exp(-d) * 1.7;
      }
      const ring = Math.pow(
        0.5 + 0.5 * Math.sin(yy * 0.24 + Math.sin(yy * 0.05 + x * 0.006) * 2.4),
        2.4,
      );
      const pore = rand() < 0.035 ? 0.35 : 0;
      let knot = 0;
      for (const k of knots) {
        const dx = Math.min(Math.abs(x - k.x), W - Math.abs(x - k.x)) / 1.5;
        const d = Math.hypot(dx, y - k.y) / k.r;
        if (d < 1) knot = Math.max(knot, 1 - d);
      }
      const i = y * W + x;
      height[i] = ring * 0.8 - pore - knot * 0.5;
      // Warm, slightly desaturated oak: darker late wood in the rings, darker knots.
      const tone = (0.78 + (1 - ring) * 0.15) * (1 - knot * 0.45) * (1 - pore * 0.4);
      const streak = 0.94 + 0.06 * Math.sin(x * 0.013 + y * 0.002);
      color.data.set([150 * tone * streak, 96 * tone * streak, 58 * tone * streak, 255], i * 4);
      rough.data.set([0, (0.6 + ring * 0.22 + pore) * 255, 0, 255], i * 4);
    }
  return {
    map: textureOf(color, bin, true),
    normalMap: textureOf(normalsFrom(height, W, H, 2.2), bin),
    roughnessMap: textureOf(rough, bin),
  };
}

/** Hammered metal: overlapping shallow dents for a normal and a roughness map. */
function hammeredMaps(bin: Bin) {
  const N = 256;
  const rand = seeded(29);
  const height = new Float32Array(N * N);
  for (let n = 0; n < 110; n++) {
    const cx = rand() * N;
    const cy = rand() * N;
    const r = 8 + rand() * 16;
    const depth = 0.4 + rand() * 0.6;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d >= 1) continue;
        const i = ((y + N) % N) * N + ((x + N) % N);
        height[i] -= depth * (1 - d * d) * (1 - d * d);
      }
  }
  const rough = new ImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const r = 0.36 + Math.min(0.3, -height[i] * 0.18) + (rand() - 0.5) * 0.06;
    rough.data.set([0, r * 255, 0, 255], i * 4);
  }
  return {
    normalMap: textureOf(normalsFrom(height, N, N, 1.6), bin),
    roughnessMap: textureOf(rough, bin),
  };
}

/** A soft round sprite, white in the middle. */
function glowTexture(bin: Bin, hard = 0.0) {
  const { canvas, g } = canvas2d(128);
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(Math.max(0.05, hard), "rgba(255,255,255,.75)");
  gradient.addColorStop(0.4, "rgba(255,255,255,.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return bin.add(new CanvasTexture(canvas));
}

/** A four-point star for sparkles. */
function starTexture(bin: Bin) {
  const { canvas, g } = canvas2d(64);
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.18, "rgba(255,255,255,.5)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(255,255,255,.9)";
  for (const [w, h] of [
    [2, 30],
    [30, 2],
  ]) {
    g.beginPath();
    g.ellipse(32, 32, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  return bin.add(new CanvasTexture(canvas));
}

/** A shaft of light: bright at its foot, fading up and to the sides. */
function shaftTexture(bin: Bin) {
  const { canvas, g } = canvas2d(64, 256);
  const image = g.createImageData(64, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 64; x++) {
      const across = 1 - Math.pow(Math.abs(x / 63 - 0.5) * 2, 1.6);
      const up = Math.pow(y / 255, 1.8);
      const a = clamp01(across * up) * 255;
      image.data.set([255, 255, 255, a], (y * 64 + x) * 4);
    }
  g.putImageData(image, 0, 0);
  return bin.add(new CanvasTexture(canvas));
}

/**
 * Cheap particles: one draw of point sprites with their own size, alpha and colour. They move
 * on the CPU (a few hundred at most) and fade out by their remaining life.
 */
class Particles {
  readonly points: Points;
  private position: Float32Array;
  private velocity: Float32Array;
  private life: Float32Array;
  private span: Float32Array;
  private size: Float32Array;
  private baseSize: Float32Array;
  private alpha: Float32Array;
  private tint: Float32Array;
  private material: ShaderMaterial;
  live = 0;
  constructor(
    private capacity: number,
    map: Texture,
    additive: boolean,
    bin: Bin,
  ) {
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.span = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.baseSize = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.tint = new Float32Array(capacity * 3);
    const geometry = bin.add(new BufferGeometry());
    geometry.setAttribute(
      "position",
      new BufferAttribute(this.position, 3).setUsage(DynamicDrawUsage),
    );
    geometry.setAttribute("size", new BufferAttribute(this.size, 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute("alpha", new BufferAttribute(this.alpha, 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute("tint", new BufferAttribute(this.tint, 3).setUsage(DynamicDrawUsage));
    this.material = bin.add(
      new ShaderMaterial({
        uniforms: { map: { value: map }, viewport: { value: 600 } },
        vertexShader: `
          attribute float size; attribute float alpha; attribute vec3 tint;
          uniform float viewport; varying float vAlpha; varying vec3 vTint;
          void main() {
            vec4 view = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * view;
            gl_PointSize = clamp(size * projectionMatrix[1][1] * viewport * 0.5 / max(0.1, -view.z), 0.0, 128.0);
            vAlpha = alpha; vTint = tint;
          }`,
        fragmentShader: `
          uniform sampler2D map; varying float vAlpha; varying vec3 vTint;
          void main() {
            vec4 t = texture2D(map, gl_PointCoord);
            gl_FragColor = vec4(vTint * t.rgb, t.a * vAlpha);
          }`,
        transparent: true,
        depthWrite: false,
        blending: additive ? AdditiveBlending : NormalBlending,
      }),
    );
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    geometry.setDrawRange(0, 0);
  }
  /** Adds up to `n` particles; `init` fills position, velocity, life (ms), size and colour. */
  spawn(n: number, init: (p: Vector3, v: Vector3) => { life: number; size: number; color: Color }) {
    const p = new Vector3();
    const v = new Vector3();
    for (let k = 0; k < n && this.live < this.capacity; k++) {
      const i = this.live++;
      p.set(0, 0, 0);
      v.set(0, 0, 0);
      const { life, size, color } = init(p, v);
      p.toArray(this.position, i * 3);
      v.toArray(this.velocity, i * 3);
      this.life[i] = this.span[i] = life;
      this.baseSize[i] = size;
      color.toArray(this.tint, i * 3);
    }
  }
  /** Steps every particle by `dt` ms; `fade(t)` gives alpha for t = 0 (born) … 1 (gone). */
  step(dt: number, gravity: number, drag: number, fade: (t: number, i: number) => number) {
    const s = dt / 1000;
    let i = 0;
    while (i < this.live) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // Move the last live particle into this slot.
        const last = --this.live;
        for (const [array, width] of [
          [this.position, 3],
          [this.velocity, 3],
          [this.tint, 3],
          [this.life, 1],
          [this.span, 1],
          [this.baseSize, 1],
        ] as const)
          array.copyWithin(i * width, last * width, last * width + width);
        continue;
      }
      const k = Math.pow(drag, s);
      this.velocity[i * 3] *= k;
      this.velocity[i * 3 + 1] = this.velocity[i * 3 + 1] * k + gravity * s;
      this.velocity[i * 3 + 2] *= k;
      for (let c = 0; c < 3; c++) this.position[i * 3 + c] += this.velocity[i * 3 + c] * s;
      const t = 1 - this.life[i] / this.span[i];
      this.alpha[i] = fade(t, i);
      this.size[i] = this.baseSize[i] * (0.6 + 0.4 * Math.sin(Math.min(1, t * 4) * Math.PI * 0.5));
      i++;
    }
    const geometry = this.points.geometry;
    geometry.setDrawRange(0, this.live);
    for (const name of ["position", "size", "alpha", "tint"])
      (geometry.getAttribute(name) as BufferAttribute).needsUpdate = true;
  }
  setViewport(height: number) {
    this.material.uniforms.viewport.value = height;
  }
  clear() {
    this.live = 0;
    this.points.geometry.setDrawRange(0, 0);
  }
}

export type ChestTarget = { x: number; y: number };
export type ChestBand = { left: number; top: number; width: number; height: number };

export type ChestScene = {
  /**
   * Plays the reveal once. `targets()` gives each card's coin landing point in canvas pixels
   * (read again on every resize); `onCoin(i, first)` fires as each coin reaches card i and
   * `onSlam` once the last one is home.
   */
  play(options: {
    cards: number;
    perCard: number;
    targets: () => ChestTarget[];
    onOpen: () => void;
    onCoin: (card: number, first: boolean) => void;
    onSlam: () => void;
    onDone: () => void;
  }): void;
  /** Jumps to the end: the chest open, the coins home. */
  skip(): void;
  resize(width: number, height: number, band: ChestBand): void;
  dispose(): void;
};

/** The reveal's beats, in scene milliseconds (slow motion stretches the fountain's peak). */
export const chestCue = {
  thud: 480,
  beats: [900, 1130, 1330, 1490, 1620, 1720],
  burst: 1800,
  slow: 2330,
  /** Real milliseconds spent in slow motion, and how fast scene time runs meanwhile. */
  slowReal: 780,
  slowRate: 0.3,
};
/** Scene time for real time since the start: one stretch of slow motion at the peak. */
const sceneTime = (real: number) => {
  const { slow, slowReal, slowRate } = chestCue;
  if (real <= slow) return real;
  if (real <= slow + slowReal) return slow + (real - slow) * slowRate;
  return slow + slowReal * slowRate + (real - slow - slowReal);
};

const CW = 2.3; // chest width (x)
const CD = 1.5; // depth (z)
const CH = 1.0; // body height
const PLANK = 0.1; // plank thickness
const POST = 0.17;
const LID_R = CD / 2;
const STRAP_X = 0.64;
const FOUNTAIN = 1.9; // how high the coins go above the rim
const LID_OPEN = MathUtils.degToRad(106);

/** Brightens bevels: vertices whose normal is off the main axes catch a worn, lighter edge. */
function edgeWear(geometry: BufferGeometry, base = 0.85, edge = 2.1) {
  const normal = geometry.getAttribute("normal");
  const colors = new Float32Array(normal.count * 3);
  for (let i = 0; i < normal.count; i++) {
    const m = Math.max(
      Math.abs(normal.getX(i)),
      Math.abs(normal.getY(i)),
      Math.abs(normal.getZ(i)),
    );
    const wear = smooth(0.97, 0.72, m);
    const c = lerp(base, edge, wear);
    colors.set([c, c, c], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

/**
 * A wooden loot chest built in code: bevelled planks with gaps between chunky corner posts, a
 * domed lid of curved staves, hammered iron straps with worn edges, ornate brass corners and
 * lock plate, big rivets, and a hoard of silver, gold and gems inside. The reveal: the camera
 * starts low and wide and dollies in, the chest thuds down in a burst of dust, rattles in
 * rising beats with light leaking from the seams, bursts open with a flash and shafts of light,
 * and a fountain of coins erupts (slow motion at its peak) and rains into each member's card.
 */
export async function createChestScene(
  canvas: HTMLCanvasElement,
  { width, height, band }: { width: number; height: number; band: ChestBand },
): Promise<ChestScene> {
  const bin = new Bin();
  const { renderer, environment } = makeRenderer(canvas, bin);
  renderer.toneMappingExposure = 1.12;
  const coinLook = await mintCoin(bin, environment, "small");
  const scene = new Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.5;
  const camera = new PerspectiveCamera(30, 1, 0.1, 120);
  const ember = token(canvas, "--accent", "#ee945a");
  const warm = token(canvas, "--warning", "#e6b35b");

  /* --- lights ------------------------------------------------------------------------------ */
  const key = new DirectionalLight(warm.clone().lerp(new Color(0xffffff), 0.45), 2.6);
  key.position.set(-5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 30 });
  key.shadow.radius = 3;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  // A warm rim from behind picks out the silhouette against the dark well.
  const rim = new DirectionalLight(ember.clone().lerp(warm, 0.4), 2.4);
  rim.position.set(3.5, 4, -6);
  const fill = new DirectionalLight(token(canvas, "--focus", "#82b9ff"), 0.3);
  fill.position.set(6, 2, 4);
  scene.add(key, rim, fill);

  /* --- materials --------------------------------------------------------------------------- */
  const wood = woodMaps(bin);
  const metal = hammeredMaps(bin);
  const tones = [0xffffff, 0xe9d9c8, 0xf6e4d2, 0xd8c4b0, 0xfff1e0];
  const planks = tones.map((tone, i) =>
    bin.add(
      new MeshStandardMaterial({
        color: tone,
        map: wood.map,
        normalMap: wood.normalMap,
        normalScale: new Vector2(0.9, 0.9),
        roughnessMap: wood.roughnessMap,
        roughness: 0.85 + (i % 3) * 0.08,
        metalness: 0,
        vertexColors: true,
      }),
    ),
  );
  const darkWood = bin.add(
    new MeshStandardMaterial({
      color: 0x9a7e6a,
      map: wood.map,
      normalMap: wood.normalMap,
      roughnessMap: wood.roughnessMap,
      roughness: 0.95,
      vertexColors: true,
    }),
  );
  const iron = bin.add(
    new MeshStandardMaterial({
      color: 0x77706a,
      metalness: 0.92,
      roughness: 1,
      roughnessMap: metal.roughnessMap,
      normalMap: metal.normalMap,
      normalScale: new Vector2(0.8, 0.8),
      envMapIntensity: 1.5,
      vertexColors: true,
    }),
  );
  const brass = bin.add(
    new MeshStandardMaterial({
      color: 0xe0b45e,
      metalness: 1,
      roughness: 0.75,
      roughnessMap: metal.roughnessMap,
      normalMap: metal.normalMap,
      normalScale: new Vector2(0.5, 0.5),
      envMapIntensity: 2.2,
      vertexColors: true,
    }),
  );
  const shadowWood = bin.add(new MeshStandardMaterial({ color: 0x1c120b, roughness: 1 }));

  /* --- the chest ----------------------------------------------------------------------------- */
  const chest = new Group(); // moves (drop, shake); its origin is the floor under its centre
  const body = new Group();
  chest.add(body);
  const pick = seeded(3);
  const place = (parent: Object3D, mesh: Mesh, x: number, y: number, z: number, shadow = true) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    mesh.updateMatrix();
    return mesh;
  };
  /**
   * Baked ambient occlusion for wood, by where each vertex sits on the body: darker toward the
   * floor, in the corners and under the straps and the lid.
   */
  const bakeWood = (mesh: Mesh, inside = false) => {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const v = new Vector3();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrix);
      let ao = 0.7 + 0.3 * smooth(0.05, 0.45, v.y);
      ao *= 1 - 0.22 * smooth(CW / 2 - 0.35, CW / 2 - 0.05, Math.abs(v.x));
      ao *= 1 - 0.2 * smooth(0.2, 0.06, Math.abs(Math.abs(v.x) - STRAP_X));
      ao *= 1 - 0.15 * smooth(CH - 0.15, CH, v.y);
      if (inside) ao *= 0.55;
      colors.set([ao, ao, ao], i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
  };
  const rounded = (w: number, h: number, d: number, r: number) =>
    bin.add(new RoundedBoxGeometry(w, h, d, 2, r));
  const plank = (w: number, h: number, d: number) => {
    const geometry = rounded(w, h, d, 0.022);
    // Each plank its own slice of the grain.
    const uv = geometry.getAttribute("uv");
    const shift = pick();
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * (w / 2.4) + shift, uv.getY(i) * 0.9 + shift * 0.3);
    return new Mesh(geometry, planks[Math.floor(pick() * planks.length)]);
  };

  // Plinth and posts.
  bakeWood(place(body, new Mesh(rounded(CW + 0.1, 0.12, CD + 0.1, 0.04), darkWood), 0, 0.06, 0));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      bakeWood(
        place(
          body,
          new Mesh(rounded(POST, CH - 0.06, POST, 0.04), darkWood),
          sx * (CW / 2 - POST / 2),
          (CH + 0.06) / 2,
          sz * (CD / 2 - POST / 2),
        ),
      );
  // Three bevelled boards per wall, with gaps.
  const rows = 3;
  const rowH = (CH - 0.12) / rows;
  for (let r = 0; r < rows; r++) {
    const y = 0.12 + rowH * (r + 0.5);
    for (const sz of [-1, 1])
      bakeWood(
        place(
          body,
          plank(CW - 2 * POST + 0.04, rowH - 0.022, PLANK),
          0,
          y,
          sz * (CD / 2 - PLANK / 2 - 0.012),
        ),
      );
    for (const sx of [-1, 1]) {
      const side = plank(CD - 2 * POST + 0.04, rowH - 0.022, PLANK);
      side.rotation.y = Math.PI / 2;
      bakeWood(place(body, side, sx * (CW / 2 - PLANK / 2 - 0.012), y, 0));
    }
  }
  // The hold: a dark floor high up, so the hoard sits near the rim.
  place(
    body,
    new Mesh(rounded(CW - 0.3, 0.04, CD - 0.3, 0.01), shadowWood),
    0,
    CH * 0.74,
    0,
    false,
  );

  // Iron straps: bands round the top and foot, and two straps down the front and back.
  const strap = (w: number, h: number, d: number) =>
    new Mesh(edgeWear(rounded(w, h, d, 0.018)), iron);
  for (const y of [CH - 0.075, 0.2]) {
    for (const sz of [-1, 1])
      place(body, strap(CW + 0.03, 0.13, 0.05), 0, y, sz * (CD / 2 + 0.012));
    for (const sx of [-1, 1]) {
      const band = strap(CD + 0.03, 0.13, 0.05);
      band.rotation.y = Math.PI / 2;
      place(body, band, sx * (CW / 2 + 0.012), y, 0);
    }
  }
  for (const x of [-STRAP_X, STRAP_X])
    for (const sz of [-1, 1])
      place(body, strap(0.17, CH - 0.04, 0.05), x, CH / 2 + 0.01, sz * (CD / 2 + 0.026));

  // Ornate brass corners: a curled plate on both faces of every corner, top and bottom.
  const corner = new Shape();
  corner.moveTo(0, 0);
  corner.lineTo(0.44, 0);
  corner.quadraticCurveTo(0.46, 0.09, 0.36, 0.1);
  corner.quadraticCurveTo(0.25, 0.1, 0.2, 0.15);
  corner.quadraticCurveTo(0.15, 0.2, 0.15, 0.25);
  corner.quadraticCurveTo(0.14, 0.38, 0.1, 0.44);
  corner.quadraticCurveTo(0.05, 0.47, 0, 0.44);
  corner.closePath();
  const cornerGeometry = bin.add(
    edgeWear(
      new ExtrudeGeometry(corner, {
        depth: 0.02,
        bevelEnabled: true,
        bevelSize: 0.014,
        bevelThickness: 0.014,
        bevelSegments: 2,
        curveSegments: 10,
      }),
      0.75,
      1.6,
    ),
  );
  const basis = new Matrix4();
  const plate = (
    geometry: BufferGeometry,
    material: Material,
    xAxis: Vector3,
    yAxis: Vector3,
    zAxis: Vector3,
    at: Vector3,
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(basis.makeBasis(xAxis, yAxis, zAxis).setPosition(at));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    body.add(mesh);
    return mesh;
  };
  const X = new Vector3(1, 0, 0);
  const Y = new Vector3(0, 1, 0);
  const Z = new Vector3(0, 0, 1);
  const rivetSpots: Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const top of [false, true]) {
        const y = top ? CH - 0.005 : 0.125;
        const up = top ? Y.clone().negate() : Y.clone();
        plate(
          cornerGeometry,
          brass,
          X.clone().multiplyScalar(-sx),
          up,
          Z.clone().multiplyScalar(sz),
          new Vector3(sx * (CW / 2 + 0.01), y, sz * (CD / 2 + 0.045)),
        );
        plate(
          cornerGeometry,
          brass,
          Z.clone().multiplyScalar(-sz),
          up,
          X.clone().multiplyScalar(sx),
          new Vector3(sx * (CW / 2 + 0.045), y, sz * (CD / 2 + 0.01)),
        );
        const ry = top ? y - 0.09 : y + 0.09;
        rivetSpots.push(
          new Vector3(sx * (CW / 2 - 0.09), ry, sz * (CD / 2 + 0.085)),
          new Vector3(sx * (CW / 2 + 0.085), ry, sz * (CD / 2 - 0.09)),
        );
      }

  // The lock plate: a scrolled shield with a keyhole, on a dark backing so the hole reads.
  const lock = new Shape();
  lock.moveTo(-0.2, 0.2);
  lock.lineTo(0.2, 0.2);
  lock.quadraticCurveTo(0.33, 0.22, 0.3, 0.1);
  lock.quadraticCurveTo(0.2, 0.06, 0.22, -0.06);
  lock.quadraticCurveTo(0.22, -0.2, 0, -0.33);
  lock.quadraticCurveTo(-0.22, -0.2, -0.22, -0.06);
  lock.quadraticCurveTo(-0.2, 0.06, -0.3, 0.1);
  lock.quadraticCurveTo(-0.33, 0.22, -0.2, 0.2);
  const keyhole = new Path();
  keyhole.absarc(0, 0, 0.045, -Math.PI / 3, (Math.PI * 4) / 3, false);
  keyhole.lineTo(-0.032, -0.14);
  keyhole.lineTo(0.032, -0.14);
  keyhole.closePath();
  lock.holes.push(keyhole);
  const lockGeometry = bin.add(
    edgeWear(
      new ExtrudeGeometry(lock, {
        depth: 0.03,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        bevelSegments: 3,
        curveSegments: 14,
      }),
      0.8,
      1.6,
    ),
  );
  plate(lockGeometry, brass, X, Y, Z, new Vector3(0, CH - 0.27, CD / 2 + 0.05));
  place(
    body,
    new Mesh(rounded(0.12, 0.2, 0.02, 0.005), shadowWood),
    0,
    CH - 0.31,
    CD / 2 + 0.055,
    false,
  );
  rivetSpots.push(
    new Vector3(-0.2, CH - 0.12, CD / 2 + 0.1),
    new Vector3(0.2, CH - 0.12, CD / 2 + 0.1),
    new Vector3(0, CH - 0.52, CD / 2 + 0.1),
  );
  // Rivets down the straps and along the bands.
  for (const x of [-STRAP_X, STRAP_X])
    for (const sz of [-1, 1])
      for (let k = 0; k < 3; k++)
        rivetSpots.push(new Vector3(x, 0.38 + k * 0.17, sz * (CD / 2 + 0.06)));
  for (const y of [CH - 0.075, 0.2])
    for (const sz of [-1, 1])
      for (const x of [-0.95, -0.32, 0.32, 0.95])
        rivetSpots.push(new Vector3(x, y, sz * (CD / 2 + 0.045)));

  // The lid: curved staves round the back hinge, bevelled with gaps, end caps and straps.
  const hinge = new Group();
  hinge.position.set(0, CH, -CD / 2);
  chest.add(hinge);
  const lid = new Group();
  lid.position.set(0, 0, CD / 2);
  hinge.add(lid);
  const staves = 6;
  const arcSector = (
    r0: number,
    r1: number,
    a0: number,
    a1: number,
    depth: number,
    bevel: number,
  ) => {
    const shape = new Shape();
    shape.absarc(0, 0, r1, a0, a1, false);
    shape.absarc(0, 0, r0, a1, a0, true);
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 18,
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.rotateY(Math.PI / 2);
    return bin.add(geometry);
  };
  for (let i = 0; i < staves; i++) {
    const a0 = (i / staves) * Math.PI + 0.008;
    const a1 = ((i + 1) / staves) * Math.PI - 0.008;
    const geometry = arcSector(LID_R - PLANK + 0.02, LID_R + 0.02, a0, a1, CW - 0.12, 0.016);
    // Grain along the stave.
    const uv = geometry.getAttribute("uv");
    const pos = geometry.getAttribute("position");
    const shift = pick();
    for (let v = 0; v < uv.count; v++)
      uv.setXY(
        v,
        pos.getX(v) * 0.42 + shift,
        ((Math.atan2(pos.getY(v), pos.getZ(v)) - a0) / (a1 - a0)) * 0.3 + shift,
      );
    const stave = place(
      lid,
      new Mesh(geometry, planks[Math.floor(pick() * planks.length)]),
      0,
      0,
      0,
    );
    bakeWood(stave);
  }
  for (const sx of [-1, 1]) {
    const end = new Shape();
    end.absarc(0, 0, LID_R + 0.01, 0, Math.PI, false);
    end.lineTo(LID_R + 0.01, 0);
    const geometry = bin.add(
      new ExtrudeGeometry(end, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.015,
        bevelSegments: 2,
        curveSegments: 24,
      }),
    );
    geometry.translate(0, 0, -0.035);
    geometry.rotateY(Math.PI / 2);
    bakeWood(place(lid, new Mesh(geometry, darkWood), sx * (CW / 2 - 0.06), 0, 0));
    // Brass trim round each end.
    place(
      lid,
      new Mesh(
        edgeWear(arcSector(LID_R - 0.03, LID_R + 0.05, 0, Math.PI, 0.05, 0.012), 0.75, 1.6),
        brass,
      ),
      sx * (CW / 2 - 0.02),
      0,
      0,
    );
  }
  const lidRivets: Vector3[] = [];
  for (const x of [-STRAP_X, STRAP_X]) {
    place(
      lid,
      new Mesh(edgeWear(arcSector(LID_R + 0.01, LID_R + 0.075, 0, Math.PI, 0.17, 0.018)), iron),
      x,
      0,
      0,
    );
    for (let k = 1; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      lidRivets.push(new Vector3(x, Math.sin(a) * (LID_R + 0.085), Math.cos(a) * (LID_R + 0.085)));
    }
  }
  place(
    lid,
    new Mesh(edgeWear(rounded(CW + 0.04, 0.1, 0.07, 0.02), 0.75, 1.6), brass),
    0,
    0.05,
    LID_R + 0.01,
  );
  place(
    lid,
    new Mesh(edgeWear(rounded(CW + 0.04, 0.1, 0.07, 0.02), 0.75, 1.6), brass),
    0,
    0.05,
    -LID_R - 0.01,
  );
  // The hasp hangs from the lid over the lock plate.
  place(
    lid,
    new Mesh(edgeWear(rounded(0.16, 0.26, 0.05, 0.02), 0.75, 1.6), brass),
    0,
    -0.07,
    LID_R + 0.06,
  );
  lidRivets.push(new Vector3(0, 0.0, LID_R + 0.09));

  const rivetGeometry = bin.add(new SphereGeometry(0.042, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  edgeWear(rivetGeometry, 1, 1);
  const rivets = (parent: Object3D, spots: Vector3[], outward: (spot: Vector3) => Vector3) => {
    const mesh = new InstancedMesh(rivetGeometry, brass, spots.length);
    const m = new Matrix4();
    spots.forEach((spot, i) => {
      m.compose(spot, new Quaternion().setFromUnitVectors(Y, outward(spot)), new Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const bodyRivets = rivets(body, rivetSpots, (s) =>
    Math.abs(s.x) > CW / 2 + 0.05
      ? new Vector3(Math.sign(s.x), 0, 0)
      : new Vector3(0, 0, Math.sign(s.z)),
  );
  const topRivets = rivets(lid, lidRivets, (s) => new Vector3(0, s.y, s.z).normalize());

  // The hoard: silver and gold coins heaped up, and a few gems.
  const goldMaterials = coinLook.materials.map((m) => {
    const copy = bin.add((m as MeshStandardMaterial).clone());
    copy.color.set(0xffc35a);
    return copy;
  });
  const rand = seeded(11);
  const heap = (count: number, materials: Material[]) => {
    const mesh = new InstancedMesh(coinLook.geometry, materials, count);
    const m = new Matrix4();
    const q = new Quaternion();
    const axis = new Vector3();
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * (CW - 0.5);
      const z = (rand() - 0.5) * (CD - 0.5);
      const mound = 1 - Math.min(1, Math.hypot(x / (CW / 2 - 0.2), z / (CD / 2 - 0.2)));
      axis.set(rand() - 0.5, 0, rand() - 0.5).normalize();
      q.setFromAxisAngle(axis, (rand() - 0.5) * 1.1);
      m.compose(
        new Vector3(x, CH * 0.77 + mound * 0.32 + rand() * 0.04, z),
        q,
        new Vector3(0.15, 0.15, 0.15),
      );
      mesh.setMatrixAt(i, m);
    }
    body.add(mesh);
    return mesh;
  };
  const hoard = [heap(46, coinLook.materials), heap(34, goldMaterials)];
  const gemGeometry = bin.add(new IcosahedronGeometry(0.1, 0));
  const gems = [0xe0314f, 0x2fbf71, 0x3f7fff, 0xb455ff, 0xe0314f].map((hue, i) => {
    const material = bin.add(
      new MeshStandardMaterial({
        color: hue,
        emissive: hue,
        emissiveIntensity: 0.25,
        roughness: 0.06,
        metalness: 0.2,
        flatShading: true,
        envMapIntensity: 2.6,
      }),
    );
    const gem = new Mesh(gemGeometry, material);
    const a = (i / 5) * Math.PI * 2 + 0.4;
    gem.position.set(Math.cos(a) * 0.45, CH * 0.77 + 0.26, Math.sin(a) * 0.22);
    gem.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    gem.scale.setScalar(0.8 + rand() * 0.5);
    body.add(gem);
    return gem;
  });

  /* --- light and effects ------------------------------------------------------------------- */
  const glowMap = glowTexture(bin);
  const inner = new PointLight(warm.clone().lerp(ember, 0.35), 0, 7, 1.5);
  inner.position.set(0, CH + 0.2, 0.05);
  body.add(inner);
  // Light leaking through the seam under the lid, before it opens.
  const leakMaterial = bin.add(
    new MeshBasicMaterial({
      color: warm.clone().lerp(new Color(0xffffff), 0.3),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  for (const sz of [-1, 1])
    place(
      body,
      new Mesh(rounded(CW - 0.1, 0.035, 0.02, 0.005), leakMaterial),
      0,
      CH + 0.002,
      sz * (CD / 2 + 0.002),
      false,
    );
  for (const sx of [-1, 1]) {
    const seam = place(
      body,
      new Mesh(rounded(CD - 0.1, 0.035, 0.02, 0.005), leakMaterial),
      sx * (CW / 2 + 0.002),
      CH + 0.002,
      0,
      false,
    );
    seam.rotation.y = Math.PI / 2;
  }
  const additive = (map: Texture, color: Color) =>
    bin.add(
      new SpriteMaterial({
        map,
        color,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
  const halo = new Sprite(additive(glowMap, warm.clone().lerp(ember, 0.5)));
  const flash = new Sprite(additive(glowMap, new Color(0xfff2d6)));
  const leakGlow = new Sprite(additive(glowMap, ember));
  const rays = new Group();
  const shaft = shaftTexture(bin);
  const rayMaterial = bin.add(
    new MeshBasicMaterial({
      map: shaft,
      color: warm.clone().lerp(new Color(0xffffff), 0.25),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const rayGeometry = bin.add(new PlaneGeometry(0.55, 3.2));
  rayGeometry.translate(0, 1.6, 0);
  [-0.55, -0.28, -0.05, 0.16, 0.4, 0.62].forEach((angle, i) => {
    const ray = new Mesh(rayGeometry, rayMaterial);
    ray.rotation.z = angle;
    ray.scale.set(0.7 + (i % 3) * 0.35, 0.8 + ((i * 7) % 4) * 0.12, 1);
    ray.position.x = angle * 0.6;
    rays.add(ray);
  });
  const fx = new Group(); // follows the chest's mouth
  fx.add(halo, flash, leakGlow, rays);
  scene.add(fx);

  const dust = new Particles(60, glowMap, false, bin);
  const sparks = new Particles(180, starTexture(bin), true, bin);
  scene.add(dust.points, sparks.points);

  // The floor: shadows and a soft contact shadow.
  const floor = new Mesh(
    bin.add(new PlaneGeometry(30, 30)),
    bin.add(new ShadowMaterial({ opacity: 0.5, depthWrite: false })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const blob = new Mesh(
    bin.add(new PlaneGeometry(CW * 1.7, CD * 2)),
    bin.add(
      new MeshBasicMaterial({
        map: blobTexture(bin),
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      }),
    ),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.003;
  scene.add(floor, blob);
  chest.rotation.y = -0.38;
  scene.add(chest);

  // The coins that fly: the fountain (some fall back in) and each card's share.
  const flyCap = 170;
  const flying = new InstancedMesh(coinLook.geometry, coinLook.materials, flyCap);
  flying.instanceMatrix.setUsage(DynamicDrawUsage);
  flying.count = 0;
  flying.frustumCulled = false;
  scene.add(flying);

  /* --- framing ----------------------------------------------------------------------------- */
  // Fit the camera to the chest with its lid open and the fountain above it, inside the band:
  // every corner of that box must sit inside the frame from the final camera angle.
  const fit = new Sphere();
  const corners: Vector3[] = [];
  {
    hinge.rotation.x = -LID_OPEN;
    chest.updateMatrixWorld(true);
    const box = new Box3().expandByObject(body).expandByObject(hinge);
    hinge.rotation.x = 0;
    chest.updateMatrixWorld(true);
    box.max.y = Math.max(box.max.y, CH + FOUNTAIN);
    box.getBoundingSphere(fit);
    fit.center.copy(box.getCenter(new Vector3()));
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z).sub(fit.center));
  }
  const END = { elevation: 0.3, azimuth: 0.1 };
  let size = { width, height };
  let frame = band;
  let distance = 10;
  const layout = () => {
    renderer.setSize(size.width, size.height, false);
    const aspect = frame.width / Math.max(1, frame.height);
    camera.aspect = aspect;
    // The band is the camera's frame; the rest of the canvas extends it, so nothing clips there.
    camera.setViewOffset(
      frame.width,
      frame.height,
      -frame.left,
      -frame.top,
      size.width,
      size.height,
    );
    const vfov = MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const back = new Vector3(
      Math.sin(END.azimuth) * Math.cos(END.elevation),
      Math.sin(END.elevation),
      Math.cos(END.azimuth) * Math.cos(END.elevation),
    );
    const right = new Vector3(0, 1, 0).cross(back).normalize();
    const up = back.clone().cross(right);
    distance = 0;
    for (const c of corners) {
      const z = c.dot(back);
      distance = Math.max(
        distance,
        z + Math.abs(c.dot(right)) / Math.tan(hfov / 2),
        z + Math.abs(c.dot(up)) / Math.tan(vfov / 2),
      );
    }
    distance *= 1.06;
    const buffer = new Vector2();
    renderer.getDrawingBufferSize(buffer);
    dust.setViewport(buffer.y);
    sparks.setViewport(buffer.y);
  };
  /** Pixels per world unit `depth` in front of the camera. */
  const unitAt = (depth: number) =>
    frame.height / (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2));
  const shake = new Vector3();
  const look = new Vector3();
  const posCamera = (k: number) => {
    const e = easeInOut(k);
    const elevation = lerp(0.05, END.elevation, e);
    const azimuth = lerp(0.42, END.azimuth, e);
    const dist = distance * lerp(1.4, 1, e);
    look.copy(fit.center);
    look.y += lerp(-0.35, 0, e) * fit.radius;
    camera.position.set(
      look.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
      look.y + Math.sin(elevation) * dist,
      look.z + Math.cos(azimuth) * Math.cos(elevation) * dist,
    );
    camera.position.add(shake);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };
  layout();
  const render = () => renderer.render(scene, camera);

  /* --- the reveal ---------------------------------------------------------------------------- */
  let stop = () => {};
  let finish: (() => void) | null = null;
  let targets: () => ChestTarget[] = () => [];
  let spots: ChestTarget[] = [];
  const mouth = new Vector3();
  const tmp = new Vector3();
  const dir = new Vector3();
  const m = new Matrix4();
  const q = new Quaternion();
  const sc = new Vector3();

  const restPose = () => {
    chest.position.set(0, 0, 0);
    chest.scale.set(1, 1, 1);
    body.rotation.set(0, 0, 0);
    hinge.rotation.x = -LID_OPEN;
    inner.intensity = 4.5;
    (halo.material as SpriteMaterial).opacity = 0.4;
    (flash.material as SpriteMaterial).opacity = 0;
    (leakGlow.material as SpriteMaterial).opacity = 0;
    rayMaterial.opacity = 0.32;
    leakMaterial.opacity = 0;
    flying.count = 0;
    dust.clear();
    sparks.clear();
    shake.set(0, 0, 0);
    posCamera(1);
    placeFx(1);
  };
  const placeFx = (open: number) => {
    mouth.set(0, CH + 0.1, 0);
    chest.updateMatrixWorld(true);
    chest.localToWorld(mouth);
    fx.position.copy(mouth);
    halo.scale.setScalar(3.4 * (0.75 + 0.25 * open));
    leakGlow.scale.setScalar(3.2);
    // The shafts turn to face the camera around the vertical.
    rays.rotation.y = Math.atan2(camera.position.x - mouth.x, camera.position.z - mouth.z);
  };

  return {
    resize(w, h, b) {
      size = { width: w, height: h };
      frame = b;
      layout();
      spots = targets();
      // Resizing clears the canvas: draw at once (the next frame moves on from here).
      if (!finish) {
        posCamera(1);
        placeFx(1);
      }
      render();
    },
    skip() {
      finish?.();
    },
    play({ cards, perCard, targets: read, onOpen, onCoin, onSlam, onDone }) {
      targets = read;
      spots = read();
      type Coin = {
        card: number; // -1 falls back into the chest
        first: boolean;
        launch: number;
        v: Vector3;
        handoff: number;
        rain: number;
        from: Vector3;
        axis: Vector3;
        spin: number;
        arrived: boolean;
      };
      const coins: Coin[] = [];
      const shareCount = Math.min(cards * perCard, flyCap - 40);
      const r = seeded(17);
      const g = -9; // units per second²
      for (let k = 0; k < shareCount + 40; k++) {
        const share = k < shareCount;
        const card = share ? k % cards : -1;
        const launch = chestCue.burst + 40 + r() * 420;
        const vy = 4.7 + r() * 1.1;
        const v = new Vector3((r() - 0.5) * 2.2, vy, (r() - 0.5) * 1.6 + 0.35);
        const apex = (vy / -g) * 1000;
        coins.push({
          card,
          first: share && k < cards,
          launch,
          v,
          handoff: launch + apex * (0.85 + r() * 0.2) + (share ? Math.floor(k / cards) * 35 : 0),
          rain: 620 + r() * 260,
          from: new Vector3(),
          axis: new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
          spin: 6 + r() * 10,
          arrived: false,
        });
      }
      const lastArrival = coins.reduce(
        (t, c) => (c.card >= 0 ? Math.max(t, c.handoff + c.rain) : t),
        0,
      );
      const slamAt = lastArrival + 140;
      const end = slamAt + 1500;
      let opened = false;
      let slammed = false;
      let lastScene = 0;
      const began = performance.now();
      const ballistic = (c: Coin, ms: number, out: Vector3) => {
        const s = ms / 1000;
        return out
          .copy(mouth)
          .addScaledVector(c.v, s)
          .setY(mouth.y + c.v.y * s + 0.5 * g * s * s);
      };
      const tick = (now: number) => {
        const t = sceneTime(now - began);
        const dt = Math.max(0, t - lastScene);
        lastScene = t;
        // Drop and thud.
        const fall = t < chestCue.thud ? 1 - Math.pow(t / chestCue.thud, 2) : 0;
        const squashT = (t - chestCue.thud) / 260;
        const squash =
          squashT > 0 && squashT < 1 ? Math.sin(squashT * Math.PI) * 0.09 * (1 - squashT) : 0;
        chest.position.y = fall * 4.5;
        chest.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
        if (t >= chestCue.thud && t - dt < chestCue.thud) {
          const base = new Vector3();
          chest.getWorldPosition(base);
          dust.spawn(56, (p, v) => {
            const a = r() * Math.PI * 2;
            const radius = 1.1 + r() * 0.5;
            p.set(
              base.x + Math.cos(a) * radius,
              0.08 + r() * 0.1,
              base.z + Math.sin(a) * radius * 0.75,
            );
            v.set(
              Math.cos(a) * (1.6 + r() * 2.2),
              0.4 + r() * 1.1,
              Math.sin(a) * (1.4 + r() * 1.6),
            );
            return {
              life: 700 + r() * 600,
              size: 0.5 + r() * 0.6,
              color: new Color(0x8a7563).multiplyScalar(0.9 + r() * 0.3),
            };
          });
        }
        // Rattles in rising beats, light leaking at the seams.
        let rattle = 0;
        chestCue.beats.forEach((beat, i) => {
          const u = (t - beat) / 150;
          if (u > 0 && u < 1) rattle += Math.sin(u * Math.PI * 3) * (1 - u) * (0.35 + i * 0.13);
        });
        body.rotation.z = rattle * 0.035;
        body.rotation.x = rattle * 0.012;
        const lidHop = Math.max(0, rattle) * 0.09;
        const leak =
          t < chestCue.burst
            ? smooth(chestCue.beats[0] - 100, chestCue.burst, t) * (0.45 + Math.abs(rattle) * 0.8)
            : Math.max(0, 1 - (t - chestCue.burst) / 200);
        leakMaterial.opacity = clamp01(leak);
        (leakGlow.material as SpriteMaterial).opacity = clamp01(leak) * 0.5;
        // The burst: the lid flies open past its stop and rocks back.
        const o = t - chestCue.burst;
        let lidAngle = lidHop;
        if (o > 0) {
          const spring = 1 - Math.exp(-o / 140) * Math.cos(o / 95);
          lidAngle =
            lerp(lidHop, LID_OPEN, spring) +
            (o < 160 ? MathUtils.degToRad(24) * Math.sin((o / 160) * Math.PI) : 0);
          if (!opened) {
            opened = true;
            onOpen();
          }
        }
        hinge.rotation.x = -lidAngle;
        const light = o > 0 ? easeOut(o / 260) : 0;
        const settle = smooth(slamAt, end, t);
        inner.intensity = light * (11 - settle * 6.5) + leak * 3;
        (halo.material as SpriteMaterial).opacity = light * (0.8 - settle * 0.4);
        const flashT = o / 380;
        (flash.material as SpriteMaterial).opacity =
          flashT > 0 && flashT < 1 ? Math.pow(1 - flashT, 2) : 0;
        flash.scale.setScalar(2 + easeOut(clamp01(flashT)) * 6);
        rayMaterial.opacity = light * (0.75 - settle * 0.43) * (0.85 + 0.15 * Math.sin(t / 90));
        rays.scale.set(1, 0.4 + easeOut(clamp01(o / 500)) * 0.6, 1);
        if (o > 0 && o - dt <= 0)
          sparks.spawn(110, (p, v) => {
            p.copy(mouth).add(tmp.set((r() - 0.5) * 1.8, r() * 0.3, (r() - 0.5) * 1.1));
            v.set((r() - 0.5) * 2.4, 1.2 + r() * 3.4, (r() - 0.5) * 1.6);
            return {
              life: 1200 + r() * 1600,
              size: 0.12 + r() * 0.22,
              color: warm.clone().lerp(new Color(0xffffff), r() * 0.7),
            };
          });
        if (o > 300 && t < slamAt && Math.floor(t / 70) !== Math.floor((t - dt) / 70))
          sparks.spawn(3, (p, v) => {
            p.copy(mouth).add(tmp.set((r() - 0.5) * 1.6, 0, (r() - 0.5) * 0.9));
            v.set((r() - 0.5) * 0.6, 0.6 + r() * 1.2, (r() - 0.5) * 0.4);
            return {
              life: 1400 + r() * 900,
              size: 0.08 + r() * 0.12,
              color: warm.clone().lerp(new Color(0xffffff), 0.5),
            };
          });
        // Camera: a slow dolly in, shaken by the thud, the beats and the burst.
        const kick = (at: number, len: number, amp: number) => {
          const u = (t - at) / len;
          return u > 0 && u < 1 ? amp * (1 - u) * (1 - u) : 0;
        };
        const quake =
          kick(chestCue.thud, 320, 0.07) +
          chestCue.beats.reduce((a, beat, i) => a + kick(beat, 140, 0.008 + i * 0.004), 0) +
          kick(chestCue.burst, 380, 0.05);
        shake
          .set(
            Math.sin(t * 0.091) * quake,
            Math.sin(t * 0.137 + 1) * quake,
            Math.sin(t * 0.073 + 2) * quake * 0.5,
          )
          .multiplyScalar(fit.radius);
        posCamera(clamp01(t / 2600));
        placeFx(light);
        dust.step(dt, -0.8, 0.12, (u) => 0.55 * Math.pow(1 - u, 1.5));
        sparks.step(
          dt,
          -0.35,
          0.5,
          (u, i) => Math.pow(1 - u, 1.2) * (0.6 + 0.4 * Math.sin(t / 45 + i * 1.7)),
        );
        // Coins: up out of the chest, then down in arcs to the cards.
        const depth = camera.position.distanceTo(fit.center) * 0.62;
        const perPixel = 1 / unitAt(depth);
        let n = 0;
        for (const c of coins) {
          if (t < c.launch) continue;
          let scale = 0.13;
          if (c.card < 0 || t < c.handoff) {
            const s = t - c.launch;
            ballistic(c, s, tmp);
            if (c.card < 0 && tmp.y < mouth.y - 0.25 && s > 300) continue; // fell back in
            q.setFromAxisAngle(c.axis, (s / 1000) * c.spin);
            c.from.copy(tmp);
          } else {
            const u = (t - c.handoff) / c.rain;
            if (u >= 1) {
              if (!c.arrived) {
                c.arrived = true;
                onCoin(c.card, c.first);
              }
              continue;
            }
            const spot = spots[c.card] ?? { x: size.width / 2, y: size.height };
            tmp
              .set((spot.x / size.width) * 2 - 1, 1 - (spot.y / size.height) * 2, 0.5)
              .unproject(camera);
            dir.subVectors(tmp, camera.position).normalize();
            const target = tmp.copy(camera.position).addScaledVector(dir, depth);
            const k = easeInOut(u) * 0.35 + u * 0.65;
            const lift = Math.sin(Math.PI * u) * 0.9;
            const a = c.from;
            tmp.set(lerp(a.x, target.x, k), lerp(a.y, target.y, k) + lift, lerp(a.z, target.z, k));
            q.setFromAxisAngle(c.axis, ((c.handoff - c.launch) / 1000) * c.spin + u * 9);
            // Shrink to the size of the card's silver icon, then vanish into it.
            const end = 11 * perPixel;
            scale = lerp(0.13, end, easeInOut(u)) * (u > 0.88 ? (1 - u) / 0.12 : 1);
          }
          m.compose(tmp, q, sc.setScalar(scale));
          if (n < flyCap) flying.setMatrixAt(n++, m);
        }
        flying.count = n;
        flying.instanceMatrix.needsUpdate = true;
        if (!slammed && t >= slamAt) {
          slammed = true;
          onSlam();
        }
        render();
        if (t < end || sparks.live > 0 || dust.live > 0) return t < end + 2500;
        return false;
      };
      const done = () => {
        finish = null;
        restPose();
        render();
        onDone();
      };
      finish = () => {
        stop();
        coins.forEach((c) => {
          if (c.card >= 0 && !c.arrived) {
            c.arrived = true;
            onCoin(c.card, c.first);
          }
        });
        if (!opened) onOpen();
        if (!slammed) onSlam();
        done();
      };
      tick(began);
      stop = animate((now) => {
        if (tick(now)) return true;
        done();
        return false;
      });
    },
    dispose() {
      stop();
      finish = null;
      hoard.forEach((h) => h.dispose());
      bodyRivets.dispose();
      topRivets.dispose();
      flying.dispose();
      gems.length = 0;
      bin.dispose();
    },
  };
}
