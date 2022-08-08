import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "@mui/material/Card";
import Lottie from "lottie-react";
import loginYoga from "../../../../../../../assets/Animations/login-yoga.json";
import Typography from "@mui/material/Typography/Typography";
import Link from "@mui/material/Link";

import {
  ACCOUNT_TYPES,
  ACCOUNT_SETTINGS,
} from "@flenzr/shared/constant-user-type";
import { SharedUiCustomSelect } from "@flenzr/shared/ui-custom-select";
import { SharedUiFlenzrSignInForm } from "@flenzr/shared/ui-flenzr-sign-in-form";
import { SharedUiBrandSignInForm } from "@flenzr/shared/ui-brand-sign-in-form";
import { SharedUiThirdPartySignin } from "@flenzr/shared/ui-third-party-signin";

export function SignIn() {
  //** color list for ui-custom select */
  const colorList = ["#4525F2", "#00B24B"];
  const [color, setColor] = useState(colorList[0]);

  const { t } = useTranslation();
  const [userType, setUserType] = useState(ACCOUNT_TYPES[0]);

  //** inline styles */
  const outerBox = { backgroundColor: "#02021c" };
  const centerCard = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  const handleChange = (change: string) => {
    setColor(colorList[ACCOUNT_TYPES.indexOf(change)]);
    setUserType(change);
  };

  const handleSignInFlenzr = () => {
    console.log("login custom hook is called");
  };

  const handleSignInBrand = () => {
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
            <div className="w-full my-4">
              {t("newFlenzrOrBrand")}
              <span>{t("createNew")}</span>
            </div>
            {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
              <>
                <SharedUiFlenzrSignInForm
                  onSignIn={handleSignInFlenzr}
                ></SharedUiFlenzrSignInForm>
                <SharedUiThirdPartySignin></SharedUiThirdPartySignin>
              </>
            ) : (
              <SharedUiBrandSignInForm
                onSignIn={handleSignInBrand}
              ></SharedUiBrandSignInForm>
            )}
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
            <div className="w-full mt-6 mb-2 flex items-center font-semibold">
              <div className="mr-1">{t("newFlenzrOrBrand")}</div>
              <Link
                component="button"
                variant="inherit"
                className="font-semibold"
                underline="hover"
              >
                {t("createNew")}
              </Link>
            </div>
            <div className="w-full">
              {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
                <>
                  <div className="mb-6">
                    <SharedUiFlenzrSignInForm
                      onSignIn={handleSignInFlenzr}
                    ></SharedUiFlenzrSignInForm>
                  </div>
                  <SharedUiThirdPartySignin />
                </>
              ) : (
                <SharedUiBrandSignInForm
                  onSignIn={handleSignInBrand}
                ></SharedUiBrandSignInForm>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SignIn;
