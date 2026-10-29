// Marks today in Nepal on a month grid, from each cell's AD date. Nepal's date comes from Intl, so
// the visitor's own time zone never matters, and no calendar code is downloaded for it.
const nepalToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());

const cell = document.querySelector<HTMLElement>(`[data-ad="${nepalToday}"]`);
if (cell) {
  cell.classList.add("today");
  cell.setAttribute("aria-current", "date");
}

// The home page shows the month it was built in. If Nepal has moved on to another month since,
// open that month's page instead.
const starts = document.querySelector<HTMLElement>("[data-month-starts]");
if (starts && !cell) {
  const months: [string, string][] = JSON.parse(starts.dataset.monthStarts ?? "[]");
  const current = months.filter(([firstAd]) => firstAd <= nepalToday).at(-1);
  if (current) location.replace(current[1]);
}
