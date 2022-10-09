import DashboardViews from "./DashboardViews";
import { FeatureProfileBillboard } from "@flenzr/feature/profile-billboard";
import { SharedUiMenuBar } from "@flenzr/shared/ui-menu-bar";
import { useState } from "react";
import { DEFAULT_MENU } from "@flenzr/shared/constant-menu-list";

const Dashboard = () => {

  const [selectedMenu, setSelectedMenu] = useState(DEFAULT_MENU);

  return (
    <>
      {/* Profile banner - cover and picture*/}
      <FeatureProfileBillboard />
      {/* common menu bar */}
      <SharedUiMenuBar selectedMenu={selectedMenu} onMenuChange={setSelectedMenu}/>
      {/* lazy loaded views */}
      <DashboardViews selectedView={selectedMenu.view}/>
    </>
  );
};

export default Dashboard;
