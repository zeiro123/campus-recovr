import { useGetFoundItemsQuery } from "../../redux/api/api";
import type { FoundItem } from "../../types/types";
import { Link } from "react-router-dom";
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaCheckCircle,
  FaBoxOpen,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUser,
} from "react-icons/fa";
import { useState } from "react";
import ItemPhoto from "../../components/item/ItemPhoto";
import ContactActions from "../../components/item/ContactActions";

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Content of the expandable item panel (shared by the desktop side column and
// the mobile drawer). The panel is closed with the X — the grid reflows back.
const PanelBody = ({
  item,
  onClose,
}: {
  item: FoundItem;
  onClose: () => void;
}) => (
  <div className="flex h-full flex-col">
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
        Item details
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close item details"
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
      >
        <FaTimes className="h-4 w-4" />
      </button>
    </div>

    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className="relative">
        <ItemPhoto
          src={item?.img}
          alt={item?.foundItemName}
          className="h-48 w-full rounded-xl"
        />
        {item?.isClaimed ? (
          <span className="badge badge-ok absolute right-3 top-3 bg-surface/90 backdrop-blur-md">
            <FaCheckCircle className="h-3 w-3" />
            Claimed
          </span>
        ) : (
          <span className="badge badge-accent absolute right-3 top-3 bg-surface/90 backdrop-blur-md">
            <FaBoxOpen className="h-3 w-3" />
            Available
          </span>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-ink">{item?.foundItemName}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          {item?.description || "No description provided."}
        </p>
      </div>

      <dl className="divide-y divide-line rounded-xl bg-surface-2 px-3">
        <div className="flex items-center gap-2.5 py-2.5 text-sm">
          <FaCalendarAlt className="text-accent" />
          <span className="text-ink-mute">Date found</span>
          <span className="ml-auto font-medium text-ink">
            {formatDate(item?.date || item?.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2.5 py-2.5 text-sm">
          <FaMapMarkerAlt className="text-accent" />
          <span className="text-ink-mute">Location</span>
          <span className="ml-auto line-clamp-1 text-right font-medium text-ink">
            {item?.location || "Not specified"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 py-2.5 text-sm">
          <FaUser className="text-accent" />
          <span className="text-ink-mute">Found by</span>
          <span className="ml-auto font-medium text-ink">
            {item?.user?.username || "Anonymous"}
          </span>
        </div>
      </dl>

      <ContactActions
        ownerUserId={item?.user?.id}
        ownerUsername={item?.user?.username}
        ownerPhone={item?.user?.phone}
        itemPhone={item?.phone}
        itemName={item?.foundItemName || "this item"}
        context="found"
      />

      <Link
        to={`/foundItems/${item?.id}`}
        className="btn btn-outline w-full"
        onClick={onClose}
      >
        Open full page
      </Link>
    </div>
  </div>
);

const FoundItemsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);
  const [selected, setSelected] = useState<FoundItem | null>(null);

  const { data: foundItems, isLoading } = useGetFoundItemsQuery({
    page: currentPage,
    limit,
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = foundItems?.meta?.totalPage || 1;

  if (isLoading)
    return (
      <div className="page">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:py-6 lg:px-6">
          {/* Header Skeleton */}
          <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
            <div className="skeleton mx-auto h-9 w-64" />
            <div className="skeleton mx-auto h-5 w-3/4 max-w-md" />
          </div>

          {/* Cards Skeleton */}
          <div className="container mx-auto px-4">
            <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="card overflow-hidden">
                  <div className="skeleton h-56 rounded-none" />
                  <div className="p-6">
                    <div className="skeleton mb-3 h-6 w-2/3" />
                    <div className="mb-4 space-y-2">
                      <div className="skeleton h-4" />
                      <div className="skeleton h-4 w-3/4" />
                    </div>
                    <div className="mb-4 space-y-2">
                      <div className="skeleton h-4 w-1/2" />
                      <div className="skeleton h-4 w-2/3" />
                    </div>
                    <div className="skeleton h-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="page pb-16">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:py-6 lg:px-6">
        {/* Header Section */}
        <div className="section-head">
          <h2 className="section-title">All Found Items</h2>
          <p className="section-sub">
            Discover items that have been found and reported by our community
          </p>
        </div>

        {/* Search is handled by the AI Search page — browse-only listing here */}

        {/* Results Info */}
        <div className="mb-6">
          <p className="text-center text-sm font-medium text-ink-mute">
            {`Showing ${foundItems?.data?.length || 0} found items`}
          </p>
        </div>
      </div>
      {/* card items */}
      <div className="container mx-auto px-4">
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1">
            {foundItems?.data?.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-2xl border border-line bg-surface shadow-card">
                  <FaSearch className="text-2xl text-ink-mute" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-ink">
                  No found items yet
                </h3>
                <p className="mx-auto mb-6 max-w-md text-ink-dim">
                  No found items have been reported yet. Check back later or be
                  the first to report a found item!
                </p>
              </div>
            ) : (
              <div className="mx-auto grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {foundItems?.data?.map((foundItem: FoundItem) => {
                  const isSelected = selected?.id === foundItem?.id;
                  return (
                    <button
                      type="button"
                      key={foundItem?.id}
                      onClick={() => setSelected(isSelected ? null : foundItem)}
                      className={`card card-hover group flex aspect-square flex-col overflow-hidden p-0 text-left transition ${
                        isSelected ? "ring-2 ring-accent" : ""
                      }`}
                    >
                      <div className="relative min-h-0 flex-1 overflow-hidden">
                        <ItemPhoto
                          src={foundItem?.img}
                          alt={foundItem?.foundItemName}
                          className="h-full w-full"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                        {foundItem?.isClaimed ? (
                          <span className="badge badge-ok absolute right-2 top-2 bg-surface/90 text-[10px] backdrop-blur-md">
                            <FaCheckCircle className="h-2.5 w-2.5" />
                            Claimed
                          </span>
                        ) : (
                          <span className="badge badge-accent absolute right-2 top-2 bg-surface/90 text-[10px] backdrop-blur-md">
                            <FaBoxOpen className="h-2.5 w-2.5" />
                            Available
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 p-3">
                        <h3 className="mb-1.5 line-clamp-1 text-sm font-bold text-ink transition-colors group-hover:text-accent">
                          {foundItem?.foundItemName}
                        </h3>
                        <div className="space-y-1 text-xs text-ink-dim">
                          <div className="flex items-center gap-1.5">
                            <FaMapMarkerAlt className="h-3 w-3 shrink-0 text-ink-mute" />
                            <span className="line-clamp-1">
                              {foundItem?.location || "Location not set"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FaCalendarAlt className="h-3 w-3 shrink-0 text-ink-mute" />
                            <span>
                              {formatDate(
                                foundItem?.date || foundItem?.createdAt
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expanded item panel — desktop (sticky side column) */}
          {selected && (
            <aside className="sticky top-24 z-[60] hidden w-96 shrink-0 xl:block">
              <div className="card overflow-hidden">
                <PanelBody item={selected} onClose={() => setSelected(null)} />
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Expanded item panel — mobile / tablet drawer */}
      {selected && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="absolute inset-y-0 right-0 w-96 max-w-[92vw] overflow-y-auto bg-canvas shadow-pop">
            <div className="min-h-full border-l border-line">
              <PanelBody item={selected} onClose={() => setSelected(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex flex-col items-center space-y-4 pb-8">
          {/* Page Info */}
          <div className="text-sm text-ink-mute">
            Showing page {currentPage} of {totalPages} (
            {foundItems?.meta?.total || 0} total items)
          </div>

          <nav className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface p-2 shadow-card">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                currentPage === 1
                  ? "cursor-not-allowed text-ink-mute"
                  : "text-ink-dim hover:bg-white/5 hover:text-ink"
              }`}
            >
              <FaChevronLeft className="mr-2 h-3 w-3" />
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                const endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1
                );

                // Adjust startPage if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                // First page
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => handlePageChange(1)}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-white/5"
                    >
                      1
                    </button>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis1" className="px-2 text-ink-mute">
                        ...
                      </span>
                    );
                  }
                }

                // Visible pages
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePageChange(i)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        currentPage === i
                          ? "bg-accent-strong text-accent-ink"
                          : "text-ink-dim hover:bg-white/5"
                      }`}
                    >
                      {i}
                    </button>
                  );
                }

                // Last page
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis2" className="px-2 text-ink-mute">
                        ...
                      </span>
                    );
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => handlePageChange(totalPages)}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-white/5"
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? "cursor-not-allowed text-ink-mute"
                  : "text-ink-dim hover:bg-white/5 hover:text-ink"
              }`}
            >
              Next
              <FaChevronRight className="ml-2 h-3 w-3" />
            </button>
          </nav>

          {/* Quick Jump */}
          {totalPages > 10 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-mute">Go to page:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                  }
                }}
                className="field w-16 px-2 py-1 text-center"
              />
              <span className="text-ink-mute">of {totalPages}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FoundItemsPage;
