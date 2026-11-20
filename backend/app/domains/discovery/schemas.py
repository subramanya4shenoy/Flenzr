from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

from app.domains.creators.schemas import PublicCreatorProfile

from app.domains.discovery.networks import DiscoveryNetwork


class DiscoveryAudience(BaseModel):
    network: DiscoveryNetwork
    count: int | None
    metric: Literal["followers", "subscribers"]
    source: str
    updated_at: datetime | None
    basis: Literal["largest_connected_account"]


class DiscoveryCreator(PublicCreatorProfile):
    connected_networks: list[DiscoveryNetwork] = Field(default_factory=list)
    audiences: list[DiscoveryAudience] = Field(default_factory=list)


class CreatorDiscoveryPage(BaseModel):
    items: list[DiscoveryCreator]
    total: int
    limit: int
    offset: int
