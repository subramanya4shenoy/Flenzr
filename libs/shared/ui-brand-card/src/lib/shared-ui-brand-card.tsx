import { SharedSocialUnfollow } from '@flenzr/feature-social-unfollow';

export function SharedUiBrandCard() {
  return (
    <div
      className="w-56 shadow p-4"
      style={{
        borderRadius: "28px",
        boxShadow: "-5px -5px 30px 5px #ff000014, 5px 5px 30px 5px #0000ff1c",
      }}
    >
      <div
        className="h-16 w-16 rounded-full shadow mx-auto overflow-hidden bg-cover bg-center bg-norepeat"
        style={{
          backgroundImage:
            "url('https://logo.clearbit.com/spotify.com')",
        }}
      ></div>

      <div className="px-4 mx-auto my-2 text-center w-full truncate hover:text-clip capitalize text-sm">
        Spotify
      </div>

      <div className="text-2xl text-center font-bold text-primary mx-auto my-4">123 K</div>
      <div className="w-11/12 mx-auto my-4">
        <SharedSocialUnfollow />
      </div>
    </div>
  );
};


export default SharedUiBrandCard;
