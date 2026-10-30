import { Bookmark, Pin, Repeat2, Star, MoreHorizontal } from "lucide-react";
import {
  archivePostAction,
  resharePostAction,
  togglePostFlagAction,
  togglePostLikeCountAction,
  togglePostResharePermissionAction,
  toggleSavedPostAction,
} from "@/app/actions/social";

type PostControlsProps = {
  postId: string;
  isOwner: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  isFeatured?: boolean;
  isArchived?: boolean;
  allowReshare?: boolean;
  isReshareAllowed?: boolean;
  hideLikeCount?: boolean;
};

const buttonClass = "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-[#526058] hover:bg-[#f1f4ef]";

export function PostControls({
  postId,
  isOwner,
  isSaved = false,
  isPinned = false,
  isFeatured = false,
  isArchived = false,
  allowReshare = false,
  isReshareAllowed = false,
  hideLikeCount = false,
}: PostControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-[#edf0eb] px-3 py-2">
      {!isOwner && (
        <form action={toggleSavedPostAction.bind(null, postId)}>
          <button className={buttonClass} aria-label={isSaved ? "Kaydedilenlerden kaldır" : "Gönderiyi kaydet"}>
            <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Kaydedildi" : "Kaydet"}
          </button>
        </form>
      )}
      {!isOwner && allowReshare && (
        <form action={resharePostAction.bind(null, postId)}>
          <button className={buttonClass}><Repeat2 size={15} /> Yeniden paylaş</button>
        </form>
      )}
      {isOwner && (
        <details className="relative ml-auto">
          <summary className={`${buttonClass} cursor-pointer list-none`} aria-label="Gönderi seçenekleri">
            <MoreHorizontal size={17} /> Seçenekler
          </summary>
          <div className="absolute right-0 top-full z-10 mt-1 min-w-48 rounded-xl border border-[#e1e6df] bg-white p-1 shadow-xl">
            <form action={togglePostFlagAction.bind(null, postId, "pin")}>
              <button className={`${buttonClass} w-full`}><Pin size={15} /> {isPinned ? "Sabitlemeyi kaldır" : "Profile sabitle"}</button>
            </form>
            <form action={togglePostFlagAction.bind(null, postId, "feature")}>
              <button className={`${buttonClass} w-full`}><Star size={15} /> {isFeatured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}</button>
            </form>
            <form action={archivePostAction.bind(null, postId, !isArchived)}>
              <button className={`${buttonClass} w-full`}><Bookmark size={15} /> {isArchived ? "Arşivden çıkar" : "Arşive ekle"}</button>
            </form>
            <form action={togglePostResharePermissionAction.bind(null, postId)}>
              <button className={`${buttonClass} w-full`}><Repeat2 size={15} /> {isReshareAllowed ? "Yeniden paylaşımı kapat" : "Yeniden paylaşımı aç"}</button>
            </form>
            <form action={togglePostLikeCountAction.bind(null, postId)}>
              <button className={`${buttonClass} w-full`}>{hideLikeCount ? "Beğeni sayısını göster" : "Beğeni sayısını gizle"}</button>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}
