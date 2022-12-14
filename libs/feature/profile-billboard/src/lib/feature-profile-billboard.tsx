import { FeatureSocialAdd } from "@flenzr/feature/social-add";
import IconButton from "@mui/material/IconButton";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ModeCommentOutlinedIcon from "@mui/icons-material/ModeCommentOutlined";
import Tooltip from "@mui/material/Tooltip";

export function FeatureProfileBillboard() {
  return (
    <div className="mx-auto max-w-5xl shadow p-2 rounded-[27px] h-96 overflow-hidden">
      {/* cover */}
      <div className="relative">
        <div
          className="rounded-[27px] w-full h-64 overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1598449356475-b9f71db7d847?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80')",
          }}
        ></div>
        <div className="absolute bottom-o h-28 w-28 ml-10 -mt-14 rounded-full shadow p-2">
          <div
            className="rounded-full w-full h-full overflow-hidden bg-cover bg-center bg-norepeat"
            style={{
              backgroundImage:
                "url('https://img.freepik.com/free-photo/portrait-attractive-adult-girl-with-long-dark-curly-hair-wearing-earrings-pastel-pink-shirt-has-make-up-broadly-smiling_295783-14161.jpg?w=1800&t=st=1660148966~exp=1660149566~hmac=6be553227f0d82fc08eedffc48f5305ef7531e4450feff55f004764256db89b4')",
            }}
          ></div>
        </div>
      </div>

      {/* name */}
      <div className="laptop:flex desktop:flex w-full justify-between laptop:pl-40 desktop:pl-40 pr-2 items-center pt-2">
        <div className="pl-40 laptop:pl-0 desktop:pl-0 capitalize font-bold text-xl">sophie carter</div>
        <div className="w-full flex justify-end mt-6 laptop:mt-0 desktop:mt-0 laptop:w-auto desktop:w-auto items-center">
          <FeatureSocialAdd />
          <Tooltip title="Email" arrow>
            <IconButton
              aria-label="Email"
              className="opacity-50 hover:opacity-100"
              color="primary"
              sx={{ marginLeft: "10px" }}
            >
              <EmailOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chat" arrow>
            <IconButton
              aria-label="Chat"
              className="opacity-50 hover:opacity-100"
              color="primary"
              sx={{ marginLeft: "10px" }}
            >
              <ModeCommentOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="More" arrow>
            <IconButton
              aria-label="More"
              className="opacity-50 hover:opacity-100"
              color="primary"
              sx={{ marginLeft: "10px" }}
            >
              <MoreHorizIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default FeatureProfileBillboard;
