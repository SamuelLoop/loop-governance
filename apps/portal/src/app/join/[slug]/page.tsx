import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { EnrollmentForm } from "./enrollment-form";

type Params = Promise<{ slug: string }>;

export default async function JoinPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, level, description, subject_tags")
    .eq("slug", slug)
    .single();

  if (!community) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-amber-500">
          {community.level} community
        </p>
        <h1 className="text-3xl font-light tracking-tight text-neutral-100">
          {community.name}
        </h1>
        {community.description && (
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            {community.description}
          </p>
        )}
      </div>

      <EnrollmentForm
        communityId={community.id}
        communityName={community.name}
      />
    </main>
  );
}
