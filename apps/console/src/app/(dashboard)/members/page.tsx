import { createServiceClient } from "@/lib/supabase-server";

export default async function MembersPage() {
  const admin = createServiceClient();

  const { data: memberships } = await admin
    .from("community_memberships")
    .select(`
      id, role, joined_at,
      users!community_memberships_user_id_fkey(id, display_name, email, location_name, subject_expertise),
      communities!community_memberships_community_id_fkey(name, slug)
    `)
    .order("joined_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-light tracking-tight">Members</h1>

      {memberships && memberships.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 font-mono text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Community</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m: any) => (
                <tr
                  key={m.id}
                  className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50"
                >
                  <td className="px-4 py-3 text-neutral-100">
                    {m.users?.display_name}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {m.users?.email}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {m.communities?.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        m.role === "admin"
                          ? "bg-amber-500/10 text-amber-400"
                          : m.role === "quorum"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {m.users?.location_name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No members yet.</p>
      )}
    </div>
  );
}
