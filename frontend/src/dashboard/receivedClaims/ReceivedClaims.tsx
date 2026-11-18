/* eslint-disable @typescript-eslint/no-explicit-any */
// Claims received on the items I published — the publisher inbox as its own
// tab. Same table style as MyClaimReqPage; clicking a claim opens a tracking
// modal whose journey is drawn as a node-and-edge stepper (dotted edges) —
// one node per step of the claim process, done/pending/decided.
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaSearch,
  FaTimes,
  FaCalendarAlt,
  FaInbox,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaCheck,
  FaUndo,
  FaUserCircle,
  FaComments,
  FaBoxOpen,
  FaRoute,
} from "react-icons/fa";
import {
  useGetClaimsForMyItemsQuery,
  useViewClaimMutation,
  useUpdateClaimStatusMutation,
  useRequestClaimInfoMutation,
} from "../../redux/api/claimsApi";
import { useStartChatMutation } from "../../redux/api/chatApi";
import { useNavigate } from "react-router-dom";
import toastNotify from "../../components/modal/toastNotify";
import ItemPhoto from "../../components/item/ItemPhoto";
import "react-toastify/dist/ReactToastify.css";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ── Claim journey: nodes + dotted edges ─────────────────────────────────────
type StepState = "done" | "pending" | "warn" | "danger";
type Step = {
  key: string;
  label: string;
  note?: string;
  time?: string;
  icon: any;
  state: StepState;
};

const NODE_CLS: Record<StepState, string> = {
  done: "border-ok text-ok bg-white/[0.03]",
  pending: "border-line text-ink-mute bg-surface-2",
  warn: "border-warn text-warn bg-white/[0.03]",
  danger: "border-bad text-bad bg-white/[0.03]",
};

// One node per process step, derived from the claim's own fields:
// submitted → seen → [info requested] → decision → [appeal].
const buildSteps = (claim: any): Step[] => {
  const steps: Step[] = [];

  steps.push({
    key: "submitted",
    label: "Claim submitted",
    note: claim?.distinguishingFeatures || "The claimant did not add details.",
    time: fmtDate(claim?.createdAt),
    icon: <FaInbox />,
    state: "done",
  });

  steps.push({
    key: "seen",
    label: "Seen by you",
    note: claim?.viewedAt
      ? undefined
      : "Open this claim to mark it as seen — the claimant is notified.",
    time: fmtDate(claim?.viewedAt),
    icon: <FaEye />,
    state: claim?.viewedAt ? "done" : "pending",
  });

  if (claim?.infoRequest) {
    steps.push({
      key: "info",
      label: "More info requested",
      note: `You asked: "${claim.infoRequest}" — awaiting the claimant's response.`,
      icon: <FaInfoCircle />,
      state: "warn",
    });
  }

  if (claim?.status === "APPROVED") {
    steps.push({
      key: "decision",
      label: "Claim approved",
      note: "You verified the claimant — the item is being returned to them.",
      time: fmtDate(claim?.updatedAt),
      icon: <FaCheckCircle />,
      state: "done",
    });
  } else if (claim?.status === "REJECTED") {
    steps.push({
      key: "decision",
      label: "Claim rejected",
      note: claim?.rejectionReason
        ? `Reason given: "${claim.rejectionReason}"`
        : "No reason was provided.",
      time: fmtDate(claim?.updatedAt),
      icon: <FaTimesCircle />,
      state: "danger",
    });
  } else {
    steps.push({
      key: "decision",
      label: "Your decision",
      note: "Approve, reject, or ask the claimant for more information.",
      icon: <FaClock />,
      state: "pending",
    });
  }

  if (claim?.status === "REJECTED" && claim?.appealedAt) {
    steps.push({
      key: "appeal",
      label: "Appealed by the claimant",
      note: `Appeal: "${claim.appealMessage || "No message"}" — re-review and update your decision.`,
      time: fmtDate(claim?.appealedAt),
      icon: <FaUndo />,
      state: "warn",
    });
  }

  return steps;
};

