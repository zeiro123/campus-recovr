import app from "./app";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import config from "./app/config/config";
import { setIo } from "./app/socket/io";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: ["http://localhost:5173", process.env.CLIENT_URL || "*"],
    credentials: true,
  },
});

// Handshake auth: only sessions carrying a valid app JWT may connect.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    const raw = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const payload = jwt.verify(raw, config.jwt_secrets as string) as {
      id?: string;
    };
    if (!payload?.id) return next(new Error("unauthorized"));
    socket.data.userId = payload.id;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  // Personal room — server pushes per-user events (messages, notifications).
  socket.join(`user:${socket.data.userId}`);
  socket.on("disconnect", () => {
    socket.leave(`user:${socket.data.userId}`);
  });

  // Typing indicator relay: the client emits "typing", the other participant
  // of the conversation receives "user:typing".
  socket.on(
    "typing",
    async (data: { conversationId?: string; typing?: boolean }) => {
      try {
        const conversationId = data?.conversationId;
        if (!conversationId) return;
        const prisma = (await import("./app/config/prisma")).default;
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, isDeleted: false },
          select: { userOneId: true, userTwoId: true },
        });
        if (!conversation) return;
        const other =
          conversation.userOneId === socket.data.userId
            ? conversation.userTwoId
            : conversation.userOneId;
        io.to(`user:${other}`).emit("user:typing", {
          conversationId,
          typing: Boolean(data.typing),
          userId: socket.data.userId,
        });
      } catch {
        /* ignore typing relay errors */
      }
    }
  );
});

setIo(io);

async function main() {
  server.listen(PORT, () => {
    console.log("port", PORT);
  });
}

main();
