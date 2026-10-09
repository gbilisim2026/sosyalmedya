"use client";

import { useActionState } from "react";
import { createPostAction } from "@/app/actions/social";

export function PostForm() {
  const [state, action, pending] = useActionState(createPostAction, {});

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Açıklama
        <textarea
          name="caption"
          maxLength={2200}
          rows={6}
          placeholder="Aklından geçenleri paylaş... #hashtag"
          className="mt-2 w-full resize-y rounded-lg border border-[#dce2dc] bg-white p-3.5 outline-none focus:border-[#4f8266] focus:ring-2 focus:ring-[#4f8266]/15"
        />
      </label>
      <label className="block text-sm font-medium">
        Fotoğraf veya video <span className="font-normal text-[#788179]">(isteğe bağlı)</span>
        <input
          name="media"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="mt-2 block w-full rounded-lg border border-[#dce2dc] bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#edf4e9] file:px-3 file:py-2 file:font-medium file:text-[#315b46]"
        />
        <span className="mt-2 block text-xs text-[#788179]">Görsel en fazla 20 MB, video 100 MB.</span>
      </label>
      {state.error && <p role="alert" className="text-sm text-[#a53f30]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-[#203d34] px-5 font-semibold text-white hover:bg-[#2c5145] disabled:opacity-60"
      >
        {pending ? "Paylaşılıyor..." : "Gönderiyi paylaş"}
      </button>
    </form>
  );
}