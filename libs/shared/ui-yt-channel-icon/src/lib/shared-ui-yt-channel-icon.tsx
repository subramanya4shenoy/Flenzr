import Tooltip from "@mui/material/Tooltip";
import CancelIcon from '@mui/icons-material/Cancel';

export function SharedUiYtChannelIcon({ channel }: any) {
  const boxStyle= {
    borderRadius: "28px",
  };
  return (
    <Tooltip title={channel.title} arrow>
      <div className="relative">
        <div className="absolute right-0 -mt-1 -mr-1 text-error cursor-pointer">
          <CancelIcon/>
        </div>
        <div className="w-14 h-14 rounded-full overflow-hidden cursor-pointer border-4 border-white shadow" 
        style={boxStyle}>
          <img alt={channel.title} src={channel.thumbnails_default} />
        </div>
      </div>
    </Tooltip>
  );
}

export default SharedUiYtChannelIcon;
