export function getLessonVideoPlaybackProps() {
  return {
    controls: false,
    loop: true,
    autoPlay: true,
    muted: true,
    playsInline: true,
    preload: "metadata",
  };
}
