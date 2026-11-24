// Edition-specific constants. The full EditionProfile
// (docs/forever/03-data-architecture.md §2) replaces this module; until then
// it holds the values the shipped blocks need, for the edition the app reads
// today: the Classic Anniversary realms, currently in The Burning Crusade.

export type EditionId = "classic-anniversary" | "forever";

export const ACTIVE_EDITION: EditionId = "classic-anniversary";

/**
 * Auction listing durations, in hours. The Burning Crusade uses 12/24/48;
 * WoW: Forever uses 2/8/24 (confirmed from the Forever client's strings,
 * docs/forever/02-forever-facts.md).
 */
export const LISTING_HOURS_BY_EDITION: Record<EditionId, number[]> = {
  "classic-anniversary": [12, 24, 48],
  forever: [2, 8, 24],
};

export const LISTING_HOURS = LISTING_HOURS_BY_EDITION[ACTIVE_EDITION];

export const EDITION_LABEL: Record<EditionId, string> = {
  "classic-anniversary": "Classic",
  forever: "Forever",
};
