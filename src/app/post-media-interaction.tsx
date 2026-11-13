"use client";

import { useRef, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { togglePostLikeAction } from "@/app/actions/social";

export function PostMediaInteraction({
  postId,
  liked,
  children,
}: {
  postId: string;
  liked: boolean;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showHeart, setShowHeart] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, video, input, textarea")) return;
    setShowHeart(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowHeart(false), 850);
    if (!liked) formRef.current?.requestSubmit();
  };

  return (
    <div className="post-media-interaction relative" onDoubleClick={handleDoubleClick}>
      {children}
      <form ref={formRef} action={togglePostLikeAction.bind(null, postId)} className="hidden" aria-hidden="true">
        <button type="submit" tabIndex={-1} aria-hidden="true" />
      </form>
      {showHeart && <Heart className="double-tap-heart" size={88} fill="white" stroke="white" aria-hidden="true" />}
    </div>
  );
}
