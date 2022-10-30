import Tooltip from "@mui/material/Tooltip";
import CancelIcon from '@mui/icons-material/Cancel';
import { useMutation } from "@apollo/client";
import { DISABLE_YT_CHANNEL } from "./graphql/ytChannel.mutation";
import { SharedUiLoader } from "@flenzr/shared/ui-loader";

export function SharedUiYtChannelIcon({ channel, updateChannels }: any) {

  const [deactivateChannel, { data, loading, error }] = useMutation(DISABLE_YT_CHANNEL, {
    errorPolicy: "all",
    variables: {
      youtube_id: channel.youtube_id
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => { updateChannels();},
  });

  const boxStyle= { borderRadius: "28px"};

  return (
    <Tooltip title={channel.title} arrow>
      <div className="relative">
        <div className="absolute right-0 -mt-1 -mr-1 text-error cursor-pointer" 
        onClick={() => { deactivateChannel()} }>

          <CancelIcon/>
        </div>
        <div className="w-14 h-14 rounded-full overflow-hidden cursor-pointer border-4 border-white shadow" 
        style={boxStyle}>
        {(loading) ?
        <SharedUiLoader/> : 
          <img alt={channel.title} src={channel.thumbnails_default} />
        }
        </div>
      </div>
    </Tooltip>
  );
}

export default SharedUiYtChannelIcon;
