import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { togglePostLikeAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";
import { CommentComposer } from "@/app/comment-composer";

type Person = {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  avatarScale?: number;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
};
type CommentItem = { id: string; content: string; gifUrl: string | null; gifLicense: string | null; gifAttributionUrl: string | null; user: Person };

type PostEngagementProps = {
  postId: string;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  likers: Person[];
  comments: CommentItem[];
  variant?: "feed" | "reel";
  hideLikeCount?: boolean;
};

export function PostEngagement({
  postId,
  likesCount,
  commentsCount,
  likedByCurrentUser,
  likers,
  comments,
  variant = "feed",
  hideLikeCount = false,
}: PostEngagementProps) {
  const isReel = variant === "reel";

  return (
    <section className={isReel ? "text-white" : "border-t border-[#edf0eb] px-4 py-3 text-[#202522]"}>
      <form action={togglePostLikeAction.bind(null, postId)}>
        <button
          type="submit"
          aria-label={likedByCurrentUser ? "Beğeniyi kaldır" : "Gönderiyi beğen"}
          className={`inline-flex items-center gap-2 rounded-full transition hover:scale-105 ${isReel ? "text-white" : "text-[#315b46]"}`}
        >
          <Heart size={isReel ? 25 : 21} fill={likedByCurrentUser ? "currentColor" : "none"} />
          {!hideLikeCount && <span className="text-sm font-semibold">{likesCount}</span>}
        </button>
      </form>

      {!hideLikeCount && likers.length > 0 && (
        <div className={`mt-2 flex flex-wrap items-center gap-x-1 text-xs ${isReel ? "text-white/75" : "text-[#68716b]"}`}>
          <span>Beğenenler:</span>
          {likers.map((person, index) => (
            <span key={person.username}>
              {index > 0 && ", "}
              <Link href={`/profile/${encodeURIComponent(person.username)}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                <UserAvatar {...person} className="size-5 text-[9px]" /> @{person.username}
              </Link>
            </span>
          ))}
          {likesCount > likers.length && <span> ve {likesCount - likers.length} kişi</span>}
        </div>
      )}

      <details className="group mt-3">
        <summary className={`flex cursor-pointer list-none items-center gap-2 text-sm ${isReel ? "text-white/90" : "text-[#526058]"}`}>
          <MessageCircle size={17} /> {commentsCount} yorum
        </summary>
        <div className={`mt-3 space-y-2 text-xs ${isReel ? "text-white/90" : "text-[#526058]"}`}>
          {comments.map((comment) => (
            <p key={comment.id} className="flex items-start gap-2 break-words">
              <UserAvatar {...comment.user} className="mt-0.5 size-6 text-[9px]" />
              <span><Link href={`/profile/${encodeURIComponent(comment.user.username)}`} className="mr-1 font-semibold hover:underline">
                @{comment.user.username}
              </Link>{comment.content !== "GIF" && comment.content}
                {comment.gifUrl && <span className="mt-1 block">
                  <a href={comment.gifAttributionUrl ?? "https://commons.wikimedia.org/"} target="_blank" rel="noreferrer" className="text-[10px] underline">GIF · {comment.gifLicense ?? "Wikimedia Commons"}</a>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comment.gifUrl} alt="Yorum GIF'i" loading="lazy" className="mt-1 max-h-40 rounded-lg" />
                </span>}
              </span>
            </p>
          ))}
          {commentsCount > comments.length && <p className="opacity-70">Son {comments.length} yorum gösteriliyor.</p>}
          <CommentComposer postId={postId} variant={variant} />
        </div>
      </details>
      {(likesCount > likers.length || commentsCount > comments.length) && (
        <Link href={`/post/${postId}`} className={`mt-3 inline-block text-xs font-semibold hover:underline ${isReel ? "text-white/80" : "text-[#557260]"}`}>
          Tüm etkileşimleri gör
        </Link>
      )}
    </section>
  );
}