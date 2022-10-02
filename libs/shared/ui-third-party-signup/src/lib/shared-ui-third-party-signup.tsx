import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import GoogleSignUp from "./google-signup/google-signUp";
import { GOOGLE_SIGN_UP } from "./graphql/mutations/googleSignUp.mutation";
import { useMutation } from "@apollo/client";
import { useCookies } from "react-cookie";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import TwitterIcon from "@mui/icons-material/Twitter";
import { FACEBOOK_SIGN_UP } from "./graphql/mutations/facebookSignUp.mutation";
import { IFbUserDetails } from "./facebook-signup/facebook-signUp.interface";
import { CreateJWT } from "@flenzr/shared/ui-utils";
import FacebookSignUp from "./facebook-signup/facebook-signUp";

export function SharedUiThirdPartySignup({
  onSuccessThirdPartySignUp,
  googleIconId,
}: any) {
  const { t } = useTranslation();
  const [, setCookie] = useCookies(["access-token"]);

  const updateCoockie = ({ token }: any) => {
    if (token) {
      token && setCookie("access-token", token);
      onSuccessThirdPartySignUp();
    }
  };

  // mutations for third party below
  // google
  const [
    registerGoogleUser,
    { data: gData, loading: gLoading, error: gError },
  ] = useMutation(GOOGLE_SIGN_UP, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (gData) => {
      const { signInWithGoogle } = gData;
      signInWithGoogle && updateCoockie(signInWithGoogle);
    },
  });

  // facebook
  const [
    registerFacebookUser,
    { data: fbData, loading: fbLoading, error: fbError },
  ] = useMutation(FACEBOOK_SIGN_UP, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (fbData) => {
      const { signInWithFb } = fbData;
      signInWithFb && updateCoockie(signInWithFb);
    },
  });

  return (
    <>
      {(gError || fbError) && (
        <Alert className="my-2" severity="error" variant="filled">
          <span>{gError?.message || fbError?.message}</span>
        </Alert>
      )}
      {gLoading ? (
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
          <IconButton aria-label="Twitter">
            <TwitterIcon />
          </IconButton>
          <FacebookSignUp
            onSuccess={(res: IFbUserDetails) => {
              registerFacebookUser({
                variables: {
                  credential: CreateJWT(res),
                },
              });
            }}
          />
        </div>
      )}
    </>
  );
}

export default SharedUiThirdPartySignup;
