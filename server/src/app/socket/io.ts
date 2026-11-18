// Holder for the Socket.IO server instance, set once in server.ts so any
// service (e.g. chat) can push realtime events to connected users.
import type { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export const setIo = (server: IOServer) => {
  io = server;
};

export const getIo = () => io;
