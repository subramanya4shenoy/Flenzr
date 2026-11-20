"""Public audience summaries and SQL filters over authorized saved snapshots."""
from datetime import datetime, timezone
from enum import IntEnum

from sqlalchemy import BigInteger, and_, case, desc, literal, select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement

from app.domains.creators.models import Creator
from app.domains.discovery.networks import NETWORKS, connected_accounts, network_credentials

class AudienceWindow(IntEnum):
    week = 7
    month = 30
    quarter = 90


MAX_AUDIENCE = 1_000_000_000_000
SOURCES = {"instagram": "Instagram API", "youtube": "YouTube API", "facebook": "Facebook Pages API",
           "x": "X API", "linkedin": "LinkedIn OpenID Connect"}


class _SavedInteger(FunctionElement):
    """Reject null, booleans, strings, fractions and unsafe numbers before casting."""
    type = BigInteger()
    inherit_cache = True


@compiles(_SavedInteger, "sqlite")
def _sqlite_integer(element, compiler, **kwargs):
    obj, key = list(element.clauses)
    obj = compiler.process(obj, **kwargs)
    key = compiler.process(key, **kwargs)
    path = f"('$.' || {key})"
    value = f"json_extract({obj}, {path})"
    return f"(CASE WHEN json_type({obj}, {path}) = 'integer' AND {value} BETWEEN 0 AND {MAX_AUDIENCE} THEN CAST({value} AS INTEGER) END)"


@compiles(_SavedInteger, "postgresql")
def _postgres_integer(element, compiler, **kwargs):
    obj, key = list(element.clauses)
    value = f"({compiler.process(obj, **kwargs)} -> {compiler.process(key, **kwargs)})"
    return f"(CASE WHEN json_typeof({value}) = 'number' AND CAST({value} AS TEXT) ~ '^[0-9]+$' THEN CASE WHEN CAST(CAST({value} AS TEXT) AS NUMERIC) <= {MAX_AUDIENCE} THEN CAST(CAST({value} AS TEXT) AS BIGINT) END END)"


def saved_audience_queries(network, now):
    credentials, value, eligible = network_credentials(network, now)
    count = _SavedInteger(value["snapshot"], literal("followers"))
    saved_at = _SavedInteger(value, literal("fetched_at"))
    updated = case((and_(saved_at > 0, saved_at <= now), saved_at), else_=None)
    valid = and_(eligible, count.is_not(None),
                 value["snapshot"]["followersAvailable"].as_boolean().is_not(False),
                 value["snapshot"]["subscribersHidden"].as_boolean().is_not(True))
    def best(field):
        return (select(field).select_from(credentials).where(valid)
                .order_by(desc(count), desc(updated).nulls_last(), credentials.c.key)
                .limit(1).correlate(Creator).scalar_subquery())
    return best(count), best(updated)


def audience_summaries(creator, now):
    best = {}
    connected = set()
    for network, handle, credential in connected_accounts(creator, now):
        connected.add(network)
        snapshot = credential.get("snapshot") or {}
        if not isinstance(snapshot, dict):
            continue
        count = snapshot.get("followers")
        if (type(count) is not int or not 0 <= count <= MAX_AUDIENCE
                or snapshot.get("followersAvailable") is False or snapshot.get("subscribersHidden") is True):
            continue
        updated = credential.get("fetched_at")
        if type(updated) is not int or not 0 < updated <= now:
            updated = None
        candidate = (count, updated or 0)
        previous = best.get(network)
        if previous is None or candidate > previous:
            best[network] = candidate
    return [{"network": network, "count": best.get(network, (None, 0))[0],
             "metric": "subscribers" if network == "youtube" else "followers", "source": SOURCES[network],
             "updated_at": datetime.fromtimestamp(best[network][1], timezone.utc) if network in best and best[network][1] else None,
             "basis": "largest_connected_account"} for network in NETWORKS if network in connected]
