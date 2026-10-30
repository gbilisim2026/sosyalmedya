"use client";

import { useActionState } from "react";
import { UserRoundX } from "lucide-react";
import { SocialFormState, toggleBlockUserAction, followUserFormAction } from "@/app/actions/social";

export function BlockToggle({ username, blockedByCurrentUser }: { username: string; blockedByCurrentUser: boolean }) {
  const action = toggleBlockUserAction.bind(null, username);
  const [state, formAction, pending] = useActionState<SocialFormState, FormData>(action, {
    resetKey: blockedByCurrentUser ? "blocked" : "unblocked",
  });
  const blocked = state.resetKey ? state.resetKey === "blocked" : blockedByCurrentUser;
  return (
    <div>
      <form action={formAction}>
        <button disabled={pending} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:opacity-60 ${blocked ? "border-[#e1e6df] bg-[#edf4e9] text-[#315b46]" : "border-[#dce2dc] text-[#7c453d] hover:bg-[#fff0ed]"}`}>
          <UserRoundX size={15} />{pending ? "İşleniyor..." : blocked ? "Engellemeyi Kaldır" : "Engelle"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-1 text-xs text-[#a53f30]">{state.error}</p>}
      {state.success && <p role="status" className="mt-1 text-xs text-[#315b46]">{state.success}</p>}
    </div>
  );
}

export function FollowSuggestionButton({ username }: { username: string }) {
  const action = followUserFormAction.bind(null, username);
  const [state, formAction, pending] = useActionState<SocialFormState, FormData>(action, {});
  return (
    <form action={formAction}>
      <button disabled={pending || Boolean(state.success)} className="rounded-lg bg-[#203d34] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "..." : state.success ?? "Takip et"}
      </button>
      {state.error && <span role="alert" className="sr-only">{state.error}</span>}
    </form>
  );
}
