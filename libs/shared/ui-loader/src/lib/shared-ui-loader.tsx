import Lottie from "lottie-react";
import loginYoga from "../assets/loading.json";

export const SharedUiLoader = () => {
  return (
    <div className="w-auto">
      <Lottie
            className=""
            animationData={loginYoga}
            loop={true}
            renderer="svg"
          />
    </div>
  );
};
