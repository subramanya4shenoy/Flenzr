import {
  ACCOUNT_SETTINGS,
  ACCOUNT_TYPES,
} from "@flenzr/shared/constant-user-type";
import { SharedUiBrandSignInForm } from "@flenzr/shared/ui-brand-sign-in-form";
import { SharedUiCustomSelect } from "@flenzr/shared/ui-custom-select";
import { SharedUiFlenzrSignInForm } from "@flenzr/shared/ui-flenzr-sign-in-form";
import { SharedUiThirdPartySignin } from "@flenzr/shared/ui-third-party-signin";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Lottie from "lottie-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import loginYoga from "../../../../../../../assets/Animations/login-yoga.json";

const SignInDesktop = ({ onSuccess }: any) => {
  const [userType, setUserType] = useState(ACCOUNT_TYPES[0]);
  const { t } = useTranslation();
  const colorList = ["#4525F2", "#00B24B"];
  const [color, setColor] = useState(colorList[0]);
  const navigate = useNavigate();
  const centerCard = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };
  const handleChange = (change: string) => {
    setColor(colorList[ACCOUNT_TYPES.indexOf(change)]);
    setUserType(change);
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
              <strong>{t("signInAs")}</strong>
            </Typography>
            <div className="mx-4 -mt-1">
              <SharedUiCustomSelect
                list={ACCOUNT_TYPES}
                selectedOption={userType}
                onChangeSelection={(e: string) => {
                  handleChange(e);
                }}
                color={color}
              ></SharedUiCustomSelect>
            </div>
          </div>
          <div className="w-full">
            {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
              <>
                <div className="mt-6">
                  <SharedUiThirdPartySignin googleIconId="googleSignInDesktopIcon"
                  onSuccessThirdPartySignIn={() => { onSuccess() }}/>
                </div>
                <div className="mb-6">
                  <SharedUiFlenzrSignInForm
                    onSignIn={onSuccess}
                  ></SharedUiFlenzrSignInForm>
                </div>
              </>
            ) : (
              <div className="mt-10 mb-6">
                <SharedUiBrandSignInForm
                  onSignIn={() => {return;}}
                ></SharedUiBrandSignInForm>
              </div>
            )}
          </div>
          <div className="w-full mt-2 mb-2 flex justify-center items-center font-semibold">
            <div className="mr-1">{t("newFlenzrOrBrand")}</div>
            <Link
              component="button"
              variant="inherit"
              className="font-semibold"
              underline="hover"
              onClick={(e) => {
                navigate("/signup");
              }}
            >
              {t("createNew")}
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SignInDesktop;
