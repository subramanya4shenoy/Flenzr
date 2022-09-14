import { ThemeProvider } from "@mui/material";
import React, { lazy } from "react";
import { defaultTheme } from "../../../../libs/theme";
import { Routes, Route } from "react-router-dom";
import { FeatureProductPage } from "@flenzr/feature/product-page";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";

import "../styles.scss";
import Dashboard from "./components/Dashboard/Dashboard";
import { SharedUiShellBar } from "@flenzr/shared/ui-shell-bar";
import WhatsNew from "./components/WhatsNew/WhatsNew";
import Works from "./components/Works/works";

const SignUp = lazy(() => import("./components/Onboarding/SignUp/SignUp"));
const SignIn = lazy(() => import("./components/Onboarding/SignIn/SignIn"));

export function App() {
  const navigate = useNavigate();
  const [cookies] = useCookies(["access-token"]);
  const cook_ER = () => { console.log()};

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
      case "new":
        navigate("/new");
        break;
      case "works":
        navigate("/works");
        break;
      default:
        break;
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      {/* common shell needs to be added */}
      {cookies["access-token"] && <SharedUiShellBar navigateTo={navigationPaths} />}
      <React.Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={
              cookies["access-token"] ? (
                <div className="laptop:mt-20 desktop:mt-20">
                  <Dashboard />
                </div>
              ) : (
                <FeatureProductPage navigateTo={navigationPaths} />
              )
            }
          />
          <Route
            path="/signup"
            element={
              <SignUp
                onSuccess={() => {
                  navigationPaths("/");
                }}
              />
            }
          />
          <Route
            path="/signin"
            element={
              <SignIn
                onSuccess={() => {
                  navigationPaths("/");
                }}
              />
            }
          />
          <Route path="/new" element={<WhatsNew />} />
          <Route path="/works" element={<Works />} />

          {/* <Route path='*' element={<Page404 />} /> */}
        </Routes>
      </React.Suspense>
    </ThemeProvider>
  );
}

export default App;
