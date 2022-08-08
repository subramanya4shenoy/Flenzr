import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import GoogleIcon from '@mui/icons-material/Google';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded';

/* eslint-disable-next-line */
export interface SharedUiThirdPartySigninProps {}

export const SharedUiThirdPartySignin = (
  props: SharedUiThirdPartySigninProps
) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="w-full flex text-xs font-bold capitalize opacity-50 justify-center items-center mb-4">
        <div className="border-2 h-1 w-auto rounded-full grow mx-4 opacity-25"></div>
        <div>{t("orSignInWith")}</div>
        <div className="border-2 h-1 w-auto rounded-full grow mx-4 opacity-25"></div>
      </div>
      <div className="w-full justify-center flex">
        <IconButton aria-label="Google">
          <GoogleIcon />
        </IconButton>
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
    </>
  );
};
