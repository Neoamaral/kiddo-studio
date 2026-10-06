import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { isDbConfigured } from "@/lib/db/client";
import { readDashboard, type Dashboard } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";

const EMPTY: Dashboard = {
  totals: {
    sessions: 0,
    pageViews: 0,
    bookingStarts: 0,
    submitted: 0,
    confirmed: 0,
    revenueCents: 0,
    submittedSeen: 0,
  },
  funnel: [],
  topPages: [],
  sources: [],
  ctas: [],
  devices: [],
  gear: [],
  health: { events: 0, sizeBytes: 0 },
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const parsed = Number(raw);
  const days = [7, 30, 90].includes(parsed) ? parsed : 30;

  /*
   * Read defensively, the way the overview does. Eight queries at once is the
   * heaviest read in the admin, and a timeout has to leave the navigation
   * usable instead of replacing the page with an error.
   */
  let data = EMPTY;
  let failed: string | null = null;
  if (isDbConfigured()) {
    try {
      data = await readDashboard(days);
    } catch (err) {
      failed = err instanceof Error ? err.message : "The database did not answer.";
    }
  }

  return (
    <AnalyticsDashboard data={data} days={days} dbOff={!isDbConfigured()} failed={failed} />
  );
}
