import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { addPostCommentAction, togglePostLikeAction } from "@/app/actions/social";

type Person = { username: string; displayName: string | null };
type CommentItem = { id: string; content: string; user: Person };

type PostEngagementProps = {
  postId: string;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  likers: Person[];
  comments: CommentItem[];
  variant?: "feed" | "reel";
};

export function PostEngagement({
  postId,
  likesCount,
  commentsCount,
  likedByCurrentUser,
  likers,
  comments,
  variant = "feed",
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
          <span className="text-sm font-semibold">{likesCount}</span>
        </button>
      </form>

      {likers.length > 0 && (
        <div className={`mt-2 flex flex-wrap items-center gap-x-1 text-xs ${isReel ? "text-white/75" : "text-[#68716b]"}`}>
          <span>Beğenenler:</span>
          {likers.map((person, index) => (
            <span key={person.username}>
              {index > 0 && ", "}
              <Link href={`/profile/${encodeURIComponent(person.username)}`} className="font-medium hover:underline">
                @{person.username}
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
            <p key={comment.id} className="break-words">
              <Link href={`/profile/${encodeURIComponent(comment.user.username)}`} className="mr-1 font-semibold hover:underline">
                @{comment.user.username}
              </Link>
              {comment.content}
            </p>
          ))}
          {commentsCount > comments.length && <p className="opacity-70">Son {comments.length} yorum gösteriliyor.</p>}
          <form action={addPostCommentAction.bind(null, postId)} className="flex gap-2 pt-1">
            <input
              name="content"
              required
              maxLength={1000}
              placeholder="Yorum yaz..."
              aria-label="Yorum yaz"
              className={`min-w-0 flex-1 rounded-lg px-3 py-2 outline-none ${isReel ? "border border-white/25 bg-black/30 text-white placeholder:text-white/55" : "border border-[#dce2dc] bg-white text-[#202522]"}`}
            />
            <button className={`rounded-lg px-3 py-2 font-semibold ${isReel ? "bg-white text-[#203d34]" : "bg-[#203d34] text-white"}`}>Yayınla</button>
          </form>
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