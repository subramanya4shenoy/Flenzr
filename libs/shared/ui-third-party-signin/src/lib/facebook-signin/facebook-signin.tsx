import IconButton from "@mui/material/IconButton";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import { useState } from "react";

const FacebookSignIn = ({ onSuccess }: any) => {

  return (
    <FacebookLogin
      appId="123"
      autoLoad={true}
      fields="name,email,picture"
      onClick={(data)=>{console.log("clicked", data)}}
      callback={(data) => { console.log("data",data)}}
      onFailure={(data) => { console.log("error",data)}}
      render={({onClick}) => {
        return <IconButton onClick={onClick} aria-label="Facebook">
                <FacebookRoundedIcon />
               </IconButton>;
      }}
    />
  );
};

export default FacebookSignIn;
