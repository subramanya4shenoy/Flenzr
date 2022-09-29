import IconButton from "@mui/material/IconButton";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import { useState } from "react";
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props'

const FacebookSignIn = ({ onSuccess }: any) => {

  return (
    <FacebookLogin
      appId= { process.env["NX_FACEBOOK_APP_ID"] as string }
      autoLoad={false}  
      fields="name,email,picture"
      onClick={(data)=>{console.log("clicked", data)}}
      callback={(data) => {onSuccess(data)}}
      onFailure={(data) => { console.log("error",data)}}
      render={({onClick}: any) => {
        return <IconButton onClick={onClick} aria-label="Facebook">
                <FacebookRoundedIcon />
               </IconButton>;
      }}
    />
  );
};

export default FacebookSignIn;
