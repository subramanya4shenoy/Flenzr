import IconButton from "@mui/material/IconButton";
import YouTubeIcon from "@mui/icons-material/YouTube";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";

export function FeatureSocialList() {
  return (
    <div className="flex justify-center items-center">
      <IconButton sx={{marginLeft: "2px", marginRight:"2px"}} aria-label="youtube" size="small">
        <YouTubeIcon />
      </IconButton>
      <IconButton sx={{marginLeft: "2px", marginRight:"2px"}} aria-label="instagram" size="small">
        <InstagramIcon />
      </IconButton>
      <IconButton sx={{marginLeft: "2px", marginRight:"2px"}} aria-label="twitter" size="small">
        <TwitterIcon />
      </IconButton>
      <IconButton sx={{marginLeft: "2px", marginRight:"2px"}} aria-label="facebook" size="small">
        <FacebookIcon />
      </IconButton>
    </div>
  );
}

export default FeatureSocialList;
