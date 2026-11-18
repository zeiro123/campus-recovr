// Notification center: claims, messages and system alerts, newest first.
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "flowbite-react";
import {
  FaBell,
  FaCheckDouble,
  FaComments,
  FaExclamationTriangle,
  FaHandshake,
  FaInfoCircle,
} from "react-icons/fa";
import {
  useGetMyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../redux/api/claimsApi";
import { useUserVerification } from "../../auth/auth";
import { getSocket } from "../../lib/socket";
import { store } from "../../redux/store";
import { baseApi } from "../../redux/api/baseApi";
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const iconFor = (type: string) => {
  if (type === "claim")
    return { Icon: FaHandshake, color: "text-accent", bg: "bg-accent/10" };
  if (type === "message")
    return { Icon: FaComments, color: "text-ok", bg: "bg-ok/10" };
  return { Icon: FaInfoCircle, color: "text-ink-mute", bg: "bg-surface-3" };
};

const Notifications = () => {
  const navigate = useNavigate();
  const users = useUserVerification();
  const { data, isLoading, refetch } = useGetMyNotificationsQuery(undefined, {
    skip: !users?.email,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  // Live updates via socket.
  useEffect(() => {
    if (!users?.email) return;
    const s = getSocket();
    if (!s) return;
    const onNotification = () => {
      store.dispatch(
        baseApi.util.invalidateTags(["notifications", "claims", "myClaims"])
      );
    };
    const onRead = () => {
      store.dispatch(baseApi.util.invalidateTags(["notifications"]));
    };
    s.on("notification", onNotification);
    s.on("notifications:read", onRead);
    return () => {
      s.off("notification", onNotification);
      s.off("notifications:read", onRead);
    };
  }, [users?.email]);

  const notifications = useMemo(
    () => data?.data?.notifications ?? [],
    [data]
  );
  const unreadCount = data?.data?.unreadCount ?? 0;

  const open = async (n: {
    id: string;
    read: boolean;
    link?: string | null;
  }) => {
    try {
      if (!n.read) await markRead(n.id).unwrap();
      if (n.link) navigate(n.link);
    } catch {
      /* non-fatal */
    }
  };

  const markEverything = async () => {
    try {
      await markAllRead().unwrap();
      toastNotify({ message: "All notifications marked as read", status: true });
      refetch();
    } catch {
      toastNotify({ message: "Could not mark notifications as read", status: false });
    }
  };

  return (
    <section className="page px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-ink">
              <FaBell className="text-accent" /> Notifications
            </h1>
            <p className="mt-1 text-sm text-ink-dim">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markEverything}
              disabled={markingAll}
              className="btn btn-outline flex items-center gap-2 px-3 py-2 text-sm"
            >
              <FaCheckDouble className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {isLoading ? (
            <div className="grid min-h-[30vh] place-items-center">
              <Spinner size="lg" className="text-accent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-card py-16 text-center">
              <FaBell className="h-8 w-8 text-ink-mute" />
              <p className="mt-3 text-sm text-ink-dim">
                Nothing yet — claim and message alerts will show up here.
              </p>
            </div>
          ) : (
            notifications.map((n: any) => {
              const { Icon, color, bg } = iconFor(n.type);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => open(n)}
                  className={`flex w-full items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition hover:border-accent/50 ${
                    n.read
                      ? "border-line bg-card"
                      : "border-accent/40 bg-accent/[0.06]"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bg} ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`truncate font-semibold ${
                          n.read ? "text-ink-dim" : "text-ink"
                        }`}
                      >
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 line-clamp-2 block text-sm text-ink-dim">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] uppercase tracking-wider text-ink-mute">
                      {relativeTime(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && (
                    <span className="mt-1 shrink-0 text-[11px] font-medium text-accent">
                      Open
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-ink-mute">
          <FaExclamationTriangle className="h-3 w-3" />
          Tip: claim alerts also appear on the bell in the navbar.
        </p>
      </div>
    </section>
  );
};

export default Notifications;
