import { FeatureStatsCard } from "@flenzr/feature/stats-card";
import { FeatureProfileCategory } from "@flenzr/feature/profile-category";
import { SharedUiRating } from "@flenzr/shared/ui-rating";
import { FeatureProfileTargetLocation } from "@flenzr/feature/profile-target-location";
import { FeatureUserPost } from "@flenzr/feature/user-post";
import { FeatureUserPostFeed } from "@flenzr/feature/user-post-feed";

export function FeatureProfileFeeds() {
  return (
    <div className="laptop:flex desktop:flex">
      <div className="w-full hidden laptop:block desktop:block laptop:w-1/3 desktop:w-1/3 laptop:sticky desktop:sticky top-0">
        <div className="mb-4 flex justify-center items-center">
          <div>
            <FeatureStatsCard />
            <div className="my-4 pr-10">
              <FeatureProfileCategory/>
            </div>
            <div className="my-4 pr-10">
              <SharedUiRating/>
            </div>
            <FeatureProfileTargetLocation/>
          </div>
        </div>
      </div>
      <div className="laptop:w-2/3 desktop:w-2/3 px-4">
        <div className="hidden laptop:block desktop:block">
          <FeatureUserPost/>
        </div>
        <div className="mt-10">
          <FeatureUserPostFeed />
        </div>
      </div>
    </div>
  );
}

export default FeatureProfileFeeds;
