# What the current tool highlights, and how well

Evaluation of the six views in `wowahdata` (and their `ah-heatmap` predecessors),
measured against the bundled sample export (`public/sample/`, Nightslayer,
2026-01-21 → 2026-05-06, 20,902 rows: 11,526 purchases, 8,511 sales, 327 expired,
242 canceled, 296 income/expense). All figures are auction-sourced rows unless noted, gold, and
recomputable with the script quoted at the bottom.

## Verdict per view

| View | Verdict | Why |
| --- | --- | --- |
| Sale heatmap (day × hour) | **Strong — keep as hero** | Timing is the single most concentrated signal in the data. Its per-cell price readout is the one misleading part. |
| Buy/sell scatter over time | **Strong** | Price drift over weeks is 3–10× larger than the flip spread; only a time axis shows it. |
| "DE source" stat card | **Strong idea, under-built** | It is the only place the tool admits the business is a conversion pipeline, not a flip. |
| Daily P&L | **Mixed** | Cumulative line is useful; per-item daily bars mislead for conversion items. |
| Price histogram | **Weak** | Collapses time, so drift masquerades as overlap. |
| Sell-through | **Weak as defined** | 96% overall; the flag fires only on long-tail noise and ignores cancels. |
| Cash flow | **Weak** | Three orders of magnitude smaller than trading volume. |

## Evidence

### 1. Timing (heatmap) is real signal

A uniform market would put 25% of units in any 6-hour window and 10% in the top
10% of the 168 day×hour cells.

| Item | Units sold | Best 6h window (UTC) | Worst 6h window | Top-10% cells hold | Heaviest weekday |
| --- | ---: | --- | --- | ---: | --- |
| All AH sales | 53,040 | 00–06: **42%** | 10–16: 12% | 28% | Sat 20% |
| Greater Planar Essence | 5,167 | 23–05: **56%** | 09–15: 7% | 45% | Wed 26% |
| Arcane Dust | 27,612 | 23–05: **49%** | 09–15: 11% | 34% | Tue 18% |
| Large Prismatic Shard | 717 | 00–06: **54%** | 08–14: 9% | 56% | Tue 28% |
| Bolt of Netherweave | 8,540 | 03–09: 35% | 10–16: 10% | 49% | **Sat 37%** |

Two things make this the right hero:

- The peak-to-trough ratio is 4–8×, far larger than any price edge in the data.
- Weekday signatures differ by item: the enchanting materials peak Tue/Wed (UTC),
  which lines up with the weekly raid reset, while cloth peaks on Saturday. A
  per-item heatmap is therefore not redundant with an all-items one.

**The clock moves volume, not price.** The heatmap's hover readout shows a median
price per cell, which invites reading price off the grid. That reading does not
hold up. Large Prismatic Shard averaged 18.55g in the 00–12 UTC half of the day
against 16.46g in the other half — a 12.7% raw gap — but dividing each sale by
its own week's average price shrinks the gap to −0.7%. The raw figure is price
drift across weeks leaking into the hour axis because the seller's hours shifted
over the period. After the same normalisation Greater Planar Essence keeps +4.2%,
Bolt of Netherweave +2.9%, Arcane Dust +0.2%. A per-cell price is only meaningful
relative to a same-week (or same-day) baseline, and even then the effect is small
next to the 4–8× volume swing.

**Caveat to carry forward:** the heatmap shows when *this seller's* auctions
cleared. It conflates buyer demand with when the seller happened to have stock
listed. It cannot distinguish "nobody buys at 10:00 UTC" from "I was sold out at
10:00 UTC". Any Forever version that gains market-wide listing data should
normalise by listing presence.

### 2. Price over time (scatter) beats price distribution (histogram)

| Item | Median buy | Median sell | Spread | Weekly avg sell, min → max |
| --- | ---: | ---: | ---: | --- |
| Greater Planar Essence | 6.15 | 6.57 | +7% | 5.79 → 7.03 (21%) |
| Arcane Dust | 1.00 | 1.07 | +7% | 0.95 → 1.46 (54%) |
| Large Prismatic Shard | 17.57 | 18.23 | +4% | 11.56 → 23.22 (101%) |
| Small Prismatic Shard | 5.52 | 5.93 | +7% | 5.05 → 7.27 (44%) |

Flip spreads are thin (4–7%); week-to-week drift is 21–101%. The scatter keeps
time on the x-axis, so "bought the dip, sold the recovery" is visible. The
histogram pools the whole range, so a week-3 buy at 17g and a week-9 sell at 17g
look like zero margin when they are two different markets. 35% of Arcane Dust buy
units sit at or above the median sell price, which reads as bad buying on the
histogram and as ordinary drift on the scatter.

