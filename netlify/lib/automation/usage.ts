// Per-user limits on paid work. Free accounts get 2 AI reports in total; members ($12.99/year) get unlimited
// reports, with a daily safety cap. Everyone has a daily upload cap. Counters use conditional writes so two
// requests at once can't both slip past a limit.
import { getStore } from "@netlify/blobs";

export const FREE_REPORTS = 2;
export const MEMBER_REPORTS_PER_DAY = 10;
export const UPLOADS_PER_DAY = 20;
export const MEMBERSHIP_PRICE = "$12.99/year";

type Usage = { reportsStarted: number; day: string; reportsToday: number; uploadsToday: number };

// Set by the payment provider once checkout is connected (see CLAUDE.md). Until then nobody is a member.
export type Membership = { activeUntil: string };

export type Plan = {
  member: boolean;
  freeReportsLeft: number;
  reportsLeftToday: number;
  price: string;
};

export type LimitResult = { ok: true } | { ok: false; code: "upgrade_required" | "daily_limit"; message: string };

function usageStore() {
  return getStore({ name: "usage", consistency: "strong" });
}

function membershipStore() {
  return getStore({ name: "memberships", consistency: "strong" });
}

const today = () => new Date().toISOString().slice(0, 10);

function fresh(usage: Usage | undefined): Usage {
  const base = usage ?? { reportsStarted: 0, day: today(), reportsToday: 0, uploadsToday: 0 };
  return base.day === today() ? base : { ...base, day: today(), reportsToday: 0, uploadsToday: 0 };
}

async function isMember(userId: string): Promise<boolean> {
  const membership: Membership | null = await membershipStore().get(userId, { type: "json" });
  return Boolean(membership && Date.parse(membership.activeUntil) > Date.now());
}

// Reads the counter, lets `change` decide, and writes back only if nobody else wrote in between (retrying if so).
async function updateUsage(userId: string, change: (usage: Usage) => LimitResult & { next?: Usage }): Promise<LimitResult> {
  const store = usageStore();
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(userId, { type: "json" });
    const decision = change(fresh(current?.data as Usage | undefined));
    if (!decision.ok || !decision.next) return decision;
    const written = current?.etag
      ? await store.setJSON(userId, decision.next, { onlyIfMatch: current.etag })
      : await store.setJSON(userId, decision.next, { onlyIfNew: true });
    if (written.modified) return { ok: true };
  }
  return { ok: false, code: "daily_limit", message: "Too many requests at once. Try again in a moment." };
}

export async function useReport(userId: string): Promise<LimitResult> {
  const member = await isMember(userId);
  return updateUsage(userId, (usage) => {
    if (!member && usage.reportsStarted >= FREE_REPORTS) {
      return {
        ok: false,
        code: "upgrade_required",
        message: `You've used your ${FREE_REPORTS} free AI reports. Upgrade for unlimited reports (${MEMBERSHIP_PRICE}).`,
      };
    }
    if (member && usage.reportsToday >= MEMBER_REPORTS_PER_DAY) {
      return { ok: false, code: "daily_limit", message: `That's ${MEMBER_REPORTS_PER_DAY} reports today. Try again tomorrow.` };
    }
    return { ok: true, next: { ...usage, reportsStarted: usage.reportsStarted + 1, reportsToday: usage.reportsToday + 1 } };
  });
}

export async function refundReport(userId: string): Promise<void> {
  await updateUsage(userId, (usage) => ({
    ok: true,
    next: {
      ...usage,
      reportsStarted: Math.max(0, usage.reportsStarted - 1),
      reportsToday: Math.max(0, usage.reportsToday - 1),
    },
  }));
}

export async function useUpload(userId: string): Promise<LimitResult> {
  return updateUsage(userId, (usage) =>
    usage.uploadsToday >= UPLOADS_PER_DAY
      ? { ok: false, code: "daily_limit", message: `That's ${UPLOADS_PER_DAY} uploads today. Try again tomorrow.` }
      : { ok: true, next: { ...usage, uploadsToday: usage.uploadsToday + 1 } },
  );
}

export async function loadPlan(userId: string): Promise<Plan> {
  const [member, stored] = await Promise.all([isMember(userId), usageStore().get(userId, { type: "json" })]);
  const usage = fresh(stored as Usage | undefined);
  return {
    member,
    freeReportsLeft: member ? 0 : Math.max(0, FREE_REPORTS - usage.reportsStarted),
    reportsLeftToday: member ? Math.max(0, MEMBER_REPORTS_PER_DAY - usage.reportsToday) : 0,
    price: MEMBERSHIP_PRICE,
  };
}
