// The facts the pages state that the packages don't give directly: the paksha worked out from the
// order of tithis, the cleaned tithi names, and month lengths. Run with `node --test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { NepaliDate } from "nepdate-core";
import { coveredDays, day, monthDays, yearHolidays } from "./patro.ts";

const at = (y: number, m: number, d: number) => day(NepaliDate.of(y, m, d));

test("Purnima ends the shukla paksha and Aunsi the krishna paksha", () => {
  // Kartik 2083: Purnima on the 9th, Aunsi on the 23rd.
  assert.equal(at(2083, 7, 9).tithi?.en, "Purnima");
  assert.equal(at(2083, 7, 9).tithi?.paksha, "shukla");
  assert.equal(at(2083, 7, 10).tithi?.paksha, "krishna");
  assert.equal(at(2083, 7, 23).tithi?.en, "Aunsi");
  assert.equal(at(2083, 7, 23).tithi?.paksha, "krishna");
  assert.equal(at(2083, 7, 24).tithi?.paksha, "shukla");
});

test("the day after Purnima is krishna paksha and the day after Aunsi shukla", () => {
  let previous: string | null = null;
  for (const d of coveredDays()) {
    if (!d.tithi) continue;
    // A tithi can span two sunrises; the repeated day keeps its paksha.
    if (previous === "Purnima" && d.tithi.en !== "Purnima") assert.equal(d.tithi.paksha, "krishna", d.iso);
    if (previous === "Aunsi" && d.tithi.en !== "Aunsi") assert.equal(d.tithi.paksha, "shukla", d.iso);
    previous = d.tithi.en;
  }
});

test("the data's (K) mark is dropped and its day is krishna paksha", () => {
  const d = at(2081, 1, 12);
  assert.equal(d.tithi?.en, "Pratipadha");
  assert.equal(d.tithi?.paksha, "krishna");
  for (const c of coveredDays()) assert.ok(!c.tithi || !/[(*]/.test(c.tithi.en + c.tithi.np), c.iso);
});

test("a skipped Purnima still starts the krishna paksha", () => {
  // Mangsir 2082: Chaturdashi on the 18th, then Pratipadha; the data has no Purnima.
  assert.equal(at(2082, 8, 18).tithi?.paksha, "shukla");
  assert.equal(at(2082, 8, 19).tithi?.en, "Pratipadha");
  assert.equal(at(2082, 8, 19).tithi?.paksha, "krishna");
});

test("within a paksha the tithi number never goes down", () => {
  let previous: { n: number; paksha: string } | null = null;
  for (const d of coveredDays()) {
    if (!d.tithi) continue;
    if (previous && previous.paksha === d.tithi.paksha) assert.ok(d.tithi.number >= previous.n, d.iso);
    previous = { n: d.tithi.number, paksha: d.tithi.paksha };
  }
});

test("tithi numbers run 1 to 15", () => {
  for (const d of coveredDays()) if (d.tithi) assert.ok(d.tithi.number >= 1 && d.tithi.number <= 15, d.iso);
});

test("a year's months add up to its length", () => {
  const days = Array.from({ length: 12 }, (_, i) => monthDays(2083, i + 1).length).reduce((a, b) => a + b);
  assert.equal(days, 365);
});

test("public holidays of 2083 start with the new year", () => {
  const holidays = yearHolidays(2083);
  assert.equal(holidays[0].iso, "2083-01-01");
  assert.ok(holidays.every((d) => d.holiday));
});
