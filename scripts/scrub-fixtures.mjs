import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const SOURCE_DIR = "C:/Users/TC933/OneDrive/Desktop";
const TARGET_DIR = "__fixtures__/nightslayer";
const KINDS = ["purchases", "sales", "expired", "canceled", "income", "expenses"];

mkdirSync(TARGET_DIR, { recursive: true });

const KEEP = new Set(["Bluemage", "Candyowens", "Clickyportal", "Samaltmann", "Donnytrump", "Merchant"]);
const map = new Map();

function anon(name) {
  if (!name || KEEP.has(name)) return name;
  if (!map.has(name)) map.set(name, `Anon${map.size + 1}`);
  return map.get(name);
}

for (const kind of KINDS) {
  const src = join(SOURCE_DIR, `Accounting_Nightslayer_${kind}.csv`);
  const dst = join(TARGET_DIR, `Accounting_Nightslayer_${kind}.csv`);
  const lines = readFileSync(src, "utf8").split(/\r?\n/);
  const header = lines[0].split(",");
  const opIdx = header.indexOf("otherPlayer");
  const out = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { out.push(line); continue; }
    if (opIdx === -1) { out.push(line); continue; }
    const cols = line.split(",");
    cols[opIdx] = anon(cols[opIdx]);
    out.push(cols.join(","));
  }
  writeFileSync(dst, out.join("\n"));
  console.log(`${basename(dst)}: ${out.length - 1} rows`);
}
console.log(`\nScrubbed ${map.size} unique otherPlayer values to AnonN.`);
