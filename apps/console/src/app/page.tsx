export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-amber-500">
          Loop Console
        </p>
        <h1 className="mb-6 text-4xl font-light tracking-tight">
          Governance Console
        </h1>
        <p className="text-lg text-neutral-400">
          Community management, quorum dashboards, fund proposals, trade
          oversight, and accreditation views. The admin layer for fractal
          governance.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 font-mono text-xs text-neutral-600">
          <span>Port 3200</span>
          <span className="text-neutral-800">|</span>
          <span>Admin app</span>
        </div>
      </div>
    </main>
  );
}
