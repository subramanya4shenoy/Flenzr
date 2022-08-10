import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";

export function SharedUiMenuBar() {
  const [value, setValue] = useState(0);
  const { t } = useTranslation();

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <div className="shadow-md w-auto mx-auto max-w-xl rounded-full -mt-6 bg-white">
      <Tabs value={value} onChange={handleChange} centered>
        <Tab label={t("feeds")} />
        <Tab label={t("about")} />
        <Tab label={t("community")} />
        <Tab label={t("brands")} />
        <Tab label={t("connections")} />
      </Tabs>
    </div>
  );
}

export default SharedUiMenuBar;
