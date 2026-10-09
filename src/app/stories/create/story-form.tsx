"use client";

import { useActionState } from "react";
import { createStoryAction } from "@/app/actions/social";

export function StoryForm() {
  const [state, action, pending] = useActionState(createStoryAction, {});

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Hikâye fotoğrafı veya videosu
        <input
          name="media"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="mt-2 block w-full rounded-lg border border-[#dce2dc] bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#edf4e9] file:px-3 file:py-2 file:font-medium file:text-[#315b46]"
        />
      </label>
      <label className="block text-sm font-medium">
        Hikâye efekti
        <select name="visualEffect" defaultValue="NONE" className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] bg-white px-3">
          <option value="NONE">Efekt yok</option>
          <option value="FADE">Yumuşak geçiş</option>
          <option value="ZOOM">Yakınlaşma</option>
          <option value="SLIDE">Kayma</option>
          <option value="BOUNCE">Hafif sıçrama</option>
        </select>
      </label>
      <p className="text-xs text-[#788179]">Hikâyen 24 saat sonra akıştan kaldırılır.</p>
      {state.error && <p role="alert" className="text-sm text-[#a53f30]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-[#203d34] px-5 font-semibold text-white hover:bg-[#2c5145] disabled:opacity-60"
      >
        {pending ? "Yükleniyor..." : "Hikâyeyi paylaş"}
      </button>
    </form>
  );
}