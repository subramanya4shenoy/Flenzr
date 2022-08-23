import { FeatureStatsCard } from "@flenzr/feature/stats-card";
import { FeatureProfileCategory } from "@flenzr/feature/profile-category";
import { SharedUiRating } from "@flenzr/shared/ui-rating";
import { FeatureProfileTargetLocation } from "@flenzr/feature/profile-target-location";
import { FeatureUserPost } from "@flenzr/feature/user-post";
import { FeatureUserPostFeed } from "@flenzr/feature/user-post-feed";

export function FeatureProfileFeeds() {
  return (
    <div className="flex">
      <div className="w-1/3">
        <div className="mb-4 flex justify-center items-center">
          <div>
            <FeatureStatsCard />
            <FeatureProfileCategory/>
            <SharedUiRating/>
            <FeatureProfileTargetLocation/>
          </div>
        </div>
      </div>
      <div className="w-2/3">
        <FeatureUserPost/>
        <div className="mt-10">
          <FeatureUserPostFeed />
        </div>
      </div>
    </div>
  );
}

export default FeatureProfileFeeds;
