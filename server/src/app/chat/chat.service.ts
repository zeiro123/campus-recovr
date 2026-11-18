import { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";
import {
  Prisma,
  ChatMessage,
  Conversation,
} from "@prisma/client";
import { getIo } from "../socket/io";

const USER_SELECT = {
  id: true,
  username: true,
  userImg: true,
  role: true,
} satisfies Prisma.UserSelect;

type ChatWithUsers = Prisma.ConversationGetPayload<{
  include: {
    userOne: { select: typeof USER_SELECT };
    userTwo: { select: typeof USER_SELECT };
  };
}> & { messages?: ChatMessage[] };

const otherUserOf = (chat: ChatWithUsers, me: string) =>
  chat.userOneId === me ? chat.userTwo : chat.userOne;

const participantChat = async (me: string, chatId: string) => {
  const chat = await prisma.conversation.findFirst({
    where: { id: chatId, isDeleted: false },
    include: {
      userOne: { select: USER_SELECT },
      userTwo: { select: USER_SELECT },
    },
  });
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found");
  }
  if (chat.userOneId !== me && chat.userTwoId !== me) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You are not a participant in this conversation"
    );
  }
  return chat;
};

// Get (or create) the 1:1 conversation between the caller and another user.
// An optional item reference creates a highlighted first message in new chats.
const getOrCreateChat = async (
  me: JwtPayload,
  otherUserId: string,
  item?: { name?: string; type?: string }
) => {
  if (!otherUserId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
  }
  if (otherUserId === me.id) {
    throw new AppError(StatusCodes.BAD_REQUEST, "You cannot message yourself");
  }
  const other = await prisma.user.findFirst({
    where: { id: otherUserId, isDeleted: false },
    select: USER_SELECT,
  });
  if (!other) {
    throw new AppError(StatusCodes.NOT_FOUND, "User does not exist");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userOneId: me.id, userTwoId: otherUserId },
        { userOneId: otherUserId, userTwoId: me.id },
      ],
    },
    include: {
      userOne: { select: USER_SELECT },
      userTwo: { select: USER_SELECT },
    },
  });
  if (existing) {
    // If it was soft-deleted (delete conversation), restore it so the
    // @@unique([userOneId, userTwoId]) doesn't block the re-create.
    if (existing.isDeleted) {
      return prisma.conversation.update({
        where: { id: existing.id },
        data: { isDeleted: false },
        include: {
          userOne: { select: USER_SELECT },
          userTwo: { select: USER_SELECT },
        },
      });
    }
    return existing;
  }

  // Deterministic ordering so the @@unique([userOneId, userTwoId]) holds.
  const [one, two] = [me.id, otherUserId].sort();
  const created = await prisma.conversation.create({
    data: { userOneId: one, userTwoId: two },
    include: {
      userOne: { select: USER_SELECT },
      userTwo: { select: USER_SELECT },
    },
  });

  // Reference first message — highlights which item the chat is about.
  if (item?.name) {
    const kind = item.type === "found" ? "found" : "lost";
    await prisma.chatMessage.create({
      data: {
        conversationId: created.id,
        senderId: me.id,
        body: `📋 Regarding: ${kind} item "${item.name}"`,
      },
    });
  }

  return created;
};

