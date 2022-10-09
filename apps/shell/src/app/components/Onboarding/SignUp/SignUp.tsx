import { useEffect, useState } from "react";
import { ACCOUNT_TYPES } from "@flenzr/shared/constant-user-type";
import { SignUpMobile } from "./SignUpMobile";
import { SignUpDesktop } from "./SignUpDesktop";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";

export function SignUp() {
  //** inline styles */
  const outerBox = { backgroundColor: "#02021c" };
  
  const [userType] = useState(ACCOUNT_TYPES[0]);
  const navigate = useNavigate();

  const [cookies, setCookie, removeCookie] = useCookies(["access-token"]);

  useEffect(() => {
    removeCookie("access-token");
  },[])

  const handleSignUpFlenzr = () => {
    console.log("signUp custom hook is called");
    navigate('/');
  };

  return (
    <div className="w-screen h-screen" style={outerBox}>

        <SignUpMobile
          userType={userType}
          handleSignUpFlenzr={handleSignUpFlenzr}
          handleSignInBrand={() => {
            return;
          }}
        />
        
        <SignUpDesktop
          userType={userType}
          handleSignUpFlenzr={handleSignUpFlenzr}
          onSuccessThirdPartySignUp={handleSignUpFlenzr}
          handleSignInBrand={() => {
            return;
          }}
        />

    </div>
  );
}

export default SignUp;
