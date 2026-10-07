import { Courier_Prime } from "next/font/google";
import { cn } from "../cn";

const receiptFace = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export interface Slip {
  readonly merchant: string;
  readonly lines: ReadonlyArray<readonly [string, string]>;
  readonly total?: string;
}

/** A loose till receipt, set in a receipt face: the "before" of the page. */
export function ReceiptSlip({ slip, className, style }: { slip: Slip; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "absolute w-[13.5rem] border border-[#d6d6d2] bg-paper px-4 pt-3.5 pb-4 text-[12.5px] leading-[1.55] text-ink",
        receiptFace.className,
        className,
      )}
    >
      <p className="mb-1.5 text-center text-[13.5px] font-bold uppercase">{slip.merchant}</p>
      {slip.lines.map(([label, price]) => (
        <p key={label} className="flex justify-between gap-3 uppercase">
          <span className="truncate">{label}</span>
          <span>{price}</span>
        </p>
      ))}
      {slip.total && (
        <p className="mt-1.5 flex justify-between border-t border-dashed border-ink/50 pt-1.5 font-bold">
          <span>TOTAL</span>
          <span>{slip.total}</span>
        </p>
      )}
    </div>
  );
}

/** The receipts a month of everyday spending leaves in a pocket. */
export const SLIPS: Slip[] = [
  { merchant: "Harbour St Grocer", lines: [["Sourdough loaf", "2.40"], ["Eggs x12", "3.10"], ["Cheddar 400g", "7.00"]], total: "24.11" },
  { merchant: "Pret A Manger", lines: [["Flat white", "3.40"], ["Croissant", "2.80"]], total: "6.20" },
  { merchant: "Boots", lines: [["Meal deal", "3.99"], ["Paracetamol", "0.79"]], total: "11.29" },
  { merchant: "Café de Flore", lines: [["2 café crème", "€18.50"]], total: "€18.50" },
  { merchant: "Octopus Energy", lines: [["September", "48.20"]] },
  { merchant: "Tesco Express", lines: [["Bananas", "0.76"], ["Milk 2pt", "1.25"]], total: "16.30" },
];
