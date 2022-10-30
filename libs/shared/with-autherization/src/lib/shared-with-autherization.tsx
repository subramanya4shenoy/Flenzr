import { NetworkStatus, useLazyQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { ME } from "./graphql/me.query";

export const SharedWithAutherization = ({children}:any) => {
  const [auth, setAuth] = useState(false);
  const [cookies] = useCookies(["access-token"]);
  const [retryCounter, setRetryCounter] = useState(0);
  const [getMe, { loading, error, data, refetch, networkStatus }] = useLazyQuery(ME, 
    { notifyOnNetworkStatusChange: true,
      fetchPolicy: "network-only",
      context: {
        headers: {
          'Authorization': cookies["access-token"] ? `Bearer ${cookies["access-token"]}` : ''
        }
      },
      onCompleted: (data) => {setAuth(data)}
    }
  );

  useEffect(() => {
    if(cookies["access-token"]) {
      getMe();
    }
  }, [cookies])
  
  if (networkStatus === NetworkStatus.refetch) return "Refetching!";
  if (loading) return "loading";
  if (error) return <></>;
  return (auth && cookies && cookies["access-token"]) ? {...children} : <></>;
};


export default SharedWithAutherization;