import { cn } from "../cn";
import { CountUp } from "../count-up";

/** The demo's sample month, as the app's home screen shows it. The bands add up to the total. */
const BANDS = [
  { name: "bills", total: "£635.00", ink: "bg-cat-violet", text: "text-white", ring: true },
  { name: "grocery", total: "£62.16", ink: "bg-cat-lime", text: "text-ink" },
  { name: "health", total: "£53.28", ink: "bg-cat-teal", text: "text-ink" },
  { name: "food", total: "£52.97", ink: "bg-cat-orange", text: "text-ink" },
  { name: "transport", total: "£35.00", ink: "bg-cat-indigo", text: "text-white" },
];

const LATEST = [
  { title: "Lidl", category: "Grocery", amount: "£45.86", ink: "bg-cat-lime" },
  { title: "Boots", category: "Health", amount: "£17.00", ink: "bg-cat-teal" },
  { title: "Greggs", category: "Food", amount: "£2.27", ink: "bg-cat-orange" },
];

/** The "after": the sample month, on the violet of its biggest category. */
export function MonthPanel({
  compact = false,
  label,
  latestClassName,
}: {
  compact?: boolean;
  label?: string;
  /** Lets the page hide the "Latest" list where there isn't room. */
  latestClassName?: string;
}) {
  return (
    <div className="text-white">
      <p
        className={cn(
          "leading-[0.85] font-extrabold tracking-[-0.04em]",
          compact ? "text-[clamp(3.5rem,17vw,5.5rem)]" : "text-[clamp(4.5rem,7.5vw,7.5rem)]",
        )}
      >
        <CountUp minor={83841} currency="GBP" storageKey={compact ? "landing-total-phone" : "landing-total"} />
      </p>
      <p className={cn("mt-2 font-bold", compact ? "text-lg leading-tight" : "text-2xl")}>
        spent in October so far. <span className="opacity-80">Most of it went on bills.</span>
      </p>
      <div className={cn("flex gap-0.5 bg-white ring-2 ring-white", compact ? "mt-4 h-3" : "mt-6 h-5")}>
        {/* Bills shares the ground's violet, so it prints as paper to stay visible. */}
        <span className="bg-paper" style={{ flex: 76 }} />
        <span className="bg-cat-lime" style={{ flex: 7 }} />
        <span className="bg-cat-teal" style={{ flex: 6 }} />
        <span className="bg-cat-orange" style={{ flex: 6 }} />
        <span className="bg-cat-indigo" style={{ flex: 4 }} />
      </div>
      <ul className={cn("grid gap-1.5", compact ? "mt-3" : "mt-5")}>
        {BANDS.map((b) => (
          <li
            key={b.name}
            className={cn(
              "flex justify-between font-extrabold",
              compact ? "px-2.5 py-1.5" : "px-3 py-2",
              b.ink,
              b.text,
              b.ring && "ring-2 ring-white",
            )}
          >
            {b.name} <span>{b.total}</span>
          </li>
        ))}
      </ul>
      <div className={cn(compact ? "mt-5" : "mt-6", latestClassName)}>
        <p className="text-sm font-bold">Latest</p>
        <ul className="mt-1.5 bg-paper text-ink">
          {LATEST.map((e) => (
            <li key={e.title} className="flex items-center gap-2.5 border-b border-rule px-3 py-2 last:border-0">
              <span aria-hidden className={cn("h-7 w-3 shrink-0 ring-1 ring-ink", e.ink)} />
              <span className="flex-1">
                <strong className="block text-sm leading-tight font-bold">{e.title}</strong>
                <span className="text-xs text-muted">{e.category}</span>
              </span>
              <strong className="text-sm font-extrabold">{e.amount}</strong>
            </li>
          ))}
        </ul>
      </div>
      {label && <p className={cn("inline-block bg-ink/40 px-2 py-1 text-xs font-bold", compact ? "mt-3" : "mt-4")}>{label}</p>}
    </div>
  );
}
