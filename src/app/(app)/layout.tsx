import { requireUser } from "@/server/session";
import { SideRail, TabBar } from "@/ui/app-nav";
import { DemoBanner } from "@/ui/demo-banner";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh">
      <SideRail />
      <div className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {user.isDemo && <DemoBanner />}
        {children}
      </div>
      <TabBar />
    </div>
  );
}
