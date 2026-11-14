// On-platform chat: conversation list + message thread with live polling.
// No websockets by design — polling keeps it reliable behind any proxy.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaComments,
  FaPaperPlane,
  FaUserCircle,
} from "react-icons/fa";
import { Spinner } from "flowbite-react";
import {
  useGetChatMessagesQuery,
  useGetMyChatsQuery,
  useSendChatMessageMutation,
} from "../../redux/api/chatApi";
import { useUserVerification } from "../../auth/auth";
import { getSessionUser } from "../../auth/auth";

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

const ChatThread = ({ chatId }: { chatId: string }) => {
  const navigate = useNavigate();
  const user = getSessionUser();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const threadQuery = useGetChatMessagesQuery(chatId, {
    pollingInterval: 3000,
  });
  const [sendChatMessage, { isLoading: sending }] =
    useSendChatMessageMutation();

  const otherUser = threadQuery.data?.data?.chat?.otherUser;
  const messages = useMemo(
    () => threadQuery.data?.data?.messages ?? [],
    [threadQuery.data]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    try {
      await sendChatMessage({ chatId, body }).unwrap();
      setDraft("");
    } catch {
      /* the toast on failure is handled by the error layer; keep the draft */
    }
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
          <div>
            <p className="font-semibold leading-tight text-ink">
              {otherUser?.username || "Conversation"}
            </p>
            <p className="text-[11px] text-ink-mute">
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {threadQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" className="text-accent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FaComments className="h-8 w-8 text-ink-mute" />
              <p className="mt-3 text-sm text-ink-dim">
                No messages yet — say hi and ask about the item!
              </p>
            </div>
          ) : (
            messages.map((m: any) => {
              const mine = m.senderId === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "rounded-br-sm bg-accent text-white"
                        : "rounded-bl-sm bg-surface-2 text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {m.body}
                    </p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        mine ? "text-white/70" : "text-ink-mute"
                      }`}
                    >
                      {relativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="btn btn-brand flex h-11 w-11 items-center justify-center !p-0 disabled:opacity-50"
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
