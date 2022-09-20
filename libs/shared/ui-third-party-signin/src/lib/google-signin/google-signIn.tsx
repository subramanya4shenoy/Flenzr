import IconButton from "@mui/material/IconButton";
import { useEffect } from "react";
import { isMobile } from "react-device-detect";

const GoogleSignIn = ({ onSuccess, googleIconId }: any) => {
  useEffect(() => {
    (window as any).google.accounts.id.initialize({
      client_id: process.env["NX_GOOGLE_AUTH_UI_CLIENT_ID"],
      callback: ({ clientId, credential }: any) => {
        onSuccess({ clientId: clientId, credential: credential });
      },
    });

    (window as any).google.accounts.id.renderButton(
      document.getElementById(googleIconId),
      { type: "icon", size: "medium", shape: "circle" }
    );
  }, [googleIconId]);

  return (
    <IconButton aria-label="Google">
      <div id={googleIconId}></div>
    </IconButton>
  );
};

export default GoogleSignIn;
