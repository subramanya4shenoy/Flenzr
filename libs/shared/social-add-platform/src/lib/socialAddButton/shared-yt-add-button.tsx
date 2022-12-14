import { useLazyQuery } from "@apollo/client";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { ADD_YT_AUTH_URL } from "../graphql/social-yt";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { SharedUiLoader } from "@flenzr/shared/ui-loader";


const SharedYtAddBtn = () => {
  const { t } = useTranslation();
  const [getRedirectionUrl, { loading, error, data, refetch, networkStatus }] =
    useLazyQuery(ADD_YT_AUTH_URL, {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        redirection(data);
      },
    });

  const redirection = ({ addNewYTChannel }: any) => {
    if (addNewYTChannel) {
      (window as any).location.replace(addNewYTChannel);
    }
  };

  if (loading) {
    return <SharedUiLoader/>;
  }
  if (error) {
    return <>error</>;
  }

  return (
    <Button
      sx={{
        my: 4,
        bgcolor: "#FF0000",
        ":hover": {
          bgcolor: "#FF0000",
          color: "white",
        },
      }}
      variant="contained"
      onClick={() => {
        getRedirectionUrl();
      }}
      startIcon={<YouTubeIcon />}
    >
      {t("addYtChannel")}
    </Button>
  );
};

export default SharedYtAddBtn;
