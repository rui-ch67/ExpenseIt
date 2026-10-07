import { cn } from "../cn";
import { CountUp } from "../count-up";

/** The "after": a sample month from the demo, exactly as the app shows it. */
export function MonthPanel({ compact = false, label }: { compact?: boolean; label?: string }) {
  const bands = [
    { name: "grocery", total: "£62.16", ink: "bg-cat-lime" },
    { name: "health", total: "£53.28", ink: "bg-cat-teal" },
    { name: "food", total: "£52.97", ink: "bg-cat-orange" },
  ];
  return (
    <div className="text-white">
      <p
        className={cn(
          "leading-[0.85] font-extrabold tracking-[-0.04em]",
          compact ? "text-[2.5rem]" : "text-[clamp(4.5rem,7.5vw,7.5rem)]",
        )}
      >
        <CountUp minor={83841} currency="GBP" storageKey={compact ? "landing-total-phone" : "landing-total"} />
      </p>
      <p className={cn("mt-3 font-bold", compact ? "text-base leading-tight" : "text-2xl")}>
        spent in October so far.{!compact && <span className="opacity-80"> Most of it went on bills.</span>}
      </p>
      <div className={cn("flex gap-0.5 bg-white ring-2 ring-white", compact ? "mt-4 h-3" : "mt-7 h-5")}>
        {/* Bills shares the ground's violet, so it prints as paper to stay visible. */}
        <span className="bg-paper" style={{ flex: 76 }} />
        <span className="bg-cat-lime" style={{ flex: 7 }} />
        <span className="bg-cat-teal" style={{ flex: 6 }} />
        <span className="bg-cat-orange" style={{ flex: 6 }} />
        <span className="bg-cat-indigo" style={{ flex: 4 }} />
      </div>
      <ul className={cn("grid gap-1.5", compact ? "mt-3 text-[13px]" : "mt-5")}>
        <li className={cn("flex justify-between bg-cat-violet font-extrabold ring-2 ring-white", compact ? "px-2 py-1" : "px-3 py-2")}>
          bills <span>£635.00</span>
        </li>
        {bands.map((b) => (
          <li key={b.name} className={cn("flex justify-between font-extrabold text-ink", compact ? "px-2 py-1" : "px-3 py-2", b.ink)}>
            {b.name} <span>{b.total}</span>
          </li>
        ))}
      </ul>
      {label && <p className="mt-3 inline-block bg-ink/40 px-2 py-1 text-xs font-bold">{label}</p>}
    </div>
  );
}
