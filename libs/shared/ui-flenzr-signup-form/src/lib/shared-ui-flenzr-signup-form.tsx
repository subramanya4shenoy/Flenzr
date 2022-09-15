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
  const [device_id, setDevice_id] = useState("");
  const [display_name, setDisplay_name] = useState("");
  const [language, setLanguage] = useState("");
  const [location, setLocation] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [created_ip, setCreated_ip] = useState("");

  const [cookies, setCookie] = useCookies(["access-token"]);
  
  const updateCoockie = (data: any) => {
    const { signUp } = data;
    if(signUp) {
      const { token } = signUp;
      token && setCookie("access-token", token);
      onSignUp();
    }
  };
  const [signUpFlenzr, { data, loading, error }] = useMutation(SIGN_UP, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
    onCompleted: (data) => data && updateCoockie(data)
  });

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
          onClick={() => {
            signUpFlenzr({
              variables: { email: email, 
                           password: password ,
                           device_id: device_id,
                           display_name: display_name,
                           language: language,
                           location: location,
                           mobile: mobile,
                           name: name,
                           source: source,
                           created_ip: created_ip
                         },
            });
          }}
          variant="contained"
          size="large"
        >
          {t("signUpBtn")}
        </Button>
      </div>
    </FormControl>)}
    </>
  );
}

export default SharedUiFlenzrSignupForm;
