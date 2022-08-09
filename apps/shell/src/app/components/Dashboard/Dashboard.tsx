import React from "react";
import DashboardViews from "./DashboardViews";
import { FeatureProfileBillboard } from "@flenzr/feature/profile-billboard";
import { SharedUiMenuBar } from "@flenzr/shared/ui-menu-bar";

const Dashboard = () => {
  return (
    <>
      {/* Profile banner - cover and picture*/}
      <FeatureProfileBillboard />

      {/* common menu bar */}
      <SharedUiMenuBar />

      {/* lazy loaded views */}
      <DashboardViews />
    </>
  );
};

export default Dashboard;
