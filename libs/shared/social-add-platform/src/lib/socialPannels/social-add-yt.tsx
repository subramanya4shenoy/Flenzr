import { FeatureSocialYtList } from "@flenzr/feature/social-yt-list";
import React from "react";
import SharedYtAddBtn from "../socialAddButton/shared-yt-add-button";

const SocialAddYt = () => {

  return (
    <div className="m-4 flex-col w-72 items-center content-center place-content-center justify-self-center">
      <FeatureSocialYtList />
      <SharedYtAddBtn />
    </div>
  );
};

export default SocialAddYt;
