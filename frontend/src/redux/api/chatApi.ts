/* eslint-disable @typescript-eslint/no-explicit-any */
// RTK Query endpoints for 1:1 chat and the profile phone number.
// Threads poll on an interval so the UI stays live without websockets.
import { baseApi } from "./baseApi";

const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // get-or-create a 1:1 conversation with a user
    startChat: builder.mutation({
      query: (userId: string) => ({
        url: "/chats",
        method: "POST",
        body: { userId },
      }),
    }),
    // my conversations, newest activity first (last message + unread counts)
    getMyChats: builder.query<any[], void>({
      query: () => ({ url: "/my/chats", method: "GET" }),
      providesTags: ["chats"],
      pollingInterval: 5000,
    }),
    // full message thread of one conversation (marks incoming as read)
    getChatMessages: builder.query({
      query: (chatId: string) => ({
        url: `/chats/${chatId}/messages`,
        method: "GET",
      }),
      providesTags: (_r, _e, chatId: string) => [{ type: "chats", id: chatId }],
      pollingInterval: 3000,
    }),
    sendChatMessage: builder.mutation({
      query: ({ chatId, body }: { chatId: string; body: string }) => ({
        url: `/chats/${chatId}/messages`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: (_r, _e, arg: { chatId: string }) => [
        { type: "chats", id: arg.chatId },
        "chats",
      ],
    }),
    markChatRead: builder.mutation({
      query: (chatId: string) => ({
        url: `/chats/${chatId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["chats"],
    }),
    // profile phone number (powers the WhatsApp handoff)
    savePhone: builder.mutation({
      query: (phone: string) => ({
        url: "/user/phone",
        method: "PUT",
        body: { phone },
      }),
    }),
    // display name (social users can set an anonymous handle)
    saveName: builder.mutation({
      query: (name: string) => ({
        url: "/user/name",
        method: "PUT",
        body: { name },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useStartChatMutation,
  useGetMyChatsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkChatReadMutation,
  useSavePhoneMutation,
  useSaveNameMutation,
} = chatApi;
