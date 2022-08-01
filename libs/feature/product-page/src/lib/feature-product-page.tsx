import Button from '@mui/material/Button';
import Lottie from 'lottie-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import wave from '../assets/wave.png';
import influencer from '../assets/influencer-day.json';
import logo from '../assets/logo-white.svg';

/* eslint-disable-next-line */
export interface FeatureProductPageProps {}

export const FeatureProductPage = (props: FeatureProductPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const topBox = { backgroundColor: '#02021c' };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* upper half of landing */}
      <div
        style={topBox}
        className="w-screen h-screen laptop:h-3/4 desktop:h-3/4 overflow-hidden relative"
      >
        <Lottie
          className="mt-10 desktop:mt-auto laptop:w-full mx-auto opacity-80"
          animationData={influencer}
          loop={true}
          renderer="svg"
        />
        <img
          className="w-1/4 mt-32 hidden laptop:block desktop:block"
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translate(-50%, 0%)',
            zIndex: 100,
          }}
          src={logo}
          alt="Flenzr"
        />
        <img
          className="hidden laptop:block desktop:block w-full -mt-1 absolute bottom-0 -mb-1"
          src={wave}
          alt="Flenzr"
        />
      </div>

      <div className="w-screen h-1/2 laptop:h-1/4 -mt-16 desktop:h-1/4 absolute bottom-0 pb-10 overflow-hidden">
        <div className="text-center text-3xl">
          <img
            className="w-3/4 mb-10 block laptop:hidden desktop:hidden mx-auto"
            src={logo}
            alt="Flenzr"
          />
          <div className="text-sm px-4 laptop:text-2xl desktop:text-2xl text-white laptop:text-black desktop:text-black font-bold mb-6 -mt-18">
            {t('subtext')}
          </div>
          <div className="mx-auto mt-4">
            <Button
              variant="contained"
              className="pr-4"
              color="success"
              onClick={() => navigate('/signup')}
            >
              {t('join')}
            </Button>
            <span className="px-4 text-white laptop:text-black desktop:text-black text-xs laptop:text-xl desktop:text-xl">
              OR
            </span>
            <Button variant="contained" onClick={() => navigate('/signin')}>
              {t('login')}
            </Button>
          </div>
        </div>
        {/* <Lottie
          className="w-full mx-auto absolute -z-10"
          animationData={aurora}
          style={{
            top: '0%',
            left: '50%',
            transform: 'translate(-50%, 0%)',
          }}
          loop={true}
          renderer="svg"
        /> */}
      </div>
    </div>
  );
};

export default FeatureProductPage;
