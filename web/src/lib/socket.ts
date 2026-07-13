import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api";

export function createSocket(token: string): Socket {
  return io(API_BASE, { auth: { token }, autoConnect: true });
}
