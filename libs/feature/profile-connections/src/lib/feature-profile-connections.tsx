import { SharedUiUserCard } from "@flenzr/shared/ui-user-card";

export function FeatureProfileConnections() {
  return (
    <div className="flex flex-wrap rounded-lg justify-center">
      <div className="m-8">
        <SharedUiUserCard />
      </div>
      <div className="m-8">
        <SharedUiUserCard />
      </div>
    </div>
  );
}

export default FeatureProfileConnections;
