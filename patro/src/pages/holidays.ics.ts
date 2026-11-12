// Every public holiday the data covers, as one calendar to subscribe to (webcal://). The apps link
// here; a calendar app fetches it again weekly, so new data years arrive without a new link.
import type { APIRoute } from "astro";
import { holidayCalendar } from "../lib/ics";
import { FIRST_YEAR, LAST_YEAR, yearHasPatro, yearHolidays } from "../lib/patro";

export const GET: APIRoute = () => {
  const days = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    if (yearHasPatro(year)) days.push(...yearHolidays(year));
  }
  return holidayCalendar(days, { name: "Nepal public holidays", refresh: "P1W" });
};
