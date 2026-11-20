"""Saved authorization state only: no token decryption or provider calls."""
from typing import Literal

from sqlalchemy import JSON, String, and_, column, exists, func, literal, or_
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement

from app.domains.creators.models import Creator

DiscoveryNetwork = Literal["instagram", "youtube", "facebook", "x", "linkedin"]
NETWORKS = ("instagram", "youtube", "facebook", "x", "linkedin")


class _AccountRows(FunctionElement):
    inherit_cache = True


@compiles(_AccountRows, "postgresql")
def _postgres_accounts(element, compiler, **kwargs):
    return "json_array_elements(%s)" % compiler.process(list(element.clauses)[0], **kwargs)


@compiles(_AccountRows, "sqlite")
def _sqlite_accounts(element, compiler, **kwargs):
    return "json_each(%s)" % compiler.process(list(element.clauses)[0], **kwargs)


class _ObjectValue(FunctionElement):
    type = JSON()
    inherit_cache = True


@compiles(_ObjectValue, "sqlite")
def _sqlite_object(element, compiler, **kwargs):
    value, kind = list(element.clauses)
    return "(CASE WHEN %s = 'object' THEN %s ELSE '{}' END)" % (
        compiler.process(kind, **kwargs), compiler.process(value, **kwargs))


@compiles(_ObjectValue, "postgresql")
def _postgres_object(element, compiler, **kwargs):
    value = compiler.process(list(element.clauses)[0], **kwargs)
    return "(CASE WHEN json_typeof(%s) = 'object' THEN %s ELSE '{}'::json END)" % (value, value)


def network_credentials(network: DiscoveryNetwork, now: float):
    credentials = func.json_each(Creator.social_credentials).table_valued(
        column("key", String), column("value", JSON), column("type", String)).alias("discovery_credentials")
    value = _ObjectValue(credentials.c.value, credentials.c.type)
    prefix = "" if network == "instagram" else network + ":"
    accounts = _AccountRows(Creator.social_links["_accounts"]).table_valued(
        column("value", JSON), column("type", String)).alias("discovery_accounts")
    account_value = _ObjectValue(accounts.c.value, accounts.c.type)
    linked = exists().select_from(accounts).where(and_(
        account_value["platform"].as_string() == network,
        credentials.c.key == literal(prefix) + account_value["handle"].as_string(),
    )).correlate(Creator, credentials)
    if network in ("instagram", "youtube"):
        handle = Creator.instagram_handle if network == "instagram" else Creator.youtube_channel
    else:
        handle = Creator.social_links[network].as_string()
    linked = or_(credentials.c.key == literal(prefix) + handle, linked)
    valid = value["expires_at"].as_float() > now
    if network in ("youtube", "x"):
        valid = or_(valid, func.coalesce(value["encrypted_refresh_token"].as_string(), "") != "")
    if network == "instagram":
        valid = or_(valid, and_(value["expires_at"].as_float().is_(None), value["mode"].as_string() == "unified"))
    return credentials, value, and_(linked, func.coalesce(value["encrypted_token"].as_string(), "") != "", valid)


def network_predicate(network: DiscoveryNetwork, now: float):
    credentials, _, eligible = network_credentials(network, now)
    return exists().select_from(credentials).where(eligible).correlate(Creator)


def connected_accounts(creator: Creator, now: float):
    links = creator.social_links or {}
    accounts = [("instagram", creator.instagram_handle), ("youtube", creator.youtube_channel)]
    accounts.extend((network, links.get(network)) for network in NETWORKS if network not in ("instagram", "youtube"))
    accounts.extend((account.get("platform"), account.get("handle")) for account in links.get("_accounts", []) if isinstance(account, dict))
    found = {}
    for network, handle in accounts:
        if network not in NETWORKS or not handle:
            continue
        key = handle if network == "instagram" else network + ":" + handle
        credential = (creator.social_credentials or {}).get(key, {})
        if not isinstance(credential, dict) or not credential.get("encrypted_token"):
            continue
        expiry = credential.get("expires_at")
        valid = isinstance(expiry, (int, float)) and expiry > now
        if network in ("youtube", "x"):
            valid = valid or bool(credential.get("encrypted_refresh_token"))
        if network == "instagram" and expiry is None and credential.get("mode") == "unified":
            valid = True
        if valid:
            found[(network, handle)] = credential
    return [(network, handle, credential) for (network, handle), credential in found.items()]


def connected_networks(creator: Creator, now: float) -> list[str]:
    found = {network for network, _, _ in connected_accounts(creator, now)}
    return [network for network in NETWORKS if network in found]
