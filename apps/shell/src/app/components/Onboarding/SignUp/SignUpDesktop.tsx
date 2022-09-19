import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography';
import Lottie from 'lottie-react';
import { useNavigate } from 'react-router-dom';
import loginYoga from "../../../../../../../assets/Animations/signup.json";
import { useTranslation } from "react-i18next";
import Link from '@mui/material/Link';
import { SharedUiBrandSignInForm } from '@flenzr/shared/ui-brand-sign-in-form';
import { SharedUiFlenzrSignupForm } from '@flenzr/shared/ui-flenzr-signup-form';
import { SharedUiThirdPartySignup } from '@flenzr/shared/ui-third-party-signup';
import { ACCOUNT_SETTINGS } from '@flenzr/shared/constant-user-type';
import { isMobile } from 'react-device-detect';

interface ISignUpDesktopProps {
    userType: string;
    handleSignUpFlenzr: () => void;
    onSuccessThirdPartySignUp: (res:any, source: any) => void;
    handleSignInBrand: () => void;
  }
const SignUpDesktop = ({
    userType,
    handleSignUpFlenzr,
    onSuccessThirdPartySignUp,
    handleSignInBrand,
  }: ISignUpDesktopProps) => {

    const { t } = useTranslation();
    const navigate = useNavigate();
    
    //** inline styles */
  const centerCard = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  return (
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
                  {(!isMobile) && <SharedUiThirdPartySignup onSuccessThirdPartySignUp={onSuccessThirdPartySignUp}/>}
                  </div>
                  <div className="mb-6">
                    <SharedUiFlenzrSignupForm
                      onSignUp={handleSignUpFlenzr}
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
  )
}

export {SignUpDesktop}