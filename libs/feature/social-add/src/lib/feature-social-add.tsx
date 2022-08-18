import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

export const FeatureSocialAdd = () => {

  const { t } = useTranslation();

  return (
    <Button variant="contained" color="primary" size="small" className="hidden laptop:block desktop:block">
      {t("addToConnection")}
    </Button>
  );
}
