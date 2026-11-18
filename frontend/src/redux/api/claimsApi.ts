/* eslint-disable @typescript-eslint/no-explicit-any */
// RTK Query endpoints for the claims workflow, notifications and personal blocks.
import { baseApi } from "./baseApi";

const claimsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // claims on the items I published (publisher inbox)
    getClaimsForMyItems: builder.query<any[], void>({
      query: () => ({ url: "/my/items/claims", method: "GET" }),
      providesTags: ["claims"],
      pollingInterval: 10000,
    }),
    // my sent claims (claimant tracking view)
    getMyClaims: builder.query<any[], void>({
      query: () => ({ url: "/my/claims", method: "GET" }),
      providesTags: ["myClaims"],
      pollingInterval: 10000,
    }),
    // create a claim on a found or lost item
    createClaim: builder.mutation({
      query: (data: {
        foundItemId?: string;
        lostItemId?: string;
        distinguishingFeatures: string;
        lostDate?: string;
      }) => ({ url: "/claims", method: "POST", body: data }),
      invalidatesTags: ["claims", "myClaims"],
    }),
    // publisher marks a claim as viewed
    viewClaim: builder.mutation({
      query: (claimId: string) => ({
        url: `/claims/${claimId}/viewed`,
        method: "PUT",
      }),
      invalidatesTags: ["claims", "myClaims"],
    }),
    // publisher asks the claimant for more information
    requestClaimInfo: builder.mutation({
      query: ({ claimId, message }: { claimId: string; message: string }) => ({
        url: `/claims/${claimId}/request-info`,
        method: "PUT",
        body: { message },
      }),
      invalidatesTags: ["claims", "myClaims"],
    }),
    // claimant adds more information to their claim
    updateClaimInfo: builder.mutation({
      query: ({
        claimId,
        distinguishingFeatures,
      }: {
        claimId: string;
        distinguishingFeatures: string;
      }) => ({
        url: `/claims/${claimId}/update-info`,
        method: "PUT",
        body: { distinguishingFeatures },
      }),
      invalidatesTags: ["claims", "myClaims"],
    }),
    // claimant appeals a rejected claim
    appealClaim: builder.mutation({
      query: ({ claimId, message }: { claimId: string; message: string }) => ({
        url: `/claims/${claimId}/appeal`,
        method: "PUT",
        body: { message },
      }),
      invalidatesTags: ["claims", "myClaims"],
    }),
    // approve / reject a claim (publisher decision)
    updateClaimStatus: builder.mutation({
      query: ({
        claimId,
        status,
        rejectionReason,
      }: {
        claimId: string;
        status: string;
        rejectionReason?: string;
      }) => ({
        url: `/claims/${claimId}`,
        method: "PUT",
        body: { status, rejectionReason },
      }),
      invalidatesTags: ["claims", "myClaims", "lostItems", "foundItems"],
    }),

    // notifications
    getMyNotifications: builder.query<
      { notifications: any[]; unreadCount: number },
      void
    >({
      query: () => ({ url: "/my/notifications", method: "GET" }),
      providesTags: ["notifications"],
      pollingInterval: 15000,
    }),
    markNotificationRead: builder.mutation({
      query: (id: string) => ({
        url: `/notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["notifications"],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: "/notifications/read-all", method: "PUT" }),
      invalidatesTags: ["notifications"],
    }),

    // personal blocks
    getBlockedUsers: builder.query<any[], void>({
      query: () => ({ url: "/blocks", method: "GET" }),
      providesTags: ["blocks"],
    }),
    blockUser: builder.mutation({
      query: (userId: string) => ({
        url: "/blocks",
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["blocks"],
    }),
    unblockUser: builder.mutation({
      query: (userId: string) => ({
        url: `/blocks/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["blocks"],
    }),
  }),
});

export const {
  useGetClaimsForMyItemsQuery,
  useGetMyClaimsQuery,
  useCreateClaimMutation,
  useViewClaimMutation,
  useRequestClaimInfoMutation,
  useUpdateClaimInfoMutation,
  useAppealClaimMutation,
  useUpdateClaimStatusMutation,
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = claimsApi;
