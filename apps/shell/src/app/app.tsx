import { ThemeProvider } from '@mui/material';
import React, { lazy } from 'react';
import { defaultTheme } from '../../../../libs/theme';
import { Routes, Route } from 'react-router-dom';
import { FeatureProductPage } from '@flenzr/feature/product-page';
import '../styles.scss';

const SignUp = lazy(() => import('./components/Onboarding/SignUp/SignUp'));
const SignIn = lazy(() => import('./components/Onboarding/SignIn/SignIn'));

export function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <React.Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<FeatureProductPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          {/* <Route path='*' element={<Page404 />} /> */}
        </Routes>
      </React.Suspense>
    </ThemeProvider>
  );
}

export default App;
