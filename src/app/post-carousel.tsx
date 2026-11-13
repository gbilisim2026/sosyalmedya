"use client";

import Image from "next/image";
import { useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

type PostCarouselProps = {
  images: string[];
  caption: string | null;
  preview?: boolean;
};

export function PostCarousel({ images, caption, preview = false }: PostCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (images.length === 0) return null;

  const currentIndex = Math.min(activeIndex, images.length - 1);
  const moveTo = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(images.length - 1, index)));
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStart(event.touches[0]?.clientX ?? null);
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStart === null) return;
    const touchEnd = event.changedTouches[0]?.clientX;
    if (touchEnd === undefined) {
      setTouchStart(null);
      return;
    }
    const distance = touchEnd - touchStart;
    if (distance > 45) moveTo(currentIndex - 1);
    if (distance < -45) moveTo(currentIndex + 1);
    setTouchStart(null);
  };

  return (
    <div
      className={`post-carousel relative isolate w-full overflow-hidden bg-[#f0f0f2] ${preview ? "rounded-2xl" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => setTouchStart(null)}
      aria-label={`Fotoğraf galerisi, ${images.length} fotoğraf`}
      aria-roledescription="karusel"
    >
      <div className={`relative aspect-[4/5] max-h-[680px] w-full ${preview ? "max-h-[min(70vh,620px)]" : ""}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={images[currentIndex]}
            src={images[currentIndex]}
            alt={caption ? `${caption} (${currentIndex + 1}. fotoğraf)` : `Gönderi fotoğrafı ${currentIndex + 1}`}
            className="carousel-image absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <Image
            key={images[currentIndex]}
            src={images[currentIndex]}
            alt={caption ? `${caption} (${currentIndex + 1}. fotoğraf)` : `Gönderi fotoğrafı ${currentIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 680px"
            unoptimized
            className="carousel-image object-contain"
          />
        )}
      </div>
      {images.length > 1 && (
        <>
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white" aria-live="polite">
            <Images size={15} aria-hidden="true" />
            <span>{currentIndex + 1}/{images.length}</span>
          </div>
          <button
            type="button"
            className="carousel-arrow carousel-arrow-left"
            aria-label="Önceki fotoğraf"
            onClick={() => moveTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="carousel-arrow carousel-arrow-right"
            aria-label="Sonraki fotoğraf"
            onClick={() => moveTo(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
          >
            <ChevronRight size={20} />
          </button>
          <div className="carousel-dots" role="group" aria-label="Fotoğraf seç">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`${index + 1}. fotoğrafı göster`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={`carousel-dot ${index === currentIndex ? "carousel-dot-active" : ""}`}
                onClick={() => moveTo(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
