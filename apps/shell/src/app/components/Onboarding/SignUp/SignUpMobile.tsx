import Lottie from "lottie-react";
import loginYoga from "../../../../../../../assets/Animations/signup.json";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { ACCOUNT_SETTINGS } from "@flenzr/shared/constant-user-type";
import { isMobile } from "react-device-detect";
import { SharedUiThirdPartySignup } from "@flenzr/shared/ui-third-party-signup";
import { SharedUiFlenzrSignupForm } from "@flenzr/shared/ui-flenzr-signup-form";
import { SharedUiBrandSignInForm } from "@flenzr/shared/ui-brand-sign-in-form";
import Link from "@mui/material/Link";
import { useNavigate } from "react-router-dom";

interface ISignUpMobileProps {
  userType: string;
  handleSignUpFlenzr: () => void;
  handleSignInBrand: () => void;
}
const SignUpMobile = ({
  userType,
  handleSignUpFlenzr,
  handleSignInBrand,
}: ISignUpMobileProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="block laptop:hidden desktop:hidden">
      <Lottie
        className="w-3/4 mx-auto"
        animationData={loginYoga}
        loop={true}
        renderer="svg"
      />
      <div className="-mt-4 bg-white mx-5 px-10 py-10 rounded-md">
        <div className="flex mb-4 justify-left items-center">
          <Typography className="capitalize" variant="body1">
            <strong>{t("createAccount ")}</strong>
          </Typography>
        </div>
        <div>
          {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
            <>
              <div className="my-2">
                <SharedUiThirdPartySignup
                  onSuccessThirdPartySignUp={handleSignUpFlenzr}
                  googleIconId="GoogleMobileIconSignUp"
                />
              </div>
              <SharedUiFlenzrSignupForm
                onSignUp={handleSignUpFlenzr}
              ></SharedUiFlenzrSignupForm>
            </>
          ) : (
            <SharedUiBrandSignInForm
              onSignIn={handleSignInBrand}
            ></SharedUiBrandSignInForm>
          )}
          <div className="w-full mt-2 mb-2 flex justify-center items-center font-semibold">
            {t("alreadyHaveAnAccount")}

            <Link
              component="button"
              variant="inherit"
              className="font-semibold"
              underline="hover"
              onClick={(e) => {
                navigate("/signin");
              }}
            >
              {t("loginBtn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SignUpMobile };
