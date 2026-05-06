import Papa from "papaparse";
import {
  type CashFlowRow,
  type ExpiredCanceledRow,
  type PurchaseSaleRow,
  type TsmKind,
  type LoadedData,
} from "./csv";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseCsv<T>(input: string): T[] {
  const r = Papa.parse<Record<string, unknown>>(input, {
    header: true,
    skipEmptyLines: true,
  });
  return (r.data as unknown as T[]) ?? [];
}

export function parsePurchaseSale(input: string): PurchaseSaleRow[] {
  return parseCsv<Record<string, unknown>>(input).map((r) => ({
    itemString: str(r.itemString),
    itemName: str(r.itemName),
    stackSize: num(r.stackSize),
    quantity: num(r.quantity),
    price: num(r.price),
    otherPlayer: str(r.otherPlayer),
    player: str(r.player),
    time: num(r.time),
    source: str(r.source),
  }));
}

export function parseExpiredCanceled(input: string): ExpiredCanceledRow[] {
  return parseCsv<Record<string, unknown>>(input).map((r) => ({
    itemString: str(r.itemString),
    itemName: str(r.itemName),
    stackSize: num(r.stackSize),
    quantity: num(r.quantity),
    player: str(r.player),
    time: num(r.time),
  }));
}

export function parseCashFlow(input: string): CashFlowRow[] {
  return parseCsv<Record<string, unknown>>(input).map((r) => ({
    type: str(r.type),
    amount: num(r.amount),
    otherPlayer: str(r.otherPlayer),
    player: str(r.player),
    time: num(r.time),
  }));
}

const PARSERS = {
  purchases: parsePurchaseSale,
  sales: parsePurchaseSale,
  expired: parseExpiredCanceled,
  canceled: parseExpiredCanceled,
  income: parseCashFlow,
  expenses: parseCashFlow,
} as const;

export type ParsedKindResult = {
  purchases?: PurchaseSaleRow[];
  sales?: PurchaseSaleRow[];
  expired?: ExpiredCanceledRow[];
  canceled?: ExpiredCanceledRow[];
  income?: CashFlowRow[];
  expenses?: CashFlowRow[];
};

export function parseByKind(kind: TsmKind, input: string): ParsedKindResult {
  return { [kind]: PARSERS[kind](input) } as ParsedKindResult;
}

export function buildLoadedData(
  realm: string,
  parts: ParsedKindResult,
): LoadedData {
  return {
    realm,
    purchases: parts.purchases ?? [],
    sales: parts.sales ?? [],
    expired: parts.expired ?? [],
    canceled: parts.canceled ?? [],
    income: parts.income ?? [],
    expenses: parts.expenses ?? [],
    loadedAt: Date.now(),
  };
}
