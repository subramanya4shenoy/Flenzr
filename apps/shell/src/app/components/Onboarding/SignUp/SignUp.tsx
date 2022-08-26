import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/** All Interface */
export interface SignUpProps {
  onSuccess(): void;
}

export function SignUp({ onSuccess }: SignUpProps) {
  return (
    <> sign up flow</>
  );
}

export default SignUp;
