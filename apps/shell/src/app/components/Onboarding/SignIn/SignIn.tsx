import SignInMobile from "./SignInMobile";
import SignInDesktop from "./SignInDesktop";

/** component */
export function SignIn({ onSuccess }: any) {
  //** inline styles */
  const outerBox = { backgroundColor: "#02021c" };

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



