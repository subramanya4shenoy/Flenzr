import * as React from 'react';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_SETTINGS, ACCOUNT_TYPES } from '@flenzr/shared/constant-user-type';
import { useCookies } from 'react-cookie';
import Lottie from 'lottie-react';
import loginYoga from "../../../../../../../assets/Animations/signup.json";
import { SharedUiThirdPartySignup } from '@flenzr/shared/ui-third-party-signup';
import { SharedUiFlenzrSignupForm } from '@flenzr/shared/ui-flenzr-signup-form';
import { SharedUiBrandSignInForm } from '@flenzr/shared/ui-brand-sign-in-form';
import Link from '@mui/material/Link';
import { useNavigate } from 'react-router-dom';

/** All Interface */
export interface SignUpProps {
  onSuccess(): void;
}

export function SignUp({ onSuccess }: SignUpProps) {

  const { t } = useTranslation();
  const [userType, setUserType] = useState(ACCOUNT_TYPES[0]);
  const navigate = useNavigate();

  //** inline styles */
  const outerBox = { backgroundColor: "#02021c" };
  const centerCard = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  const handleSignInFlenzr = () => {
    onSuccess();
    console.log("login custom hook is called");
  };

  const handleSignUpFlenzr = () => {
    onSuccess();
    console.log("signUp custom hook is called");
  };

  const handleSignInBrand = () => {
    onSuccess();
    console.log("login custom hook is called for brand login");
  };

  return (
    <div className="w-screen h-screen" style={outerBox}>
      {/* mobile design */}
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
                  <SharedUiThirdPartySignup />
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
              >
                {t("loginBtn")}

              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* desktop and laptop design */}
      <Card
        className="hidden laptop:block desktop:block 
                  w-4/6 h-3/4 laptop:h-auto desktop:h-auto 
                  absolute overflow-auto"
        style={centerCard}
      >
        <div className="flex-none laptop:flex desktop:flex">
          <div
            className="hidden laptop:block desktop:block 
                          laptop:h-auto desktop:h-auto 
                          laptop:w-1/2 desktop:w-1/2 mx-auto"
          >
            <Lottie
              className=""
              animationData={loginYoga}
              loop={true}
              renderer="svg"
            />
          </div>
          <div className="w-full laptop:w-1/2 desktop:w-1/2 p-4 laptop:p-10 desktop:p-10 flex flex-wrap items-start content-start justify-left">
            <div className="flex justify-center content-center items-center">
              <Typography className="capitalize" variant="h5" component="h5">
                <strong>{t("createAccount")}</strong>
              </Typography>
            </div>
            <div className="w-full">
              {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
                <>
                  <div className="mt-6">
                    <SharedUiThirdPartySignup />
                  </div>
                  <div className="mb-6">
                    <SharedUiFlenzrSignupForm
                      onSignUp={handleSignInFlenzr}
                    ></SharedUiFlenzrSignupForm>
                  </div>
                </>
              ) : (
                <div className="mt-10 mb-6">
                  <SharedUiBrandSignInForm
                    onSignIn={handleSignInBrand}
                  ></SharedUiBrandSignInForm>
                </div>
              )}
            </div>
            <div className="w-full mt-2 mb-2 flex justify-center items-center font-semibold">
              <div className="mr-1">{t("alreadyHaveAnAccount")}</div>
              <Link
                component="button"
                variant="inherit"
                className="font-semibold"
                underline="hover"
                onClick={(e) => { navigate("/signin")}}
              >
                {t("loginBtn")}
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SignUp;