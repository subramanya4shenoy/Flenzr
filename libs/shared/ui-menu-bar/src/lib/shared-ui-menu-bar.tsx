import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { MENU_LIST, MENU_VIEW_MAP } from "@flenzr/shared/constant-menu-list";
import DynamicFeedTwoToneIcon from "@mui/icons-material/DynamicFeedTwoTone";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import AssuredWorkloadIcon from "@mui/icons-material/AssuredWorkload";
import InfoIcon from "@mui/icons-material/Info";

export interface SharedUiMenuBarProps {
  selectedMenu: { index: number; id: string; label: string; view: string };
  onMenuChange(val: {
    index: number;
    id: string;
    label: string;
    view: string;
    icon?: any;
  }): void;
}

export const SharedUiMenuBar = ({
  selectedMenu,
  onMenuChange,
}: SharedUiMenuBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="shadow-md w-auto mx-auto max-w-xl laptop:rounded-full desktop:rounded-full -mt-4 laptop:-mt-6 desktop:-mt-6 bg-white">
      <div className="hidden laptop:block desktop:block">
        <Tabs
          value={selectedMenu.index}
          onChange={(e, val) => {
            onMenuChange(MENU_LIST[val]);
          }}
          centered
        >
          {MENU_LIST.map((menu) => {
            return <Tab key={menu.id} label={t(menu.label)} />;
          })}
        </Tabs>
      </div>

      <div className="laptop:hidden desktop:hidden sticky top-0">
        <Tabs
          value={selectedMenu.index}
          onChange={(e, val) => {
            onMenuChange(MENU_LIST[val]);
          }}
          centered
        >
          {MENU_LIST.map((menu) => {
            let component: any;
            switch (menu.id) {
              case MENU_VIEW_MAP.FEED.id:
                component = (
                  <Tab key={menu.id} icon={<DynamicFeedTwoToneIcon />} />
                );
                break;
              case MENU_VIEW_MAP.CONNECTIONS.id:
                component = <Tab key={menu.id} icon={<PeopleOutlineIcon />} />;
                break;
              case MENU_VIEW_MAP.COMMUNITY.id:
                component = <Tab key={menu.id} icon={<WorkspacesIcon />} />;
                break;
              case MENU_VIEW_MAP.BRANDS.id:
                component = (
                  <Tab key={menu.id} icon={<AssuredWorkloadIcon />} />
                );
                break;
              case MENU_VIEW_MAP.ABOUT.id:
                component = <Tab key={menu.id} icon={<InfoIcon />} />;
                break;
            }
            return component;
          })}
        </Tabs>
      </div>
    </div>
  );
};
