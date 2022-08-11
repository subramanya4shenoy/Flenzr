import React from "react";
import { FeatureProfileAbout } from "@flenzr/feature/profile-about";
import { FeatureProfileFeeds } from "@flenzr/feature/profile-feeds";
import { FeatureProfileCommunity } from "@flenzr/feature/profile-community";
import { FeatureProfileBrands } from "@flenzr/feature/profile-brands";
import { FeatureProfileConnections } from "@flenzr/feature/profile-connections";
import { MENU_VIEW_MAP } from "@flenzr/shared/constant-menu-list";

export interface DashboardViewsProps {
  selectedView: string
}
const DashboardViews = ({selectedView}:DashboardViewsProps) => {
  return (
    <div className="mx-auto max-w-5xl mt-6">
      {/* Feeds */}
     {(selectedView === MENU_VIEW_MAP.FEED.view) && <FeatureProfileFeeds />}

      {/* About */}
      {(selectedView === MENU_VIEW_MAP.ABOUT.view) && <FeatureProfileAbout />}

      {/* comunity */}
      {(selectedView === MENU_VIEW_MAP.COMMUNITY.view) && <FeatureProfileCommunity />}

      {/* Brands */}
      {(selectedView === MENU_VIEW_MAP.BRANDS.view) && <FeatureProfileBrands />}

      {/* connection */}
      {(selectedView === MENU_VIEW_MAP.CONNECTIONS.view) && <FeatureProfileConnections />}
    </div>
  );
};

export default DashboardViews;
