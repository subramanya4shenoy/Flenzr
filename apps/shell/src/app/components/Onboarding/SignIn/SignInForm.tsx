import React, { useState } from 'react';
import { Button, FormControl, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const SignInForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    navigate('');
  };

  return (
    <FormControl className="w-full">
      <TextField
        label={t('emailOrMobile')}
        id="email"
        value={email}
        type="text"
        margin="normal"
        className="w-full"
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label={t('password')}
        id="password"
        value={password}
        type="password"
        margin="normal"
        className="w-full"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex-none laptop:flex desktop:flex mt-4 laptop:justify-between desktop:justify-between">
        <Button className="text-center w-full" variant="text">
          {t('forgotPassword')}
        </Button>
        <Button
          className="w-full"
          onClick={handleLogin}
          variant="contained"
          size="large"
        >
          {t('loginBtn')}
        </Button>
      </div>
    </FormControl>
  );
};

export default SignInForm;
