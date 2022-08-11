import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { MENU_LIST } from "@flenzr/shared/constant-menu-list";

export interface SharedUiMenuBarProps {
  selectedMenu: {index:number; id: string; label: string; view: string},
  onMenuChange(val:{ index: number; id: string; label: string; view: string}):void
}

export const SharedUiMenuBar = ({selectedMenu, onMenuChange}:SharedUiMenuBarProps) => {

  const { t } = useTranslation();

  return (
    <div className="shadow-md w-auto mx-auto max-w-xl rounded-full -mt-6 bg-white">
      <Tabs value={selectedMenu.index} 
      onChange={(e, val) => {onMenuChange(MENU_LIST[val])}} centered>
        {MENU_LIST.map((menu) => {
          return <Tab key={menu.id} label={t(menu.label)} />;
        })}
      </Tabs>
    </div>
  );
}
