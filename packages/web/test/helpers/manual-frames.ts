/**
 * A manual frame clock in place of requestAnimationFrame: each `step()` runs
 * the waiting callbacks 16ms after the last, so a test sees every frame of an
 * animation however busy the machine is. Call `restore()` when done.
 */
export function manualFrames() {
  const realRequest = window.requestAnimationFrame;
  const realCancel = window.cancelAnimationFrame;
  let queue = new Map<number, FrameRequestCallback>();
  let id = 0;
  let now = performance.now();
  window.requestAnimationFrame = (callback) => {
    queue.set(++id, callback);
    return id;
  };
  window.cancelAnimationFrame = (handle) => void queue.delete(handle);
  return {
    /** Runs one frame, 16ms after the last. */
    step(count = 1) {
      for (let i = 0; i < count; i++) {
        now += 16;
        const due = queue;
        queue = new Map();
        for (const callback of due.values()) callback(now);
      }
    },
    restore() {
      window.requestAnimationFrame = realRequest;
      window.cancelAnimationFrame = realCancel;
    },
  };
}
