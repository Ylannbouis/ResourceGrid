"use client";

/**
 * Anonymous ownership. On create, the API returns a secret token; we keep a map of
 * { pinId: token } in localStorage. Possessing the token is the only proof needed to
 * edit/resolve/delete a pin — no account, no login.
 */
const KEY = "resourcegrid.owner-tokens";

type TokenMap = Record<string, string>;

function read(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as TokenMap;
  } catch {
    return {};
  }
}

function write(map: TokenMap): void {
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function rememberOwnership(pinId: string, token: string): void {
  const map = read();
  map[pinId] = token;
  write(map);
}

export function getOwnerToken(pinId: string): string | undefined {
  return read()[pinId];
}

export function isOwner(pinId: string): boolean {
  return Boolean(read()[pinId]);
}

export function forgetOwnership(pinId: string): void {
  const map = read();
  delete map[pinId];
  write(map);
}
