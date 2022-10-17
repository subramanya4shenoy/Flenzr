import { ThemeProvider } from "@mui/material";
import React, { lazy } from "react";
import { defaultTheme } from "../../../../libs/theme";
import { Routes, Route } from "react-router-dom";
import { FeatureProductPage } from "@flenzr/feature/product-page";
import { useCookies } from "react-cookie";

import Dashboard from "./components/Dashboard/Dashboard";
import { SharedUiShellBar } from "@flenzr/shared/ui-shell-bar";
import { SharedWithAutherization } from "@flenzr/shared/with-autherization";
import WhatsNew from "./components/WhatsNew/WhatsNew";
import Works from "./components/Works/works";
import MySocial from "./components/MySocial/MySocial";
import { Googleauth } from "@flenzr/shared/social-add-platform";

const SignUp = lazy(() => import("./components/Onboarding/SignUp/SignUp"));
const SignIn = lazy(() => import("./components/Onboarding/SignIn/SignIn"));

export function App() {
  const [cookies] = useCookies(["access-token"]);

  return (
    <ThemeProvider theme={defaultTheme}>
      {/* common shell needs to be added */}
      <SharedWithAutherization>
        <SharedUiShellBar />
      </SharedWithAutherization>
      <React.Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={
              cookies["access-token"] ? (
                <div className="laptop:mt-20 desktop:mt-20">
                    <SharedWithAutherization>
                      <Dashboard />
                    </SharedWithAutherization>
                </div>
              ) : (
                <FeatureProductPage />
              )
            }
          />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/new" element={<WhatsNew />} />
          <Route path="/works" element={<Works />} />
          <Route path="/mysocial" element={
            <SharedWithAutherization>
              <div className="laptop:mt-20 desktop:mt-20">
                <MySocial/>
              </div>
            </SharedWithAutherization>
          }/>
          <Route path="/googleauth" element={<Googleauth/>}/>
        </Routes>
      </React.Suspense>
    </ThemeProvider>
  );
}

export default App;
