import IconButton from "@mui/material/IconButton";
import { LoginSocialInstagram } from "reactjs-social-login";
import InstagramIcon from "@mui/icons-material/Instagram";

const InstagramSignIn = ({ onSuccess }: any) => {

  return (
    <LoginSocialInstagram
      client_id={process.env["NX_INSTAGRAM_CLIENT_ID"] as string}
      client_secret={process.env["NX_INSTAGRAM_CLIENT_SECRET"] as string}
      redirect_uri={process.env["NX_INSTAGRAM_REDIRECT_URI"] as string}
      isOnlyGetToken={false}
      onResolve={(data:any) => {
        onSuccess(data);
      }}
      onReject={(err: any) => {
        console.log(err);
      }}
    >
      <IconButton>
        <InstagramIcon />
      </IconButton>
    </LoginSocialInstagram>
  );
};

export default InstagramSignIn;
