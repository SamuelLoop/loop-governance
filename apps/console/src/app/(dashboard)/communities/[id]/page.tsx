import { createServiceClient, createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SplitButton } from "./split-button";
import { SettingsForm } from "./settings-form";

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: community } = await admin
    .from("communities")
    .select("*")
    .eq("id", id)
    .single();

  if (!community) notFound();

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  let parentName: string | null = null;
  if (community.parent_id) {
    const { data: parent } = await admin
      .from("communities")
      .select("name, id")
      .eq("id", community.parent_id)
      .single();
    parentName = parent?.name ?? null;
  }

  const { data: children } = await admin
    .from("communities")
    .select("id, name, slug, level")
    .eq("parent_id", id)
    .order("name");

  const { data: memberships } = await admin
    .from("community_memberships")
    .select(
      `id, role, joined_at,
      users!community_memberships_user_id_fkey(id, display_name, email, location_name)`
    )
    .eq("community_id", id)
    .order("joined_at", { ascending: false });

  const memberCount = memberships?.length ?? 0;
  const atLimit = memberCount >= community.dunbar_limit;
  const pct = Math.min((memberCount / community.dunbar_limit) * 100, 100);

  const isAdmin =
    profile &&
    memberships?.some(
      (m: any) => m.users?.id === profile.id && m.role === "admin"
    );

  return (
    <div className="max-w-4xl">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/communities" />}>
              Communities
            </BreadcrumbLink>
          </BreadcrumbItem>
          {community.parent_id && parentName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={`/communities/${community.parent_id}`} />}>
                  {parentName}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{community.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {community.name}
            </h1>
            <Badge variant="outline">{community.level}</Badge>
          </div>
          {community.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {community.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/communities/${id}/chat`} />}>
            Chat
          </Button>
          {isAdmin && <SplitButton communityId={id} atLimit={atLimit} />}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold">{memberCount}</span>
              <span className="mb-0.5 text-xs text-muted-foreground">
                / {community.dunbar_limit} limit
              </span>
            </div>
            <Progress value={pct} className="mt-2 h-1.5" />
            {atLimit && (
              <p className="mt-1.5 text-[10px] text-destructive">
                Dunbar limit reached. Community will auto-split.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quorum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">
              {community.quorum_size}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              voters required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sub-communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">
              {children?.length ?? 0}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              {community.subject_tags?.length ?? 0} subject tag
              {(community.subject_tags?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {community.subject_tags && community.subject_tags.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Subject tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {community.subject_tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {children && children.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sub-communities
          </p>
          <div className="space-y-1">
            {children.map((child: any) => (
              <Link key={child.id} href={`/communities/${child.id}`}>
                <Card className="transition hover:border-primary/30">
                  <CardContent className="flex items-center gap-2 py-3">
                    <span className="text-sm font-medium">{child.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {child.level}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6">
          <SettingsForm
            communityId={id}
            quorumSize={community.quorum_size}
            dunbarLimit={community.dunbar_limit}
            maxDelegationDepth={community.max_delegation_depth ?? 10}
            delegationDecay={parseFloat(community.delegation_decay ?? "1.000")}
            quorumThresholdPct={parseFloat(community.quorum_threshold_pct ?? "10.00")}
          />
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Members ({memberCount})
        </p>
        {memberships && memberships.length > 0 ? (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">
                        {m.users?.display_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.users?.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.users?.location_name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.role === "admin"
                            ? "default"
                            : m.role === "quorum"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        )}
      </div>
    </div>
  );
}
