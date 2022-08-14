import InstagramIcon from '@mui/icons-material/Instagram';

export function FeatureStatsInstaCard() {
  return (
    <div
      className="shadow h-48 w-72 p-6 relative"
      style={{
        borderRadius: "28px",
        boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
        background:
          "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
        filter:
          "progid:DXImageTransform.Microsoft.gradient( startColorstr='#f09433', endColorstr='#bc1888',GradientType=1 )",
      }}
    >
      <div className="absolute w-12 top-0 left-0 h-12 bg-white text-center rounded-full m-4">
        <InstagramIcon className='m-3' sx={{color: "#bc1888"}}/>
      </div>
      <div className="text-6xl text-center mt-8 font-bold text-white opacity-75">
        10K
      </div>
      <div className="text-center text-md uppercase mt-4 font-bold text-white opacity-75">
        Followers
      </div>
    </div>
  );
}

export default FeatureStatsInstaCard;
