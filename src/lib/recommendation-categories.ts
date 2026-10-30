export const recommendationCategories = [
  { value: "entertainment", label: "Eğlence" },
  { value: "technology", label: "Teknoloji" },
  { value: "sports", label: "Spor" },
  { value: "gaming", label: "Oyun" },
  { value: "music", label: "Müzik" },
  { value: "education", label: "Eğitim" },
  { value: "travel", label: "Seyahat" },
  { value: "automotive", label: "Otomobil" },
  { value: "art", label: "Sanat" },
] as const;

export type RecommendationCategory = (typeof recommendationCategories)[number]["value"];

export function isRecommendationCategory(value: string): value is RecommendationCategory {
  return recommendationCategories.some((category) => category.value === value);
}
