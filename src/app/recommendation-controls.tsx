import { dismissSuggestedAccountAction, recordRecommendationFeedbackAction } from "@/app/actions/social";

export function RecommendationFeedbackButtons({
  postId,
  authorId,
  category,
}: {
  postId: string;
  authorId: string;
  category: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-3 px-3 pb-3 text-[11px]">
      <form action={recordRecommendationFeedbackAction.bind(null, "NOT_INTERESTED_POST", postId, null)}>
        <button className="text-[#68716b] underline-offset-2 hover:underline">İlgilenmiyorum</button>
      </form>
      <form action={recordRecommendationFeedbackAction.bind(null, "HIDE_ACCOUNT", authorId, null)}>
        <button className="text-[#68716b] underline-offset-2 hover:underline">Bu hesabı gizle</button>
      </form>
      {category && <form action={recordRecommendationFeedbackAction.bind(null, "LESS_CATEGORY", "", category)}>
        <button className="text-[#68716b] underline-offset-2 hover:underline">Bu kategoriyi daha az göster</button>
      </form>}
    </div>
  );
}

export function DismissSuggestionButton({ userId }: { userId: string }) {
  return <form action={dismissSuggestedAccountAction.bind(null, userId)}>
    <button aria-label="Bu hesap önerisini gizle" title="Öneriyi gizle" className="rounded-full px-2 py-1 text-xs text-[#788179] hover:bg-[#f1f4ef]">×</button>
  </form>;
}
