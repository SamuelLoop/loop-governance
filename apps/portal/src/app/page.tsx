export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-amber-500">
          Loop Governance
        </p>
        <h1 className="mb-6 text-4xl font-light tracking-tight">
          Community Portal
        </h1>
        <p className="text-lg text-neutral-400">
          Enrollment funnels, community coordination, and governance
          participation. This is the public-facing entry point for the fractal
          community system.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 font-mono text-xs text-neutral-600">
          <span>Next.js 15</span>
          <span className="text-neutral-800">+</span>
          <span>Drizzle</span>
          <span className="text-neutral-800">+</span>
          <span>Supabase</span>
          <span className="text-neutral-800">+</span>
          <span>Turborepo</span>
        </div>
      </div>
    </main>
  );
}
