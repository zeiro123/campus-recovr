import { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";
import { getIo } from "../socket/io";

const getMyNotifications = async (user: JwtPayload) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  return { notifications, unreadCount };
};

const getUnreadCount = async (user: JwtPayload) => {
  return prisma.notification.count({ where: { userId: user.id, read: false } });
};

const markRead = async (notificationId: string, user: JwtPayload) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== user.id) {
    throw new Error("Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

const markAllRead = async (user: JwtPayload) => {
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  // Live push so the badge clears instantly.
  getIo()?.to(`user:${user.id}`).emit("notifications:read");
  return { success: true };
};

export const notificationsService = {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
