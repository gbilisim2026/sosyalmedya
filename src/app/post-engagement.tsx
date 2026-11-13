import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { togglePostLikeAction } from "@/app/actions/social";
import { UserAvatar } from "@/app/user-avatar";
import { CommentComposer } from "@/app/comment-composer";
import { PostShareButton } from "@/app/post-share-button";

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
      <div className="flex items-center gap-1">
        <form action={togglePostLikeAction.bind(null, postId)}>
          <button
            type="submit"
            aria-label={likedByCurrentUser ? "Beğeniyi kaldır" : "Gönderiyi beğen"}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition hover:scale-105 active:scale-95 ${isReel ? "text-white" : likedByCurrentUser ? "text-[#e44766]" : "text-[#555560] hover:bg-[#f2f2f5]"}`}
          >
            <Heart size={isReel ? 23 : 21} fill={likedByCurrentUser ? "currentColor" : "none"} />
            {!hideLikeCount && <span className="font-semibold">{likesCount}</span>}
          </button>
        </form>
        <details className="group relative">
          <summary className={`flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full px-3 text-sm transition hover:bg-[#f2f2f5] ${isReel ? "text-white/90 hover:bg-white/10" : "text-[#555560]"}`}>
            <MessageCircle size={19} /> <span>{commentsCount}</span>
          </summary>
          <div className={`absolute left-0 top-full z-20 mt-2 w-[min(360px,calc(100vw-40px))] rounded-2xl border p-4 shadow-xl ${isReel ? "border-white/15 bg-[#17171b] text-white" : "border-[#e8e8ec] bg-white text-[#29292f]"}`}>
            <p className="mb-3 text-sm font-semibold">Yorumlar</p>
            <div className="max-h-64 space-y-3 overflow-y-auto text-xs">
              {comments.map((comment) => (
                <p key={comment.id} className="flex items-start gap-2 break-words">
                  <UserAvatar {...comment.user} className="mt-0.5 size-6 text-[9px]" />
                  <span><Link href={`/profile/${encodeURIComponent(comment.user.username)}`} className="mr-1 font-semibold hover:underline">@{comment.user.username}</Link>{comment.content !== "GIF" && comment.content}
                    {comment.gifUrl && <span className="mt-1 block">
                      <a href={comment.gifAttributionUrl ?? "https://commons.wikimedia.org/"} target="_blank" rel="noreferrer" className="text-[10px] underline">GIF · {comment.gifLicense ?? "Wikimedia Commons"}</a>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={comment.gifUrl} alt="Yorum GIF'i" loading="lazy" className="mt-1 max-h-40 rounded-lg" />
                    </span>}
                  </span>
                </p>
              ))}
              {comments.length === 0 && <p className="text-[#777781]">Henüz yorum yok. İlk yorumu sen yaz.</p>}
              {commentsCount > comments.length && <Link href={`/post/${postId}`} className="inline-block text-xs font-semibold hover:underline">Tüm yorumları gör</Link>}
            </div>
            <CommentComposer postId={postId} variant={variant} />
          </div>
        </details>
        <PostShareButton postId={postId} variant={variant} />
      </div>

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

      {commentsCount > 0 && <Link href={`/post/${postId}`} className={`mt-2 inline-block text-xs hover:underline ${isReel ? "text-white/75" : "text-[#777781]"}`}>
        Tüm yorumları gör ({commentsCount})
      </Link>}
      {(likesCount > likers.length || commentsCount > comments.length) && (
        <Link href={`/post/${postId}`} className={`mt-3 inline-block text-xs font-semibold hover:underline ${isReel ? "text-white/80" : "text-[#557260]"}`}>
          Tüm etkileşimleri gör
        </Link>
      )}
    </section>
  );
}