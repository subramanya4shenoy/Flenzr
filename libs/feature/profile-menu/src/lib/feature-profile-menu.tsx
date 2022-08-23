import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";


export interface FeatureProfileMenuProps {
  navigateTo(path: string): void;
}

export const FeatureProfileMenu = ({ navigateTo }: FeatureProfileMenuProps) => {

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { t } = useTranslation();
  
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  return (
    <>
        <Tooltip title={t("profileSettings")}>
          <IconButton
            onClick={handleClick}
            size="small"
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <Avatar sx={{ width: 32, height: 32 }} color="primary"/>
          </IconButton>
        </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="profile-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            borderRadius: '4px',
            padding: '4px',
            mt: 1.5,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1
            }
          }
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={(e) => {navigateTo('/')}}>
          <Avatar/> {t("profile")}
        </MenuItem>
        <MenuItem onClick={(e) => {navigateTo('/settings')}}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          {t("settings")}
        </MenuItem>
        <MenuItem onClick={(e) => {console.log("logout")}}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          {t("logout")}
        </MenuItem>
      </Menu>
    </>
  );
}
