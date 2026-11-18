// Realtime socket (Socket.IO) for chat — connects lazily once a session
// exists, carrying the app's JWT in the handshake for server-side auth.
import { io, Socket } from "socket.io-client";
import { getUserLocalStorage } from "../auth/auth";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");
const socketUrl = serverUrl || "http://localhost:5001";

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
