# WoW: Forever — what an AH tool needs to know

Researched 2026-11-24, three weeks after launch. Blizzard has published almost
nothing official about Forever's auction-house rules; the strongest evidence is
the client's own UI source and strings, TradeSkillMaster's changelogs and public
data files, and community API clients. Every row carries a confidence tag:

- **Confirmed** — Blizzard primary source, client data read directly, or several
  independent sources.
- **Single-source** — one source, or third-party guides only.
- **Unknown** — not found. The design must not hard-code a value.

## The game

| Fact | Confidence |
| --- | --- |
| Launched 2026-11-04, a standalone third branch beside retail and Classic. Client 1.60.1, interface 16001, project `WOW_PROJECT_CAMELOT`. | Confirmed |
| Level cap 60 indefinitely; no expansions. Data accumulates without an expansion reset. | Confirmed |
| No realms. Regions US (hosting Oceania and Latin America), EU, KR, TW. | Confirmed |
| Rulesets: Normal, PvP, Roleplay, Roleplay PvP (KR/TW: Normal and PvP only). Hardcore arrives later as a closed economy. | Confirmed |
| Characters are locked to a ruleset. Mail is ruleset-locked. | Confirmed |
| Character names are two-part (first name + surname) and unique per region; no realm suffix. | Confirmed |
| Raids open 2026-12-09. Until then there is no raid-reset demand cycle in any data. | Confirmed |

## The auction house

| Fact | Confidence |
| --- | --- |
| Each region × ruleset has three houses: Alliance, Horde, and the neutral "Blackwater Auction House". 12 markets in US and EU, 6 in KR and TW. | Confirmed |
| Faction houses are not cross-faction. Blackwater is the only cross-faction trade. | Confirmed |
| Retail-style interface with commodities: per-unit pricing, partial-quantity buys filled cheapest-first across sellers. | Confirmed |
| Copper precision is kept (unlike retail). | Confirmed |
| Equal-price rule: "Auctions posted later (at the same price) are sold first." | Confirmed (client text) |
| Listing durations are 2, 8 and 24 hours. | Confirmed |
| Items still take bids; whether commodities do is not known. | Confirmed / Unknown |
| Cut is 5% on faction houses and 15% on Blackwater. | Single-source |
| Which item categories are commodities (reported: ore, herbs, cloth, leather, dust, essences, potions). Set per item server-side. | Single-source |
| Deposit: Classic formula (5/20/60% of vendor price by duration, ×5 on Blackwater), lost on expiry or cancel. | Single-source |
| Minimum deposit: 1 silver at launch; a cut to 1 copper was announced, deferred to 2026-11-17, live status disputed. | Confirmed up to deferral |
| Posting cap per character. | Unknown |
| Blackwater is not negligible: ~73k listings against ~380k per faction house on EU Normal. | Single-source |
| Sale proceeds arrive by mail after 60 minutes; some arrived in ~2 minutes before a fix scheduled for 2026-11-17. | Confirmed |
| A Black Market AH exists (bid-only, NPC-run); players cannot list there. | Confirmed |

## Resets

| Fact | Confidence |
| --- | --- |
| A weekly reset exists. Americas maintenance is Tuesday. | Confirmed |
| Reset hours (US Tue 15:00 UTC, EU Wed 04:00 UTC) are assumed by trackers from the standard WoW schedule. | Single-source, inferred |
| KR and TW reset days. | Unknown |

## TradeSkillMaster

| Fact | Confidence |
| --- | --- |
| TSM supports Forever since v4.15 (2026-11-04); latest v4.15.9 (2026-11-20). | Confirmed |
| TSM publishes Forever pricing data. Its "realm" for Forever is ruleset + faction (`pvp-horde`, `normal-alliance`, …). No region-wide commodity file. | Confirmed |
| No Blackwater slug exists in TSM's public data. | Confirmed (absent) |
| TSM removed a "region-wide trading" setting in v4.15.8 because it merged data across rulesets, and fixed Accounting data for Roleplay PvP characters recorded on v4.15–4.15.1. Early exports may be mis-scoped. | Confirmed |
| TSM fixed "random enchant suffixes and other bonus IDs being stripped from items" in v4.15.5. Random-enchant gear is likely bonus-ID based, not `i:24673:-39`. | Confirmed (changelog); format Unknown |
| **What replaces `<Realm>` in `Accounting_<Realm>_*.csv`.** | **Unknown** |
| The client's `GetRealmName()` returned internal shard names until ~2026-11-20 and returns an empty string since. | Confirmed |
| CSV columns in a Forever export. | Unknown |
| Whether the recorded sale price is net of the cut, and of which cut. | Unknown |
| One sale mail can cover "Multiple Buyers" (client string). | Confirmed |
| How TSM records such a sale: row count, `stackSize`, `quantity`, `otherPlayer`. | Unknown |

