import { Check, Crown } from "lucide-react";

const PERKS = [
  "Unlimited AI reports (up to 10 a day)",
  "Trend Analyst, Market Researcher, Forecaster and the discernment check on every upload",
  "Regenerate any time with your own research and listing counts",
];

// Shown once a free account has used its 2 AI reports. Checkout isn't connected yet (see CLAUDE.md).
export default function UpgradeCard({ price }: { price: string }) {
  return (
    <div className="rise card mt-6 overflow-hidden">
      <div className="bg-gradient-to-br from-rose-600 to-orange-500 p-6 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
          <Crown size={16} /> Flipcast Unlimited
        </div>
        <div className="mt-2 text-4xl font-extrabold tracking-tight">{price}</div>
        <p className="mt-1 text-white/90">You've used your 2 free AI reports. Upgrade to keep going.</p>
      </div>
      <div className="p-6">
        <ul className="space-y-2 text-sm text-stone-700">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {perk}
            </li>
          ))}
        </ul>
        <button type="button" disabled className="btn-primary mt-5 cursor-not-allowed opacity-60">
          Checkout coming soon
        </button>
        <p className="mt-2 text-xs text-stone-500">
          Renews every year until you cancel. Your dashboard, listing counts and past reports stay free.
        </p>
      </div>
    </div>
  );
}
