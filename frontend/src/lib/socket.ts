// Realtime socket (Socket.IO) for chat — connects lazily once a session
// exists, carrying the app's JWT in the handshake for server-side auth.
import { io, Socket } from "socket.io-client";
import { getUserLocalStorage } from "../auth/auth";
import { serverOrigin } from "../redux/api/baseApi";

const socketUrl = serverOrigin || undefined;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getUserLocalStorage();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
