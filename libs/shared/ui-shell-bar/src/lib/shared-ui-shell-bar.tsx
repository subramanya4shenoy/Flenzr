import IconButton from "@mui/material/IconButton";
import Logo from "../assets/primary-logo.svg";
import FeedTwoToneIcon from "@mui/icons-material/FeedTwoTone";
import WorkTwoToneIcon from "@mui/icons-material/WorkTwoTone";
import SearchTwoToneIcon from "@mui/icons-material/SearchTwoTone";
import Tooltip from "@mui/material/Tooltip";
import EmailTwoToneIcon from "@mui/icons-material/EmailTwoTone";
import ChatBubbleTwoToneIcon from "@mui/icons-material/ChatBubbleTwoTone";
import NotificationsTwoToneIcon from "@mui/icons-material/NotificationsTwoTone";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { useState } from "react";
import HomeTwoToneIcon from "@mui/icons-material/HomeTwoTone";
import { useTranslation } from "react-i18next";
import { FeatureProfileMenu } from "@flenzr/feature/profile-menu";
import { useNavigate } from "react-router-dom";

export function SharedUiShellBar() {
  const [value, setValue] = useState("home");
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      {/* mobile */}
      <div className="w-screen block laptop:hidden desktop:hidden fixed z-10 bottom-0">
        <BottomNavigation value={value}>
          <BottomNavigationAction
            className="text-primary opacity-50 hover:opacity-100"
            label={t("home")}
            value="home"
            onClick={(e) => {
              navigate("/");
              setValue("home");
            }}
            icon={<HomeTwoToneIcon />}
          />
          <BottomNavigationAction
            className="text-primary opacity-50 hover:opacity-100"
            label={t("new")}
            value="new"
            onClick={(e) => {
              navigate("/new");
              setValue("new");
            }}
            icon={<FeedTwoToneIcon />}
          />
          <BottomNavigationAction
            className="text-primary opacity-50 hover:opacity-100"
            label={t("work")}
            value="work"
            onClick={(e) => {
              navigate("/works");
              setValue("work");
            }}
            icon={<WorkTwoToneIcon />}
          />
          <BottomNavigationAction
            className="text-primary opacity-50 hover:opacity-100"
            label={t('search')}
            value="search"
            onClick={(e) => {
              navigate("/search");
              setValue("search");
            }}
            icon={<SearchTwoToneIcon />}
          />
        </BottomNavigation>
      </div>

      {/* desktop */}
      <div className="hidden laptop:block desktop:block w-screen shadow mb-6 fixed top-0 bg-white z-10">
        <div className="flex w-full max-w-screen-xl	items-center content-center justify-between">
          <div className="p-3 flex items-center content-center">
            <img alt="flenzr" src={Logo} className="w-20 mr-16" />
            <div className="flex w-36 justify-between">
              <Tooltip title="Whats New!" arrow>
                <IconButton
                  aria-label={t("new")}
                  color="primary"
                  onClick={(e) => {
                    navigate("/new");
                  }}
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <FeedTwoToneIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Works" arrow>
                <IconButton
                  aria-label={t("work")}
                  color="primary"
                  onClick={(e) => {
                    navigate("/works");
                  }}
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <WorkTwoToneIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Search" arrow>
                <IconButton
                  aria-label={t("search")}
                  color="primary"
                  onClick={(e) => {
                    navigate("/search");
                  }}
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <SearchTwoToneIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
          <div className="p-3 flex items-center content-center">
            <div className="flex w-48 justify-between">
              <Tooltip title="Email" arrow>
                <IconButton
                  aria-label="email"
                  color="primary"
                  onClick={(e) => {
                    navigate("/email");
                  }}
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <EmailTwoToneIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Chat" arrow>
                <IconButton
                  aria-label="work"
                  color="primary"
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <ChatBubbleTwoToneIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Notification" arrow>
                <IconButton
                  aria-label="work"
                  color="primary"
                  className="text-primary opacity-50 hover:opacity-100"
                >
                  <NotificationsTwoToneIcon />
                </IconButton>
              </Tooltip>
              <FeatureProfileMenu navigateTo={(e) => navigate("/"+e)}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SharedUiShellBar;
