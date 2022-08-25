import { FeaturePostReaction } from "@flenzr/feature/post-reaction";
import Avatar from "@mui/material/Avatar";

export function FeatureFeedCard() {
  return (
    <div className="laptop:w-full desktop:w-full bg-white rounded-lg shadow-md my-6 p-4 mx-4">
      <div className="flex items-center">
        <Avatar
          alt="Sophie carter"
          className="mr-4"
          sx={{ width: 32, 
                height: 32, 
                boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
              }}
          src="https://img.freepik.com/free-photo/portrait-attractive-adult-girl-with-long-dark-curly-hair-wearing-earrings-pastel-pink-shirt-has-make-up-broadly-smiling_295783-14161.jpg"
        />
      <div className="font-bold capitalize">Sophie carter</div>
      </div>
      <div className="py-2 text-sm opacity-75 pl-12 pr-4 pb-6">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Tenetur sed
        consequatur tempore unde earum beatae in maiores dolore odit fugiat
        temporibus modi dignissimos vitae sit, saepe autem odio porro.
        Similique!
      </div>
      <div className="flex justify-end">
        <FeaturePostReaction/>
      </div>
    </div>
  );
}

export default FeatureFeedCard;
