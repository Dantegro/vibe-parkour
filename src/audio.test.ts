import { afterEach, describe, expect, it } from "vitest";
import {
  disposeBackgroundMusic,
  getMusicVolume,
  setMusicVolume,
} from "./audio.js";

describe("music volume", () => {
  afterEach(() => {
    disposeBackgroundMusic();
    setMusicVolume(0.28);
  });

  it("clamps volume to 0–1", () => {
    setMusicVolume(2);
    expect(getMusicVolume()).toBe(1);

    setMusicVolume(-0.5);
    expect(getMusicVolume()).toBe(0);
  });

  it("stores the requested volume within range", () => {
    setMusicVolume(0.42);
    expect(getMusicVolume()).toBe(0.42);
  });
});
