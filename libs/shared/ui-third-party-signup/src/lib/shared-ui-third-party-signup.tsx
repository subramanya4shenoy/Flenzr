import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import GoogleSignUp from "./google-signup/google-signUp";
import THIRD_PARTY_ACCOUNT from "./constants/ThirdParty.constant";


export function SharedUiThirdPartySignup({onSuccessThirdPartySignUp}:any) {
  const { t } = useTranslation();
  return (
    <div className="w-full justify-center items-center flex">
      <div className=" text-xs font-bold opacity-50  capitalize">
        {t("signUpWith")}
      </div>
      <GoogleSignUp onSuccess = {onSuccessThirdPartySignUp}/>
      <IconButton aria-label="Instagram">
        <InstagramIcon />
      </IconButton>
      <IconButton aria-label="LinkedIn">
        <LinkedInIcon />
      </IconButton>
      <IconButton aria-label="Twitter">
        <TwitterIcon />
      </IconButton>
      <IconButton aria-label="Facebook">
        <FacebookRoundedIcon />
      </IconButton>
    </div>
  );
};


export default SharedUiThirdPartySignup;
