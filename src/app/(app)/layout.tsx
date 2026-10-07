import { cookies } from "next/headers";
import { getServices } from "@/server/services";
import { requireUser } from "@/server/session";
import { SideRail, TabBar } from "@/ui/app-nav";
import { DemoBanner } from "@/ui/demo-banner";
import { DEMO_BANNER_COOKIE, DEMO_BANNER_DISMISSED } from "@/ui/demo-banner-cookie";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // Log any recurring payments that fell due since the last visit. Cheap when
  // nothing is due, and safe to repeat: each payment is logged once per date.
  await getServices().recurring.catchUp(user.id);
  const showDemoBanner =
    user.isDemo && (await cookies()).get(DEMO_BANNER_COOKIE)?.value !== DEMO_BANNER_DISMISSED;
  return (
    <div className="flex min-h-dvh">
      <SideRail />
      <div className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {showDemoBanner && <DemoBanner />}
        {children}
      </div>
      <TabBar />
    </div>
  );
}
