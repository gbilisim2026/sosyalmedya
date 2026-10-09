import type { VisualEffect } from "@/generated/prisma/enums";

const effectClasses: Record<VisualEffect, string> = {
  NONE: "",
  FADE: "media-effect-fade",
  ZOOM: "media-effect-zoom",
  SLIDE: "media-effect-slide",
  BOUNCE: "media-effect-bounce",
};

export function visualEffectClass(effect: VisualEffect) {
  return effectClasses[effect];
}