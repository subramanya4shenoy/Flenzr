import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

export function FeatureUserPost() {
  const { t } = useTranslation();

  return (
    <div className="w-full mx-4 p-5 bg-white rounded-lg shadow-md">
      <div>{t("whatAreYouUpto")}</div>
      <div>
        <TextField
          color="primary"
          type="text"
          margin="normal"
          multiline
          rows={4}
          sx={{
            background: "#F2F4F8",
            borderColor: "#F2F4F8",
            borderRadius: "16px",
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "transparent",
              },
              "&:hover fieldset": {
                borderColor: "transparent",
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "transparent",
                },
                "&:hover fieldset": {
                  borderColor: "transparent",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "transparent",
                },
              },
            },
          }}
          className="w-full"
        />
      </div>
      <div className="flex justify-end">
        <Button className="float-right" variant="contained">Share</Button>
      </div>

    </div>
  );
}

export default FeatureUserPost;
