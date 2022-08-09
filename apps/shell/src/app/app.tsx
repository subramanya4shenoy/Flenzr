import { ThemeProvider } from "@mui/material";
import React, { lazy, useEffect } from "react";
import { defaultTheme } from "../../../../libs/theme";
import { Routes, Route } from "react-router-dom";
import { FeatureProductPage } from "@flenzr/feature/product-page";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";


import "../styles.scss";
import Dashboard from "./components/Dashboard/Dashboard";

const SignUp = lazy(() => import("./components/Onboarding/SignUp/SignUp"));
const SignIn = lazy(() => import("./components/Onboarding/SignIn/SignIn"));

export function App() {
  const navigate = useNavigate();
  const [cookies] = useCookies(["wu"]);

  const navigationPaths = (path: string) => {
    switch (path) {
      case "/":
        navigate("/");
        break;
      case "signup":
        navigate("/signup");
        break;
      case "signin":
        navigate("/signin");
        break;
      default:
        break;
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      {/* common shell needs to be added */}
      {(cookies.wu) && (<></>)}
      <React.Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={(cookies.wu) ? <Dashboard/> : <FeatureProductPage navigateTo={navigationPaths} />}
          />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn onSuccess={() => {navigationPaths('/')}}/>} />
          {/* <Route path='*' element={<Page404 />} /> */}
        </Routes>
      </React.Suspense>
    </ThemeProvider>
  );
}

export default App;
