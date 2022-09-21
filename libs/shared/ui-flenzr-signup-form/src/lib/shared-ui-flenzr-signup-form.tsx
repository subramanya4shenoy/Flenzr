import { useState } from "react";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useMutation } from "@apollo/client";
import { SIGN_UP } from "./graphql/signUp.mutation";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { isMobile } from "react-device-detect";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';
import { SharedUiPasswordHelper } from "@flenzr/shared/ui-password-helper";

/* eslint-disable-next-line */
export interface SharedUiFlenzrSignUpFormProps {
  onSignUp(): void;
}

export function SharedUiFlenzrSignupForm({
  onSignUp,
}: SharedUiFlenzrSignUpFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [display_name] = useState(null);
  const [mobile] = useState(null);
  const [name] = useState(null);
  const [created_ip] = useState("");
  const [cookies, setCookie] = useCookies(["access-token"]);

  const updateCoockie = (data: any) => {
    const { signUp } = data;
    if (signUp) {
      const { token } = signUp;
      token && setCookie("access-token", token);
      onSignUp();
    }
  };

  const [signUpFlenzr, { data, loading, error }] = useMutation(SIGN_UP, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (data) => data && updateCoockie(data),
  });

  const [values, setValues] = useState({
    showPassword: false
  });

  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <>
      {error && (
        <Alert className="my-2" severity="error" variant="filled">
          <span>{error.message}</span>
        </Alert>
      )}
      {loading ? (
        <div className="flex items-center justify-center">
          <CircularProgress className="flex items-center my-4" />
        </div>
      ) : (
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
              },
            }}
            className="w-full"
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t("password")}
            id="password"
            value={password}
            type={values.showPassword ? 'text' : 'password'}
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
                },
              },
            }}
            className="w-full"
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                >
                  {values.showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <SharedUiPasswordHelper checkString={password}/>
          <div className="flex-none laptop:flex desktop:flex mt-4 laptop:justify-between desktop:justify-between">
            <Button
              className="w-full"
              onClick={() => {
                signUpFlenzr({
                  variables: {
                    email: email,
                    password: password,
                    device_id: isMobile ? "mobile" : "web-browser",
                    display_name: display_name,
                    language: window.navigator.language || "",
                    location: window.navigator.userAgent || "",
                    mobile: mobile,
                    name: name,
                    source: "email",
                    created_ip: created_ip,
                  },
                });
              }}
              variant="contained"
              size="large"
            >
              {t("signUpBtn")}
            </Button>
          </div>
        </FormControl>
      )}
    </>
  );
}

export default SharedUiFlenzrSignupForm;
