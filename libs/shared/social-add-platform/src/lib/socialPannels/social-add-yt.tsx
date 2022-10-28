import { FeatureSocialYtList } from "@flenzr/feature/social-yt-list";
import React from "react";
import SharedYtAddBtn from "../socialAddButton/shared-yt-add-button";

const SocialAddYt = () => {
  //fetch first all the channels of user
  // If active then tick ring. else normal
  // if no channels show empty.

  return (
    <div className="m-4 flex-wrap items-center justify-center">
      <FeatureSocialYtList />
      <SharedYtAddBtn />
    </div>
  );
};

export default SocialAddYt;
