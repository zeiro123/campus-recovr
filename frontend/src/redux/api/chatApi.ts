/* eslint-disable @typescript-eslint/no-explicit-any */
// RTK Query endpoints for 1:1 chat and the profile phone number.
// Threads poll on an interval so the UI stays live without websockets.
import { baseApi } from "./baseApi";

const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // get-or-create a 1:1 conversation with a user (optional item reference)
    startChat: builder.mutation({
      query: (data: { userId: string; item?: { name?: string; type?: string } }) => ({
        url: "/chats",
        method: "POST",
        body: data,
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
    // send a message (text and/or chat media)
    sendChatMessage: builder.mutation({
      query: ({
        chatId,
        body,
        media,
      }: {
        chatId: string;
        body?: string;
        media?: { type?: string; url?: string };
      }) => ({
        url: `/chats/${chatId}/messages`,
        method: "POST",
        body: { body, media },
      }),
      invalidatesTags: (_r, _e, arg: { chatId: string }) => [
        { type: "chats", id: arg.chatId },
        "chats",
      ],
    }),
    // edit a message (sender only)
    editChatMessage: builder.mutation({
      query: ({
        chatId,
        messageId,
        body,
      }: {
        chatId: string;
        messageId: string;
        body: string;
      }) => ({
        url: `/chats/${chatId}/messages/${messageId}`,
        method: "PATCH",
        body: { body },
      }),
      invalidatesTags: (_r, _e, arg: { chatId: string }) => [
        { type: "chats", id: arg.chatId },
      ],
    }),
    // delete a message: scope "self" (default) | "everyone"
    deleteChatMessage: builder.mutation({
      query: ({
        chatId,
        messageId,
        scope,
      }: {
        chatId: string;
        messageId: string;
        scope: string;
      }) => ({
        url: `/chats/${chatId}/messages/${messageId}?scope=${scope}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg: { chatId: string }) => [
        { type: "chats", id: arg.chatId },
      ],
    }),
    // delete a conversation from the inbox
    deleteChat: builder.mutation({
      query: (chatId: string) => ({
        url: `/chats/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["chats"],
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
  useEditChatMessageMutation,
  useDeleteChatMessageMutation,
  useDeleteChatMutation,
  useMarkChatReadMutation,
  useSavePhoneMutation,
  useSaveNameMutation,
} = chatApi;
