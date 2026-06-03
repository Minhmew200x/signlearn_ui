import test from "node:test";
import assert from "node:assert/strict";

import { getLessonVideoPlaybackProps } from "../src/app/lib/videoPlayback.js";

test("lesson video playback props loop and hide native controls", () => {
  const props = getLessonVideoPlaybackProps("https://cdn.example.com/lesson.mp4");

  assert.deepEqual(props, {
    controls: false,
    loop: true,
    autoPlay: true,
    muted: true,
    playsInline: true,
    preload: "metadata",
  });
});
