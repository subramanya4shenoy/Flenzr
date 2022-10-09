import Button from "@mui/material/Button";
import Lottie from "lottie-react";
import { useTranslation } from "react-i18next";
import wave from "../assets/wave.png";
import influencer from "../assets/influencer-day.json";
import aurora from "../assets/aurora.json";
import logo from "../assets/logo-white.svg";
import { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export const FeatureProductPage = () => {
  // * Translation hook
  const { t } = useTranslation();
  const navigate = useNavigate();

  // * inline styling declaration
  const logoStyle: CSSProperties = {
    position: "absolute",
    top: "10%",
    left: "50%",
    transform: "translate(-50%, 0%)",
    zIndex: 100,
  };
  const auroraStyle: CSSProperties = {
    top: "0%",
    left: "50%",
    transform: "translate(-50%, 0%)",
  };
  const btnOddCurve = {
    width: '170px'
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* upper half of landing */}
      <div className="w-screen h-screen bg-darkBlue laptop:h-3/4 desktop:h-3/4 overflow-hidden relative">
        <Lottie
          className="mt-10 desktop:mt-auto laptop:w-full mx-auto opacity-80"
          animationData={influencer}
          loop={true}
          renderer="svg"
        />
        <img
          className="w-1/4 mt-32 hidden laptop:block desktop:block"
          style={logoStyle}
          src={logo}
          alt="Flenzr"
        />
        <img
          className="hidden laptop:block desktop:block w-full -mt-1 absolute bottom-0 -mb-1"
          src={wave}
          alt="Wave"
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
            {t("subtext")}
          </div>

          {/* Desktop  */}
          <div className="mx-auto mt-4 hidden laptop:block desktop:block">
            <Button
              variant="contained"
              className="pr-4"
              color="success"
              type="button"
              size="large"
              sx={btnOddCurve}
              onClick={() => navigate("/signup")}
            >
              {t("join")}
            </Button>
            <span className="px-4 text-white laptop:text-black desktop:text-black text-xs laptop:text-xl desktop:text-xl">
              {t("or")}
            </span>
            <Button variant="contained" 
              sx={btnOddCurve}
                size="large"
              onClick={() => navigate("/signin")}>
              {t("login")}
            </Button>
          </div>

          {/* mobile */}
          <div className="mx-auto mt-4 block px-14 laptop:hidden desktop:hidden">
            <Button
              variant="contained"
              className="pr-4"
              color="success"
              type="button"
              size="large"
              fullWidth={true}
              onClick={() => navigate("/signup")}
            >
              {t("join")}
            </Button>
            <span className="px-4 text-white laptop:text-black desktop:text-black text-xs laptop:text-xl desktop:text-xl">
              {t("or")}
            </span>
            <Button variant="contained" 
                size="large"
              fullWidth={true}
              onClick={() => navigate("/signin")}>
              {t("login")}
            </Button>
          </div>

        </div>
        <Lottie
          className="w-full mx-auto absolute -z-10"
          animationData={aurora}
          style={auroraStyle}
          loop={true}
          renderer="svg"
        />
      </div>
    </div>
  );
};

export default FeatureProductPage;
