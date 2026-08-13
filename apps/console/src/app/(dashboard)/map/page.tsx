import { getMapData } from "./actions";
import { CommunityMap } from "./community-map";
import { Glass } from "@loop/ui";

export default async function MapPage() {
  const communities = await getMapData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">
          Community Map
        </h1>
        <p className="mt-1 text-body text-text-secondary">
          Geographic distribution of the governance hierarchy
        </p>
      </div>
      {/* The map canvas itself (Leaflet + H3, computed accent-gradient
          ramp) is untouched — its colour logic was already fixed in
          session 7. Only the surrounding chrome moves to Glass here,
          per session 10's pattern 3. */}
      <Glass className="h-[calc(100vh-12rem)] overflow-hidden p-0">
        <CommunityMap communities={communities} />
      </Glass>
    </div>
  );
}