const chatSummary = (chat: ChatWithUsers, me: string) => {
  const messages = chat.messages ?? [];
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const unreadCount = messages.filter(
    (m: ChatMessage) => m.senderId !== me && !m.isRead
  ).length;
  return {
    id: chat.id,
    otherUser: otherUserOf(chat, me),
    lastMessage: lastMessage
      ? { body: lastMessage.body, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
      : null,
    unreadCount,
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt,
  };
};

// All of the caller's conversations, newest activity first.
const getMyChats = async (me: JwtPayload) => {
  const chats = await prisma.conversation.findMany({
    where: {
      isDeleted: false,
      OR: [{ userOneId: me.id }, { userTwoId: me.id }],
    },
    include: {
      userOne: { select: USER_SELECT },
      userTwo: { select: USER_SELECT },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return chats.map((chat: any) => chatSummary(chat, me.id));
};

// Messages of one conversation (participant-only). Marks incoming as read.
const getChatMessages = async (
  me: JwtPayload,
  chatId: string,
  after?: string
) => {
  const chat = await participantChat(me.id, chatId);

  const where: Prisma.ChatMessageWhereInput = {
    conversationId: chat.id,
    isDeleted: false,
    // Messages the caller deleted for themselves are invisible to them.
    NOT: { deletedFor: { has: me.id } },
  };
  if (after) {
    const afterDate = new Date(after);
    if (!Number.isNaN(afterDate.getTime())) {
      where.createdAt = { gt: afterDate };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  if (after) {
    // Polling fetch — only newly arrived incoming messages need read receipts.
    const unreadIds = messages
      .filter((m: ChatMessage) => m.senderId !== me.id && !m.isRead)
      .map((m: ChatMessage) => m.id);
    if (unreadIds.length) {
      await prisma.chatMessage.updateMany({
        where: { id: { in: unreadIds } },
        data: { isRead: true },
      });
    }
  } else {
    // Full fetch — mark everything incoming as read.
    await prisma.chatMessage.updateMany({
      where: { conversationId: chat.id, senderId: { not: me.id }, isRead: false },
      data: { isRead: true },
    });
  }

  return {
    chat: { id: chat.id, otherUser: otherUserOf(chat, me.id) },
    messages,
  };
};

const sendMessage = async (
  me: JwtPayload,
  chatId: string,
  body: string,
  media?: { type?: string; url?: string }
) => {
  const text = (body ?? "").trim();
  const mediaType = (media?.type ?? "").trim().slice(0, 20);
  const mediaUrl = (media?.url ?? "").trim().slice(0, 500);
  if (!text && !mediaUrl) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
  }
  if (text.length > 2000) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Message is too long (max 2000 characters)");
  }
  const chat = await participantChat(me.id, chatId);

  // Personal blocks: if the recipient blocked me, I cannot message them
  // (the blocker can still reach out — only the blocked user is cut off).
  const otherId = chat.userOneId === me.id ? chat.userTwoId : chat.userOneId;
  const blocked = await prisma.block.count({
    where: { blockerId: otherId, blockedId: me.id },
  });
  if (blocked > 0) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can no longer message this user"
    );
  }

  const [message, updatedChat] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId: chat.id,
        senderId: me.id,
        body: text,
        mediaType,
        mediaUrl,
        deletedFor: [],
      },
    }),
    prisma.conversation.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Realtime push to both participants' personal rooms (Socket.IO).
  const client = getIo();
  if (client) {
    const payload = {
      conversationId: chat.id,
      message,
      senderId: me.id,
    };
    client.to(`user:${chat.userOneId}`).emit("message:new", payload);
    client.to(`user:${chat.userTwoId}`).emit("message:new", payload);
  }

  return { message, chat: { id: updatedChat.id } };
};

const markChatRead = async (me: JwtPayload, chatId: string) => {
  const chat = await participantChat(me.id, chatId);
  await prisma.chatMessage.updateMany({
    where: { conversationId: chat.id, senderId: { not: me.id }, isRead: false },
    data: { isRead: true },
  });
  return { id: chat.id, read: true };
};

const emitToParticipants = (chat: { userOneId: string; userTwoId: string }, event: string, payload: unknown) => {
  const client = getIo();
  if (!client) return;
  client.to(`user:${chat.userOneId}`).emit(event, payload);
  client.to(`user:${chat.userTwoId}`).emit(event, payload);
};

// Edit a message — sender only, marks it as edited.
const editMessage = async (
  me: JwtPayload,
  chatId: string,
  messageId: string,
  body: string
) => {
  const text = (body ?? "").trim();
  if (!text) throw new AppError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
  if (text.length > 2000) throw new AppError(StatusCodes.BAD_REQUEST, "Message is too long (max 2000 characters)");
  const chat = await participantChat(me.id, chatId);
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId: chat.id, isDeleted: false },
  });
  if (!message) throw new AppError(StatusCodes.NOT_FOUND, "Message not found");
  if (message.senderId !== me.id) throw new AppError(StatusCodes.FORBIDDEN, "You can only edit your own messages");

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { body: text, edited: true },
  });
  emitToParticipants(chat, "message:updated", {
    conversationId: chat.id,
    message: updated,
  });
  return updated;
};

// Delete a message — "everyone" (WhatsApp-style) or just for yourself.
const deleteMessage = async (
  me: JwtPayload,
  chatId: string,
  messageId: string,
  scope: string
) => {
  const chat = await participantChat(me.id, chatId);
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId: chat.id, isDeleted: false },
  });
  if (!message) throw new AppError(StatusCodes.NOT_FOUND, "Message not found");

  if (scope === "everyone") {
    if (message.senderId !== me.id) {
      throw new AppError(StatusCodes.FORBIDDEN, "You can only delete your own messages for everyone");
    }
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedForEveryone: true, body: "", mediaType: "", mediaUrl: "" },
    });
    emitToParticipants(chat, "message:updated", {
      conversationId: chat.id,
      message: updated,
    });
    return updated;
  }

  // Delete for myself only — the message stays visible to the other participant.
  const already = message.deletedFor.includes(me.id);
  const deletedFor = already ? message.deletedFor : [...message.deletedFor, me.id];
  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedFor },
  });
  return updated;
};

// Delete a conversation (participant only) — removes it from the inbox.
const deleteChat = async (me: JwtPayload, chatId: string) => {
  const chat = await participantChat(me.id, chatId);
  await prisma.conversation.update({
    where: { id: chat.id },
    data: { isDeleted: true },
  });
  return { id: chat.id, deleted: true };
};

export const chatService = {
  getOrCreateChat,
  getMyChats,
  getChatMessages,
  sendMessage,
  markChatRead,
  editMessage,
  deleteMessage,
  deleteChat,
};
