import { useState } from "react";
import Lottie from "lottie-react";
import loginYoga from "../../../../../../../assets/Animations/login-yoga.json";
import Typography from "@mui/material/Typography/Typography";
import { SharedUiCustomSelect } from "@flenzr/shared/ui-custom-select";
import { useTranslation } from "react-i18next";
import {
  ACCOUNT_TYPES,
  ACCOUNT_SETTINGS,
} from "@flenzr/shared/constant-user-type";
import { SharedUiThirdPartySignin } from "@flenzr/shared/ui-third-party-signin";
import { SharedUiFlenzrSignInForm } from "@flenzr/shared/ui-flenzr-sign-in-form";
import Link from "@mui/material/Link";
import { SharedUiBrandSignInForm } from "@flenzr/shared/ui-brand-sign-in-form";
import { useNavigate } from "react-router-dom";

const SignInMobile = ({ onSuccess }: any) => {
  const { t } = useTranslation();
  const [userType, setUserType] = useState(ACCOUNT_TYPES[0]);
  const colorList = ["#4525F2", "#00B24B"];
  const [color, setColor] = useState(colorList[0]);
  const navigate = useNavigate();
  const handleChange = (change: string) => {
    setColor(colorList[ACCOUNT_TYPES.indexOf(change)]);
    setUserType(change);
  };

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
        <div>
          {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
            <>
              <div className="my-2">
                <SharedUiThirdPartySignin googleIconId="googleSignInMobileIcon" onSuccessThirdPartySignIn={() => { onSuccess()}}/>
              </div>
              <SharedUiFlenzrSignInForm
                onSignIn={onSuccess}
              ></SharedUiFlenzrSignInForm>
            </>
          ) : (
            <SharedUiBrandSignInForm
              onSignIn={() => {return;}}
            ></SharedUiBrandSignInForm>
          )}
          <div className="w-full mt-2 mb-2 flex justify-center items-center font-semibold">
            {t("newFlenzrOrBrand")}
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
    </div>
  );
};

export default SignInMobile;
