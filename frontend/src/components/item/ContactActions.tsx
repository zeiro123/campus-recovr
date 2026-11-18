// Contact actions on item detail pages: start an on-platform chat with the
// owner, or jump straight to their WhatsApp if they shared a number.
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaCommentDots, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useStartChatMutation } from "../../redux/api/chatApi";
import { getSessionUser } from "../../auth/auth";
import { Spinner } from "flowbite-react";

// Builds the wa.me deep link from a locally-entered number: strips formatting
// and assumes Zimbabwe's country code (263) when the number starts with 0.
const whatsappHref = (phone: string, text: string) => {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `263${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

type Props = {
  ownerUserId?: string;
  ownerUsername?: string;
  ownerPhone?: string;
  itemPhone?: string;
  itemName: string;
  context: "lost" | "found";
};

const ContactActions = ({
  ownerUserId,
  ownerUsername,
  ownerPhone,
  itemPhone,
  itemName,
  context,
}: Props) => {
  const navigate = useNavigate();
  const user = getSessionUser();
  const [startChat, { isLoading }] = useStartChatMutation();

  const isOwner = Boolean(user && ownerUserId && user.id === ownerUserId);
  // The item's own phone (set when reporting) wins over the profile phone.
  const contactPhone = (itemPhone && itemPhone.replace(/\D/g, "").length >= 7
    ? itemPhone
    : ownerPhone) as string | undefined;
  const hasPhone = Boolean(contactPhone && contactPhone.replace(/\D/g, "").length >= 7);

  const waText =
    context === "lost"
      ? `Hi ${ownerUsername || "there"}! I saw your lost item "${itemName}" on Campus RecovR and I think I can help.`
      : `Hi ${ownerUsername || "there"}! I saw the "${itemName}" you found on Campus RecovR — I think it's mine.`;

  const openChat = async () => {
    if (!ownerUserId) return;
    try {
      const res = await startChat(ownerUserId).unwrap();
      const chatId = res?.data?.id;
      if (chatId) {
        navigate(`/messages/${chatId}`);
      } else {
        toast.error("Could not open the conversation. Please try again.");
      }
    } catch (err: any) {
      toast.error(getErrMsg(err));
    }
  };

  if (isOwner) return null;

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-bold text-ink">
        {context === "lost" ? "Found this item?" : "Is this yours?"}
      </h2>
      <p className="mb-4 text-sm text-ink-dim">
        {context === "lost"
          ? "Message the person who reported it lost — or reach them on WhatsApp if they shared a number."
          : "Message the person who found it — or reach them on WhatsApp if they shared a number."}
      </p>
      {user ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openChat}
            disabled={isLoading || !ownerUserId}
            className="btn btn-brand flex items-center gap-2"
          >
            {isLoading ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              <FaCommentDots />
            )}
            Message on Campus RecovR
          </button>
          {hasPhone && (
            <a
              href={whatsappHref(contactPhone as string, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn flex items-center gap-2 border border-emerald-500/60 px-4 py-2 text-emerald-400 transition hover:bg-emerald-500/10"
            >
              <FaWhatsapp className="text-lg" />
              Chat on WhatsApp
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-dim">
          <Link to="/login" className="link-accent font-semibold">
            Log in
          </Link>{" "}
          to contact {ownerUsername || "the person"} about this item.
        </p>
      )}
    </div>
  );
};

const getErrMsg = (err: any) =>
  err?.data?.message || "Could not open the conversation. Please try again.";

export default ContactActions;
