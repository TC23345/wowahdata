export type TsmKind =
  | "purchases"
  | "sales"
  | "expired"
  | "canceled"
  | "income"
  | "expenses";

export type PurchaseSaleRow = {
  itemString: string;
  itemName: string;
  stackSize: number;
  quantity: number;
  price: number;
  otherPlayer: string;
  player: string;
  time: number;
  source: string;
};

export type ExpiredCanceledRow = {
  itemString: string;
  itemName: string;
  stackSize: number;
  quantity: number;
  player: string;
  time: number;
};

export type CashFlowRow = {
  type: string;
  amount: number;
  otherPlayer: string;
  player: string;
  time: number;
};

export type LoadedData = {
  realm: string;
  purchases: PurchaseSaleRow[];
  sales: PurchaseSaleRow[];
  expired: ExpiredCanceledRow[];
  canceled: ExpiredCanceledRow[];
  income: CashFlowRow[];
  expenses: CashFlowRow[];
  loadedAt: number;
};

export const SYNTHETIC_DE_GEAR = "DE Gear (random enchant)";

export const COPPER_PER_GOLD = 10000;

export function copperToGold(copper: number): number {
  return copper / COPPER_PER_GOLD;
}
