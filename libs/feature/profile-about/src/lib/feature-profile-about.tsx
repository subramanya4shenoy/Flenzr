import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

/* eslint-disable-next-line */
export interface FeatureProfileAboutProps {}

export function FeatureProfileAbout(props: FeatureProfileAboutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center content-center items-top">
      <div className="m-4 p-6 shadow rounded-lg w-1/2">
        <Typography variant="h6" gutterBottom>
          {t("about")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Error magnam
          amet, harum, vitae laboriosam quis iusto, fuga commodi suscipit eius
          qui et odit. Nam ea quasi sapiente, numquam quia cupiditate.
        </Typography>
      </div>

      <div className="m-4 p-6 shadow rounded-lg w1/2">
        <Typography variant="h6" gutterBottom>
          {t("Worked with Brands")}
        </Typography>
        list
      </div>
    </div>
  );
}

export default FeatureProfileAbout;
