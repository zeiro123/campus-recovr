import { status } from "../../global/globalValues";
import { z } from "zod";
const createClaim = z.object({
  body: z.object({
    foundItemId: z.string().optional(),
    lostItemId: z.string().optional(),
    distinguishingFeatures: z.string({
      required_error: "Distinguishing features of claim item field is required",
    }),
    lostDate: z.string().optional(),
  }),
});
const updateClaim = z.object({
  body: z.object({
    foundItemId: z.string().optional(),
    distinguishingFeatures: z.string().optional(),
    lostDate: z.string().optional(),
    status: z
      .enum([status.approved, status.pending, status.rejected])
      .optional(),
  },{message:"Invalid input"}),
});

export const ItemClaimSchema = {
  createClaim,
  updateClaim,
};
