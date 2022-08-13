import { SharedSocialUnfollow } from "@flenzr/feature-social-unfollow";
import { FeatureSocialList } from "@flenzr/feature/social-list";

export const SharedUiUserCard = () => {
  return (
    <div
      className="h-64 w-56 shadow p-4"
      style={{
        borderRadius: "28px",
        boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
      }}
    >
      <div
        className="h-16 w-16 -mt-8 rounded-full shadow mx-auto overflow-hidden bg-cover bg-center bg-norepeat"
        style={{
          backgroundImage:
            "url('https://img.freepik.com/free-photo/portrait-bearded-casually-dressed-man-glasses-with-dark-curly-hair_295783-1419.jpg?w=1800&t=st=1660338313~exp=1660338913~hmac=bbfab42b7f9fe133c774a63be8525e7df2e7756d7e7336925d99ff307d273817')",
        }}
      ></div>

      <div className="px-4 mx-auto my-2 text-center w-full truncate hover:text-clip capitalize text-sm">
        Hector Solamanca
      </div>

      <div className="text-2xl text-center font-bold text-primary mx-auto my-4">123 K</div>
      <div className="mx-auto w-11/12">
      <FeatureSocialList />
      </div>
      <div className="w-11/12 mx-auto my-4">
        <SharedSocialUnfollow />
      </div>
    </div>
  );
};
