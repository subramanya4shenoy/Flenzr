import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TwitterIcon from "@mui/icons-material/Twitter";
import GoogleSignIn from "./google-signin/google-signIn";
import { useMutation } from "@apollo/client";
import { GOOGLE_SIGN_IN } from "./graphql/mutation/googleSignIn.mutation";
import { useCookies } from "react-cookie";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import FacebookSignIn from "./facebook-signin/facebook-signin";
import { IFbUserDetails } from "./facebook-signin/facebook-signIn.interface";
import { CreateJWT } from "@flenzr/shared/ui-utils";
import { FACEBOOK_SIGN_IN } from "./graphql/mutation/facebookSignIn.mutation";
import InstagramSignIn from "./instagram-signin/instagram-signin";
import { INSTAGRAM_SIGN_IN } from "./graphql/mutation/instagramSignin.mutation";
import { IInstaUserDetails } from "./instagram-signin/instagram-signin.interface";

export const SharedUiThirdPartySignin = ({
  googleIconId,
  onSuccessThirdPartySignIn,
}: any) => {
  const { t } = useTranslation();
  const [cookie, setCookie] = useCookies(["access-token"]);

  const updateCoockie = ({ token }: any) => {
    if (token) {
      token && setCookie("access-token", token);
      onSuccessThirdPartySignIn();
    }
  };

  // mutations for third party below
  // google
  const [loginGoogleUser, { data: gData, loading: gLoading, error: gError }] =
    useMutation(GOOGLE_SIGN_IN, {
      errorPolicy: "all",
      fetchPolicy: "network-only",
      onCompleted: (gData) => {
        if(gData) {
          const { signInWithGoogle } = gData;
          signInWithGoogle && updateCoockie(signInWithGoogle);
        }
      },
    });

  // facebook
  const [
    loginFacebookUser,
    { data: fbData, loading: fbLoading, error: fbError },
  ] = useMutation(FACEBOOK_SIGN_IN, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (fbData) => {
      if(fbData){
        const { signInWithFb } = fbData;
        signInWithFb && updateCoockie(signInWithFb);
      }
    },
  });

    //Instagram
    const [
      loginInstagramUser,
      { data: instaData, loading: instaLoading, error: instaError },
    ] = useMutation(INSTAGRAM_SIGN_IN, {
      errorPolicy: "all",
      fetchPolicy: "network-only",
      onCompleted: (instaData) => {
        if(instaData) {
          const { signInWithInsta } = instaData;
          signInWithInsta && updateCoockie(signInWithInsta);
        }
      },
    });

  return (
    <>
      {(gError || fbError || instaError) && (
        <Alert className="my-2" severity="error" variant="filled">
          <span>{gError?.message || 
                 fbError?.message || 
                 instaError?.message}
          </span>
        </Alert>
      )}
      {(gLoading || instaLoading || fbLoading) ? (
        <div className="flex items-center justify-center">
          <CircularProgress className="flex items-center my-4" />
        </div>
      ) : (
        <div className="w-full justify-center items-center flex">
          <div className=" text-xs font-bold opacity-50  capitalize">
            {t("signInWith")}
          </div>
          <GoogleSignIn
            googleIconId={googleIconId}
            onSuccess={(res: any) =>
              loginGoogleUser({
                variables: {
                  clientId: res.clientId,
                  credential: res.credential,
                },
              })
            }
          />
          <InstagramSignIn 
            onSuccess={(res: IInstaUserDetails) => {
              loginInstagramUser({
                variables: {
                  credential: CreateJWT(res),
                },
              })
            }}/>
          {/* uncomment below liunes to support more signins */}
          {/* <IconButton aria-label="LinkedIn">
            <LinkedInIcon />
          </IconButton>
          <IconButton aria-label="Twitter">
            <TwitterIcon />
          </IconButton> */}
          <FacebookSignIn
            onSuccess={(res: IFbUserDetails) => {
              loginFacebookUser({
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
};
