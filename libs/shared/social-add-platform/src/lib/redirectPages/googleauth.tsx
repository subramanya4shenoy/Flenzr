import { useMutation } from "@apollo/client";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ADD_YT_CHANNEL } from "../graphql/social-yt";

export const Googleauth = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate(); 
    const [signUpFlenzr, { data, loading, error }] = useMutation(ADD_YT_CHANNEL, {
      errorPolicy: "all",
      variables: {
        code: searchParams.get("code")
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => { navigate(process.env['NX_DOMAIN']+'/mysocial')},
    });
    
    useEffect(() => {
        signUpFlenzr()
    }, [])
    
  return (
    <div>googleauth</div>
  )
}
