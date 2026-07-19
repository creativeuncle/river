import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api";

export function createSocket(agentToken?: string): Socket {
  return io(API_BASE, { auth: agentToken ? { agentToken } : {}, autoConnect: true });
}
