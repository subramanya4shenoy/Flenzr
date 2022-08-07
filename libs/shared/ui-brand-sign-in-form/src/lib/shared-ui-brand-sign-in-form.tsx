import Button from "@mui/material/Button";
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
        id="email"
        value={email}
        type="email"
        margin="normal"
        className="w-full"
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label={t("password")}
        id="password"
        value={password}
        type="password"
        margin="normal"
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
        <Button className="text-center w-full" variant="text">
          {t("forgotPassword")}
        </Button>
      </div>
    </FormControl>
  );
}

export default SharedUiBrandSignInForm;
