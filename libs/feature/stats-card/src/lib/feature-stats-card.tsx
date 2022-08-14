import { FeatureSocialList } from "@flenzr/feature/social-list";

export function FeatureStatsCard() {
  return (
    <div className="shadow h-48 w-72 p-6" style={{
      borderRadius: "28px",
      boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
    }}>
      <div className="font-bold text-sm">Total fanbase</div>
      <div className="text-6xl text-center my-4">123K</div>
      <FeatureSocialList/>
    </div>
  );
};


export default FeatureStatsCard;
