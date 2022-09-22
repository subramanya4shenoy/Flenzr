import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import GoogleSignUp from "./google-signup/google-signUp";
import THIRD_PARTY_ACCOUNT from "./constants/ThirdParty.constant";
import { GOOGLE_SIGN_UP } from "./graphql/mutations/googleSignUp.mutation";
import { useMutation } from "@apollo/client";
import { useCookies } from "react-cookie";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import TwitterSignup from "./twitter-signup/twitter-signup";

export function SharedUiThirdPartySignup({ onSuccessThirdPartySignUp, googleIconId }: any) {
  const { t } = useTranslation();
  const [, setCookie] = useCookies(["access-token"]);
  const updateCoockie = (data: any) => {
    const { signUpWithGoogle } = data;
    if (signUpWithGoogle) {
      const { token } = signUpWithGoogle;
      token && setCookie("access-token", token);
      onSuccessThirdPartySignUp();
    }
  };

  // mutations for third party below
  // google
  const [registerGoogleUser, { data, loading, error }] = useMutation(
    GOOGLE_SIGN_UP,
    {
      errorPolicy: "all",
      fetchPolicy: "network-only",
      onCompleted: (data) => data && updateCoockie(data),
    }
  );

  return (
    <>
      {error && (
        <Alert className="my-2" severity="error" variant="filled">
          <span>{error.message}</span>
        </Alert>
      )}
      {loading ? (
        <div className="flex items-center justify-center">
          <CircularProgress className="flex items-center my-4" />
        </div>
      ) : (
        <div className="w-full justify-center items-center flex">
          <div className=" text-xs font-bold opacity-50  capitalize">
            {t("signUpWith")}
          </div>
          
          <GoogleSignUp 
            googleIconId={googleIconId}
            onSuccess={(res: any) =>
              registerGoogleUser({
                variables: {
                  clientId: res.clientId,
                  credential: res.credential,
                },
              })
            }
          />

          <IconButton aria-label="Instagram">
            <InstagramIcon />
          </IconButton>
          <IconButton aria-label="LinkedIn">
            <LinkedInIcon />
          </IconButton>

          <TwitterSignup />
          
          
          <IconButton aria-label="Facebook">
            <FacebookRoundedIcon />
          </IconButton>
        </div>
      )}
    </>
  );
}

export default SharedUiThirdPartySignup;
