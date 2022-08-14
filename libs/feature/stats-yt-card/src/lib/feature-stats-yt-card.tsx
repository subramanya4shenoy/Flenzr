import YouTubeIcon from '@mui/icons-material/YouTube';

export function FeatureStatsYtCard() {
  return (
    <div
      className="shadow h-48 w-72 p-6 relative"
      style={{
        borderRadius: "28px",
        backgroundColor: "#ff0000",
        boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
      }}
    >
      <div className="absolute w-12 top-0 left-0 h-12 bg-white text-center rounded-full m-4">
        <YouTubeIcon className='m-3 bg-white' sx={{color: "#ff0000"}}/>
      </div>
      <div className="text-6xl text-center mt-8 font-bold text-white opacity-75">
        13K
      </div>
      <div className="text-center text-md uppercase mt-4 font-bold text-white opacity-75">
        Followers
      </div>
    </div>
  );
}

export default FeatureStatsYtCard;
