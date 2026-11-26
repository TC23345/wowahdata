// Generates the synthetic WoW Forever test fixture in __fixtures__/forever/.
// The files mimic the TSM desktop app's Data Export (Game Mode "Forever",
// realm "PvP"): TSM_PvP_<Kind>_2026-11-25.csv, each starting with a UTF-8 BOM.
// The data is made up but deterministic (seeded PRNG), so test expectations
// stay stable. Re-run with: node scripts/make-forever-fixture.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "__fixtures__/forever";
const STAMP = "2026-11-25";
const BOM = "﻿";
const PLAYERS = ["Clåude Code", "Bankälter"];

// Four Tue–Mon trading weeks: Tue 2026-10-27 00:00 UTC → Mon 2026-11-23 23:59 UTC.
const START = Date.UTC(2026, 9, 27) / 1000;
const SPAN = 28 * 86400;

let seed = 0x5eed;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x80000000;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const time = () => START + Math.floor(rand() * SPAN);

// [itemString, itemName, stackSize, base price in copper, sales, buys]
const ITEMS = [
  ["i:10940", "Strange Dust", 20, 9500, 120, 40],
  ["i:2589", "Linen Cloth", 20, 1200, 70, 25],
  ["i:2770", "Copper Ore", 20, 2800, 45, 35],
  ["i:2447", "Peacebloom", 20, 1500, 30, 50],
  ["i:14047", "Runecloth", 20, 4200, 25, 10],
  ["i:16204", "Illusion Dust", 20, 31000, 15, 20],
];
// Random-enchant gear: itemName "?" with a random-suffix itemString.
const RANDOM_ENCHANT = ["i:15210:-19", "i:15248:-34", "i:9832:-12", "i:15497:-41"];

const PS = "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source";
const EC = "itemString,itemName,stackSize,quantity,player,time";
const CF = "type,amount,otherPlayer,player,time";

const sales = [], buys = [], cancelled = [], expired = [], income = [], expense = [];
let anon = 0;
const other = () => `Anon${(anon++ % 97) + 1}`;

for (const [is, name, stack, base, nSales, nBuys] of ITEMS) {
  for (let i = 0; i < nSales; i++) {
    const qty = pick([1, 1, 5, stack]);
    const source = rand() < 0.05 ? "COD" : "Auction";
    sales.push([is, name, stack, qty, Math.round(base * (0.85 + rand() * 0.4)), other(), pick(PLAYERS), time(), source]);
  }
  for (let i = 0; i < nBuys; i++) {
    const qty = pick([1, 5, stack]);
    buys.push([is, name, stack, qty, Math.round(base * (0.7 + rand() * 0.3)), other(), pick(PLAYERS), time(), "Auction"]);
  }
  for (let i = 0; i < Math.ceil(nSales / 10); i++) {
    cancelled.push([is, name, stack, int(1, stack), pick(PLAYERS), time()]);
    expired.push([is, name, stack, int(1, stack), pick(PLAYERS), time()]);
  }
}
for (let i = 0; i < 40; i++) {
  buys.push([pick(RANDOM_ENCHANT), "?", 1, 1, int(8000, 30000), other(), pick(PLAYERS), time(), "Auction"]);
}
for (let i = 0; i < 6; i++) {
  income.push(["Money Transfer", int(100000, 2000000), "Bankälter", "Clåude Code", time()]);
}
for (let i = 0; i < 20; i++) {
  expense.push([pick(["Postage", "Postage", "Repair Bill"]), int(30, 25000), "", pick(PLAYERS), time()]);
}

const byTime = (t) => (a, b) => a[t] - b[t];
const csv = (header, rows) =>
  BOM + [header, ...rows.map((r) => r.join(","))].join("\n") + "\n";

mkdirSync(DIR, { recursive: true });
const files = {
  Sales: csv(PS, sales.sort(byTime(7))),
  Buys: csv(PS, buys.sort(byTime(7))),
  Cancelled: csv(EC, cancelled.sort(byTime(5))),
  Expired: csv(EC, expired.sort(byTime(5))),
  Income: csv(CF, income.sort(byTime(4))),
  Expense: csv(CF, expense.sort(byTime(4))),
};
for (const [kind, text] of Object.entries(files)) {
  writeFileSync(join(DIR, `TSM_PvP_${kind}_${STAMP}.csv`), text);
}
console.log(Object.fromEntries(Object.entries(files).map(([k, t]) => [k, t.trim().split("\n").length - 1])));
