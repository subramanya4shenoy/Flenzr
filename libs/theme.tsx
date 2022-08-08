import { createTheme } from '@mui/material/styles';
import 'typeface-noto-sans';

// eslint-disable-next-line import/prefer-default-export
export const defaultTheme = createTheme({
  palette: {
    primary: {
      main: '#4525F2',
    },
    secondary: {
      main: '#673BB7',
    },
    error: {
      main: '#E50202',
    },
    warning: {
      main: '#FE9431',
    },
    info: {
      main: '#2754e6',
    },
    success: {
      main: '#00B24B',
    },
  },
  typography: {
    fontFamily: ['Noto Sans', 'sans-serif'].join(','),
  },
  components: {
    MuiButton: {
      variants: [
        {
          props: {
            variant: 'contained',
          },
          style: {
            color: 'white',
            borderRadius: '27px',
            textTransform: 'capitalize',
            fontWeight: 600
          },
        },
      ],
    },
    MuiAvatar: {},
  },
});
