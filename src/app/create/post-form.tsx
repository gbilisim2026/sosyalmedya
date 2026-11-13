"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, X } from "lucide-react";
import { useActionState } from "react";
import { createPostAction } from "@/app/actions/social";
import { PostCarousel } from "@/app/post-carousel";
import { recommendationCategories } from "@/lib/recommendation-categories";

const MAX_PHOTOS = 10;

export function PostForm({ reelMode = false }: { reelMode?: boolean }) {
  const [state, action, pending] = useActionState(createPostAction, {});
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const files = previews.map(({ file }) => file);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef(previews);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => {
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = null;
    return () => {
      cleanupTimerRef.current = setTimeout(() => {
        previewsRef.current.forEach(({ url }) => URL.revokeObjectURL(url));
        cleanupTimerRef.current = null;
      }, 0);
    };
  }, []);

  const syncFormFiles = (nextFiles: File[]) => {
    const input = mediaInputRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    nextFiles.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  };

  const updateFiles = (nextFiles: File[]) => {
    const nextPreviews = nextFiles.map((file) => previews.find((preview) => preview.file === file) ?? {
      file,
      url: URL.createObjectURL(file),
    });
    const retainedUrls = new Set(nextPreviews.map(({ url }) => url));
    previews.forEach(({ url }) => {
      if (!retainedUrls.has(url)) URL.revokeObjectURL(url);
    });
    setPreviews(nextPreviews);
    syncFormFiles(nextFiles);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!incoming.length) return;

    const nextFiles = [...files, ...incoming];
    if (reelMode && nextFiles.length > 1) {
      setSelectionError("Reels için yalnızca bir video seçebilirsin.");
      return;
    }
    if (nextFiles.length > MAX_PHOTOS) {
      setSelectionError(`Bir gönderiye en fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsin.`);
      return;
    }
    const includesVideo = nextFiles.some((file) => file.type.startsWith("video/"));
    if (includesVideo && (nextFiles.length > 1 || nextFiles.some((file) => file.type.startsWith("image/")))) {
      setSelectionError("Video gönderileri tek dosyadan oluşur; fotoğraf ve videoyu birlikte seçemezsin.");
      return;
    }
    if (nextFiles.some((file) => file.size > (file.type.startsWith("video/") ? 100 : 20) * 1024 * 1024)) {
      setSelectionError("Fotoğraflar en fazla 20 MB, videolar en fazla 100 MB olabilir.");
      return;
    }
    if (nextFiles.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) {
      setSelectionError("Gönderideki dosyaların toplam boyutu en fazla 100 MB olabilir.");
      return;
    }
    setSelectionError(null);
    updateFiles(nextFiles);
  };

  const removeFile = (index: number) => {
    setSelectionError(null);
    updateFiles(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const reorderFile = (source: number, destination: number) => {
    if (source < 0 || source >= files.length || destination < 0 || destination >= files.length || source === destination) return;
    const nextFiles = [...files];
    [nextFiles[source], nextFiles[destination]] = [nextFiles[destination], nextFiles[source]];
    updateFiles(nextFiles);
  };
  const moveFile = (index: number, offset: number) => reorderFile(index, index + offset);
  const startFileDrag = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };
  const dropFile = (event: DragEvent<HTMLLIElement>, destination: number) => {
    event.preventDefault();
    const rawSource = event.dataTransfer.getData("text/plain");
    if (!rawSource) return;
    const source = Number(rawSource);
    if (Number.isInteger(source)) reorderFile(source, destination);
  };

  const imageUrls = previews.filter(({ file }) => file.type.startsWith("image/")).map(({ url }) => url);

  return (
    <form action={action} className="create-post-form">
      <input ref={mediaInputRef} name="media" type="file" multiple hidden />
      <label className="create-post-field">
        <span>Açıklama</span>
        <textarea
          name="caption"
          maxLength={2200}
          rows={4}
          placeholder="Aklından geçenleri paylaş... #hashtag"
          className="create-post-input min-h-28 resize-y"
        />
      </label>

      <label className="create-post-field">
        <span>İçerik kategorisi <span className="font-normal text-[#788179]">(isteğe bağlı)</span></span>
        <select name="category" defaultValue="" className="create-post-input">
          <option value="">Kategori seçme</option>
          {recommendationCategories.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label className="create-post-field">
        <span>Konum <span className="font-normal text-[#788179]">(isteğe bağlı)</span></span>
        <input name="location" maxLength={160} placeholder="Bir yer ekle" className="create-post-input" />
      </label>

      <section className="create-post-field" aria-labelledby="media-label">
        <div>
          <h2 id="media-label">Fotoğraf veya video <span className="font-normal text-[#788179]">(isteğe bağlı)</span></h2>
          <p className="mt-1 text-xs text-[#788179]">
            {reelMode ? "Tek bir dikey video seç." : `En fazla ${MAX_PHOTOS} fotoğraf seç, sıralamalarını düzenle veya yeni fotoğraflar ekle.`}
          </p>
        </div>
        <div className="create-media-panel">
          <input
            ref={pickerRef}
            id="post-media-picker"
            type="file"
            accept={reelMode ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"}
            multiple={!reelMode}
            onChange={addFiles}
            className="sr-only"
            aria-label="Fotoğraf veya video seç"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#55555e]">
              <ImagePlus size={19} /> {files.length ? `${files.length} dosya seçildi` : "Galerinden medya seç"}
            </span>
            <button type="button" className="create-media-button" onClick={() => pickerRef.current?.click()}>
              <Plus size={16} /> {files.length ? "Daha fazla ekle" : "Dosya seç"}
            </button>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              {files.length > 1 && imageUrls.length === files.length ? (
                <PostCarousel images={imageUrls} caption="Gönderi önizlemesi" preview />
              ) : files[0].type.startsWith("image/") ? (
                <div className="relative mx-auto aspect-[4/5] max-h-[min(70vh,620px)] overflow-hidden rounded-2xl bg-[#f0f0f2]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previews[0].url} alt="Gönderi önizlemesi" className="h-full w-full object-contain" />
                </div>
              ) : (
                <video src={previews[0].url} controls playsInline className="mx-auto max-h-[min(70vh,620px)] w-full rounded-2xl bg-black object-contain" />
              )}
              {files.length > 1 && <p className="mt-2 text-center text-xs text-[#71717a]">Önizlemeyi kaydırarak fotoğrafları görüntüle.</p>}
              <ol className="carousel-file-list mt-4" aria-label="Seçilen medyalar, paylaşım sırası">
                {previews.map(({ file, url }, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="carousel-file-item"
                    draggable
                    onDragStart={(event) => startFileDrag(event, index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropFile(event, index)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {file.type.startsWith("image/") ? <img src={url} alt="" className="size-12 rounded-lg object-cover" /> : <video src={url} muted className="size-12 rounded-lg bg-black object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{index + 1}. {file.name}</span>
                    <button type="button" aria-label={`${index + 1}. medyayı yukarı taşı`} disabled={index === 0} onClick={() => moveFile(index, -1)} className="preview-action"><ArrowUp size={16} /></button>
                    <button type="button" aria-label={`${index + 1}. medyayı aşağı taşı`} disabled={index === files.length - 1} onClick={() => moveFile(index, 1)} className="preview-action"><ArrowDown size={16} /></button>
                    <button type="button" aria-label={`${index + 1}. medyayı kaldır`} onClick={() => removeFile(index)} className="preview-action preview-action-remove"><X size={16} /></button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <span className="mt-3 block text-xs text-[#788179]">Görsel en fazla 20 MB, video 100 MB; birden fazla dosyada toplam sınır 100 MB.</span>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="create-post-field">
          <span>Kimler görebilir?</span>
          <select name="visibility" defaultValue="PUBLIC" className="create-post-input">
            <option value="PUBLIC">Herkes</option>
            <option value="FOLLOWERS_ONLY">Yalnızca takipçilerim</option>
          </select>
        </label>
        <label className="create-post-field">
          <span>Gönderinin hedef kitlesi</span>
          <select name="audience" defaultValue="EVERYONE" className="create-post-input">
            <option value="EVERYONE">Herkes</option>
            <option value="FOLLOWERS">Yalnızca takipçilerim</option>
            <option value="CLOSE_FRIENDS">Yakın arkadaşlar</option>
            <option value="SELECTED">Belirli kişiler</option>
          </select>
        </label>
        <label className="create-post-field">
          <span>Görsel efekti</span>
          <select name="visualEffect" defaultValue="NONE" className="create-post-input">
            <option value="NONE">Efekt yok</option>
            <option value="FADE">Yumuşak geçiş</option>
            <option value="ZOOM">Yakınlaşma</option>
            <option value="SLIDE">Kayma</option>
            <option value="BOUNCE">Hafif sıçrama</option>
          </select>
        </label>
        <label className="create-post-field">
          <span>Belirli kişiler <span className="font-normal text-[#788179]">(kullanıcı adlarını virgülle ayır)</span></span>
          <input name="selectedUsernames" maxLength={1000} placeholder="@kullanici1, kullanici2" className="create-post-input" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="create-checkbox">
          <input name="allowReshare" type="checkbox" defaultChecked className="size-4 accent-[#26262c]" />
          Herkese açık gönderilerin yeniden paylaşılmasına izin ver
        </label>
        <label className="create-checkbox">
          <input name="isReel" type="checkbox" defaultChecked={reelMode} className="size-4 accent-[#26262c]" />
          Reels akışında da yayınla (video gerekir)
        </label>
      </div>

      {(selectionError || state.error) && <p role="alert" className="rounded-xl bg-[#fff0f2] px-4 py-3 text-sm text-[#b42345]">{selectionError ?? state.error}</p>}
      <button type="submit" disabled={pending} className="create-submit-button">
        {pending ? "Paylaşılıyor..." : "Gönderiyi paylaş"}
      </button>
    </form>
  );
}
