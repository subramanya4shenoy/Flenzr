import { FeatureSocialStepper } from "@flenzr/feature/social-stepper";
import Typography from "@mui/material/Typography";
import React from "react";
import { useTranslation } from "react-i18next";

const MySocial = () => {
  const { t } = useTranslation();
  return (
    <div className=" w-2/4 mx-auto">
      <Typography
        className="text-center text-bold pt-4 opacity-75"
        variant="h4"
        gutterBottom
      >
        {t("addSocialPresence")}
      </Typography>
      <div className="opacity-50">
      <Typography
        className="text-center text-bold"
        variant="subtitle1"
        gutterBottom
      >
        {t("socialPresenceDesc")}
      </Typography>
      </div>
        {/* social - stepper */}
        <div className="mt-10 pl-40">
            <FeatureSocialStepper/>
        </div>  
    </div>
  );
};

export default MySocial;
