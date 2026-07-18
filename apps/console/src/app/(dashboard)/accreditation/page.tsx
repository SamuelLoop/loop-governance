import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AccreditForm } from "./accredit-form";

export default async function AccreditationPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  const { data: scores } = await admin
    .from("accreditation_scores")
    .select(`
      id, subject_tag, score, rank,
      users!accreditation_scores_user_id_fkey(display_name),
      communities!accreditation_scores_community_id_fkey(name)
    `)
    .order("score", { ascending: false })
    .limit(50);

  const { data: recentAccreditations } = await admin
    .from("accreditations")
    .select(`
      id, subject_tag, weight, active, created_at,
      giver:users!accreditations_giver_id_fkey(display_name),
      receiver:users!accreditations_receiver_id_fkey(display_name),
      communities!accreditations_community_id_fkey(name)
    `)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: members } = await admin
    .from("users")
    .select("id, display_name")
    .neq("id", profile.id)
    .order("display_name");

  const { data: communities } = await admin
    .from("communities")
    .select("id, name, subject_tags")
    .order("level");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-light tracking-tight">
        Accreditation
      </h1>

      <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Accredit a peer
        </h2>
        <AccreditForm
          giverId={profile.id}
          members={members ?? []}
          communities={communities ?? []}
        />
      </div>

      {recentAccreditations && recentAccreditations.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Recent accreditations
          </h2>
          <div className="space-y-2">
            {recentAccreditations.map((a: any) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 px-5 py-3 text-sm"
              >
                <div>
                  <span className="text-neutral-100">
                    {a.giver?.display_name}
                  </span>
                  <span className="mx-2 text-neutral-600">accredited</span>
                  <span className="text-amber-400">
                    {a.receiver?.display_name}
                  </span>
                  <span className="mx-2 text-neutral-600">in</span>
                  <span className="text-neutral-300">{a.subject_tag}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>{a.communities?.name}</span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scores && scores.length > 0 && (
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Leaderboard
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 font-mono text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Community</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s: any, i: number) => (
                  <tr
                    key={s.id}
                    className="border-b border-neutral-800/50 transition hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      #{i + 1}
                    </td>
                    <td className="px-4 py-3 text-neutral-100">
                      {s.users?.display_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
                        {s.subject_tag}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {s.communities?.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-400">
                      {s.score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
