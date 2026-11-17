// A small Dashain surprise on the landing page: type "changa" (चङ्गा, a kite) anywhere outside a
// form field and a few kites rise across the page, the way the autumn sky fills over Kathmandu.
// The browser console says how to find it. Nothing loads or runs until the word is typed.

const WORD = "changa";
const COLORS = ["var(--nd-sindoor)", "var(--nd-marigold)", "var(--nd-slate)", "var(--nd-ink)"];

function kite(color: string): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 60 260");
  svg.setAttribute("width", "60");
  svg.setAttribute("height", "260");
  svg.innerHTML = `
    <path d="M30 2 L56 34 L30 70 L4 34 Z" fill="${color}" />
    <path d="M30 2 L30 70 M4 34 L56 34" stroke="var(--nd-surface)" stroke-width="1.5" opacity=".7" fill="none" />
    <path d="M30 70 l-7 11 h14 Z" fill="${color}" />
    <path d="M30 81 C 22 130, 44 170, 26 258" stroke="var(--nd-ink-muted)" stroke-width="1" fill="none" opacity=".6" />`;
  return svg;
}

function toast(text: string) {
  const note = document.createElement("p");
  note.className = "changa-toast";
  note.setAttribute("role", "status");
  note.lang = "ne";
  note.textContent = text;
  document.body.append(note);
  setTimeout(() => note.remove(), 4200);
}

function fly() {
  if (document.querySelector(".changa-sky")) return;
  const sky = document.createElement("div");
  sky.className = "changa-sky";
  sky.setAttribute("aria-hidden", "true");
  document.body.append(sky);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = still ? 1 : 6;
  const runs: Promise<unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const k = kite(COLORS[i % COLORS.length] as string);
    k.style.left = still ? "auto" : `${4 + i * 16}vw`;
    if (still) k.style.right = "2rem";
    sky.append(k);
    const sway = (i % 2 ? 1 : -1) * (4 + (i % 3) * 3);
    const frames = still
      ? [{ opacity: 0, transform: "translateY(20vh)" }, { opacity: 1, transform: "translateY(20vh)" }, { opacity: 0, transform: "translateY(20vh)" }]
      : [
          { transform: "translate(0, 110vh) rotate(0deg)" },
          { transform: `translate(${sway}vw, 55vh) rotate(${sway}deg)`, offset: 0.45 },
          { transform: `translate(${-sway}vw, 20vh) rotate(${-sway}deg)`, offset: 0.75 },
          { transform: `translate(${sway / 2}vw, -45vh) rotate(${sway / 2}deg)` },
        ];
    runs.push(
      k.animate(frames, { duration: still ? 3500 : 7000 + i * 600, delay: still ? 0 : i * 350, easing: "ease-in-out", fill: "forwards" })
        .finished,
    );
  }
  toast("चङ्गा चेट! Happy kite season.");
  Promise.allSettled(runs).then(() => sky.remove());
}

export function changa() {
  let typed = "";
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (target instanceof Element && target.closest("input, textarea, select, [contenteditable], nepdate-input")) return;
    typed = (typed + event.key.toLowerCase()).slice(-WORD.length);
    if (typed === WORD) {
      typed = "";
      fly();
    }
  });
  console.log(
    "%cनमस्ते!%c\nThis page converts dates with nepdate-core, right in your browser.\nThe source is at https://github.com/sanamhub/nepdate\nPsst: type “changa” anywhere on this page.",
    "font: 700 20px/1.4 system-ui; color: #c12b2b",
    "font: 13px/1.5 system-ui",
  );
}
