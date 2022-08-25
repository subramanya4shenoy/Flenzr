import { FeatureFeedCard } from "@flenzr/feature/feed-card";

export function FeatureUserPostFeed() {
  return <>
  {[...Array(Math.floor(Math.random() * 20))].map((index) => {
    return <FeatureFeedCard key={"tets_"+index}/>;
  })}
  </>
}

export default FeatureUserPostFeed;