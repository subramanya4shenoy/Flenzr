import { SharedUiYtChannelIcon } from "@flenzr/shared/ui-yt-channel-icon";
import { useQuery } from '@apollo/client';
import { GET_ALL_CHANNELS } from "../graphql/getAllChannel.query";

export const FeatureSocialYtList = () => {

  const { loading, error, data } = useQuery(GET_ALL_CHANNELS);

  if (loading) return <>'Loading...'</>;
  if (error) return <>`Error! ${error.message}`</>;

  return <>
      {
      (data) && 
      data.getAllYTChannelDetailsOfUSer.map((channel:any) => {
        return <SharedUiYtChannelIcon channel={channel}/>
      })
      }
    </>
};

// (data.getAllYTChannelDetailsOfUSer).forEach((channel: any) => {
//   
// })