import { csvHeader, expenseToCsvRow } from "@/application/export/csv";
import { firstDayOf, lastDayOf, parseYearMonth, todayIn } from "@/domain/dates";
import { errorResponse, unauthorised } from "@/server/http";
import { getServices } from "@/server/services";
import { getCurrentUser } from "@/server/session";
import { categoryMap } from "@/server/views";

/**
 * Downloads expenses as CSV, newest first. Accepts the Activity page's
 * filters (q, category, month); with none, it's everything.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorised();
  try {
    const params = new URL(request.url).searchParams;
    const month = params.get("month") ? parseYearMonth(params.get("month")!) : null;
    const query = {
      search: params.get("q") ?? undefined,
      categoryIds: params.get("category") ? [params.get("category")!] : undefined,
      from: month ? firstDayOf(month) : undefined,
      to: month ? lastDayOf(month) : undefined,
    };
    const { expenses, categories } = getServices();
    const byId = categoryMap(await categories.list(user.id));
    // Validate the filters before streaming starts, so errors become a 400.
    let page = await expenses.list(user.id, { ...query, limit: 100 });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(`﻿${csvHeader()}`)); // BOM so Excel reads UTF-8
        for (;;) {
          for (const expense of page.items) controller.enqueue(encoder.encode(expenseToCsvRow(expense, byId)));
          if (!page.nextCursor) break;
          page = await expenses.list(user.id, { ...query, limit: 100, cursor: page.nextCursor });
        }
        controller.close();
      },
    });
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="expenseit-${month ?? todayIn()}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
