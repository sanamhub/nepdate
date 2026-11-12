// The public holidays of one year as an iCalendar file, for calendar apps.
import type { APIRoute } from "astro";
import { holidayCalendar } from "../../lib/ics";
import { FIRST_YEAR, LAST_YEAR, yearHasPatro, yearHolidays } from "../../lib/patro";

export function getStaticPaths() {
  const paths = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    if (yearHasPatro(year) && yearHolidays(year).length > 0) paths.push({ params: { year: String(year) } });
  }
  return paths;
}

export const GET: APIRoute = ({ params }) => {
  const year = Number(params.year);
  return holidayCalendar(yearHolidays(year), { name: `Nepal public holidays ${year} BS` });
};
