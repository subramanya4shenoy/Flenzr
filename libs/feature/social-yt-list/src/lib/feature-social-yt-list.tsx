import { SharedUiYtChannelIcon } from "@flenzr/shared/ui-yt-channel-icon";
import { useQuery } from "@apollo/client";
import { GET_ALL_CHANNELS } from "../graphql/getAllChannel.query";
import { useTranslation } from "react-i18next";

export const FeatureSocialYtList = () => {
  const { loading, error, data } = useQuery(GET_ALL_CHANNELS, {
    fetchPolicy: "network-only",
  });
  const { t } = useTranslation();

  if (loading) return <>'Loading...'</>;
  if (error) return <>`Error! ${error.message}`</>;

  return (
    data && (
      <>
        <div className="font-bold text-left mb-2 opacity-50 ml-4">{t('yourChannel')}</div>
        <div className="flex justify-center items-center">
          {data.getAllYTChannelDetailsOfUSer.map((channel: any) => {
            return (
              <div className="m-2">
                <SharedUiYtChannelIcon channel={channel} />
              </div>
            );
          })}
        </div>
      </>
    )
  );
};
