const onSuccessThirdPartySignUp = (res:any, source:any) => {
    console.log("Thirdparty succesfully", res, source);
}

const handleSignUpFlenzr = () => {
    console.log("signUp custom hook is called");
  };

export { onSuccessThirdPartySignUp, handleSignUpFlenzr }