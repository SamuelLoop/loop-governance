import { createServiceClient } from "@/lib/supabase-server";
import { getActiveSubject } from "@/lib/subject";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RebalanceButton } from "./rebalance-button";

type Community = {
  id: string;
  name: string;
  slug: string;
  level: string;
  path: string;
  parent_id: string | null;
  subject: string;
  quorum_size: number;
  dunbar_limit: number;
  member_count: number;
  children: Community[];
};

function buildTree(communities: Community[]): Community[] {
  const map = new Map<string, Community>();
  const roots: Community[] = [];

  for (const c of communities) {
    c.children = [];
    map.set(c.id, c);
  }

  for (const c of communities) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(c);
    } else {
      roots.push(c);
    }
  }

  return roots;
}

function CommunityNode({
  community,
  depth,
}: {
  community: Community;
  depth: number;
}) {
  const atLimit = community.member_count >= community.dunbar_limit;
  const pct = Math.min(
    (community.member_count / community.dunbar_limit) * 100,
    100
  );

  return (
    <>
      <Link
        href={`/communities/${community.id}`}
        className="group flex items-center gap-3 px-4 py-3 transition hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 28 + 16}px` }}
      >
        {depth > 0 && (
          <span className="font-mono text-xs text-muted-foreground/40">
            {"└─"}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium group-hover:text-primary truncate">
              {community.name}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {community.level}
            </Badge>
            {atLimit && <Badge variant="destructive" className="text-[10px]">at limit</Badge>}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Progress
                value={pct}
                className="h-1.5 w-24"
              />
              <span className="text-xs text-muted-foreground">
                {community.member_count}/{community.dunbar_limit}
              </span>
            </div>
            <span className="text-xs text-muted-foreground/60">
              quorum {community.quorum_size}
            </span>
          </div>
        </div>
      </Link>
      {community.children.map((child) => (
        <CommunityNode key={child.id} community={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default async function CommunitiesPage() {
  const admin = createServiceClient();
  const activeSubject = await getActiveSubject();

  const { data: communities } = await admin
    .from("communities")
    .select(
      "id, name, slug, level, path, parent_id, subject, quorum_size, dunbar_limit"
    )
    .eq("subject", activeSubject)
    .order("path", { ascending: true });

  const { data: counts } = await admin
    .from("community_memberships")
    .select("community_id");

  const countMap = new Map<string, number>();
  if (counts) {
    for (const c of counts) {
      countMap.set(c.community_id, (countMap.get(c.community_id) ?? 0) + 1);
    }
  }

  const enriched: Community[] = (communities ?? []).map((c: any) => ({
    ...c,
    member_count: countMap.get(c.id) ?? 0,
    children: [],
  }));

  const tree = buildTree(enriched);
  const totalMembers = counts?.length ?? 0;
  const totalCommunities = enriched.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Communities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCommunities} communit{totalCommunities !== 1 ? "ies" : "y"},{" "}
            {totalMembers} total membership{totalMembers !== 1 ? "s" : ""}
          </p>
        </div>
        <RebalanceButton />
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Communities auto-split when membership reaches the Dunbar limit
          (default 150). Members are clustered by geographic location into a
          containment hierarchy: Global, Continental, National, City. Each
          member belongs to every level they live inside.
        </CardContent>
      </Card>

      {tree.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {tree.map((c) => (
              <CommunityNode key={c.id} community={c} depth={0} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No communities yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
