"use client";

import { get, set, del, keys } from "idb-keyval";
import type { LoadedData } from "./csv";

const KEY_PREFIX = "wowahdata:realm:";
const ACTIVE_REALM_KEY = "wowahdata:active-realm";

function realmKey(realm: string): string {
  return `${KEY_PREFIX}${realm}`;
}

export async function saveRealmData(data: LoadedData): Promise<void> {
  await set(realmKey(data.realm), data);
  await set(ACTIVE_REALM_KEY, data.realm);
}

export async function loadRealmData(realm: string): Promise<LoadedData | null> {
  const v = (await get(realmKey(realm))) as LoadedData | undefined;
  return v ?? null;
}

export async function listRealms(): Promise<string[]> {
  const all = (await keys()) as string[];
  return all
    .filter((k) => typeof k === "string" && k.startsWith(KEY_PREFIX))
    .map((k) => k.slice(KEY_PREFIX.length));
}

export async function getActiveRealm(): Promise<string | null> {
  return ((await get(ACTIVE_REALM_KEY)) as string | undefined) ?? null;
}

export async function setActiveRealm(realm: string): Promise<void> {
  await set(ACTIVE_REALM_KEY, realm);
}

export async function clearAllData(): Promise<void> {
  const realms = await listRealms();
  await Promise.all(realms.map((r) => del(realmKey(r))));
  await del(ACTIVE_REALM_KEY);
}
