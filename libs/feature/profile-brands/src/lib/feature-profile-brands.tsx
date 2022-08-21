import { SharedUiBrandCard } from "@flenzr/shared/ui-brand-card";


export function FeatureProfileBrands() {
  return (
    <div className="flex flex-wrap rounded-lg justify-center">
    <div className="m-8">
      <SharedUiBrandCard />
    </div>
    <div className="m-8">
      <SharedUiBrandCard />
    </div>
  </div>
  );
};


export default FeatureProfileBrands;
