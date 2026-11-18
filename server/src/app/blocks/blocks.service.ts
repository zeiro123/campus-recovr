import { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  userImg: true,
} as const;

const blockUser = async (blockerId: string, blockedId: string) => {
  if (blockerId === blockedId) throw new Error("You cannot block yourself");
  const target = await prisma.user.findFirst({
    where: { id: blockedId, isDeleted: false },
  });
  if (!target) throw new Error("User not found");
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) return existing;
  return prisma.block.create({ data: { blockerId, blockedId } });
};

const unblockUser = async (blockerId: string, blockedId: string) => {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  return { success: true };
};

const getBlockedUsers = async (blockerId: string) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId },
    include: { blocked: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return blocks.map((b) => ({
    id: b.id,
    userId: b.blockedId,
    username: b.blocked.username,
    name: b.blocked.name,
    userImg: b.blocked.userImg,
  }));
};

// Is there a block between these two users in either direction?
const isBlockedBetween = async (a: string, b: string) => {
  const count = await prisma.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
};

export const blocksService = { blockUser, unblockUser, getBlockedUsers, isBlockedBetween };
