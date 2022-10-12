import { SyntheticEvent, useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import {
  PLATFORM_DETAILS,
  SUPPORTED_PLATFORM,
} from "./shared-social-platform.constant";
import { TabPanel } from "./shared-social-tab-pannel";
import SocialAddYt from "./socialPannels/social-add-yt";
import SocialAddIg from "./socialPannels/social-add-ig";
import SocialAddFb from "./socialPannels/social-add-fb";

export function SharedSocialAddPlatform() {
  const [value, setValue] = useState(0);
  const { t } = useTranslation();
  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <>
      <div className="flex">
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={value}
          onChange={handleChange}
          sx={{ borderRight: 1, borderColor: "divider" }}
        >
          {SUPPORTED_PLATFORM.map((platform: string, index) => {
            return <Tab key={index} label={PLATFORM_DETAILS[platform].name} />;
          })}
        </Tabs>
        <TabPanel value={value} index={0}>
          <SocialAddYt />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <SocialAddIg />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <SocialAddFb />
        </TabPanel>
      </div>
      <div className="flex justify-end">
        <Button
          sx={{ mr: 1 }}
          variant="contained"
          color="primary"
          onClick={() => {
            console.log("submit");
          }}
        >
          {t("update")}
        </Button>
      </div>
    </>
  );
}

export default SharedSocialAddPlatform;