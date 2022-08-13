import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import Button from '@mui/material/Button';
import { SharedSocialUnfollow } from '@flenzr/shared/social-unfollow';

export const SharedUiUserCard = () => {
  return (
    <div className="h-64 w-56 shadow p-4"
        style={{borderRadius: "28px",  boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c"}}>
      <div
        className="h-24 w-24 -mt-16 rounded-full shadow mx-auto overflow-hidden bg-cover bg-center bg-norepeat"
        style={{
          backgroundImage:
            "url('https://img.freepik.com/free-photo/portrait-bearded-casually-dressed-man-glasses-with-dark-curly-hair_295783-1419.jpg?w=1800&t=st=1660338313~exp=1660338913~hmac=bbfab42b7f9fe133c774a63be8525e7df2e7756d7e7336925d99ff307d273817')",
        }}
      ></div>

      <div className="px-4 text-md mx-auto mt-2 text-center w-full truncate hover:text-clip text-primary text-xs font-bold opacity-75">
        Hector Solamanca
      </div>
      <div className="text-5xl text-center mx-auto my-6">
        123 K
      </div>
      <div className="mx-auto flex opacity-50 items-center justify-between w-4/6">
        <YouTubeIcon/>
        <InstagramIcon/>
        <TwitterIcon/>
        <FacebookIcon/>
      </div>
      <div className='w-full flex justify-center content-center mt-4'>  
        <SharedSocialUnfollow/>
      </div>
    </div>
  );
};
