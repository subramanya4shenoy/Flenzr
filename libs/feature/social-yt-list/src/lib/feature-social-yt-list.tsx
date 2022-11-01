import { SharedUiYtChannelIcon } from "@flenzr/shared/ui-yt-channel-icon";
import { useLazyQuery } from "@apollo/client";
import { GET_ALL_CHANNELS } from "../graphql/getAllChannel.query";
import { useTranslation } from "react-i18next";
import { SharedUiLoader } from "@flenzr/shared/ui-loader";
import { useEffect } from "react";
import CachedIcon from '@mui/icons-material/Cached';

export const FeatureSocialYtList = () => {
  const [fetchAllChannels, { loading, error, data, refetch }] = useLazyQuery(GET_ALL_CHANNELS, {
    fetchPolicy: "network-only",
  });
  const { t } = useTranslation();

  useEffect(() => {
    fetchAllChannels();
  }, [])

  if (loading) return <div className="w-50"><SharedUiLoader/></div>;
  if (error) return <>`Error! ${error.message}`</>;

  return (
    data && (
      <>
        <div className="w-72 flex justify-center items-center mb-2">
         { (data.getAllYTChannelDetailsOfUSer.length > 0) ? 
          (<div className="font-bold text-center flex">
            {t('yourChannel')}
            <div className="ml-2 text-primary cursor-pointer" onClick={() => { fetchAllChannels()} }><CachedIcon /></div>
          </div>) :
          (<div className="text-center flex">
            {t('noChannelsAdded')}
            <div className="ml-2 text-primary cursor-pointer" onClick={() => { fetchAllChannels()} }><CachedIcon /></div>
          </div>)}
        </div>

        <div className="flex justify-center items-center">
          {data.getAllYTChannelDetailsOfUSer.map((channel: any) => {
            return (
              <div className="m-2">
                <SharedUiYtChannelIcon channel={channel} updateChannels={refetch}/>
              </div>
            );
          })}
        </div>
      </>
    )
  );
};
