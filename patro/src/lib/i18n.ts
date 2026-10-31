// The patro's two languages. Nepali is the default; the visitor's choice is stored in the browser
// (scripts/app.ts), and everything the page writes, names and digits included, follows it.
import { monthName, toNepaliDigits, weekdayName, weekdayShortName } from "nepdate-core";

export type Lang = "ne" | "en";

/** The key the chosen language is stored under in localStorage. */
export const LANG_KEY = "patro-lang";

export const num = (n: number, lang: Lang) => (lang === "ne" ? toNepaliDigits(n) : String(n));
export const month = (m: number, lang: Lang) => monthName(m, lang);
export const weekday = (w: number, lang: Lang) => weekdayName(w, lang);
export const weekdayShort = (w: number, lang: Lang) => weekdayShortName(w, lang);
/** A name from the data in the chosen language. */
export const named = (n: { np: string; en: string }, lang: Lang) => (lang === "ne" ? n.np : n.en);

const adMonths = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const adMonthsLong = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
/** "Oct", the AD month names stay Latin in both languages, as on a printed patro. */
export const adMonth = (m: number) => adMonths.format(new Date(Date.UTC(2000, m - 1, 1)));
export const adMonthLong = (m: number) => adMonthsLong.format(new Date(Date.UTC(2000, m - 1, 1)));

export const T = {
  ne: {
    skip: "मुख्य भागमा जानुहोस्",
    patro: "पात्रो",
    today: "आज",
    prevMonth: "अघिल्लो महिना",
    nextMonth: "अर्को महिना",
    prevYear: "अघिल्लो वर्ष",
    nextYear: "अर्को वर्ष",
    prevDecade: "अघिल्लो दशक",
    nextDecade: "अर्को दशक",
    zoomOut: "महिना र वर्ष छान्नुहोस्",
    calendar: "पात्रो",
    details: "विवरण",
    view: "हेराइ",
    goTo: "मिति खोज्नुहोस्",
    goToHint: "जस्तै २०८३-०७-१४ वा 2026-10-31",
    goBs: "वि.सं.",
    goAd: "ई.सं.",
    go: "जानुहोस्",
    goBad: "यो मिति भेटिएन। वर्ष-महिना-गते लेख्नुहोस्।",
    goOut: "पात्रोमा वि.सं. १९०१ देखि २१९९ सम्मका मिति छन्।",
    tithi: "तिथि",
    holiday: "सार्वजनिक बिदा",
    holidays: "सार्वजनिक बिदा",
    events: "चाडपर्व र दिवस",
    eventsShort: "पर्व",
    noData: "यो महिनाको तिथि र बिदाको तथ्याङ्क छैन। पात्रोमा वि.सं. २०७७ देखि २०८४ सम्मको तथ्याङ्क छ।",
    nothing: "यस दिन कुनै पर्व वा बिदा छैन।",
    upcoming: "आउँदा बिदा",
    nowInNepal: "नेपालमा अहिले",
    dayPage: "यो दिनको पेज",
    close: "बन्द गर्नुहोस्",
    yearPage: "वर्षको पेज",
    ics: "बिदाहरू क्यालेन्डरमा थप्नुहोस् (.ics)",
    language: "भाषा",
    saturdayNote: "शनिबार र सार्वजनिक बिदा रातोमा। सानो अङ्क ई.सं. मिति हो।",
    allDays: "महिनाका सबै दिन",
    footerNote:
      'मिति <a href="https://nepdate.com/">NepDate</a> बाट; तिथि, बिदा र पर्व <a href="https://nepdate.com/docs/project/data/">पात्रोको तथ्याङ्क</a> बाट, जानकारीका लागि मात्र, आधिकारिक पात्रो होइन। विज्ञापन र ट्र्याकिङ छैन।',
    footerReport: "गलत मिति भए जानकारी दिनुहोस्",
    rel: (days: number) =>
      days === 0
        ? "आज"
        : days === 1
          ? "भोलि"
          : days === -1
            ? "हिजो"
            : days > 0
              ? `${toNepaliDigits(days)} दिनपछि`
              : `${toNepaliDigits(-days)} दिनअघि`,
    holidayCount: (n: number) => `${toNepaliDigits(n)} बिदा`,
  },
  en: {
    skip: "Skip to the calendar",
    patro: "Patro",
    today: "Today",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    prevYear: "Previous year",
    nextYear: "Next year",
    prevDecade: "Previous decade",
    nextDecade: "Next decade",
    zoomOut: "Pick a month or year",
    calendar: "Calendar",
    details: "Details",
    view: "View",
    goTo: "Go to date",
    goToHint: "e.g. 2083-07-14 or 2026-10-31",
    goBs: "BS",
    goAd: "AD",
    go: "Go",
    goBad: "That date was not found. Write year-month-day.",
    goOut: "The patro has dates from BS 1901 to 2199.",
    tithi: "Tithi",
    holiday: "Public holiday",
    holidays: "Public holidays",
    events: "Festivals and days",
    eventsShort: "Events",
    noData: "No tithi or holidays for this month. The patro data covers BS 2077 to 2084.",
    nothing: "No festival or holiday on this day.",
    upcoming: "Coming holidays",
    nowInNepal: "Now in Nepal",
    dayPage: "Page for this day",
    close: "Close",
    yearPage: "Page for the year",
    ics: "Add the holidays to your calendar (.ics)",
    language: "Language",
    saturdayNote: "Saturdays and public holidays in red. The small number is the AD date.",
    allDays: "Every day of the month",
    footerNote:
      'Dates from <a href="https://nepdate.com/">NepDate</a>; tithi, holidays and events from the <a href="https://nepdate.com/docs/project/data/">patro data</a>, informational and not an official calendar. No ads, no tracking.',
    footerReport: "Report a wrong date",
    rel: (days: number) =>
      days === 0
        ? "Today"
        : days === 1
          ? "Tomorrow"
          : days === -1
            ? "Yesterday"
            : days > 0
              ? `In ${days} days`
              : `${-days} days ago`,
    holidayCount: (n: number) => `${n} holiday${n === 1 ? "" : "s"}`,
  },
} as const;

export const PAKSHA: Record<"shukla" | "krishna", Record<Lang, string>> = {
  shukla: { ne: "शुक्ल पक्ष", en: "Shukla paksha" },
  krishna: { ne: "कृष्ण पक्ष", en: "Krishna paksha" },
};
