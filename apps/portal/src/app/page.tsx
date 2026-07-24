import { getAllSubjects } from "@/lib/subjects";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import Link from "next/link";

async function getSubjectStats(supabase: any, subject: string) {
  const { data: communities } = await supabase
    .from("communities")
    .select("id")
    .eq("subject", subject);
  const ids = (communities ?? []).map((c: any) => c.id);
  if (ids.length === 0)
    return { members: 0, proposals: 0, leaders: 0, communities: 0 };

  const [{ count: members }, { count: proposals }, { count: leaders }] =
    await Promise.all([
      supabase
        .from("community_memberships")
        .select("*", { count: "exact", head: true })
        .in("community_id", ids),
      supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .in("community_id", ids),
      supabase
        .from("community_memberships")
        .select("*", { count: "exact", head: true })
        .in("community_id", ids)
        .eq("role", "quorum"),
    ]);

  return {
    members: members ?? 0,
    proposals: proposals ?? 0,
    leaders: leaders ?? 0,
    communities: ids.length,
  };
}

async function getTopLeaders(supabase: any) {
  const { data: quorumMembers } = await supabase
    .from("community_memberships")
    .select(
      `user_id, community_id,
      users!community_memberships_user_id_fkey(display_name, location_name),
      communities!community_memberships_community_id_fkey(name, subject, level)`
    )
    .eq("role", "quorum")
    .limit(50);

  if (!quorumMembers || quorumMembers.length === 0) return [];

  const leaderMap = new Map<
    string,
    {
      name: string;
      location: string;
      seats: { community: string; subject: string; level: string }[];
    }
  >();

  for (const m of quorumMembers) {
    const uid = m.user_id;
    if (!leaderMap.has(uid)) {
      leaderMap.set(uid, {
        name: m.users?.display_name ?? "Anonymous",
        location: m.users?.location_name ?? "",
        seats: [],
      });
    }
    leaderMap.get(uid)!.seats.push({
      community: m.communities?.name ?? "",
      subject: m.communities?.subject ?? "",
      level: m.communities?.level ?? "",
    });
  }

  return [...leaderMap.entries()]
    .filter(([, data]) => data.seats.some((s) => s.level !== "global"))
    .sort((a, b) => b[1].seats.length - a[1].seats.length)
    .slice(0, 6)
    .map(([id, data]) => ({ id, ...data }));
}

