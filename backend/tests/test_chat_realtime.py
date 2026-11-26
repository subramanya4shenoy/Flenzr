import pytest
from app.domains.collaborations.realtime import ChatRealtimeHub


@pytest.mark.asyncio
async def test_local_fanout_exclusion_presence_and_overflow():
    hub = ChatRealtimeHub()
    brand = await hub.subscribe('deal', 'brand')
    creator = await hub.subscribe('deal', 'creator')
    other = await hub.subscribe('other', 'outsider')
    assert (await brand.get())['event'] == 'presence'
    assert await hub.is_online('creator')
    await hub.publish('deal', 'typing', {'active': True}, exclude_user_id='brand')
    assert (await creator.get())['event'] == 'typing'
    assert brand.empty() and other.empty()
    tab = await hub.subscribe('deal', 'creator')
    await brand.get()
    await hub.unsubscribe('deal', 'creator', tab)
    assert (await brand.get())['data']['online'] is True
    await hub.unsubscribe('deal', 'creator', creator)
    assert (await brand.get())['data']['online'] is False
    assert not await hub.is_online('creator')
    for i in range(130):
        await hub.publish('deal', 'message', {'sequence': i})
    assert await brand.get() is None
    await hub.stop()
    assert not hub._rooms and not hub._online_counts and not hub._closed


@pytest.mark.asyncio
async def test_bus_failure_preserves_durable_response_but_rejects_ephemeral_signal():
    from unittest.mock import AsyncMock
    from redis.exceptions import RedisError
    from app.core.exceptions import FlenzrException

    hub = ChatRealtimeHub()
    queue = await hub.subscribe('deal', 'brand')
    redis = AsyncMock()
    redis.publish.side_effect = RedisError('unavailable')
    hub._redis = redis
    hub._connected = True
    # Called after durable writes: the caller must receive their saved result.
    await hub.publish('deal', 'message', {'sequence': 1})
    assert await queue.get() is None
    # Signaling has no durable replay: expose failure for caller recovery.
    with pytest.raises(FlenzrException) as error:
        await hub.publish('deal', 'call_ring', {}, required=True)
    assert error.value.status_code == 503
    hub._redis = None
    await hub.stop()


@pytest.mark.asyncio
async def test_configured_bus_startup_failure_is_not_a_local_fallback():
    from unittest.mock import AsyncMock, patch
    from redis.exceptions import RedisError

    hub = ChatRealtimeHub()
    redis = AsyncMock()
    redis.ping.side_effect = RedisError('unavailable')
    with patch('app.domains.collaborations.realtime.Redis.from_url', return_value=redis):
        with pytest.raises(RedisError):
            await hub.start('redis://test.invalid')
    redis.aclose.assert_awaited_once()
    assert not hub._tasks and hub._redis is None
