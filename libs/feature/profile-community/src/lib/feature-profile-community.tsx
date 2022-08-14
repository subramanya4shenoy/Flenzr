import { FeatureStatsCard } from "@flenzr/feature/stats-card";
import { FeatureStatsFbCard } from "@flenzr/feature/stats-fb-card";
import { FeatureStatsInstaCard } from "@flenzr/feature/stats-insta-card";
import { FeatureStatsLinkedinCard } from "@flenzr/feature/stats-linkedin-card";
import { FeatureStatsTwitterCard } from "@flenzr/feature/stats-twitter-card";
import { FeatureStatsYtCard } from "@flenzr/feature/stats-yt-card";

export function FeatureProfileCommunity() {
  return (
    <div className="flex flex-wrap justify-center">
      <div className="m-4">
        <FeatureStatsCard />
      </div>
      <div className="m-4">
        <FeatureStatsYtCard />
      </div>
      <div className="m-4">
        <FeatureStatsInstaCard />
      </div>
      <div className="m-4">
        <FeatureStatsFbCard />
      </div>
      <div className="m-4">
        <FeatureStatsLinkedinCard />
      </div>
      <div className="m-4">
        <FeatureStatsTwitterCard />
      </div>
    </div>
  );
}

export default FeatureProfileCommunity;
