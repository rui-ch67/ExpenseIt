"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const RECORD_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Anonymous page-view counts (Vercel Web Analytics: no cookies, nothing that
 * identifies a visitor). URLs are trimmed before sending, so searches typed
 * into Activity and the ids of people's expenses and receipts never leave.
 */
function redact(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname.replace(RECORD_ID, "[id]")}` };
}

export function PageViews() {
  return <Analytics beforeSend={redact} />;
}
