import { Claim, status } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../config/prisma";
import { getIo } from "../../socket/io";

const CLAIM_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  userImg: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Create a realtime + persisted notification for a user.
const notify = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
  claimId?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link, claimId },
  });
  // Live push so unread badges update without polling.
  getIo()
    ?.to(`user:${userId}`)
    .emit("notification", { ...notification });
  return notification;
};

const createClaim = async (item: Claim, user: JwtPayload) => {
  const { foundItemId, lostItemId, distinguishingFeatures, lostDate } = item;
  if (!foundItemId && !lostItemId) {
    throw new Error("A claim must reference a found or lost item");
  }
  if (!distinguishingFeatures?.trim()) {
    throw new Error("Please describe the distinguishing features of your item");
  }

  // The item being claimed (found or lost) and its publisher.
  const foundItem = foundItemId
    ? await prisma.foundItem.findFirst({ where: { id: foundItemId, isDeleted: false } })
    : null;
  const lostItem = lostItemId
    ? await prisma.lostItem.findFirst({ where: { id: lostItemId, isDeleted: false } })
    : null;
  if (!foundItem && !lostItem) throw new Error("This item is no longer listed");
  if (foundItem && foundItem.isClaimed) {
    throw new Error("This item has already been claimed");
  }

  const publisherId = (foundItem ?? lostItem)!.userId;
  if (publisherId === user.id) {
    throw new Error("You cannot claim your own item");
  }

  const result = await prisma.claim.create({
    data: {
      foundItemId: foundItemId ?? null,
      lostItemId: lostItemId ?? null,
      distinguishingFeatures,
      lostDate: lostDate ? new Date(lostDate) : null,
      userId: user.id,
    },
    include: {
      user: { select: CLAIM_USER_SELECT },
      foundItem: foundItemId
        ? { include: { category: true, user: { select: CLAIM_USER_SELECT } } }
        : false,
      lostItem: lostItemId
        ? { include: { category: true, user: { select: CLAIM_USER_SELECT } } }
        : false,
    },
  });

  // Notify the publisher: "this user is claiming this item".
  const itemLabel = foundItem
    ? `found item "${foundItem.foundItemName}"`
    : `lost item "${lostItem!.lostItemName}"`;
  await notify(
    publisherId,
    "claim",
    `New claim on your ${itemLabel}`,
    `${user.name || user.username} is claiming this item — review it from your dashboard.`,
    foundItemId
      ? `/foundItems/${foundItemId}`
      : `/lostItems/${lostItemId}`,
    result.id
  );

  return result;
};

const claimInclude = (mine: boolean) => ({
  user: { select: CLAIM_USER_SELECT },
  foundItem: {
    include: { category: true, user: { select: CLAIM_USER_SELECT } },
  },
  lostItem: {
    include: { category: true, user: { select: CLAIM_USER_SELECT } },
  },
});

// Claims on MY published items (publisher view).
const getClaimsForMyItems = async (user: JwtPayload) => {
  const result = await prisma.claim.findMany({
    where: {
      isDeleted: false,
      OR: [
        { foundItem: { userId: user.id, isDeleted: false } },
        { lostItem: { userId: user.id, isDeleted: false } },
      ],
    },
    include: claimInclude(true),
    orderBy: { createdAt: "desc" },
  });
  return result;
};

const getMyClaim = async (user: JwtPayload) => {
  const result = await prisma.claim.findMany({
    where: {
      userId: user.id,
      OR: [
        { foundItem: { isDeleted: false } },
        { lostItem: { isDeleted: false } },
      ],
    },
    include: claimInclude(false),
    orderBy: { createdAt: "desc" },
  });
  return result;
};

const getClaim = async () => {
  const result = await prisma.claim.findMany({
    where: {
      isDeleted: false,
      OR: [{ foundItem: { isDeleted: false } }, { lostItem: { isDeleted: false } }],
    },
    include: claimInclude(false),
    orderBy: { createdAt: "desc" },
  });
  return result;
};

// Publisher marks a claim as viewed → status PENDING → VIEWED.
const viewClaim = async (claimId: string, user: JwtPayload) => {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");
  if (claim.viewedAt) return claim; // already viewed

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { viewedAt: new Date() },
  });

  await notify(
    claim.userId,
    "claim",
    "Your claim was viewed",
    "The publisher has seen your claim and is reviewing it.",
    claim.foundItemId ? `/foundItems/${claim.foundItemId}` : `/lostItems/${claim.lostItemId}`,
    claimId
  );
  return updated;
};

// Publisher asks the claimant for more information.
const requestInfo = async (
  claimId: string,
  message: string,
  user: JwtPayload
) => {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");
  const result = await prisma.claim.update({
    where: { id: claimId },
    data: { status: "PENDING", infoRequest: message.slice(0, 1000) },
  });
  await notify(
    claim.userId,
    "claim",
    "More information needed",
    message.slice(0, 300) || "The publisher needs more details about your claim.",
    claim.foundItemId ? `/foundItems/${claim.foundItemId}` : `/lostItems/${claim.lostItemId}`,
    claimId
  );
  return result;
};

