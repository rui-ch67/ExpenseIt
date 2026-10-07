import { notFound } from "next/navigation";
import { CATEGORY_COLORS, type CategoryColor } from "@/domain/category";
import { addMonths, parseYearMonth } from "@/domain/dates";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { formatLongDate, formatMonth } from "@/ui/format";
import { Recap, type RecapStory } from "@/ui/recap";

export async function generateMetadata({ params }: PageProps<"/recap/[month]">) {
  const { month } = await params;
  try {
    return { title: `${formatMonth(parseYearMonth(month), "short")}, wrapped` };
  } catch {
    return { title: "Recap" };
  }
}

type Draft = Omit<RecapStory, "ink"> & { prefer: CategoryColor | null };

/**
 * Gives every story a category ink, keeping its preferred one unless that
 * would repeat the ink of the story before it. Repeats take the next ink
 * from the month's own categories, then from the rest of the palette.
 */
function assignInks(drafts: readonly Draft[], monthInks: readonly CategoryColor[]): RecapStory[] {
  const palette = [...new Set([...monthInks, ...CATEGORY_COLORS])];
  const stories: RecapStory[] = [];
  drafts.forEach(({ prefer, ...story }, i) => {
    const previous = stories[i - 1]?.ink;
    const next = drafts[i + 1]?.prefer;
    const ink =
      prefer && prefer !== previous
        ? prefer
        : (palette.find((c) => c !== previous && c !== next && !stories.some((s) => s.ink === c)) ??
          palette.find((c) => c !== previous) ??
          null);
    stories.push({ ...story, ink });
  });
  return stories;
}

export default async function RecapPage({ params }: PageProps<"/recap/[month]">) {
  const user = await requireUser();
  const { month: raw } = await params;
  let month;
  try {
    month = parseYearMonth(raw);
  } catch {
    notFound();
  }
  const { insights, expenses, categories } = getServices();
  const [recap, categoryList] = await Promise.all([insights.monthRecap(user.id, month), categories.list(user.id)]);
  const { summary } = recap;
  if (summary.total.isZero()) notFound();

  const colorOf = (categoryId: string | null | undefined) =>
    categoryList.find((c) => c.id === categoryId)?.color ?? null;
  const name = formatMonth(month, "short");
  const previous = formatMonth(addMonths(month, -1), "short");
  const top = recap.topCategory;
  const second = summary.byCategory[1];
  const drafts: Draft[] = [];

  drafts.push({
    id: "intro",
    prefer: second?.category?.color ?? null,
    focus: "all",
    headline: summary.total.format(),
    lede: `spent in ${formatMonth(month)}, across ${summary.count} purchases. Here's where it went.`,
  });

  if (top) {
    drafts.push({
      id: "top",
      prefer: top.category?.color ?? null,
      focus: top.category?.color ?? null,
      tag: top.category?.name ?? "uncategorised",
      headline: top.total.format(),
      lede: `went on ${(top.category?.name ?? "uncategorised spending").toLowerCase()}, ${Math.round(top.share * 100)}% of the month.`,
      rows: top.places.map((p) => ({ label: p.count > 1 ? `${p.title} ×${p.count}` : p.title, value: p.total.format() })),
    });
  }

  if (second) {
    drafts.push({
      id: "second",
      prefer: second.category?.color ?? null,
      focus: second.category?.color ?? null,
      tag: second.category?.name ?? "uncategorised",
      headline: second.total.format(),
      lede: `on ${(second.category?.name ?? "everything else").toLowerCase()}, over ${second.count} ${second.count === 1 ? "purchase" : "purchases"}.`,
    });
  }

  if (recap.favouritePlace && recap.favouritePlace.count > 1) {
    const place = recap.favouritePlace;
    const { items } = await expenses.list(user.id, { search: place.title, limit: 1 });
    const color = colorOf(items[0]?.categoryId);
    drafts.push({
      id: "local",
      prefer: color,
      focus: color,
      headline: place.title,
      lede: `was your local: ${place.count} visits, ${place.total.format()} in all.`,
    });
  }

  if (recap.biggestDay) {
    const { items } = await expenses.list(user.id, { from: recap.biggestDay.day, to: recap.biggestDay.day, limit: 4 });
    const biggestItem = [...items].sort((a, b) => b.homeAmount.minor - a.homeAmount.minor)[0];
    const color = colorOf(biggestItem?.categoryId);
    drafts.push({
      id: "biggest",
      prefer: color,
      focus: color,
      headline: recap.biggestDay.total.format(),
      lede: `on ${formatLongDate(recap.biggestDay.day)}, your biggest day.`,
      rows: items.map((e) => ({ label: e.title, value: e.homeAmount.format() })),
    });
  }

  if (recap.abroad.length > 0) {
    const [first] = recap.abroad;
    drafts.push({
      id: "abroad",
      prefer: null,
      focus: "all",
      headline: first.spent.format(),
      lede: `spent abroad in ${first.currency}, which came to ${first.home.format()} at each day's rate.`,
    });
  }

  if (!summary.previousTotal.isZero()) {
    const diff = summary.total.subtract(summary.previousTotal);
    drafts.push({
      id: "versus",
      prefer: summary.byCategory[2]?.category?.color ?? null,
      focus: "all",
      headline: `${diff.isNegative() ? "−" : "+"}${diff.abs().format()}`,
      lede: diff.isNegative() ? `less than you spent in ${previous}.` : `more than you spent in ${previous}.`,
    });
  }

  drafts.push({
    id: "outro",
    prefer: top?.category?.color ?? null,
    focus: "all",
    headline: name,
    lede: `in three words: ${summary.byCategory
      .slice(0, 3)
      .map((c) => `${(c.category?.name ?? "uncategorised").toLowerCase()} ${Math.round(c.share * 100)}%`)
      .join(", ")}.`,
  });

  const monthInks = summary.byCategory.flatMap((c) => (c.category ? [c.category.color] : []));
  const shareText = `My ${name} on ExpenseIt: ${summary.total.format()} across ${summary.count} purchases${
    top ? `, mostly on ${(top.category?.name ?? "uncategorised").toLowerCase()}` : ""
  }.`;

  return (
    <Recap
      title={`Your ${name}, wrapped`}
      stories={assignInks(drafts, monthInks)}
      segments={summary.byCategory.map((c) => ({
        color: c.category?.color ?? null,
        share: c.share,
        label: c.category?.name ?? "Uncategorised",
      }))}
      shareText={shareText}
    />
  );
}
