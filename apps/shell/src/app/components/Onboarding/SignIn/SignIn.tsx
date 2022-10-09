import SignInMobile from "./SignInMobile";
import SignInDesktop from "./SignInDesktop";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useCookies } from "react-cookie";

/** component */
export function SignIn() {
  //** inline styles */
  const outerBox = { backgroundColor: "#02021c" };

  const navigate = useNavigate();
  const [cookies, setCookie, removeCookie] = useCookies(["access-token"]);

  useEffect(() => {
    removeCookie("access-token");
  },[])

  const onSuccess = () => {
    navigate('/');
  };

  return (
    <div className="w-screen h-screen" style={outerBox}>
      {/* mobile design */}
      <SignInMobile onSuccess={() => {onSuccess()}} />
      {/* desktop and laptop design */}
      <SignInDesktop onSuccess={() => { onSuccess()}} />
    </div>
  );
}

export default SignIn;



