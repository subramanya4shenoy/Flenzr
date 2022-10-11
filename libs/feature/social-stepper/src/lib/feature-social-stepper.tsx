import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { SharedSocialAddPlatform } from "@flenzr/shared/social-add-platform";
import { SharedSocialAddAbout } from "@flenzr/shared/social-add-about";
import { SharedSocialAddStyle } from "@flenzr/shared/social-add-style";
import { useState } from "react";
import { MY_SOCIAL_STEPS } from "./feature-social-stepper.constant";
import { useTranslation } from "react-i18next";

export function FeatureSocialStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [steps] = useState(MY_SOCIAL_STEPS);
  const { t } = useTranslation();
  const boxStyle= {
    borderRadius: "28px",
    boxShadow:
      "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
  };
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className="items-start justify-start flex-wrap">
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => 
            <Step key={"id_"+index}>
              <StepLabel>
                <Typography variant="h6"> {t(step.stepTitleKey)} </Typography>
              </StepLabel>
              <StepContent>
                <div className="m-6 mr-0 rounded-lg p-4" style={boxStyle}>
                  {(activeStep===0) && <SharedSocialAddPlatform />}
                  {(activeStep===1) && <SharedSocialAddAbout />}
                  {(activeStep===2) && <SharedSocialAddStyle />}
                </div>
                <div className="flex justify-end items-center">
                  {(index !== 0) && 
                  <Button sx={{mr: 1}} variant="text" color="secondary" onClick={handleBack}>{t('previous')}</Button>}
                  <Button sx={{mr: 1}} variant="text" color="secondary" onClick={handleNext}>{t('next')}</Button>
                </div>
              </StepContent>
            </Step>
        )}
      </Stepper>

      {activeStep === steps.length && (
        <div className="flex justify-end items-center">
          <Button sx={{mr: 2}} onClick={handleReset} variant="text" color="secondary">
            {t('edit')}
          </Button>
          <Button onClick={handleReset} variant="contained" color="success">
            {t('letsGo')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FeatureSocialStepper;
