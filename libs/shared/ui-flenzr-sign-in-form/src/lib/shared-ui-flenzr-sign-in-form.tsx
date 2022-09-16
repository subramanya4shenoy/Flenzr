import { useState } from "react";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";
import { useLazyQuery } from "@apollo/client";
import { SIGN_IN } from "./graphql/signIn.query";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useCookies } from "react-cookie";
/* eslint-disable-next-line */
export interface SharedUiFlenzrSignInFormProps {
  onSignIn(): void;
}

export function SharedUiFlenzrSignInForm({
  onSignIn,
}: SharedUiFlenzrSignInFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cookies, setCookie] = useCookies(["access-token"]);

  const updateCoockie = ({signIn}: any) => {
    const { token } = signIn;
    setCookie("access-token", token);
    onSignIn();
  };

  const [signInFlenzr, { loading, error, data }] = useLazyQuery(SIGN_IN, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (res) => updateCoockie(res),
  });

  return (
    <>
      {error && (
        <Alert className="my-2" severity="error" variant="filled">
          {error.graphQLErrors.map(({ message }, i) => (
            <span key={i}>{message}</span>
          ))}
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
            type="password"
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
          />
          <div className="flex-none laptop:flex desktop:flex mt-4 laptop:justify-between desktop:justify-between">
            <Button
              className="w-full"
              onClick={() => {
                signInFlenzr({
                  variables: { 
                      email: email, 
                      password: password,
                      location: ''
                    },
                });
              }}
              variant="contained"
              size="large"
            >
              {t("loginBtn")}
            </Button>
            <Link
              component="button"
              variant="body2"
              className="text-center w-full capitalize hidden desktop:block laptop:block"
              underline="hover"
            >
              {t("forgotPassword")}
            </Link>
            <div className="text-primary text-center text-md font-bold capitalize mt-4 mb-1  block laptop:hidden desktop:hidden hover:underline">
              {t("forgotPassword")}
            </div>
          </div>
        </FormControl>
      )}
    </>
  );
}

export default SharedUiFlenzrSignInForm;