## Public market data

| Fact | Confidence |
| --- | --- |
| Blizzard API namespaces `static-forever-{region}`, `dynamic-forever-{region}`; rulesets replace realms (`/data/wow/ruleset/{id}/auctions/{houseId}` and `…/commodities`). Undocumented by Blizzard. | Confirmed (community clients) |
| Snapshots publish roughly hourly; up to ~60k listings (5–9 MB) per house; asking prices only. | Single-source |
| Which API house IDs belong to which ruleset. | Unknown |
| TSM public data: `forever/{region}/region/items.csv` (`marketValue`, `historical`, `avgSalePrice`, `saleRate`, `soldPerDay`; updated daily) and `forever/{region}/realm/{ruleset}-{faction}/items.csv` (`marketValue`, `minBuyout`, `recent`, `historical`; updated every few hours). Attribution required; no bulk republishing. | Confirmed |

## Scale

| Fact | Confidence |
| --- | --- |
| 15.16M characters created by 2026-11-17 (characters, not players). | Confirmed (secondary reports) |
| One snapshot showed 3.35M listings across 36 houses; the largest EU houses hold 370–405k each, US 212–253k. RP houses are 5–10× smaller. | Single-source |
| Prices deflated steeply in week one (median tracked material −41% in five days). | Single-source |
| Launch-era unit prices are small and differ by faction (Mageweave reported at 8s on Alliance and 18s on Horde, US PvP, 7 Nov). | Single-source |
| No gold or character transfers from Classic; no WoW Token. | Single-source |

## What this means for the tool

1. **"Realm" becomes a market scope**: region × ruleset × house. The filename
   token is opaque; the user maps it at import.
2. **The 5% assumption is no longer a constant.** A Blackwater sale may be net of
   15%. The rule "never re-apply the cut to recorded revenue" still holds; what
   changes is that any *gross* figure shown must know the house, and the export
   probably cannot tell us.
3. **The trading week is per region.** Tuesday–Monday fits US; EU is likely
   Wednesday–Tuesday. And there is no reset cycle to see until raids open.
4. **Hour-of-day is timezone-ambiguous.** One US market serves Honolulu to
   Sydney; one EU market serves Lisbon to Helsinki. Store UTC; make the display
   timezone a first-class control.
5. **Undercut-and-repost changes shape.** With cheapest-first commodity fills,
   later-posted-sells-first at equal price, short durations and forfeited
   deposits, cancels and expiries cost real gold and are worth measuring by units.
6. **One row is not one stack.** Commodity fills can be partial and multi-buyer.
   Anything that sizes or counts by row needs to work on units.
7. **Random-enchant aggregation must be pattern-driven.** `itemName == "?"` is a
   Classic artefact.
8. **Sale timestamps come from mail** and trail the real sale by up to an hour —
   inconsistently so for data recorded before 2026-11-17.
9. **Early Forever exports are suspect**: TSM mis-scoped Roleplay PvP data until
   v4.15.8.
10. **History only grows.** No expansion reset means a trader's dataset is
    multi-year by design.

## Sources

Client UI source and strings: `Gethe/wow-ui-source` and
`Ketho/BlizzardInterfaceResources`, branch `forever` (builds 1.60.1.71037 and
1.60.1.70938). TSM: CurseForge changelogs v4.15–v4.15.9 and
`tradeskillmaster.com/public-data`. Blizzard: news articles 24302070 and 24303313
and the Forever hotfix forum thread (t/2403040). Community: `warcraft.wiki.gg`,
`warcrafttavern.com/forever`, `wowfah.com`, `conquestcapped.com`, the Blizzard API
forum thread t/60334 and the `goldbook`, `everloot` and `wow-forever-sdk` projects
on GitHub. The TSM 4.15 announcement itself could not be read (the site blocks
automated readers).