// Vertical stepper: a node per step, dotted-line edges between them.
const ClaimJourney = ({ steps }: { steps: Step[] }) => (
  <ol>
    {steps.map((s, i) => {
      const last = i === steps.length - 1;
      return (
        <li key={s.key} className="flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm ${NODE_CLS[s.state]}`}
            >
              {s.icon}
            </span>
            {!last && (
              <span className="w-0 flex-1 border-l-2 border-dashed border-line-strong" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{s.label}</span>
              {s.time && (
                <span className="text-[11px] uppercase tracking-wider text-ink-mute">
                  {s.time}
                </span>
              )}
            </div>
            {s.note && (
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                {s.note}
              </p>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);

// Table badge — same nuance as ClaimsPanel.
const statusBadge = (c: any) => {
  if (c?.status === "APPROVED")
    return <span className="badge badge-ok"><FaCheckCircle className="h-3 w-3" /> Approved</span>;
  if (c?.status === "REJECTED")
    return <span className="badge badge-danger"><FaTimesCircle className="h-3 w-3" /> Rejected</span>;
  if (c?.appealedAt)
    return <span className="badge badge-warn"><FaUndo className="h-3 w-3" /> Appealed</span>;
  if (c?.infoRequest)
    return <span className="badge badge-warn"><FaInfoCircle className="h-3 w-3" /> Info requested</span>;
  if (c?.viewedAt)
    return <span className="badge badge-warn"><FaClock className="h-3 w-3" /> Being reviewed</span>;
  return <span className="badge badge-warn"><FaInbox className="h-3 w-3" /> New</span>;
};

const ReceivedClaimsPage = () => {
  const { data, isLoading } = useGetClaimsForMyItemsQuery();
  const [viewClaim] = useViewClaimMutation();
  const [updateClaimStatus, { isLoading: deciding }] =
    useUpdateClaimStatusMutation();
  const [requestClaimInfo] = useRequestClaimInfoMutation();
  const [startChat] = useStartChatMutation();
  const navigate = useNavigate();

  // Filters — same style as the "My claims" tab.
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Tracking modal + inline decision forms.
  const [tracking, setTracking] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [askingInfo, setAskingInfo] = useState(false);
  const [infoText, setInfoText] = useState("");

  const claims = useMemo(() => data?.data ?? [], [data]);

  const filteredAndSorted = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = claims.filter((c: any) => {
      const item = c?.foundItem ?? c?.lostItem;
      const haystack = [
        c?.foundItem?.foundItemName,
        c?.lostItem?.lostItemName,
        item?.description,
        item?.location,
        c?.distinguishingFeatures,
        c?.user?.name,
        c?.user?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = term === "" || haystack.includes(term);
      const matchesStatus =
        statusFilter === "ALL" || c?.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a: any, b: any) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case "status":
          aValue = a?.status || "";
          bValue = b?.status || "";
          break;
        case "claimant":
          aValue = a?.user?.username?.toLowerCase() || "";
          bValue = b?.user?.username?.toLowerCase() || "";
          break;
        default:
          aValue = new Date(a?.createdAt || 0).getTime();
          bValue = new Date(b?.createdAt || 0).getTime();
      }
      if (sortOrder === "asc") return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [claims, searchTerm, statusFilter, sortBy, sortOrder]);

  // Opening a claim marks unseen ones as viewed (claimant sees "being reviewed").
  const openTrack = (claim: any) => {
    setTracking(claim);
    setRejecting(false);
    setRejectReason("");
    setAskingInfo(false);
    setInfoText("");
    if (claim?.status === "PENDING" && !claim?.viewedAt) {
      viewClaim(claim.id).catch(() => {});
    }
  };

  const itemNameOf = (c: any) =>
    c?.foundItem?.foundItemName ?? c?.lostItem?.lostItemName ?? "Item";
  const itemLinkOf = (c: any) =>
    c?.foundItem ? `/foundItems/${c.foundItem.id}` : `/lostItems/${c?.lostItem?.id}`;

  const decide = async (claim: any, status: "APPROVED" | "REJECTED") => {
    try {
      await updateClaimStatus({
        claimId: claim.id,
        status,
        rejectionReason: status === "REJECTED" ? rejectReason.trim() || undefined : undefined,
      }).unwrap();
      toastNotify({
        message:
          status === "APPROVED"
            ? "Claim approved — the claimant has been notified."
            : "Claim rejected — the claimant has been notified.",
        status: true,
      });
      setTracking(null);
      setRejecting(false);
      setRejectReason("");
    } catch (err: any) {
      toastNotify({
        message: err?.data?.message || "Could not update the claim",
        status: false,
      });
    }
  };

  const askInfo = async (claim: any) => {
    if (!infoText.trim()) return;
    try {
      await requestClaimInfo({ claimId: claim.id, message: infoText }).unwrap();
      toastNotify({
        message: "Information request sent to the claimant",
        status: true,
      });
      setAskingInfo(false);
      setInfoText("");
    } catch (err: any) {
      toastNotify({
        message: err?.data?.message || "Could not send the request",
        status: false,
      });
    }
  };

  const messageClaimer = async (claim: any) => {
    try {
      const res: any = await startChat({
        userId: claim?.user?.id,
        item: {
          name: itemNameOf(claim),
          type: claim?.foundItemId ? "found" : "lost",
        },
      }).unwrap();
      const chatId = res?.data?.id ?? res?.data?.chat?.id;
      if (chatId) navigate(`/messages/${chatId}`);
    } catch (err: any) {
      toastNotify({
        message: err?.data?.message || "Could not start a chat with the claimant",
        status: false,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <div className="section-head">
            <div className="skeleton mx-auto h-10 w-64" />
            <div className="skeleton mx-auto h-5 w-3/4 max-w-md" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row">
            <div className="skeleton h-12 flex-1" />
            <div className="skeleton h-12 w-48" />
          </div>
          <div className="card overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-b border-line p-6">
                <div className="flex items-center gap-4">
                  <div className="skeleton h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page pb-12">
      {/* Header Section */}
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="section-head">
          <h1 className="section-title">Claims on My Items</h1>
          <p className="section-sub">
            Track and manage the claims you have received on the items you
            listed — approve, reject, or ask the claimant for more information.
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card mb-8 p-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Search Input */}
            <div className="relative flex-1">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by item, claimant, or claim details..."
                className="field pl-12 pr-12"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-mute transition-colors hover:text-ink"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="field"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split("-");
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="field"
              >
                <option value="createdAt-desc">Latest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="claimant-asc">Claimant (A-Z)</option>
                <option value="claimant-desc">Claimant (Z-A)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-ink-dim">
            {filteredAndSorted.length > 0 ? (
              <span>
                Showing {filteredAndSorted.length} claim
                {filteredAndSorted.length !== 1 ? "s" : ""}
                {searchTerm && (
                  <span className="ml-2 text-accent">for "{searchTerm}"</span>
                )}
                {statusFilter !== "ALL" && (
                  <span className="ml-2 text-accent">
                    with status "{statusFilter}"
                  </span>
                )}
              </span>
            ) : (
              <span>No claims found</span>
            )}
          </div>
        </div>

        {/* Claims Table */}
        {filteredAndSorted.length === 0 ? (
          <div className="py-16 text-center">
            <div className="card mx-auto max-w-md p-12">
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface-2">
                <FaInbox className="text-2xl text-ink-mute" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-ink">
                No Claims Received
              </h3>
              <p className="mb-6 text-ink-dim">
                {searchTerm || statusFilter !== "ALL"
                  ? "No claims match your current filters. Try adjusting your search or filter criteria."
                  : "No one has claimed your listed items yet. When they do, the claims will appear here for you to track and manage."}
              </p>
              {(searchTerm || statusFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                  className="btn btn-outline mr-4"
                >
                  Clear Filters
                </button>
              )}
              <Link to="/dashboard/myFoundItems" className="btn btn-brand">
                View My Listed Items
              </Link>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-white/[0.02]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                      Claimant
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                      Claim Date
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAndSorted.map((claim: any) => {
                    const item = claim?.foundItem ?? claim?.lostItem;
                    return (
                      <tr
                        key={claim.id}
                        onClick={() => openTrack(claim)}
                        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4 text-sm text-ink-dim">
                          <div className="flex items-center">
                            <div className="mr-4 w-12 flex-shrink-0">
                              <ItemPhoto
                                src={item?.img}
                                alt={itemNameOf(claim)}
                                className="h-12 w-12 rounded-lg border border-line"
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-ink">
                                {itemNameOf(claim)}
                              </div>
                              <div className="max-w-xs truncate text-sm text-ink-mute">
                                {claim?.distinguishingFeatures ||
                                  item?.description ||
                                  "No details provided."}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-dim">
                          <div className="flex items-center gap-3">
                            {claim?.user?.userImg ? (
                              <img
                                src={claim.user.userImg}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <FaUserCircle className="h-8 w-8 text-ink-mute" />
                            )}
                            <span>
                              {claim?.user?.name ||
                                claim?.user?.username ||
                                "Unknown user"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {statusBadge(claim)}
                          {claim?.infoRequest && claim?.status === "PENDING" && (
                            <p className="mt-1.5 max-w-[16rem] text-xs text-ink-mute">
                              You asked: "{claim.infoRequest}"
                            </p>
                          )}
                          {claim?.rejectionReason &&
                            claim?.status === "REJECTED" && (
                              <p className="mt-1.5 max-w-[16rem] text-xs text-ink-mute">
                                Reason: "{claim.rejectionReason}"
                              </p>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-dim">
                          <div className="flex items-center">
                            <FaCalendarAlt className="mr-2 text-ink-mute" />
                            <span>
                              {fmtDate(claim?.createdAt) ||
                                "Date not available"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="flex flex-wrap items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openTrack(claim)}
                              className="btn btn-outline btn-sm"
                            >
                              <FaRoute />
                              Track
                            </button>
                            {claim?.status === "PENDING" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => decide(claim, "APPROVED")}
                                  disabled={deciding}
                                  className="btn btn-brand btn-sm disabled:opacity-50"
                                >
                                  <FaCheck />
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTracking(claim);
                                    setRejecting(true);
                                    setAskingInfo(false);
                                    setRejectReason("");
                                  }}
                                  className="btn btn-outline btn-sm text-rose-300"
                                >
                                  <FaTimes />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tracking modal — claim journey as nodes + dotted edges */}
      {tracking && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
          onClick={() => setTracking(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <ItemPhoto
                  src={(tracking?.foundItem ?? tracking?.lostItem)?.img}
                  alt={itemNameOf(tracking)}
                  className="h-16 w-16 rounded-xl border border-line"
                />
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {itemNameOf(tracking)}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {statusBadge(tracking)}
                    <Link
                      to={itemLinkOf(tracking)}
                      onClick={() => setTracking(null)}
                      className="text-xs text-accent hover:underline"
                    >
                      View item
                    </Link>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTracking(null)}
                aria-label="Close claim tracking"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            {/* Claimant summary */}
            <div className="mb-6 rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                {tracking?.user?.userImg ? (
                  <img
                    src={tracking.user.userImg}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <FaUserCircle className="h-10 w-10 text-ink-mute" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {tracking?.user?.name ||
                      tracking?.user?.username ||
                      "Unknown user"}
                  </p>
                  <p className="text-xs text-ink-mute">
                    Claimed {fmtDate(tracking?.createdAt)}
                    {tracking?.lostDate
                      ? ` · says they ${tracking?.foundItemId ? "found" : "lost"} it around ${fmtDate(tracking.lostDate)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => messageClaimer(tracking)}
                  className="btn btn-outline btn-sm"
                >
                  <FaComments />
                  Message
                </button>
              </div>
              {tracking?.distinguishingFeatures && (
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                  <span className="font-medium text-ink-mute">Claims:</span>{" "}
                  {tracking.distinguishingFeatures}
                </p>
              )}
            </div>

            {/* Journey — node/edge stepper */}
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-mute">
              Claim journey
            </h4>
            <div className="mb-6 pl-1">
              <ClaimJourney steps={buildSteps(tracking)} />
            </div>

            {/* Decision section — pending claims only */}
            {tracking?.status === "PENDING" && (
              <div className="border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decide(tracking, "APPROVED")}
                    disabled={deciding}
                    className="btn btn-brand px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <FaCheck />
                    Accept claim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(!rejecting);
                      setAskingInfo(false);
                    }}
                    className="btn btn-outline px-3 py-1.5 text-xs text-rose-300"
                  >
                    <FaTimes />
                    Reject claim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAskingInfo(!askingInfo);
                      setRejecting(false);
                    }}
                    className="btn btn-outline px-3 py-1.5 text-xs"
                  >
                    <FaInfoCircle />
                    Ask for info
                  </button>
                </div>

                {rejecting && (
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
                        onClick={() => setRejecting(false)}
                        className="btn border border-line px-3 py-1.5 text-xs text-ink-dim"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(tracking, "REJECTED")}
                        disabled={deciding}
                        className="btn bg-rose-500/90 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                      >
                        Confirm rejection
                      </button>
                    </div>
                  </div>
                )}

                {askingInfo && (
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
                        onClick={() => setAskingInfo(false)}
                        className="btn border border-line px-3 py-1.5 text-xs text-ink-dim"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => askInfo(tracking)}
                        disabled={!infoText.trim()}
                        className="btn btn-brand px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        Send request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivedClaimsPage;
