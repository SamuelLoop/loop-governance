import { createClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createClient();

  const { data: communities } = await supabase
    .from("communities")
    .select("id, name, slug, level, description, subject_tags")
    .order("level");

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="mb-16 max-w-xl text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-amber-500">
          Loop Governance
        </p>
        <h1 className="mb-4 text-4xl font-light tracking-tight">
          Community Portal
        </h1>
        <p className="text-lg text-neutral-400">
          Join a community to participate in governance, trade, and
          collective decision-making.
        </p>
      </div>

      {communities && communities.length > 0 && (
        <div className="w-full max-w-2xl">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            Communities
          </h2>
          <div className="space-y-3">
            {communities.map((c) => (
              <a
                key={c.id}
                href={`/join/${c.slug}`}
                className="group block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-amber-500/30 hover:bg-neutral-800/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-500/70">
                      {c.level}
                    </p>
                    <h3 className="text-lg font-medium text-neutral-100 group-hover:text-amber-400">
                      {c.name}
                    </h3>
                    {c.description && (
                      <p className="mt-1 text-sm text-neutral-400">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <span className="mt-1 text-neutral-600 transition group-hover:text-amber-500">
                    &#8594;
                  </span>
                </div>
                {c.subject_tags && (c.subject_tags as string[]).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(c.subject_tags as string[]).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
