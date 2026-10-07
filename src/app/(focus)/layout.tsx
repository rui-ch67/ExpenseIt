import { requireUser } from "@/server/session";

/** Full-screen pages (the monthly recap) without the app's navigation. */
export default async function FocusLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return children;
}
