import type { CurrencyCode } from "@/domain/currency";
import { addDays, addMonths, firstDayOf, type IsoDate, lastDayOf, monthOf } from "@/domain/dates";

/**
 * Sample spending for the "Try the demo" account: about three months of a
 * student or young professional's life in the UK, including a weekend in
 * Paris paid in euros so multi-currency shows up too. Everything is relative
 * to `today`, so the demo always looks current.
 *
 * Generation is deterministic (seeded random numbers): every visitor sees
 * the same believable picture, and tests can rely on it.
 */
export interface DemoExpenseSeed {
  readonly title: string;
  readonly category: string;
  readonly spentOn: IsoDate;
  /** Decimal string in `currency`. */
  readonly amount: string;
  readonly currency: CurrencyCode;
  readonly note?: string;
}

/** Regular payments, set up as recurring rules so the app logs them itself. */
export const DEMO_RECURRING: ReadonlyArray<{ day: number; title: string; category: string; amount: string }> = [
  { day: 1, title: "Rent", category: "Bills", amount: "625.00" },
  { day: 2, title: "Bus pass", category: "Transport", amount: "35.00" },
  { day: 3, title: "PureGym membership", category: "Health", amount: "24.99" },
  { day: 5, title: "giffgaff phone plan", category: "Bills", amount: "10.00" },
  { day: 12, title: "Spotify Premium Student", category: "Entertainment", amount: "5.99" },
  { day: 15, title: "Octopus Energy", category: "Bills", amount: "48.20" },
];

/** Monthly budgets for the demo, so the warnings have something to say. */
export const DEMO_BUDGETS: ReadonlyArray<{ category: string | null; amount: string }> = [
  { category: null, amount: "1300.00" },
  { category: "Food", amount: "60.00" },
  { category: "Grocery", amount: "150.00" },
  { category: "Entertainment", amount: "40.00" },
];

const GROCERS = ["Tesco", "Sainsbury's", "Aldi", "Lidl", "Co-op"];
const FOOD = [
  { title: "Pret A Manger", min: 4, max: 9 },
  { title: "Greggs", min: 2, max: 6 },
  { title: "Costa Coffee", min: 3, max: 6 },
  { title: "Nando's", min: 12, max: 22 },
  { title: "Wagamama", min: 14, max: 26 },
  { title: "Five Guys", min: 11, max: 18 },
];
const OCCASIONAL = [
  { title: "Uniqlo", category: "Shopping", min: 20, max: 60 },
  { title: "Amazon", category: "Shopping", min: 8, max: 45 },
  { title: "Boots", category: "Health", min: 4, max: 18 },
  { title: "Odeon cinema", category: "Entertainment", min: 9, max: 16 },
  { title: "Uber", category: "Transport", min: 7, max: 19 },
  { title: "Waterstones", category: "Education", min: 9, max: 30 },
];

/** Small, fast, seedable PRNG (mulberry32). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoExpenses(today: IsoDate, seed = 2025): DemoExpenseSeed[] {
  const random = seededRandom(seed);
  const between = (min: number, max: number) => (min + random() * (max - min)).toFixed(2);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  const thisMonth = monthOf(today);
  const start = firstDayOf(addMonths(thisMonth, -2));
  const seeds: DemoExpenseSeed[] = [];
  const add = (seedItem: Omit<DemoExpenseSeed, "currency"> & { currency?: CurrencyCode }) => {
    if (seedItem.spentOn <= today) seeds.push({ currency: "GBP", ...seedItem });
  };

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday === 6 || (weekday === 3 && random() < 0.5)) {
      add({ title: pick(GROCERS), category: "Grocery", spentOn: day, amount: between(14, 46) });
    }
    if (random() < 0.45) {
      const place = pick(FOOD);
      add({ title: place.title, category: "Food", spentOn: day, amount: between(place.min, place.max) });
    }
    if (random() < 0.12) {
      const item = pick(OCCASIONAL);
      add({ title: item.title, category: item.category, spentOn: day, amount: between(item.min, item.max) });
    }
  }

  // A weekend in Paris last month, paid in euros.
  const trip = addDays(firstDayOf(addMonths(thisMonth, -1)), 17);
  const paris = "Weekend in Paris";
  add({ title: "Eurostar to Paris", category: "Transport", spentOn: addDays(trip, -14), amount: "78.00", note: paris });
  add({ title: "Café de Flore", category: "Food", spentOn: trip, amount: "18.50", currency: "EUR", note: paris });
  add({ title: "Louvre tickets", category: "Entertainment", spentOn: trip, amount: "22.00", currency: "EUR", note: paris });
  add({ title: "Paris Metro tickets", category: "Transport", spentOn: trip, amount: "16.90", currency: "EUR", note: paris });
  add({ title: "Boulangerie Poilâne", category: "Food", spentOn: addDays(trip, 1), amount: "9.40", currency: "EUR", note: paris });
  add({ title: "Shakespeare and Company", category: "Education", spentOn: addDays(trip, 1), amount: "24.00", currency: "EUR", note: paris });

  add({
    title: "Udemy: TypeScript course",
    category: "Education",
    spentOn: addDays(lastDayOf(addMonths(thisMonth, -2)), -3),
    amount: "14.99",
  });

  return seeds.sort((a, b) => a.spentOn.localeCompare(b.spentOn));
}
