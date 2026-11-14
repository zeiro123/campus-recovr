import { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";
import {
  Prisma,
  ChatMessage,
  Conversation,
} from "@prisma/client";

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
const getOrCreateChat = async (me: JwtPayload, otherUserId: string) => {
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
      isDeleted: false,
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
  body: string
) => {
  const text = (body ?? "").trim();
  if (!text) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Message cannot be empty");
  }
  if (text.length > 2000) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Message is too long (max 2000 characters)");
  }
  const chat = await participantChat(me.id, chatId);

  const [message, updatedChat] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { conversationId: chat.id, senderId: me.id, body: text },
    }),
    prisma.conversation.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    }),
  ]);
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

export const chatService = {
  getOrCreateChat,
  getMyChats,
  getChatMessages,
  sendMessage,
  markChatRead,
};
