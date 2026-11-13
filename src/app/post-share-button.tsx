"use client";

import { useState } from "react";
import { Check, Copy, Send } from "lucide-react";

export function PostShareButton({ postId, variant = "feed" }: { postId: string; variant?: "feed" | "reel" }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const isReel = variant === "reel";
  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2600);
  };

  const sharePost = async () => {
    const url = new URL(`/post/${encodeURIComponent(postId)}`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Gönderiyi görüntüle", url });
        showFeedback("Paylaşım menüsü açıldı");
        return;
      }
      await navigator.clipboard.writeText(url);
      showFeedback("Bağlantı kopyalandı");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showFeedback("Bağlantı kopyalanamadı. Tarayıcı izinlerini kontrol et.");
    }
  };

  return (
    <span className="post-share-control">
      <button
        type="button"
        onClick={sharePost}
        aria-label="Gönderiyi paylaş veya bağlantısını kopyala"
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition active:scale-95 ${isReel ? "text-white hover:bg-white/10" : "text-[#555560] hover:bg-[#f2f2f5]"}`}
      >
        {feedback === "Bağlantı kopyalandı" ? <Check size={19} /> : <Send size={19} />}
        <span className="sr-only">Paylaş</span>
      </button>
      {feedback && <span role="status" className="share-feedback"><Copy size={13} />{feedback}</span>}
    </span>
  );
}
