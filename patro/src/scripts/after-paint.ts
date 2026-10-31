// Runs `then` once the page has painted for the first time, so what it fetches never competes
// with the first paint. A page that doesn't paint (a tab opened in the background) or a browser
// that can't report paints runs it two seconds after load instead.
export function afterFirstPaint(then: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    then();
  };
  const fallback = () => setTimeout(run, 2000);
  if (document.readyState === "complete") fallback();
  else addEventListener("load", fallback, { once: true });
  try {
    new PerformanceObserver((list, observer) => {
      if (!list.getEntriesByName("first-contentful-paint").length) return;
      observer.disconnect();
      setTimeout(run);
    }).observe({ type: "paint", buffered: true });
  } catch {
    // The load fallback runs it.
  }
}
