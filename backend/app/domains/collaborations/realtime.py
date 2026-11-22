"""In-process realtime pub/sub and online presence hub for collaboration chat & WebRTC signaling."""
import asyncio
from collections import defaultdict
from datetime import datetime, timezone


class ChatRealtimeHub:
    def __init__(self) -> None:
        # collaboration_id -> set of (user_id, asyncio.Queue)
        self._rooms: dict[str, set[tuple[str, asyncio.Queue]]] = defaultdict(set)
        # user_id -> active connection count
        self._online_counts: dict[str, int] = defaultdict(int)

    def is_online(self, user_id: str) -> bool:
        return self._online_counts.get(user_id, 0) > 0

    def subscribe(self, collaboration_id: str, user_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=128)
        self._rooms[collaboration_id].add((user_id, queue))
        was_online = self._online_counts[user_id] > 0
        self._online_counts[user_id] += 1
        if not was_online:
            self.publish(collaboration_id, 'presence', {'user_id': user_id, 'online': True, 'at': datetime.now(timezone.utc).isoformat()}, exclude_user_id=user_id)
        return queue

    def unsubscribe(self, collaboration_id: str, user_id: str, queue: asyncio.Queue) -> None:
        room = self._rooms.get(collaboration_id)
        if room:
            room.discard((user_id, queue))
            if not room:
                self._rooms.pop(collaboration_id, None)
        if self._online_counts.get(user_id, 0) > 0:
            self._online_counts[user_id] -= 1
            if self._online_counts[user_id] == 0:
                self._online_counts.pop(user_id, None)
                self.publish(collaboration_id, 'presence', {'user_id': user_id, 'online': False, 'at': datetime.now(timezone.utc).isoformat()}, exclude_user_id=user_id)

    def publish(self, collaboration_id: str, event: str, data: dict, *, exclude_user_id: str | None = None) -> None:
        room = self._rooms.get(collaboration_id)
        if not room:
            return
        payload = {'event': event, 'data': data}
        for uid, queue in list(room):
            if exclude_user_id and uid == exclude_user_id:
                continue
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait(payload)
                except asyncio.QueueEmpty:
                    pass


chat_hub = ChatRealtimeHub()

