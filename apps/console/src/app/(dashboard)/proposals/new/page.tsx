import { createClient, createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProposalForm } from "./form";

export default async function NewProposalPage() {
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: communities } = await admin
    .from("communities")
    .select("id, name, slug, level")
    .order("level");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) redirect("/");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        New proposal
      </h1>
      <Card>
        <CardContent className="pt-6">
          <CreateProposalForm
            communities={communities ?? []}
            userId={profile.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
