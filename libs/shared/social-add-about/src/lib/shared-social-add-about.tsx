import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SharedSocialAddAbout() {
  const [about, setAbout] = useState("");
  const { t } = useTranslation();
  return (
    <div>
      <TextField
            color="primary"
            autoFocus={true}
            id="about"
            multiline
            maxRows={4}
            value={about}
            type="text"
            margin="normal"
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
                }
              },
            }}
            className="w-full"
            onChange={(e) => setAbout(e.target.value)}
          />
      <div className='flex justify-end'>
    <Button sx={{mr: 1}} 
            variant="contained"
            color="primary"
            onClick={() => {console.log("submit")}}>
              {t('update')}
    </Button>
  </div>
    </div>
  );
};


export default SharedSocialAddAbout;
