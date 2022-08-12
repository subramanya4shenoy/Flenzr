import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import Button from '@mui/material/Button';

export const SharedUiUserCard = () => {
  return (
    <div className="h-72 relative  w-56 shadow flex flex-col p-4"
        style={{borderRadius: "28px",  boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c"}}>
      <div
        className="rounded-full -mt-14 h-28 w-28 shadow mx-auto overflow-hidden bg-cover bg-center bg-norepeat"
        style={{
          backgroundImage:
            "url('https://img.freepik.com/free-photo/portrait-bearded-casually-dressed-man-glasses-with-dark-curly-hair_295783-1419.jpg?w=1800&t=st=1660338313~exp=1660338913~hmac=bbfab42b7f9fe133c774a63be8525e7df2e7756d7e7336925d99ff307d273817')",
        }}
      ></div>

      <div className="px-4 text-md mx-auto mt-2 text-center w-full truncate hover:text-clip">
        Hector Solamanca
      </div>
      <div className="text-3xl text-center text-primary opacity-50 font-bold mx-auto mt-2">
        123 K
      </div>
      <div className="mx-auto flex opacity-50 items-center text-secondary justify-between w-4/6">
        <YouTubeIcon/>
        <InstagramIcon/>
        <TwitterIcon/>
        <FacebookIcon/>
      </div>
      <Button variant='contained' color='error'
        sx={{position: "absolute", bottom: 0, margin: "auto "}}>
        Unfollow
      </Button>
    </div>
  );
};
