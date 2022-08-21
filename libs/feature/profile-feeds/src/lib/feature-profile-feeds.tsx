import { FeatureStatsCard } from "@flenzr/feature/stats-card";

export function FeatureProfileFeeds() {
  return (
    <div className="flex">
      <div className="w-2/3">flowing feed</div>
      <div className="w-1/3">
        <div className="mb-4 flex justify-center items-center">
          <div>
            <FeatureStatsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureProfileFeeds;
