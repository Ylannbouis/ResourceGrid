import {
  OWNER_TOKEN_HEADER,
  type CreatePinInput,
  type OwnedPin,
  type Pin,
  type UpdatePinInput,
} from "@resourcegrid/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const base = `${API_URL}/api`;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPins(): Promise<Pin[]> {
  return handle<Pin[]>(await fetch(`${base}/pins`, { cache: "no-store" }));
}

export async function createPin(input: CreatePinInput): Promise<OwnedPin> {
  return handle<OwnedPin>(
    await fetch(`${base}/pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updatePin(
  id: string,
  token: string,
  input: UpdatePinInput,
): Promise<Pin> {
  return handle<Pin>(
    await fetch(`${base}/pins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", [OWNER_TOKEN_HEADER]: token },
      body: JSON.stringify(input),
    }),
  );
}

export async function claimPin(id: string): Promise<Pin> {
  return handle<Pin>(
    await fetch(`${base}/pins/${id}/claim`, { method: "POST" }),
  );
}

export async function resolvePin(id: string, token: string): Promise<Pin> {
  return handle<Pin>(
    await fetch(`${base}/pins/${id}/resolve`, {
      method: "POST",
      headers: { [OWNER_TOKEN_HEADER]: token },
    }),
  );
}

export async function deletePin(
  id: string,
  token: string,
): Promise<{ id: string }> {
  return handle<{ id: string }>(
    await fetch(`${base}/pins/${id}`, {
      method: "DELETE",
      headers: { [OWNER_TOKEN_HEADER]: token },
    }),
  );
}
