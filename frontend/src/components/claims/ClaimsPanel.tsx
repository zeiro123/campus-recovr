// Claims review panel for a published item: view claimers, approve/reject,
// request more info, and message the claimer on-platform.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaCheck,
  FaComments,
  FaHandshake,
  FaInfoCircle,
  FaTimes,
  FaUndo,
  FaUserCircle,
} from "react-icons/fa";
import {
  useGetClaimsForMyItemsQuery,
  useRequestClaimInfoMutation,
  useUpdateClaimStatusMutation,
  useViewClaimMutation,
} from "../../redux/api/claimsApi";
import { useStartChatMutation } from "../../redux/api/chatApi";

const relativeTime = (iso?: string) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const statusBadge = (c: any) => {
  if (c.status === "APPROVED")
    return <span className="badge badge-ok">Approved</span>;
  if (c.status === "REJECTED")
    return <span className="badge badge-danger">Rejected</span>;
  if (c.appealedAt)
    return (
      <span className="badge badge-warn">
        <FaUndo /> Appealed
      </span>
    );
  if (c.infoRequest)
    return (
      <span className="badge badge-warn">
        <FaInfoCircle /> Info requested
      </span>
    );
  if (c.viewedAt) return <span className="badge badge-warn">Being reviewed</span>;
  return <span className="badge badge-warn">New</span>;
};

type Props = {
  itemId: string;
  itemType: "lost" | "found";
};

const ClaimsPanel = ({ itemId, itemType }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetClaimsForMyItemsQuery();
  const [viewClaim] = useViewClaimMutation();
  const [updateClaimStatus, { isLoading: deciding }] =
    useUpdateClaimStatusMutation();
  const [requestClaimInfo] = useRequestClaimInfoMutation();
  const [startChat] = useStartChatMutation();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const [infoText, setInfoText] = useState("");

  const claims = (data?.data ?? []).filter((c: any) =>
    itemType === "lost" ? c.lostItemId === itemId : c.foundItemId === itemId
  );

  // Opening the panel marks new claims as viewed (claimant sees "being reviewed").
  useEffect(() => {
    const unseen = claims.filter(
      (c: any) => c.status === "PENDING" && !c.viewedAt
    );
    unseen.forEach((c: any) => {
      viewClaim(c.id).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, itemType, claims.length]);

  const decide = async (
    claimId: string,
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    try {
      await updateClaimStatus({
        claimId,
        status,
        rejectionReason: reason,
      }).unwrap();
      toast.success(
        status === "APPROVED"
          ? "Claim approved — the claimant has been notified and the item is being resolved."
          : "Claim rejected — the claimant has been notified."
      );
      setRejecting(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not update the claim");
    }
  };

  const askInfo = async (claimId: string) => {
    if (!infoText.trim()) return;
    try {
      await requestClaimInfo({ claimId, message: infoText }).unwrap();
      toast.success("Information request sent to the claimant");
      setInfoFor(null);
      setInfoText("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not send the request");
    }
  };

  const messageClaimer = async (claimerId: string, claimerName: string, itemName: string) => {
    try {
      const res: any = await startChat({
        userId: claimerId,
        item: { name: itemName, type: itemType },
      }).unwrap();
      const chatId = res?.data?.id ?? res?.data?.chat?.id;
      if (chatId) navigate(`/messages/${chatId}`);
    } catch (err: any) {
      toast.error(err?.data?.message || `Could not start a chat with ${claimerName}`);
    }
  };

  if (isLoading) {
    return <p className="p-4 text-sm text-ink-mute">Loading claims…</p>;
  }

  if (claims.length === 0) {
    return (
      <div className="p-6 text-center">
        <FaHandshake className="mx-auto h-7 w-7 text-ink-mute" />
        <p className="mt-2 text-sm text-ink-dim">
          No claims yet — when someone claims this item they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {claims.map((c: any) => (
        <div key={c.id} className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {c.user?.userImg ? (
              <img
                src={c.user.userImg}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <FaUserCircle className="h-10 w-10 shrink-0 text-ink-mute" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">
                  {c.user?.name || c.user?.username || "Unknown user"}
                </span>
                {statusBadge(c)}
                <span className="text-[11px] uppercase tracking-wider text-ink-mute">
                  {relativeTime(c.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
                <span className="font-medium text-ink-mute">Claims:</span>{" "}
                {c.distinguishingFeatures || "No details provided"}
              </p>
              {c.lostDate && (
                <p className="mt-0.5 text-xs text-ink-mute">
                  Says they found/lost it around{" "}
                  {new Date(c.lostDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {c.infoRequest && c.status === "PENDING" && (
                <p className="mt-1.5 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-1.5 text-xs text-accent-soft">
                  You asked: "{c.infoRequest}"
                </p>
              )}
              {c.appealMessage && (
                <p className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-1.5 text-xs text-amber-300">
                  <FaUndo className="mr-1 inline" /> Appeal: "{c.appealMessage}"
                </p>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => decide(c.id, "APPROVED")}
                      disabled={deciding}
                      className="btn btn-brand px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      <FaCheck /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(rejecting === c.id ? null : c.id);
                        setRejectReason("");
                      }}
                      className="btn btn-outline px-3 py-1.5 text-xs text-rose-300"
                    >
                      <FaTimes /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoFor(infoFor === c.id ? null : c.id);
                        setInfoText("");
                      }}
                      className="btn btn-outline px-3 py-1.5 text-xs"
                    >
                      <FaInfoCircle /> Ask for info
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    messageClaimer(
                      c.user?.id,
                      c.user?.username || "claimer",
                      itemType === "lost" ? "your lost item" : "your found item"
                    )
                  }
                  className="btn btn-outline px-3 py-1.5 text-xs"
                >
                  <FaComments /> Message
                </button>
              </div>

              {/* Reject reason */}
              {rejecting === c.id && (
                <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why are you rejecting? (optional — the claimant sees this)"
                    className="field text-sm"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRejecting(null)}
                      className="btn border border-line px-3 py-1.5 text-xs text-ink-dim"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        decide(c.id, "REJECTED", rejectReason.trim() || undefined)
                      }
                      disabled={deciding}
                      className="btn bg-rose-500/90 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Info request */}
              {infoFor === c.id && (
                <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
                  <textarea
                    rows={2}
                    value={infoText}
                    onChange={(e) => setInfoText(e.target.value)}
                    placeholder="What more do you need to know? e.g. Can you describe any marks inside the cover?"
                    className="field text-sm resize-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setInfoFor(null)}
                      className="btn border border-line px-3 py-1.5 text-xs text-ink-dim"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => askInfo(c.id)}
                      disabled={!infoText.trim()}
                      className="btn btn-brand px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      Send request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClaimsPanel;
