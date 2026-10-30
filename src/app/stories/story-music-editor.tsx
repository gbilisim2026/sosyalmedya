"use client";

import { useState } from "react";
import { updateStoryMusicAction } from "@/app/actions/social";
import { StoryMusicPicker, type StoryMusicSelection } from "@/app/stories/create/story-music-picker";

export function StoryMusicEditor({
  storyId,
  initialTrack,
}: {
  storyId: string;
  initialTrack: StoryMusicSelection | null;
}) {
  const [selected, setSelected] = useState(initialTrack);
  return (
    <form action={updateStoryMusicAction.bind(null, storyId)} className="mb-4 rounded-xl border border-[#e1e6df] bg-white p-4">
      <StoryMusicPicker selected={selected} onChange={setSelected} />
      <input type="hidden" name="clearMusic" value={selected ? "false" : "true"} />
      <button className="mt-3 rounded-lg bg-[#203d34] px-4 py-2 text-xs font-semibold text-white">Hikâye müziğini güncelle</button>
    </form>
  );
}
