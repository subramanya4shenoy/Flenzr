import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const BrandSignInForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Authenticate and Login to Brand Dashboard');
    navigate('/');
  };

  return (
    <FormControl className="w-full">
      <TextField
        label={t('emailWithDomainName')}
        id="email"
        value={email}
        type="email"
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
          color="success"
          size="large"
        >
          {t('loginBtn')}
        </Button>
      </div>
    </FormControl>
  );
};

export default BrandSignInForm;
