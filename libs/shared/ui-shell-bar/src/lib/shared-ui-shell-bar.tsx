import IconButton from "@mui/material/IconButton";
import Logo from "../assets/primary-logo.svg";
import FeedTwoToneIcon from "@mui/icons-material/FeedTwoTone";
import WorkTwoToneIcon from "@mui/icons-material/WorkTwoTone";
import SearchTwoToneIcon from "@mui/icons-material/SearchTwoTone";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import EmailTwoToneIcon from "@mui/icons-material/EmailTwoTone";
import ChatBubbleTwoToneIcon from "@mui/icons-material/ChatBubbleTwoTone";
import NotificationsTwoToneIcon from "@mui/icons-material/NotificationsTwoTone";


export interface SharedUiShellBarProps{
  navigateTo(path:string):void
}

export function SharedUiShellBar({navigateTo}: SharedUiShellBarProps) {
  return (
    <div className="hidden laptop:block desktop:block w-screen shadow mb-6">
      <div className="flex w-full max-w-screen-xl	items-center content-center justify-between">
        <div className="p-3 flex items-center content-center">
          <img alt="flenzr" src={Logo} className="w-20 mr-16" />
          <div className="flex w-36 justify-between">
            <Tooltip title="Whats New!" arrow>
              <IconButton
                aria-label="News"
                color="primary"
                onClick={(e) => { navigateTo('new')} }
                className="text-black text-primary opacity-50 hover:opacity-100"
              >
                <FeedTwoToneIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Works" arrow>
              <IconButton
                aria-label="work"
                color="primary"
                onClick={(e) => { navigateTo('works')} }
                className="text-black text-primary opacity-50 hover:opacity-100"
              >
                <WorkTwoToneIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Search" arrow>
              <IconButton
                aria-label="search"
                color="primary"
                onClick={(e) => { navigateTo('search')} }
                className="text-black text-primary opacity-50 hover:opacity-100"
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
                aria-label="News"
                color="primary"
                onClick={(e) => { navigateTo('email')} }
                className="text-black text-primary opacity-50 hover:opacity-100"
              >
                <EmailTwoToneIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Chat" arrow>
              <IconButton
                aria-label="work"
                color="primary"
                className="text-black text-primary opacity-50 hover:opacity-100"
              >
                <ChatBubbleTwoToneIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notification" arrow>
              <IconButton
                aria-label="work"
                color="primary"
                className="text-black text-primary opacity-50 hover:opacity-100"
              >
                <NotificationsTwoToneIcon />
              </IconButton>
            </Tooltip>
            <Avatar>S</Avatar>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SharedUiShellBar;
