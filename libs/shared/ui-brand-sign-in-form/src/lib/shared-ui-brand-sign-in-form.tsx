import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/* eslint-disable-next-line */
export interface SharedUiBrandSignInFormProps {
  onSignIn(): void;
}

export function SharedUiBrandSignInForm({
  onSignIn,
}: SharedUiBrandSignInFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <FormControl className="w-full">
      <TextField
        label={t("emailWithDomainName")}
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
          color="success"
          size="large"
        >
          {t("loginBtn")}
        </Button>
        <Link component="button" variant="body2" className="text-center w-full capitalize hidden desktop:block laptop:block" underline="hover">
          {t("forgotPassword")}
        </Link>
        <div className="text-primary text-center text-md font-bold capitalize mt-4 mb-1  block laptop:hidden desktop:hidden hover:underline">
          {t("forgotPassword")}
        </div>
      </div>
    </FormControl>
  );
}

export default SharedUiBrandSignInForm;
