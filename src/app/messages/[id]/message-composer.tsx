"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendDirectMessageAction, shareSongOrStatusAction } from "@/app/actions/social";

const emojis = ["😀", "😂", "😍", "🥰", "👍", "❤️", "🔥", "🙏"];

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendDirectMessageAction.bind(null, conversationId), {});
  return (
    <>
      <form action={action} className="rounded-b-2xl border border-[#e1e6df] bg-white p-3">
        <ComposerFields key={state.resetKey ?? "new-message"} pending={pending} />
        {state.error && <p role="alert" className="mt-2 text-sm text-[#a53f30]">{state.error}</p>}
        {state.success && <p role="status" className="mt-2 text-sm text-[#315b46]">{state.success}</p>}
      </form>
      <SharedSongAndStatus conversationId={conversationId} />
    </>
  );
}

function SharedSongAndStatus({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(shareSongOrStatusAction.bind(null, conversationId), {});
  return (
    <details className="border-x border-b border-[#e1e6df] bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold text-[#557260]">Şarkı veya durum paylaş</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <form action={action} className="space-y-2 rounded-xl border border-[#edf0eb] p-3">
          <input type="hidden" name="kind" value="SONG" />
          <label className="block text-xs font-semibold">Şarkı adı
            <input name="songTitle" maxLength={200} required placeholder="Dinlediğin şarkı" className="mt-1 h-9 w-full rounded-lg border border-[#dce2dc] px-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-semibold">Kısa not <span className="font-normal text-[#788179]">(isteğe bağlı)</span>
            <input name="note" maxLength={240} placeholder="Bu şarkıyı dinle..." className="mt-1 h-9 w-full rounded-lg border border-[#dce2dc] px-2 text-sm font-normal" />
          </label>
          <button disabled={pending} className="rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Şarkıyı paylaş</button>
        </form>
        <form action={action} className="space-y-2 rounded-xl border border-[#edf0eb] p-3">
          <input type="hidden" name="kind" value="STATUS" />
          <label className="block text-xs font-semibold">Kısa durum notu
            <textarea name="note" maxLength={240} required rows={2} placeholder="Şu an ne yapıyorsun?" className="mt-1 w-full rounded-lg border border-[#dce2dc] p-2 text-sm font-normal" />
          </label>
          <button disabled={pending} className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold disabled:opacity-60">Durumu paylaş</button>
        </form>
      </div>
      {state.error && <p role="alert" className="mt-2 text-xs text-[#a53f30]">{state.error}</p>}
      {state.success && <p role="status" className="mt-2 text-xs text-[#315b46]">{state.success}</p>}
      <p className="mt-2 text-[10px] text-[#788179]">Yalnızca bu sohbetin katılımcıları şarkı adını ve kısa notu görür. Burada otomatik müzik oynatılmaz.</p>
    </details>
  );
}

function ComposerFields({ pending }: { pending: boolean }) {
  const [content, setContent] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function addEmoji(emoji: string) {
    const input = inputRef.current;
    if (!input) return setContent((current) => `${current}${emoji}`);
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const updated = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    setContent(updated);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  return (
    <>
      {previewUrl && (
        <div className="mb-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Gönderilecek fotoğraf önizlemesi" className="size-20 rounded-xl object-cover" />
          <button type="button" onClick={() => {
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }} className="text-xs font-semibold text-[#a53f30]">Fotoğrafı kaldır</button>
        </div>
      )}
      <div className="mb-2 flex gap-1">
        {emojis.map((emoji) => <button key={emoji} type="button" aria-label={`${emoji} emojisi ekle`} onClick={() => addEmoji(emoji)} className="rounded-lg p-1.5 text-lg hover:bg-[#edf4e9]">{emoji}</button>)}
      </div>
      <div className="flex items-end gap-2">
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#dce2dc] text-lg hover:bg-[#edf4e9]" aria-label="Fotoğraf ekle">
          📷
          <input
            ref={fileInputRef}
            name="media"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
        <textarea
          ref={inputRef}
          id="message-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
          maxLength={4000}
          rows={2}
          placeholder="Bir mesaj yaz..."
          aria-label="Mesajınız"
          className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-[#dce2dc] p-3 text-sm outline-none focus:border-[#4f8266]"
        />
        <button disabled={pending} className="shrink-0 rounded-xl bg-[#203d34] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </div>
      {pending && <progress aria-label="Mesaj ve fotoğraf yükleniyor" className="mt-2 h-1 w-full accent-[#4f8266]" />}
    </>
  );
}
