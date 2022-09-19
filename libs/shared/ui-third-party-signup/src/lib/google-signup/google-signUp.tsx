import { useMutation } from "@apollo/client";
import IconButton from "@mui/material/IconButton";
import { useEffect } from "react";
import { isMobile } from "react-device-detect";
import { GOOGLE_SIGN_UP } from "../graphql/mutations/googleSignUp.mutation";
import { useCookies } from "react-cookie";

const GoogleSignUp = ({onSuccess}: any) => {

  const [cookies, setCookie] = useCookies(["access-token"]);
  const updateCoockie = (data: any) => {
    const { signUpWithGoogle } = data;
    if (signUpWithGoogle) {
      const { token } = signUpWithGoogle;
      token && setCookie("access-token", token);
      onSuccess();
    }
  };

  const [registerGoogleUser, { data, loading, error }] = useMutation(GOOGLE_SIGN_UP, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (data) => data && updateCoockie(data),
  });
  

  useEffect(() => {
    (window as any).google.accounts.id.initialize({
      client_id: process.env["NX_GOOGLE_AUTH_UI_CLIENT_ID"],
      callback: ({clientId, credential}: any) => {
        registerGoogleUser({variables : { clientId:clientId, credential:credential}});
      },
    });

    (window as any).google.accounts.id.renderButton(
      document.getElementById("google_button-true"),
      { type: "icon", size: "medium", shape: "circle" }
    );

    (window as any).google.accounts.id.renderButton(
      document.getElementById("google_button-false"),
      { type: "icon", size: "medium", shape: "circle" }
    );
  }, []);

  return (
    <IconButton aria-label="Google">
        <div id={"google_button-"+isMobile}></div> 
    </IconButton>
  );
};

export default GoogleSignUp;
