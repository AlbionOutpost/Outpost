import { describe, expect, it, vi } from "vitest";
import { loadScene, stageMode, type SceneModule } from "@/components/economy-scene-loader";

describe("Treasury 3D stage choice", () => {
  it("shows the result at once under reduced motion, with or without WebGL", () => {
    expect(stageMode({ reducedMotion: true, webgl: true })).toBe("instant");
    expect(stageMode({ reducedMotion: true, webgl: false })).toBe("instant");
  });

  it("falls back to the CSS coin and chest without WebGL", () => {
    expect(stageMode({ reducedMotion: false, webgl: false })).toBe("css");
  });

  it("plays the WebGL models when motion is allowed and WebGL works", () => {
    expect(stageMode({ reducedMotion: false, webgl: true })).toBe("webgl");
  });

  it("never fetches three.js for the fallback or the instant result", () => {
    const load = vi.fn(() => Promise.reject(new Error("should not load")));
    expect(loadScene(stageMode({ reducedMotion: false, webgl: false }), load)).toBeNull();
    expect(loadScene(stageMode({ reducedMotion: true, webgl: true }), load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("fetches the scene once a WebGL flip or reveal plays", async () => {
    const scene = {} as SceneModule;
    const load = vi.fn(() => Promise.resolve(scene));
    await expect(loadScene("webgl", load)).resolves.toBe(scene);
    expect(load).toHaveBeenCalledOnce();
  });
});