export default async function Home() {
  const supabase = await createClient();
  const admin = createServiceClient();
  const subjects = getAllSubjects();

  const { count: totalMembers } = await admin
    .from("users")
    .select("id", { count: "exact", head: true });

  const { count: totalProposals } = await admin
    .from("proposals")
    .select("id", { count: "exact", head: true });

  const { count: totalCommunities } = await admin
    .from("communities")
    .select("id", { count: "exact", head: true });

  const subjectStats: Record<
    string,
    { members: number; proposals: number; leaders: number; communities: number }
  > = {};
  for (const s of subjects) {
    subjectStats[s.slug] = await getSubjectStats(admin, s.slug);
  }

  const topLeaders = await getTopLeaders(admin);

  const SUBJECT_LABELS: Record<string, string> = {};
  for (const s of subjects) {
    SUBJECT_LABELS[s.slug] = s.name;
  }

  const LEVEL_ORDER = ["local", "city", "national", "continental", "global"];

  return (
    <main className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl text-center">
          <img
            src="/logo.png"
            alt="Loop_cmbntr"
            className="mx-auto mb-8 h-16 w-16 rounded-xl"
          />

          <h1 className="mb-6 text-5xl font-light leading-[1.1] tracking-tight text-neutral-50 sm:text-6xl">
            Would you like to
            <br />
            <span className="font-medium text-amber-400">
              rule the world?
            </span>
          </h1>

          <p className="mx-auto mb-4 max-w-lg text-xl font-light leading-relaxed text-neutral-400">
            And get paid for it.
          </p>

          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-neutral-500">
            Pick a subject you care about. Build your reputation. Earn
            fractional ownership in the institutions you help govern. The more
            trust you earn, the more you earn.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#subjects"
              className="rounded-lg bg-amber-500 px-8 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
            >
              Start governing
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg border border-neutral-700 px-8 py-3.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Live stats bar */}
        <div className="relative z-10 mt-16 flex gap-12 text-center text-sm text-neutral-500">
          <div>
            <span className="block font-mono text-2xl font-light text-neutral-200">
              {(totalMembers ?? 0).toLocaleString()}
            </span>
            participants
          </div>
          <div>
            <span className="block font-mono text-2xl font-light text-neutral-200">
              {(totalCommunities ?? 0).toLocaleString()}
            </span>
            communities
          </div>
          <div>
            <span className="block font-mono text-2xl font-light text-neutral-200">
              {(totalProposals ?? 0).toLocaleString()}
            </span>
            proposals
          </div>
          <div>
            <span className="block font-mono text-2xl font-light text-neutral-200">
              {subjects.length}
            </span>
            subjects
          </div>
        </div>
      </section>

      {/* ── LOOP is tradeable ── */}
      <section className="border-y border-neutral-800/50 bg-gradient-to-b from-neutral-900/60 to-transparent px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-400">
                Now live on Base L2
              </span>
            </div>
            <h2 className="mb-3 text-3xl font-light tracking-tight text-neutral-100">
              LOOP is tradeable
            </h2>
            <p className="mx-auto max-w-lg text-base text-neutral-400">
              Buy, hold, and trade LOOP tokens with full liquidity on Base L2.
              Your governance power, backed by a real market.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center">
              <p className="mb-1 font-mono text-2xl font-light text-green-400">
                $1.00
              </p>
              <p className="text-xs text-neutral-500">Card purchase price</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center">
              <p className="mb-1 font-mono text-2xl font-light text-green-400">
                0.0004
              </p>
              <p className="text-xs text-neutral-500">ETH per token (on-chain)</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center">
              <p className="mb-1 font-mono text-2xl font-light text-green-400">
                2x
              </p>
              <p className="text-xs text-neutral-500">Tokens minted per purchase</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-200">
                  Buy with card or crypto
                </h3>
                <p className="text-sm leading-relaxed text-neutral-500">
                  Pay with USD, GBP, or EUR via card. Or connect your wallet
                  and purchase directly with ETH on Base L2. Every purchase
                  mints tokens for you, plus funds the impact treasury and
                  governance rewards.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-200">
                  Trade on DEX
                </h3>
                <p className="text-sm leading-relaxed text-neutral-500">
                  LOOP has full trading liquidity on Base L2 decentralized
                  exchanges. Track the live price on DEXScreener. Your tokens
                  are standard ERC-20 and work with any Base-compatible wallet.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/buy"
              className="rounded-lg bg-green-500 px-8 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-green-400"
            >
              Buy LOOP tokens
            </a>
            <a
              href="https://basescan.org/token/0xb8B309BBD007143cbef1844b75C1Fd038a267F21"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-700 px-8 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
            >
              View on Basescan
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-amber-500/60">
            Three steps
          </p>
          <h2 className="mb-16 text-center text-3xl font-light tracking-tight text-neutral-100">
            From participant to paid leader
          </h2>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/40 p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 font-mono text-sm font-semibold text-amber-400">
                1
              </div>
              <h3 className="mb-2 text-lg font-medium text-neutral-100">
                Pick your subjects
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Choose the areas you care about: governance, health, ecology,
                economics. You are placed into communities from your city up to
                the global level.
              </p>
            </div>

            <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/40 p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 font-mono text-sm font-semibold text-amber-400">
                2
              </div>
              <h3 className="mb-2 text-lg font-medium text-neutral-100">
                Build your power tree
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Vote on proposals, delegate to people you trust, and earn
                delegations from others. Your power tree is public. The
                stronger it is, the more influence you hold.
              </p>
            </div>

            <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/40 p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 font-mono text-sm font-semibold text-amber-400">
                3
              </div>
              <h3 className="mb-2 text-lg font-medium text-neutral-100">
                Earn while you govern
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Win leadership group seats through elections. Leaders earn asset-backed
                tokens representing fractional ownership in the ventures and
                funds your community stewards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The deal ── */}
      <section className="border-y border-neutral-800/50 bg-neutral-900/30 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-2xl font-light tracking-tight text-neutral-100">
            Not volunteer work. <span className="text-amber-400">Ownership.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-neutral-400">
            25% of all minted tokens go to impact projects. 25% go to
            participants as loyalty rewards. These are not speculative coins:
            they represent equity in real ventures managed by the communities
            you help govern. Participate in society, own a piece of it.
          </p>
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-6">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-5">
              <p className="mb-1 font-mono text-2xl font-light text-amber-400">
                25%
              </p>
              <p className="text-xs text-neutral-500">
                to impact projects
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-5">
              <p className="mb-1 font-mono text-2xl font-light text-amber-400">
                25%
              </p>
              <p className="text-xs text-neutral-500">
                to participants
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-5">
              <p className="mb-1 font-mono text-2xl font-light text-amber-400">
                50%
              </p>
              <p className="text-xs text-neutral-500">
                to operations &amp; growth
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Subjects grid ── */}
      <section id="subjects" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-amber-500/60">
            Choose your arena
          </p>
          <h2 className="mb-4 text-center text-3xl font-light tracking-tight text-neutral-100">
            What do you want to govern?
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-center text-sm text-neutral-500">
            Each subject has its own democratic hierarchy, elections, proposals,
            and treasury. Pick what matters to you.
          </p>

          <div className="mx-auto mb-14 max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-5 text-center">
            <p className="mb-2 text-sm font-medium text-neutral-200">
              Don't see your thing? Create your own.
            </p>
            <p className="mb-3 text-sm leading-relaxed text-neutral-500">
              Woodworking expertise. Save the whales. How to make more money.
              Any subject imaginable. Only communities with funding from private
              or impact sources will pay participants today, but that changes.
              Build a community big enough and it attracts funding. Then
              governing it becomes your living.
            </p>
            <a
              href="/create"
              className="inline-block rounded-lg border border-amber-500/30 px-5 py-2 text-xs font-semibold text-amber-400 transition hover:border-amber-500/60 hover:bg-amber-500/5"
            >
              Start a community
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const stats = subjectStats[s.slug];
              const isActive = stats.communities > 0;
              return (
                <Link
                  key={s.slug}
                  href={`/join/${s.slug}`}
                  className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 transition hover:border-neutral-700"
                >
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(ellipse at top, ${s.accent}08 0%, transparent 70%)`,
                    }}
                  />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{s.icon}</span>
                        <h3
                          className="text-lg font-medium"
                          style={{ color: s.accent }}
                        >
                          {s.name}
                        </h3>
                      </div>
                      {isActive && (
                        <span
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                          style={{
                            backgroundColor: `${s.accent}15`,
                            color: s.accent,
                          }}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: s.accent }}
                          />
                          Live
                        </span>
                      )}
                    </div>

                    <p className="mb-5 text-sm leading-relaxed text-neutral-500">
                      {s.description}
                    </p>

                    {isActive ? (
                      <div className="flex gap-5 border-t border-neutral-800/50 pt-4 text-xs text-neutral-500">
                        <div>
                          <span className="block font-mono text-base text-neutral-300">
                            {stats.members}
                          </span>
                          members
                        </div>
                        <div>
                          <span className="block font-mono text-base text-neutral-300">
                            {stats.proposals}
                          </span>
                          proposals
                        </div>
                        <div>
                          <span className="block font-mono text-base text-neutral-300">
                            {stats.leaders}
                          </span>
                          leaders
                        </div>
                      </div>
                    ) : (
                      <p className="border-t border-neutral-800/50 pt-4 text-xs text-neutral-600">
                        Be the first to start this subject
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Leaders ── */}
      {topLeaders.length > 0 && (
        <section className="border-t border-neutral-800/50 px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-amber-500/60">
              Leaderboard
            </p>
            <h2 className="mb-4 text-center text-3xl font-light tracking-tight text-neutral-100">
              People already governing
            </h2>
            <p className="mx-auto mb-14 max-w-lg text-center text-sm text-neutral-500">
              These participants hold leadership group seats across communities. Their
              power trees are public. Build yours to join them.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topLeaders.map((leader) => (
                <div
                  key={leader.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 font-mono text-sm font-semibold text-amber-400">
                      {leader.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-200">
                        {leader.name}
                      </p>
                      {leader.location && (
                        <p className="text-xs text-neutral-500">
                          {leader.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const lowestPerSubject = new Map<string, typeof leader.seats[0]>();
                      for (const seat of leader.seats) {
                        const existing = lowestPerSubject.get(seat.subject);
                        if (!existing || LEVEL_ORDER.indexOf(seat.level) < LEVEL_ORDER.indexOf(existing.level)) {
                          lowestPerSubject.set(seat.subject, seat);
                        }
                      }
                      return [...lowestPerSubject.values()]
                        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
                        .map((seat, i) => {
                          const subjectConfig = subjects.find((s) => s.slug === seat.subject);
                          const subjectLabel = subjectConfig?.name ?? seat.subject;
                          const locationPart = seat.community.includes(": ")
                            ? seat.community.split(": ")[1]
                            : seat.community;
                          const label = seat.level === "global"
                            ? subjectLabel
                            : `${subjectLabel}: ${locationPart}`;
                          return (
                            <span
                              key={i}
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: subjectConfig
                                  ? `${subjectConfig.accent}15`
                                  : "rgb(38 38 38)",
                                color: subjectConfig?.accent ?? "#737373",
                              }}
                            >
                              {label}
                            </span>
                          );
                        });
                    })()}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    {leader.seats.filter((s) => s.level !== "global").length} leadership seat
                    {leader.seats.filter((s) => s.level !== "global").length !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Liquid governance explainer ── */}
      <section className="border-t border-neutral-800/50 bg-neutral-900/20 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-light tracking-tight text-neutral-100">
            Power you earn. Power you can lose.
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Liquid democracy
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                Delegate your vote to someone you trust on any subject. Change
                your mind at any time. Power flows to the most trusted, not the
                loudest.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Self-correcting
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                Corrupt or incompetent leaders lose delegations in real time.
                No waiting for the next election cycle. Bad actors are
                identified and demoted by the community.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Geographic hierarchy
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                Communities are organized from your local neighbourhood up to
                the global level. Prove yourself locally, rise to govern
                nationally, then globally.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Asset-backed tokens
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                Not speculative crypto. Tokens represent equity in real ventures
                and impact funds managed by your community. Govern well, and
                your stake grows with the outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-light tracking-tight text-neutral-100">
            Ready to govern?
          </h2>
          <p className="mb-8 text-lg text-neutral-500">
            Pick a subject. Join your communities. Start building your power
            tree today.
          </p>
          <a
            href="#subjects"
            className="inline-block rounded-lg bg-amber-500 px-10 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400"
          >
            Choose your first subject
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-800/50 px-6 py-10 text-center text-xs text-neutral-600">
        <div className="mb-3 flex items-center justify-center gap-2">
          <img src="/logo.png" alt="Loop_cmbntr" className="h-6 w-6 rounded" />
          <span className="font-medium text-neutral-500">
            Loop<span className="text-neutral-600">_</span>
            <span className="text-red-500/60">cmbntr</span>
          </span>
        </div>
        <p>Connecting, rewarding, and empowering communities.</p>
        <p className="mt-2 text-neutral-700">
          Part of the{" "}
          <a
            href="https://www.loopcmbntr.live"
            className="text-neutral-500 underline decoration-neutral-700 transition hover:text-neutral-300"
          >
            Loop_cmbntr
          </a>{" "}
          network
        </p>
      </footer>
    </main>
  );
}
