from typing import Optional
from fastapi import APIRouter,Depends,Query,Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import EntityNotFoundError
from app.domains.brands.services import BrandService
from app.domains.identity.models import SystemRole,User
from .schemas import ShortlistCreate,ShortlistRead,ShortlistPage,ShortlistMemberRead,ShortlistMemberPage
from .service import ShortlistService

router=APIRouter(prefix='/shortlists',tags=['Private brand shortlists'])

async def organization(current_user:User=Depends(require_role([SystemRole.BRAND_OWNER])),db:AsyncSession=Depends(get_db)):
    org=await BrandService.get_organization_by_owner(db,current_user.id)
    if not org:raise EntityNotFoundError('Organization',current_user.id)
    return org.id

@router.get('',response_model=ShortlistPage)
async def groups(page:int=Query(1,ge=1,le=10000),page_size:int=Query(20,ge=1,le=50),q:Optional[str]=Query(None,max_length=80),org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.groups(db,org_id,page,page_size,q)

@router.post('',response_model=ShortlistRead,status_code=201)
async def create(body:ShortlistCreate,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.create(db,org_id,body)

@router.get('/{id}',response_model=ShortlistRead)
async def read(id:str,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.read(db,org_id,id)

@router.get('/{id}/members',response_model=ShortlistMemberPage)
async def members(id:str,page:int=Query(1,ge=1,le=10000),page_size:int=Query(20,ge=1,le=50),org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.members(db,org_id,id,page,page_size)

@router.get('/{id}/creators/{handle}',response_model=Optional[ShortlistMemberRead])
async def lookup(id:str,handle:str,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.lookup(db,org_id,id,handle)

@router.put('/{id}/creators/{handle}',response_model=ShortlistMemberRead)
async def save(id:str,handle:str,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    return await ShortlistService.save(db,org_id,id,handle)

@router.delete('/{id}/members/{member_id}',status_code=204)
async def remove(id:str,member_id:str,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    await ShortlistService.remove(db,org_id,id,member_id)
    return Response(status_code=204)

@router.delete('/{id}',status_code=204)
async def delete_group(id:str,org_id:str=Depends(organization),db:AsyncSession=Depends(get_db)):
    await ShortlistService.delete_group(db,org_id,id)
    return Response(status_code=204)
