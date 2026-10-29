// The header's theme button (ThemeToggle.astro). It stores the choice under Starlight's key, so the
// landing page and the docs open in the same theme.
for (const button of document.querySelectorAll<HTMLButtonElement>(".theme-toggle")) {
  button.addEventListener("click", toggle);
}

function toggle() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("starlight-theme", next);
  } catch {
    // Storage blocked (private window): the choice lasts for this page only.
  }
}
