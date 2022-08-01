import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@mui/material/Card';
import Lottie from 'lottie-react';
import loginYoga from '../../../../../../../assets/Animations/login-yoga.json';
// import loginYoga from '@flenzr/shared/assets/Animations/login-yoga.json';
import Typography from '@mui/material/Typography/Typography';
import SignInForm from './SignInForm';
import {
  ACCOUNT_TYPES,
  ACCOUNT_SETTINGS,
} from '../../../../../../Constant/AccountType';
import BrandSignInForm from './BrandSignInForm';
import { SharedUiCustomSelect } from '@flenzr/shared/ui-custom-select';
export function SignIn() {
  const { t } = useTranslation();
  const [userType, setUserType] = useState(ACCOUNT_TYPES[0]);
  const colorList = ['#05f', '#10d876'];
  const [color, setColor] = useState(colorList[0]);

  const outerBox = { backgroundColor: '#02021c' };
  const centerCard = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };
  const handleChange = (change: any) => {
    setColor(colorList[ACCOUNT_TYPES.indexOf(change)]);
    setUserType(change);
  };

  return (
    <div className="w-screen h-screen" style={outerBox}>
      {/* mobile design */}
      <div className="block laptop:hidden desktop:hidden">
        <Lottie
          className="w-3/4 mx-auto"
          animationData={loginYoga}
          loop={true}
          renderer="svg"
        />
        <div className="-mt-4 bg-white mx-5 px-10 py-10 rounded-md">
          <div className="flex mb-4 justify-center items-center">
            <Typography className="uppercase" variant="body1">
              <strong>{t('signInAs')}</strong>
            </Typography>
            <div className="mx-4 -mt-1">
              <SharedUiCustomSelect
                list={ACCOUNT_TYPES}
                selectedOption={userType}
                onChangeSelection={(e: any) => {
                  handleChange(e);
                }}
                color={color}
              ></SharedUiCustomSelect>
            </div>
          </div>
          <div>
            {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
              <SignInForm></SignInForm>
            ) : (
              <BrandSignInForm></BrandSignInForm>
            )}
          </div>
        </div>
      </div>

      {/* desktop and laptop design */}
      <Card
        className="hidden laptop:block desktop:block w-3/4 h-3/4 laptop:h-auto desktop:h-auto absolute overflow-auto"
        style={centerCard}
      >
        <div className="flex-none laptop:flex desktop:flex">
          <div className="hidden laptop:block desktop:block laptop:h-auto desktop:h-auto laptop:w-1/2 desktop:w-1/2 mx-auto">
            <Lottie
              className=""
              animationData={loginYoga}
              loop={true}
              renderer="svg"
            />
          </div>
          <div className="w-full laptop:w-1/2 desktop:w-1/2 p-4 laptop:p-10 desktop:p-10 flex flex-wrap items-start content-start justify-center">
            <Typography className="uppercase" variant="h6" component="h6">
              <strong>{t('signInAs')}</strong>
            </Typography>
            <div className="mx-4 -mt-1">
              <SharedUiCustomSelect
                list={ACCOUNT_TYPES}
                selectedOption={userType}
                onChangeSelection={(e: any) => {
                  handleChange(e);
                }}
                color={color}
              ></SharedUiCustomSelect>
            </div>
            <div className="w-full mt-10">
              {userType === ACCOUNT_SETTINGS.Flenzr.id ? (
                <SignInForm></SignInForm>
              ) : (
                <BrandSignInForm></BrandSignInForm>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SignIn;
