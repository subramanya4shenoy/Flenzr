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
      onCompleted: (data) => {setAuth(data)}
    }
  );

  useEffect(() => {
    if(cookies && cookies["access-token"]) {
      getMe();
    }
  }, [cookies])
  
  if (networkStatus === NetworkStatus.refetch) return "Refetching!";
  if (loading) return "loading";
  if (error) {
    if(retryCounter < 4) {
      setRetryCounter(retryCounter+1);
      refetch();
    } else {
      return "Error"
    }
  }
  return (auth && cookies && cookies["access-token"]) ? {...children} : <></>;
};


export default SharedWithAutherization;