### 3. The business is a conversion pipeline, and only one card says so

| Largest AH buys | Cost | | Largest AH sells | Revenue |
| --- | ---: | --- | --- | ---: |
| DE Gear (random enchant), 3,014 rows | 22,357 | | Greater Planar Essence | 33,712 |
| Netherweave Cloth, 109,377 units | 12,859 | | Arcane Dust | 30,682 |
| Nexus Crystal | 4,438 | | Large Prismatic Shard | 12,770 |
| Lesser Planar Essence | 2,967 | | Bolt of Netherweave | 8,073 |
| Netherweave Tunic, Thick Draenic Vest (gear) | 4,256 | | Netherweave and Imbued Netherweave bags | 5,530 |

The two columns barely overlap. The export records no link between a purchase
and what it was turned into, but the shape is unmistakable: gear and cloth go in;
dust, essences, shards, bolts and bags come out (disenchanting and tailoring).

- 1,095 distinct items were bought; 168 were sold. Four items are 82% of revenue.
- Per-item P&L is consequently wrong in both directions: Arcane Dust shows
  +25,175g, DE Gear −22,282g, Netherweave Cloth −12,599g. None of the three
  numbers describes a decision the trader made.
- All-items daily P&L is positive on 45 days and negative on 51 — buy days and
  sell days, not good days and bad days.
- The "DE source" card (`sold + expired − bought`) is the tool's one
  acknowledgement of this: 34,325 implied units for Arcane Dust. It is the right
  instinct expressed as a single number with no input side attached. The formula
  also overstates: 34,325 is more than the 27,612 units actually sold, because
  expired stock that was relisted is counted each time it expired. Sold minus
  bought gives 22,345 (81% of units sold).

This is the largest gap between what the trader does and what the tool shows.

### 4. Sell-through measures the wrong outcome

- Row sell-through is 96.2% overall; 53 of 98 qualifying items are at 100%.
- Counted by units and including cancels, the picture inverts: 53,040 units
  sold, 17,231 expired and 12,305 canceled, so only 64% of listed units sold on
  the attempt. For the two largest items it is 61% (Greater Planar Essence) and
  59% (Arcane Dust). Rows hide this because one expired row can be a whole
  posting of stacks.
- Of the 12 "slow" flags, 11 are items with 3–11 lifetime events (Sword of Zeal,
  Mountain Silversage, recipe drops). The twelfth is DE Gear, which is bought to
  be disenchanted and is not meant to sell. None is where the gold is.
- Cancels are where the churn is and the metric ignores them: Arcane Dust had
  7,249 units canceled across 77 rows against 27,612 sold; Greater Planar Essence
  2,692 canceled against 5,167 sold. That is undercut-and-repost behaviour.

A three-way outcome (sold / expired / canceled, by units) on the items that carry
revenue would say something; a two-way ratio on rows does not.

### 5. Cash flow is negligible at this scale

Postage 6.9g and repairs 33.1g across 15 weeks, against 103,339g of AH revenue.
"Money Transfer" rows (4,162g out, 1,380g in) are gold sent to and received from
other characters, not a cost of trading. It does not earn a top-level tab.

### 6. Things the data says are *not* worth building

- **Counterparty analysis.** 5,819 distinct buyers; the top ten are 4% of
  revenue. There is no whale to find.
- **Per-character splits.** One character is 98% of sale rows.

## Layout baseline (measured)

Playwright against the current app at 1440×900 with the sample data loaded:

| Interaction | What moves | By how much |
| --- | --- | ---: |
| Switch chart tab | Panel height, footer position | panel 483–635px; footer travels 152px |
| Hover a heatmap cell | Readout swaps a 1-line hint for a stat grid | panel +72px (635 → 707) |
| Select a non-curated item via search | Chip row wraps to a second line | everything below +36px |
| Open "Custom" range | Inline date form appears | everything below +78px |
| Viewport 1100px wide | Chip row is already wrapped at rest | control bar 221px vs 185px |

Browser CLS reports ~0 for nearly all of these because each follows a click and
is exempted as input-driven, or happens below the fold. CLS is therefore not a
usable acceptance metric here; the test has to assert block geometry directly.

## Reproducing

```
python3 docs/forever/scripts/analyze_sample.py public/sample             # revenue, heatmap concentration, spreads, sell-through
python3 docs/forever/scripts/price_by_hour_normalised.py public/sample   # the week-normalisation check in section 1
BASE_URL=http://localhost:3000/ node docs/forever/scripts/layout_baseline.js   # layout geometry per interaction (needs `npm run dev`)
```
