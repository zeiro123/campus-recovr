import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useGetSingleLostItemQuery } from "../../redux/api/api";
import {
  useCreateClaimMutation,
  useGetMyClaimsQuery,
} from "../../redux/api/claimsApi";
import { Spinner } from "flowbite-react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUser,
  FaTag,
  FaEnvelope,
  FaCheck,
  FaExclamationTriangle,
  FaHandshake,
  FaTimes,
} from "react-icons/fa";
import ContactActions from "../../components/item/ContactActions";
import ItemPhoto from "../../components/item/ItemPhoto";
import { getSessionUser } from "../../auth/auth";
import { getErrorMessage } from "../../utils/getErrorMessage";

const SingleLostItem = () => {
  const { lostItem: lostItemId } = useParams<{ lostItem: string }>();
  const { data: singleLostItem, isLoading } = useGetSingleLostItemQuery(
    lostItemId ?? "",
    { skip: !lostItemId }
  );

  const me = getSessionUser();
  const [createClaim, { isLoading: claimLoading }] = useCreateClaimMutation();
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  // claims I've already sent (to show "claim sent" instead of the button)
  const { data: myClaimsData } = useGetMyClaimsQuery(undefined, {
    skip: !me?.id,
  });
  const myClaimOnThisItem = (myClaimsData?.data ?? []).find(
    (c: any) => c.lostItemId === lostItemId
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ lostDate: string; distinguishingFeatures: string }>();

  const onSubmit = async (data: {
    lostDate: string;
    distinguishingFeatures: string;
  }) => {
    try {
      const res = await createClaim({
        lostItemId,
        distinguishingFeatures: data.distinguishingFeatures,
        lostDate: data.lostDate
          ? new Date(data.lostDate).toISOString()
          : undefined,
      });
      if (res?.error) {
        toast.error(
          getErrorMessage(res.error, "Failed to submit claim. Please try again.")
        );
      } else if (res.data?.success) {
        toast.success("Claim sent — the reporter has been notified!");
        setIsClaimModalOpen(false);
        reset();
      } else {
        toast.error("Failed to submit claim. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" className="mb-4 text-accent" />
          <p className="text-ink-dim">Loading lost item details...</p>
        </div>
      </div>
    );
  }

  const lostItem = singleLostItem?.data;

  // Handle case where item is not found
  if (!lostItem) {
    return (
      <div className="page flex items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-bad/30 bg-bad/10">
            <FaExclamationTriangle className="text-xl text-rose-300" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-ink">Item Not Found</h2>
          <p className="mb-6 text-ink-dim">
            The lost item you're looking for doesn't exist or may have been
            removed.
          </p>
          <Link to="/lostItems" className="btn btn-outline w-full">
            <FaArrowLeft />
            Back to Lost Items
          </Link>
        </div>
      </div>
    );
  }

  const {
    lostItemName,
    date,
    isFound,
    img,
    description,
    location,
    user,
    category,
    phone,
  } = lostItem;

  return (
    <div className="page">
      {/* Header with Back Button */}
      <div className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            to="/lostItems"
            className="link-accent mb-4 inline-flex items-center gap-2 text-sm"
          >
            <FaArrowLeft />
            Back to Lost Items
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-ink md:text-4xl">
            {lostItemName || "Lost Item"}
          </h1>
          <p className="text-ink-dim">Lost item details and information</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Section */}
          <div className="space-y-6">
            <div className="group relative">
              <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card">
                <ItemPhoto
                  src={img}
                  alt={lostItemName}
                  className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              </div>

              {/* Status Badge */}
              <div className="absolute right-4 top-4">
                {isFound ? (
                  <span className="badge badge-ok bg-surface/90 backdrop-blur-md">
                    <FaCheck />
                    Found
                  </span>
                ) : (
                  <span className="badge badge-danger bg-surface/90 backdrop-blur-md">
                    <FaExclamationTriangle />
                    Missing
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-8">
            {/* Description */}
            <div className="card p-6">
              <h2 className="mb-4 text-xl font-bold text-ink">Description</h2>
              <p className="leading-relaxed text-ink-dim">
                {description || "No description available for this item."}
              </p>
            </div>

            {/* Details */}
            <div className="card p-6">
              <dl className="divide-y divide-line">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-mute">
                    <FaCalendarAlt className="text-accent" />
                    Date Lost
                  </dt>
                  <dd className="text-right text-sm font-semibold text-ink">
                    {date
                      ? new Date(date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Date not specified"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-mute">
                    <FaMapMarkerAlt className="text-accent" />
                    Location
                  </dt>
                  <dd className="text-right text-sm font-semibold text-ink">
                    {location || "Location not specified"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-mute">
                    <FaTag className="text-accent" />
                    Category
                  </dt>
                  <dd className="text-right text-sm font-semibold text-ink">
                    {category?.name || "Uncategorized"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-mute">
                    <FaUser className="text-accent" />
                    Reported By
                  </dt>
                  <dd className="text-right text-sm font-semibold text-ink">
                    {user?.username || "Anonymous"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Contact Information */}
            <div className="card p-6">
              <h3 className="mb-4 text-lg font-bold text-ink">
                Found This Item?
              </h3>
              <p className="mb-6 leading-relaxed text-ink-dim">
                If you have found this item, claim it below or contact the
                owner to help reunite them with their belongings.
              </p>

              {!isFound ? (
                <div className="flex flex-col gap-4 sm:flex-row">
                  {myClaimOnThisItem ? (
                    <div className="flex-1 rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
                      <p className="flex items-center justify-center gap-2 font-medium text-accent-soft">
                        <FaHandshake /> Claim sent —{" "}
                        {myClaimOnThisItem.status === "PENDING"
                          ? myClaimOnThisItem.viewedAt
                            ? "being reviewed"
                            : "awaiting review"
                          : myClaimOnThisItem.status.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs text-ink-mute">
                        Track it from your claims page.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="btn btn-brand flex-1"
                    >
                      <FaHandshake />
                      Claim This Item
                    </button>
                  )}
                  <Link
                    to="/reportFoundItem"
                    className="btn btn-outline flex-1"
                  >
                    Report Found Item
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-ok/30 bg-ok/10 p-4 text-center">
                  <p className="font-medium text-emerald-300">
                    This item has been marked as found!
                  </p>
                </div>
              )}
            </div>

            {/* Claim modal */}
            {isClaimModalOpen && (
              <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
                <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-pop">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                        <FaHandshake className="text-accent" /> Claim this item
                      </h3>
                      <p className="mt-1 text-sm text-ink-dim">
                        Tell the reporter how you know this item — they'll be
                        notified and can approve or reject your claim.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(false)}
                      aria-label="Close claim modal"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-dim">
                        When did you find it?
                      </label>
                      <input
                        type="date"
                        {...register("lostDate")}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-dim">
                        Distinguishing features <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="e.g. Black Nike pouch with a UZ student card inside and a small scratch on the corner"
                        {...register("distinguishingFeatures", {
                          required: "Please describe the distinguishing features",
                        })}
                        className="field w-full resize-none"
                      />
                      {errors.distinguishingFeatures && (
                        <p className="mt-1 text-xs text-rose-400">
                          {errors.distinguishingFeatures.message}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsClaimModalOpen(false)}
                        className="btn border border-line px-4 py-2 text-sm text-ink-dim"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={claimLoading}
                        className="btn btn-brand px-4 py-2 text-sm disabled:opacity-50"
                      >
                        {claimLoading ? "Sending…" : "Send claim"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Message the reporter / WhatsApp handoff */}
            <ContactActions
              ownerUserId={user?.id}
              ownerUsername={user?.username}
              ownerPhone={user?.phone}
              itemPhone={phone}
              itemName={lostItemName}
              context="lost"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleLostItem;
