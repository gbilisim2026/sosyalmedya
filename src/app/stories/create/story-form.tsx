"use client";

import { useActionState, useEffect, useState } from "react";
import { createStoryAction } from "@/app/actions/social";
import { StoryMusicPicker, type StoryMusicSelection } from "@/app/stories/create/story-music-picker";

export function StoryForm() {
  const [state, action, pending] = useActionState(createStoryAction, {});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<StoryMusicSelection | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Hikâye fotoğrafı veya videosu
        <input
          name="media"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
            setIsVideo(Boolean(file?.type.startsWith("video/")));
          }}
          className="mt-2 block w-full rounded-lg border border-[#dce2dc] bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#edf4e9] file:px-3 file:py-2 file:font-medium file:text-[#315b46]"
        />
      </label>
      <StoryMusicPicker selected={music} onChange={setMusic} />
      {previewUrl && (
        <div className="overflow-hidden rounded-xl bg-[#18231d]">
          {isVideo
            ? <video src={previewUrl} controls playsInline className="max-h-[55vh] w-full object-contain" />
            : /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Hikâye önizlemesi" className="max-h-[55vh] w-full object-contain" />}
        </div>
      )}
      <label className="block text-sm font-medium">
        Hikâyeye yazı veya emoji ekle
        <textarea name="caption" value={caption} onChange={(event) => setCaption(event.currentTarget.value)} maxLength={1000} rows={3} placeholder="Hikâyene bir şey yaz..." className="mt-2 block w-full rounded-lg border border-[#dce2dc] p-3 text-sm" />
      </label>
      <div className="-mt-3 flex flex-wrap gap-1">
        {["😀", "😂", "😍", "🥰", "👍", "❤️", "🔥", "✨"].map((emoji) => <button key={emoji} type="button" onClick={() => setCaption((value) => `${value}${emoji}`)} className="rounded-lg p-1.5 text-lg hover:bg-[#edf4e9]" aria-label={`${emoji} ekle`}>{emoji}</button>)}
      </div>
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
      <label className="block text-sm font-medium">
        Kimler görebilir?
        <select name="audience" defaultValue="FOLLOWERS" className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] bg-white px-3">
          <option value="EVERYONE">Herkes</option>
          <option value="FOLLOWERS">Yalnızca takipçilerim</option>
          <option value="CLOSE_FRIENDS">Yakın arkadaşlar</option>
          <option value="SELECTED">Belirli kişiler</option>
        </select>
      </label>
      <label className="block text-sm font-medium">
        Belirli kişiler <span className="font-normal text-[#788179]">(kullanıcı adlarını virgülle ayır)</span>
        <input name="selectedUsernames" maxLength={1000} placeholder="@kullanici1, kullanici2" className="mt-2 h-11 w-full rounded-lg border border-[#dce2dc] px-3" />
      </label>
      <p className="text-xs text-[#788179]">Hikâyen 24 saat sonra akıştan kaldırılır.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowReshare" defaultChecked className="accent-[#315b46]" />Herkese açık hikâyemi başkaları yeniden paylaşabilsin</label>
      {state.error && <p role="alert" className="text-sm text-[#a53f30]">{state.error}</p>}
      {pending && <progress aria-label="Hikâye yükleniyor" className="h-1 w-full accent-[#4f8266]" />}
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