// The views the pages and the browser both render (render.ts): what a month, a zoom view and a
// day's card contain, in both languages. Run with `node --test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { NepaliDate } from "nepdate-core";
import { day } from "./patro.ts";
import { dayCard, decadeStart, decadeTiles, esc, monthDetails, monthGrid, upcomingHolidays, yearTiles } from "./render.ts";

const count = (html: string, needle: string) => html.split(needle).length - 1;

test("a month has a button per day after blanks up to its first weekday", () => {
  // Kartik 2083 has 30 days and starts on a Sunday; Mangsir 2083 starts on a Tuesday.
  const kartik = monthGrid(2083, 7, "ne", { todayAd: null });
  assert.equal(count(kartik, '<button type="button" class="cell'), 30);
  assert.equal(count(kartik, 'role="columnheader"'), 7);
  const mangsir = monthGrid(2083, 8, "ne", { todayAd: null });
  const first = NepaliDate.of(2083, 8, 1).weekday;
  assert.equal(first, 2);
  assert.equal(count(mangsir.slice(0, mangsir.indexOf('<button')), 'class="blank"'), first);
});

test("today is ringed only when its AD date is given", () => {
  assert.equal(count(monthGrid(2083, 7, "ne", { todayAd: null }), 'aria-current="date"'), 0);
  const html = monthGrid(2083, 7, "ne", { todayAd: "2026-10-31" });
  assert.equal(count(html, 'aria-current="date"'), 1);
  assert.match(html, /class="cell sat today[^"]*" data-bs="2083-07-14"/);
});

test("the language sets the digits and the names", () => {
  const ne = monthGrid(2083, 7, "ne", { todayAd: null });
  const en = monthGrid(2083, 7, "en", { todayAd: null });
  assert.match(ne, /<span class="cell-bs">२२<\/span>/);
  assert.match(en, /<span class="cell-bs">22<\/span>/);
  assert.match(ne, /लक्ष्मी पूजा/);
  assert.match(en, /Laxmi Puja/);
  assert.doesNotMatch(en, /लक्ष्मी पूजा/);
});

test("a long Latin tithi name may break at a syllable on a narrow cell", () => {
  // Kartik 22, 2083 is Chaturdashi.
  assert.match(monthGrid(2083, 7, "en", { todayAd: null }), /Chatur­dashi/);
});

test("the year view has twelve months and the decade view twelve years in range", () => {
  assert.equal(count(yearTiles(2083, "ne", { viewed: 7, today: null }), "<button"), 12);
  assert.equal(decadeStart(2083), 2079);
  assert.equal(count(decadeTiles(2079, "en", { viewed: 2083, today: null }), "<button"), 12);
  // At the start of the range the years before 1901 are blank, not buttons.
  const first = decadeTiles(decadeStart(1901), "en", { viewed: 1901, today: null });
  assert.equal(count(first, "<button"), 10);
  assert.doesNotMatch(first, /data-year="1900"/);
});

test("a day's card has its holiday, tithi and every event", () => {
  const html = dayCard(day(NepaliDate.of(2083, 7, 22)), "en", null);
  assert.match(html, /Public holiday/);
  assert.match(html, /Chaturdashi/);
  assert.equal(count(html, "<li>"), day(NepaliDate.of(2083, 7, 22)).events.length);
  const today = day(NepaliDate.of(2083, 7, 14));
  assert.match(dayCard(day(NepaliDate.of(2083, 7, 22)), "en", today), /In 8 days/);
  assert.match(dayCard(day(NepaliDate.of(2083, 7, 22)), "ne", today), /८ दिनपछि/);
});

test("the coming holidays are holidays, in order, from the given day", () => {
  const from = day(NepaliDate.of(2083, 7, 14));
  const list = upcomingHolidays(from, 4);
  assert.deepEqual(
    list.map((d) => d.iso),
    ["2083-07-22", "2083-07-24", "2083-07-25", "2083-07-29"],
  );
});

test("the month details list every day", () => {
  assert.equal(count(monthDetails(2083, 7, "ne", { todayAd: null }), '<li class="row'), 30);
});

test("text from the data is escaped", () => {
  assert.equal(esc(`<b>"Tom" & 'Jerry'</b>`), "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
});

test("a cell names two events and counts the rest for wide and narrow cells", () => {
  // Kartik 22, 2083 has six events.
  const html = monthGrid(2083, 7, "en", { todayAd: null });
  const cell = html.slice(html.indexOf('data-bs="2083-07-22"'), html.indexOf('data-bs="2083-07-23"'));
  assert.equal(count(cell.slice(cell.indexOf("cell-events")), "<span>"), 2);
  assert.match(cell, /class="cell-more wide">\+4</);
  assert.match(cell, /class="cell-more narrow">\+5</);
});
