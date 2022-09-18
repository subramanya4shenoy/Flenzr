import IconButton from "@mui/material/IconButton";
import { useEffect } from "react";
import { isMobile } from "react-device-detect";

const GoogleSignUp = ({onSuccess}: any) => {
  useEffect(() => {
    (window as any).google.accounts.id.initialize({
      client_id: process.env["NX_GOOGLE_AUTH_UI_CLIENT_ID"],
      callback: (res: any) => {
        onSuccess(res);
      },
    });

    (window as any).google.accounts.id.renderButton(
      document.getElementById("google_button-true"),
      { type: "icon", size: "large", shape: "circle" }
    );

    (window as any).google.accounts.id.renderButton(
      document.getElementById("google_button-false"),
      { type: "icon", size: "large", shape: "circle" }
    );
  }, []);

  return (
    <IconButton aria-label="Google">
        <div id={"google_button-"+isMobile}></div> 
    </IconButton>
  );
};

export default GoogleSignUp;
