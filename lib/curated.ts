// Items pinned to the top of the dropdown. Order matters — most-traded TBC
// reagents first, then bags, then less-frequent staples. The synthetic DE Gear
// entry slots in immediately after the dust because that's where buy-side
// volume actually lives.
import { SYNTHETIC_DE_GEAR } from "./csv";

export const CURATED_ITEMS = [
  "Arcane Dust",
  "Greater Planar Essence",
  "Large Prismatic Shard",
  "Lesser Planar Essence",
  "Small Prismatic Shard",
  "Netherweave Cloth",
  "Imbued Netherweave Bag",
  "Netherbloom",
  "Huge Spotted Feltail",
  "Bottled Nethergon Energy",
  "Terocone",
  "Ironweb Spider Silk",
  SYNTHETIC_DE_GEAR,
] as const;

export const DEFAULT_ITEM = "Arcane Dust";
