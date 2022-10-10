import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const SocialStepper = () => {
  const [activeStep, setActiveStep] = React.useState(0);

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
        <Step>
          <StepLabel>
            <Typography> Social Links </Typography>
          </StepLabel>
          <StepContent>
            <Typography> step_description</Typography>
            <div>
              <Button variant="contained" size="small" onClick={handleNext}>
                Continue
              </Button>
              <Button onClick={handleNext} size="small">Skip</Button>
            </div>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>
            <Typography> Social Links </Typography>
          </StepLabel>
          <StepContent>
            <Typography> step_description</Typography>
            <div>
              <Button variant="contained" size="small" onClick={handleNext}>
                Continue
              </Button>
              <Button onClick={handleNext} size="small">Skip</Button>
            </div>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>
            <Typography> Social Links </Typography>
          </StepLabel>
          <StepContent>
            <Typography> step_description</Typography>
            <div>
              <Button variant="contained" size="small" onClick={handleNext}>
                Continue
              </Button>
              <Button onClick={handleNext} size="small">Skip</Button>
            </div>
          </StepContent>
        </Step>
      </Stepper>

      {activeStep === 3 && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography>All steps completed - you&apos;re finished</Typography>
          <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
            Proceed
          </Button>
        </Paper>
      )}
    </div>
  );
};

export default SocialStepper;
