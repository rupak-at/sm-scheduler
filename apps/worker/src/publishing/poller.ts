export function startPoller(task: () => Promise<void>, period: number, onError: () => void) {
  let running = false,
    stopping = false;
  let active: Promise<void> = Promise.resolve();
  function tick() {
    if (running || stopping) return;
    running = true;
    active = task()
      .catch(onError)
      .finally(() => {
        running = false;
      });
  }
  const timer = setInterval(tick, period);
  tick();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await active;
  };
}
