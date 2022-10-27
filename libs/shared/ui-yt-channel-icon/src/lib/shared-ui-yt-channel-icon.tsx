
export function SharedUiYtChannelIcon({channel}:any) {

  return (
    <div className="flex-wrap items-center justify-center">
      <div className="w-10 h-10 rounded-full overflow-hidden" >
      <img
           alt={channel.title}
           src={channel.thumbnails_default} />
      </div>
      <div className="text-xs">{channel.title}</div>
    </div>
  );
}

export default SharedUiYtChannelIcon;
