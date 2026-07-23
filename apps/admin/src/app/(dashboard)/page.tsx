import { requireAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase-server";

export default async function AdminDashboard() {
  const session = await requireAdminSession();
  const admin = createServiceClient();

  const isPlatformAdmin = session.platformRole === "platform_admin";

  const [
    { count: userCount },
    { count: communityCount },
    { count: flagCount },
    { count: orgCount },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .then((r) => ({ count: r.count ?? 0 })),
    admin
      .from("communities")
      .select("id", { count: "exact", head: true })
      .then((r) => ({ count: r.count ?? 0 })),
    admin
      .from("moderation_flags")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => ({ count: r.count ?? 0 })),
    isPlatformAdmin
      ? admin
          .from("white_label_configs")
          .select("id", { count: "exact", head: true })
          .then((r) => ({ count: r.count ?? 0 }))
      : Promise.resolve({ count: null }),
  ]);

  const stats = [
    { label: "Total Users", value: userCount },
    { label: "Communities", value: communityCount },
    { label: "Pending Flags", value: flagCount },
    ...(orgCount !== null ? [{ label: "Organizations", value: orgCount }] : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isPlatformAdmin
            ? "Platform overview across all organizations"
            : `Managing ${session.whiteLabel?.name ?? "organization"}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the sidebar to navigate to specific management areas.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/members"
            className="rounded-md border border-border bg-secondary/30 p-3 text-sm transition-colors hover:bg-secondary"
          >
            <span className="font-medium">Manage Members</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              View and manage platform users
            </p>
          </a>
          <a
            href="/moderation"
            className="rounded-md border border-border bg-secondary/30 p-3 text-sm transition-colors hover:bg-secondary"
          >
            <span className="font-medium">Review Flags</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {flagCount} pending moderation flags
            </p>
          </a>
          <a
            href="/allocations"
            className="rounded-md border border-border bg-secondary/30 p-3 text-sm transition-colors hover:bg-secondary"
          >
            <span className="font-medium">Treasury Allocations</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure subject budget splits
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
