// The header's theme button. It stores the choice under Starlight's key, so the docs open in the
// same theme.
const button = document.querySelector<HTMLButtonElement>(".theme-toggle");

button?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("starlight-theme", next);
  } catch {
    // Storage blocked (private window): the choice lasts for this page only.
  }
});
