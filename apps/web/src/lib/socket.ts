"use client";

import { io, type Socket } from "socket.io-client";
import {
  SocketEvents,
  type Pin,
  type ServerToClientEvents,
} from "@resourcegrid/shared";
import { usePinStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket<ServerToClientEvents> | null = null;

/**
 * Connect once and wire socket deltas straight into the pin store. Idempotent so
 * React StrictMode double-mounts don't open duplicate connections.
 */
export function connectSocket(): Socket<ServerToClientEvents> {
  if (socket) return socket;

  socket = io(API_URL, { transports: ["websocket", "polling"] });
  const { upsert, remove, setConnected } = usePinStore.getState();

  socket.on("connect", () => setConnected(true));
  socket.on("disconnect", () => setConnected(false));

  socket.on(SocketEvents.PinCreated, (pin: Pin) => upsert(pin));
  socket.on(SocketEvents.PinUpdated, (pin: Pin) => upsert(pin));
  socket.on(SocketEvents.PinResolved, (pin: Pin) => upsert(pin)); // store drops resolved
  socket.on(SocketEvents.PinDeleted, ({ id }) => remove(id));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
