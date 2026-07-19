import { getMapData } from "./actions";
import { CommunityMap } from "./community-map";

export default async function MapPage() {
  const communities = await getMapData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community Map
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Geographic distribution of the governance hierarchy
        </p>
      </div>
      <div className="h-[calc(100vh-12rem)] overflow-hidden rounded-lg border">
        <CommunityMap communities={communities} />
      </div>
    </div>
  );
}
