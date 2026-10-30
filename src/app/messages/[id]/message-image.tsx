"use client";

import { useState } from "react";

export function MessageImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Mesajla gönderilen fotoğraf" className="max-h-72 max-w-full object-cover" />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Fotoğraf görüntüleyici" onClick={() => setOpen(false)} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <button type="button" aria-label="Fotoğrafı kapat" onClick={() => setOpen(false)} className="absolute right-5 top-5 text-3xl text-white">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Mesajla gönderilen fotoğraf, büyük görünüm" className="max-h-[90dvh] max-w-[95vw] object-contain" />
        </div>
      )}
    </>
  );
}
