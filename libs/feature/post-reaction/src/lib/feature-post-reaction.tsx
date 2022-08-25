import IconButton from "@mui/material/IconButton";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HeartBrokenOutlinedIcon from '@mui/icons-material/HeartBrokenOutlined';

export function FeaturePostReaction() {
  return (
    <div className="flex items-center">
      <div className="mr-2">
        <IconButton aria-label="fingerprint" color="error">
          <FavoriteBorderIcon />
        </IconButton>
        <span className="text-xs font-bold opacity-50">{Math.floor(Math.random() * 1000)}</span>
      </div>
      <div className="mr-4">
        <IconButton aria-label="fingerprint" color="error">
          <HeartBrokenOutlinedIcon />
        </IconButton>
        <span className="text-xs font-bold opacity-50">{Math.floor(Math.random() * 1000)}</span>
      </div>
    </div>
  );
}

export default FeaturePostReaction;
