import { useState } from "react";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

/* eslint-disable-next-line */
export interface SharedUiFlenzrSignInFormProps {
  onSignIn(): void;
}

export function SharedUiFlenzrSignupForm({
  onSignIn,
}: SharedUiFlenzrSignInFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <FormControl className="w-full">
      <TextField
        label={t("emailOrMobile")}
        color="primary"
        autoFocus={true}
        id="email"
        value={email}
        type="text"
        margin="normal"
        sx={{
          background:"#F2F4F8",
          borderColor: "#F2F4F8",
          borderRadius: "16px",
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'transparent',
            },
           '&:hover fieldset': {
            borderColor: 'transparent',
           }
          }
        }}
        className="w-full"
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label={t("password")}
        id="password"
        value={password}
        type="password"
        margin="normal"
        sx={{
          background:"#F2F4F8",
          borderColor: "#F2F4F8",
          borderRadius: "16px",
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'transparent',
            },
           '&:hover fieldset': {
            borderColor: 'transparent',
           }
          }
        }}
        className="w-full"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex-none laptop:flex desktop:flex mt-4 laptop:justify-between desktop:justify-between">
        <Button
          className="w-full"
          onClick={onSignIn}
          variant="contained"
          size="large"
        >
          {t("signUpBtn")}
        </Button>
      </div>
    </FormControl>
  );
}

export default SharedUiFlenzrSignupForm;
