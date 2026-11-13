"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { sendStoryReplyAction } from "@/app/actions/social";

const reactions = ["❤️", "😂", "😍", "👏", "🔥", "🙌"];

export function StoryReply({ storyId }: { storyId: string }) {
  const [state, action, pending] = useActionState(sendStoryReplyAction.bind(null, storyId), {});
  const [content, setContent] = useState("");

  return (
    <form action={action} className="story-reply">
      <div className="story-reactions" aria-label="Hızlı tepki">
        {reactions.map((reaction) => (
          <button key={reaction} type="button" onClick={() => setContent((current) => `${current}${reaction}`)} aria-label={`${reaction} tepki ekle`}>
            {reaction}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          name="content"
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
          maxLength={4000}
          placeholder="Hikâyeye yanıt ver..."
          aria-label="Hikâyeye mesaj olarak yanıt ver"
          className="story-reply-input"
        />
        <button type="submit" disabled={pending || !content.trim()} aria-label="Yanıtı gönder" className="story-reply-submit">
          <Send size={17} />
        </button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-xs text-[#b42345]">{state.error}</p>}
      {state.success && <p role="status" className="mt-2 text-xs text-[#4f46b8]">{state.success}</p>}
    </form>
  );
}
