import { getAllSubjects } from "@/lib/subjects";
import { CreateForm } from "./create-form";

export default function CreatePage() {
  const subjects = getAllSubjects();

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="mb-10 text-center">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs uppercase tracking-[0.3em] text-amber-500/60 transition hover:text-amber-500"
        >
          &larr; Back
        </a>
        <h1 className="text-3xl font-light tracking-tight text-neutral-100">
          Start something new
        </h1>
        <p className="mx-auto mt-3 max-w-md text-neutral-400">
          Create a community around any subject. If it grows, it attracts
          funding. Then governing it becomes your living.
        </p>
      </div>

      <CreateForm subjects={subjects} />
    </main>
  );
}
