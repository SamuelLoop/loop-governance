import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getSubject } from "@/lib/subjects";
import { EnrollmentForm } from "./enrollment-form";

type Params = Promise<{ slug: string }>;

export default async function JoinPage({ params }: { params: Params }) {
  const { slug } = await params;
  const subject = getSubject(slug);

  if (!subject) {
    notFound();
  }

  const h = await headers();
  const geoCity = h.get("x-vercel-ip-city") ?? "";
  const geoCountry = h.get("x-vercel-ip-country-region") ?? "";
  const geoCountryCode = h.get("x-vercel-ip-country") ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <span className="mb-2 block text-3xl">{subject.icon}</span>
        <h1
          className="text-3xl font-light tracking-tight"
          style={{ color: subject.accentLight }}
        >
          {subject.name}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-neutral-400">
          {subject.description}
        </p>
      </div>

      <EnrollmentForm
        subject={subject}
        geoCity={decodeURIComponent(geoCity)}
        geoCountryCode={geoCountryCode}
      />
    </main>
  );
}
