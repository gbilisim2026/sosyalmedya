"use client";

import { useActionState, useEffect, useState } from "react";
import { removeAvatarAction, updateAvatarAction } from "@/app/actions/social";

type AvatarEditorProps = {
  avatarUrl: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function AvatarEditor({ avatarUrl, scale, offsetX, offsetY }: AvatarEditorProps) {
  const [state, action, pending] = useActionState(updateAvatarAction, {});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(scale);
  const [x, setX] = useState(offsetX);
  const [y, setY] = useState(offsetY);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="mt-4 rounded-xl border border-[#e1e6df] bg-[#f8faf7] p-4">
      <h2 className="text-sm font-semibold">Profil fotoğrafı</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#dce9d7] shadow">
          {(previewUrl ?? avatarUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl ?? avatarUrl ?? ""} alt="Profil fotoğrafı önizlemesi" className="size-full object-cover" style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }} />
          ) : <span className="grid size-full place-items-center text-xl font-semibold text-[#315b46]">+</span>}
        </div>
        <form action={action} className="min-w-0 flex-1 space-y-3">
          <label className="block text-xs font-medium">
            Fotoğraf seç (JPG, PNG, WebP veya GIF; en fazla 20 MB)
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
              className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf4e9] file:px-3 file:py-2 file:font-semibold file:text-[#315b46]"
            />
          </label>
          <input type="hidden" name="avatarScale" value={zoom} />
          <input type="hidden" name="avatarOffsetX" value={x} />
          <input type="hidden" name="avatarOffsetY" value={y} />
          <label className="block text-xs">Yakınlaştır: {zoom.toFixed(1)}×
            <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.currentTarget.value))} className="mt-1 block w-full" />
          </label>
          <label className="block text-xs">Yatay konum: {x}%
            <input type="range" min="0" max="100" step="1" value={x} onChange={(event) => setX(Number(event.currentTarget.value))} className="mt-1 block w-full" />
          </label>
          <label className="block text-xs">Dikey konum: {y}%
            <input type="range" min="0" max="100" step="1" value={y} onChange={(event) => setY(Number(event.currentTarget.value))} className="mt-1 block w-full" />
          </label>
          {state.error && <p role="alert" className="text-sm text-[#a53f30]">{state.error}</p>}
          {state.success && <p role="status" className="text-sm text-[#315b46]">{state.success}</p>}
          {pending && <progress aria-label="Profil fotoğrafı yükleniyor" className="h-1 w-full accent-[#4f8266]" />}
          <button disabled={pending} className="rounded-lg bg-[#203d34] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {pending ? "Yükleniyor..." : "Fotoğrafı kaydet"}
          </button>
        </form>
        {avatarUrl && (
          <form action={removeAvatarAction}>
            <button className="rounded-lg border border-[#dce2dc] px-3 py-2 text-xs font-semibold text-[#8b4236]">Fotoğrafı kaldır</button>
          </form>
        )}
      </div>
    </div>
  );
}
