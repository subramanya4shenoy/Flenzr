import { NetworkStatus, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { ME } from "./graphql/me.query";

export const SharedWithAutherization = ({children}:any) => {
  const [auth, setAuth] = useState(false);
  const { loading, error, data, refetch, networkStatus } = useQuery(ME, 
    { notifyOnNetworkStatusChange: true,
      fetchPolicy: "network-only",
      onCompleted: (data) => { console.log("me==>", data); setAuth(data)}
    }
  );

  useEffect(() => {;}, [auth])
  
  if (networkStatus === NetworkStatus.refetch) return "Refetching!";
  if (loading) return "loading";
  if (error) {
    console.log("ERROR", error)
    return "error"
  };
  return auth ? {...children} : <>no comp {auth}</>;
};


export default SharedWithAutherization;