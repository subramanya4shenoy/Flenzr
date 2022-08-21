import { FeatureStatsCard } from "@flenzr/feature/stats-card";
import { FeatureProfileCategory } from "@flenzr/feature/profile-category";
import { SharedUiRating } from "@flenzr/shared/ui-rating";

export function FeatureProfileFeeds() {
  return (
    <div className="flex">
      <div className="w-2/3">flowing feed</div>
      <div className="w-1/3">
        <div className="mb-4 flex justify-center items-center">
          <div>
            <FeatureStatsCard />
            <FeatureProfileCategory/>
            <SharedUiRating/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureProfileFeeds;
