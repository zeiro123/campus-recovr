// On-platform chat: conversation list + message thread, realtime via Socket.IO
// (with polling as a backstop) — emoji picker, typing indicator, media, edit,
// and WhatsApp-style date separators.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaComments,
  FaPaperPlane,
  FaUserCircle,
  FaPhoneAlt,
  FaMicrophone,
  FaSmile,
  FaPaperclip,
  FaEdit,
  FaEllipsisH,
  FaTrash,
  FaBan,
} from "react-icons/fa";
import { Spinner } from "flowbite-react";
import {
  useGetChatMessagesQuery,
  useGetMyChatsQuery,
  useSendChatMessageMutation,
  useEditChatMessageMutation,
  useDeleteChatMessageMutation,
  useDeleteChatMutation,
} from "../../redux/api/chatApi";
import {
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} from "../../redux/api/claimsApi";
import { useUserVerification, getSessionUser } from "../../auth/auth";
import { getSocket } from "../../lib/socket";
import { uploadImageFile } from "../../utils/uploadImage";
import toastNotify from "../../components/modal/toastNotify";

const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const Messages = () => {
  const { chatId } = useParams();
  const user = useUserVerification();
  const navigate = useNavigate();

  const chatsQuery = useGetMyChatsQuery(undefined, {
    skip: !user || Boolean(chatId),
    pollingInterval: 5000,
  });

  if (!user) {
    return (
      <section className="page flex items-center justify-center px-4 py-16">
        <div className="card max-w-md p-8 text-center">
          <FaComments className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-4 text-xl font-bold text-ink">Messages</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Log in to chat with people about lost and found items.
          </p>
          <Link to="/login" className="btn btn-brand mt-5 inline-flex">
            Log in
          </Link>
        </div>
      </section>
    );
  }

  if (chatId) {
    return <ChatThread chatId={chatId} />;
  }

  const chats = chatsQuery.data?.data ?? [];

  return (
    <section className="page px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ink md:text-3xl">Messages</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-dim">
            Your conversations about lost and found items. New messages arrive
            automatically.
          </p>
        </header>

        {chatsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : chats.length === 0 ? (
          <div className="card p-10 text-center">
            <FaComments className="mx-auto h-10 w-10 text-ink-mute" />
            <p className="mt-4 font-semibold text-ink">No conversations yet</p>
            <p className="mt-1 text-sm text-ink-dim">
              Open any lost or found item and use the{" "}
              <span className="font-medium text-ink">Message</span> button to
              start a chat.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/lostItems" className="btn btn-brand">
                Browse lost items
              </Link>
              <Link to="/foundItems" className="btn border border-line">
                Browse found items
              </Link>
            </div>
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden p-0">
            {chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => navigate(`/messages/${chat.id}`)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-surface-2"
              >
                {chat.otherUser?.userImg ? (
                  <img
                    src={chat.otherUser.userImg}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold uppercase text-ink-mute">
                    {(chat.otherUser?.username || "?").slice(0, 2)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ink">
                      {chat.otherUser?.username || "Unknown user"}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-mute">
                      {chat.lastMessage
                        ? relativeTime(chat.lastMessage.createdAt)
                        : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-dim">
                    {chat.lastMessage
                      ? `${chat.lastMessage.senderId === user.id ? "You: " : ""}${chat.lastMessage.body}`
                      : "No messages yet"}
                  </p>
                </div>
                {(chat.unreadCount ?? 0) > 0 && (
                  <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const EMOJIS = ["😀", "😂", "👍", "🙏", "🔥", "❤️", "😮", "😢", "🎉", "👏", "😍", "🤝"];

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const exactTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const ChatThread = ({ chatId }: { chatId: string }) => {
  const navigate = useNavigate();
  const user = getSessionUser();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [typingIncoming, setTypingIncoming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typingTimer = useRef<number | null>(null);

  const threadQuery = useGetChatMessagesQuery(chatId, {
    pollingInterval: 20000,
  });
  const [sendChatMessage, { isLoading: sending }] =
    useSendChatMessageMutation();
  const [editChatMessage] = useEditChatMessageMutation();
  const [deleteChatMessage] = useDeleteChatMessageMutation();
  const [deleteChat, { isLoading: deletingChat }] = useDeleteChatMutation();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();

  const otherUser = threadQuery.data?.data?.chat?.otherUser;
  const isBlocked = (blockedUsersData?.data ?? []).some(
    (b: any) => b.userId === otherUser?.id
  );

  const toggleBlock = async () => {
    if (!otherUser?.id) return;
    try {
      if (isBlocked) {
        await unblockUser(otherUser.id).unwrap();
        toastNotify({ message: "User unblocked", status: true });
      } else {
        await blockUser(otherUser.id).unwrap();
        toastNotify({
          message: "User blocked — they can no longer message you",
          status: true,
        });
      }
    } catch (err: any) {
      toastNotify({
        message: err?.data?.message || "Could not update the block",
        status: false,
      });
    }
  };
  const messages = useMemo(
    () => threadQuery.data?.data?.messages ?? [],
    [threadQuery.data]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingIncoming]);

  // Typing indicator — incoming
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onTyping = (d: { conversationId?: string; typing?: boolean }) => {
      if (d?.conversationId !== chatId) return;
      setTypingIncoming(Boolean(d.typing));
    };
    s.on("user:typing", onTyping);
    return () => {
      s.off("user:typing", onTyping);
    };
  }, [chatId]);

  const emitTyping = (typing: boolean) => {
    getSocket()?.emit("typing", { conversationId: chatId, typing });
  };

  const handleDraftChange = (v: string) => {
    setDraft(v);
    emitTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => emitTyping(false), 1500);
  };

  const send = async () => {
    const body = draft.trim();
    if ((!body && !mediaBusy) || sending) return;
    try {
      await sendChatMessage({ chatId, body }).unwrap();
      setDraft("");
      emitTyping(false);
    } catch {
      /* keep the draft on failure */
    }
  };

  const saveEdit = async () => {
    const body = editDraft.trim();
    if (!editing || !body) return;
    try {
      await editChatMessage({ chatId, messageId: editing.id, body }).unwrap();
      setEditing(null);
    } catch {
      /* keep the editor on failure */
    }
  };

  const removeMessage = async (messageId: string, scope: string) => {
    setMenuFor(null);
    try {
      await deleteChatMessage({ chatId, messageId, scope }).unwrap();
    } catch {
      /* handled by the error layer */
    }
  };

  const removeConversation = async () => {
    try {
      await deleteChat(chatId).unwrap();
      navigate("/messages", { replace: true });
    } catch {
      /* handled by the error layer */
    }
  };

  const sendMedia = async (file: File) => {
    if (!file) return;
    setMediaBusy(true);
    try {
      const url = await uploadImageFile(file);
      const kind = file.type.startsWith("image")
        ? "image"
        : file.type.startsWith("video")
        ? "video"
        : "audio";
      await sendChatMessage({ chatId, media: { type: kind, url } }).unwrap();
    } catch (err: any) {
      toastNotify({ message: err?.message || "Could not send the media", status: false });
    } finally {
      setMediaBusy(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setMediaBusy(true);
        try {
          const url = await uploadImageFile(file);
          await sendChatMessage({ chatId, media: { type: "voice", url } }).unwrap();
        } catch (err: any) {
          toastNotify({ message: err?.message || "Could not send the voice note", status: false });
        } finally {
          setMediaBusy(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toastNotify({ message: "Microphone access was denied", status: false });
    }
  };

  // Group messages by day for WhatsApp-style separators
  const visible = messages.filter((m: any) => !(m.deletedFor || []).includes(user?.id || ""));
  const groups: { day: string; items: any[] }[] = [];
  visible.forEach((m: any) => {
    const day = dayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  });

  const renderMedia = (m: any) => {
    if (!m.mediaUrl) return null;
    if (m.mediaType === "image") {
      return <img src={m.mediaUrl} alt="" className="mt-1 max-h-56 rounded-xl object-cover" />;
    }
    if (m.mediaType === "video") {
      return <video src={m.mediaUrl} controls className="mt-1 max-h-56 rounded-xl" />;
    }
    return <audio src={m.mediaUrl} controls className="mt-1 max-w-[16rem]" />;
  };

  return (
    <section className="page flex flex-col px-4 py-8 sm:px-6">
      <div className="mx-auto flex h-[calc(100vh-13rem)] min-h-[28rem] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/messages")}
            aria-label="Back to messages"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          {otherUser?.userImg ? (
            <img
              src={otherUser.userImg}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <FaUserCircle className="h-9 w-9 text-ink-mute" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight text-ink">
              {otherUser?.username || "Conversation"}
            </p>
            <p className="text-[11px] text-ink-mute">
              {typingIncoming ? (
                <span className="text-accent-soft">typing…</span>
              ) : (
                `${messages.length} message${messages.length === 1 ? "" : "s"}`
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              toastNotify({
                message: "Voice calls are coming soon — WhatsApp calls work in the meantime.",
                status: false,
              });
            }}
            aria-label="Voice call (coming soon)"
            title="Voice call — coming soon"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
          >
            <FaPhoneAlt className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleBlock}
            aria-label={isBlocked ? "Unblock user" : "Block user"}
            title={
              isBlocked ? "Unblock this user" : "Block this user (they can no longer message you)"
            }
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              isBlocked
                ? "text-rose-300 hover:bg-rose-500/10"
                : "text-ink-mute hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <FaBan className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={removeConversation}
            disabled={deletingChat}
            aria-label="Delete conversation"
            title="Delete conversation"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-rose-300"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {threadQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" className="text-accent" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FaComments className="h-8 w-8 text-ink-mute" />
              <p className="mt-3 text-sm text-ink-dim">
                No messages yet — say hi and ask about the item!
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.day}>
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-mute">
                    {g.day}
                  </span>
                </div>
                {g.items.map((m: any) => {
                  const mine = m.senderId === user?.id;
                  const isReference = (m.body || "").startsWith("📋 Regarding:");
                  const isDeletedForAll = m.deletedForEveryone;
                  if (isReference) {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="max-w-[85%] rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-center text-xs font-medium text-accent-soft">
                          {m.body}
                          <p className="mt-0.5 text-[10px] text-ink-mute">
                            {exactTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={m.id}
                      className={`group flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="relative max-w-[75%]">
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            isDeletedForAll
                              ? "bg-surface-2 italic text-ink-mute"
                              : mine
                              ? "rounded-br-sm bg-accent text-white"
                              : "rounded-bl-sm bg-surface-2 text-ink"
                          }`}
                        >
                          {isDeletedForAll ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              🚫 This message was deleted
                            </p>
                          ) : (
                            <>
                              {m.mediaUrl ? renderMedia(m) : null}
                              {m.body ? (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {m.body}
                                </p>
                              ) : null}
                            </>
                          )}
                          <p
                            className={`mt-1 text-right text-[10px] ${
                              mine && !isDeletedForAll ? "text-white/70" : "text-ink-mute"
                            }`}
                          >
                            {exactTime(m.createdAt)}
                            {m.edited && !isDeletedForAll ? " · edited" : ""}
                          </p>
                        </div>
                        {/* Message actions */}
                        <div
                          className={`absolute top-1 ${
                            mine ? "-left-8" : "-right-8"
                          } hidden group-hover:block`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setMenuFor(menuFor === m.id ? null : m.id)
                            }
                            aria-label="Message options"
                            className="grid h-6 w-6 place-items-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
                          >
                            <FaEllipsisH className="h-3 w-3" />
                          </button>
                        </div>
                        {menuFor === m.id && (
                          <div
                            className="fixed inset-0 z-50"
                            onClick={() => setMenuFor(null)}
                          >
                            <div
                              className={`absolute ${
                                mine ? "right-4" : "left-4"
                              } top-16 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-pop`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {mine && !isDeletedForAll && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing({ id: m.id, body: m.body });
                                    setEditDraft(m.body);
                                    setMenuFor(null);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-dim transition hover:bg-surface-2 hover:text-ink"
                                >
                                  <FaEdit className="h-3.5 w-3.5" /> Edit message
                                </button>
                              )}
                              {mine && !isDeletedForAll && (
                                <button
                                  type="button"
                                  onClick={() => removeMessage(m.id, "everyone")}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                                >
                                  <FaTrash className="h-3.5 w-3.5" /> Delete for
                                  everyone
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeMessage(m.id, "self")}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-dim transition hover:bg-surface-2"
                              >
                                <FaTrash className="h-3.5 w-3.5" /> Delete for me
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Inline edit */}
                        {editing?.id === m.id && (
                          <div className="mt-1 rounded-xl border border-accent/40 bg-surface-2 p-2">
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveEdit();
                                }
                                if (e.key === "Escape") setEditing(null);
                              }}
                              rows={2}
                              className="field max-h-24 w-full resize-none text-sm"
                              autoFocus
                            />
                            <div className="mt-1 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="btn border border-line px-2.5 py-1 text-xs text-ink-dim"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="btn btn-brand px-2.5 py-1 text-xs"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line p-3">
          {isBlocked && (
            <div className="mb-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-center text-sm text-rose-300">
              🚫 You blocked this user — they can't message you until you
              unblock them (ban icon above).
            </div>
          )}
          {showEmojis && (
            <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setDraft((d) => d + e);
                    handleDraftChange(draft + e);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:bg-surface-3"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowEmojis((v) => !v)}
              aria-label="Emoji picker"
              className="grid h-11 w-10 shrink-0 place-items-center rounded-lg text-ink-mute transition hover:text-ink"
            >
              <FaSmile className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach media"
              className="grid h-11 w-10 shrink-0 place-items-center rounded-lg text-ink-mute transition hover:text-ink"
            >
              {mediaBusy ? (
                <Spinner size="sm" className="text-accent" />
              ) : (
                <FaPaperclip className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) sendMedia(f);
                e.target.value = "";
              }}
            />
            <textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Type a message… (Enter to send)"
              className="field max-h-32 min-h-11 flex-1 resize-none"
            />
            <button
              type="button"
              onClick={toggleRecording}
              aria-label={recording ? "Stop recording" : "Record voice note"}
              title={recording ? "Stop & send" : "Record voice note"}
              className={`grid h-11 w-10 shrink-0 place-items-center rounded-lg transition ${
                recording
                  ? "bg-rose-500/20 text-rose-300"
                  : "text-ink-mute hover:text-ink"
              }`}
            >
              {recording ? (
                <span className="h-3 w-3 animate-pulse rounded-full bg-rose-400" />
              ) : (
                <FaMicrophone className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="btn btn-brand flex h-11 w-11 shrink-0 items-center justify-center !p-0 disabled:opacity-50"
            >
              {sending ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                <FaPaperPlane className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Messages;