// Claimant updates their claim with more info (and optionally appeals).
const updateClaimInfo = async (
  claimId: string,
  distinguishingFeatures: string,
  user: JwtPayload
) => {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");
  if (claim.userId !== user.id) throw new Error("You can only edit your own claim");
  if (claim.status === "APPROVED") throw new Error("This claim was already approved");
  const result = await prisma.claim.update({
    where: { id: claimId },
    data: { distinguishingFeatures: distinguishingFeatures.slice(0, 1000), infoRequest: null },
  });
  // Let the publisher know the claimant responded.
  const item = claim.foundItemId
    ? await prisma.foundItem.findUnique({ where: { id: claim.foundItemId } })
    : claim.lostItemId
    ? await prisma.lostItem.findUnique({ where: { id: claim.lostItemId } })
    : null;
  if (item) {
    await notify(
      item.userId,
      "claim",
      "Claim updated",
      `${user.name || user.username} added more information to their claim.`,
      claim.foundItemId ? `/foundItems/${claim.foundItemId}` : `/lostItems/${claim.lostItemId}`,
      claimId
    );
  }
  return result;
};

// Claimant appeals a rejected claim.
const appealClaim = async (
  claimId: string,
  message: string,
  user: JwtPayload
) => {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");
  if (claim.userId !== user.id) throw new Error("You can only appeal your own claim");
  if (claim.status !== "REJECTED") throw new Error("Only rejected claims can be appealed");
  if (claim.appealedAt) throw new Error("This claim was already appealed once");
  if (!message.trim()) throw new Error("Please explain why you are appealing");

  const result = await prisma.claim.update({
    where: { id: claimId },
    data: {
      status: "PENDING",
      appealMessage: message.slice(0, 1000),
      appealedAt: new Date(),
    },
  });
  // Notify the publisher about the appeal.
  const item = claim.foundItemId
    ? await prisma.foundItem.findUnique({ where: { id: claim.foundItemId } })
    : claim.lostItemId
    ? await prisma.lostItem.findUnique({ where: { id: claim.lostItemId } })
    : null;
  if (item) {
    await notify(
      item.userId,
      "claim",
      "Claim appeal",
      `${user.name || user.username} appealed their rejected claim — please re-review it.`,
      claim.foundItemId ? `/foundItems/${claim.foundItemId}` : `/lostItems/${claim.lostItemId}`,
      claimId
    );
  }
  return result;
};

const updateClaimStatus = async (claimId: string, data: Partial<Claim>, user: JwtPayload) => {
  // Start a transaction to ensure all updates happen together
  const result = await prisma.$transaction(async (tx) => {
    // Update the claim status
    const updatedClaim = await tx.claim.update({
      where: {
        id: claimId,
      },
      data,
      include: {
        foundItem: true,
        lostItem: true,
      },
    });

    const item = updatedClaim.foundItem ?? updatedClaim.lostItem;
    const itemPath = updatedClaim.foundItemId
      ? `/foundItems/${updatedClaim.foundItemId}`
      : `/lostItems/${updatedClaim.lostItemId}`;

    // If the claim is being approved
    if (data.status === "APPROVED") {
      // Mark the item as claimed/found (found items) or found (lost items)
      if (updatedClaim.foundItemId) {
        await tx.foundItem.update({
          where: { id: updatedClaim.foundItemId },
          data: { isClaimed: true },
        });
      } else if (updatedClaim.lostItemId) {
        await tx.lostItem.update({
          where: { id: updatedClaim.lostItemId },
          data: { isFound: true },
        });
      }

      // Reject all other pending claims for the same item
      const where = updatedClaim.foundItemId
        ? { foundItemId: updatedClaim.foundItemId }
        : { lostItemId: updatedClaim.lostItemId };
      await tx.claim.updateMany({
        where: {
          ...where,
          id: { not: claimId },
          status: "PENDING",
        },
        data: { status: "REJECTED", rejectionReason: "The item was claimed by someone else" },
      });
    }

    // If the claim is being rejected, check if there are any other approved claims
    if (data.status === "REJECTED") {
      if (updatedClaim.foundItemId) {
        const approvedClaims = await tx.claim.findMany({
          where: { foundItemId: updatedClaim.foundItemId, status: "APPROVED" },
        });
        if (approvedClaims.length === 0) {
          await tx.foundItem.update({
            where: { id: updatedClaim.foundItemId },
            data: { isClaimed: false },
          });
        }
      } else if (updatedClaim.lostItemId) {
        const approvedClaims = await tx.claim.findMany({
          where: { lostItemId: updatedClaim.lostItemId, status: "APPROVED" },
        });
        if (approvedClaims.length === 0) {
          await tx.lostItem.update({
            where: { id: updatedClaim.lostItemId },
            data: { isFound: false },
          });
        }
      }
    }

    return updatedClaim;
  });

  // Notify the claimant of the decision (outside the transaction).
  const item = result.foundItem ?? result.lostItem;
  if (item && data.status) {
    const itemName = (item as any).foundItemName ?? (item as any).lostItemName;
    const verdict = data.status === "APPROVED" ? "approved" : "rejected";
    await notify(
      result.userId,
      "claim",
      `Your claim was ${verdict}`,
      data.status === "APPROVED"
        ? `Your claim on "${itemName}" was approved — contact the publisher to arrange collection.`
        : `Your claim on "${itemName}" was rejected${data.rejectionReason ? `: ${data.rejectionReason}` : ""}. You can appeal once from your claims page.`,
      result.foundItemId ? `/foundItems/${result.foundItemId}` : `/lostItems/${result.lostItemId}`,
      claimId
    );
  }

  return result;
};

export const claimsService = {
  createClaim,
  getClaim,
  updateClaimStatus,
  getMyClaim,
  getClaimsForMyItems,
  viewClaim,
  requestInfo,
  updateClaimInfo,
  appealClaim,
};
