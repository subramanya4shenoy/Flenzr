from datetime import datetime, timezone
from sqlalchemy import select,func,delete,update
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import EntityNotFoundError,FlenzrException
from app.domains.creators.models import Creator
from app.domains.identity.models import User
from .models import BrandShortlist,BrandShortlistMember


class ShortlistService:
    @staticmethod
    async def owned(db,org_id,id,lock=False):
        query=select(BrandShortlist).where(BrandShortlist.id==id,BrandShortlist.organization_id==org_id).execution_options(populate_existing=True)
        if lock:query=query.with_for_update()
        row=await db.scalar(query)
        if row is None:raise EntityNotFoundError('Shortlist',id)
        return row

    @staticmethod
    async def read(db,org_id,id):
        row=await ShortlistService.owned(db,org_id,id)
        count=await db.scalar(select(func.count()).select_from(BrandShortlistMember).where(BrandShortlistMember.shortlist_id==id))
        return {'id':row.id,'name':row.name,'members_count':count or 0,'created_at':row.created_at,'updated_at':row.updated_at}

    @staticmethod
    async def groups(db,org_id,page=1,page_size=20,q=None):
        count=select(func.count(BrandShortlistMember.id)).where(BrandShortlistMember.shortlist_id==BrandShortlist.id).correlate(BrandShortlist).scalar_subquery()
        query=select(BrandShortlist.id,BrandShortlist.name,count.label('members_count'),BrandShortlist.created_at,BrandShortlist.updated_at).where(BrandShortlist.organization_id==org_id)
        if q and q.strip():
            term='%'+q.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%'
            query=query.where(BrandShortlist.name.ilike(term,escape='\\'))
        total=await db.scalar(select(func.count()).select_from(query.subquery()))
        items=(await db.execute(query.order_by(BrandShortlist.created_at.desc(),BrandShortlist.id.desc()).offset((page-1)*page_size).limit(page_size))).mappings().all()
        return {'items':items,'total':total or 0,'page':page,'page_size':page_size}

    @staticmethod
    async def create(db,org_id,body):
        id=str(body.request_id);name=body.name;normalized=name.casefold()
        existing=await db.get(BrandShortlist,id)
        if existing:
            if existing.organization_id==org_id and existing.normalized_name==normalized:return await ShortlistService.read(db,org_id,id)
            raise FlenzrException('SHORTLIST_REQUEST_USED','This create request was already used. Reload your shortlists before retrying.',409)
        row=BrandShortlist(id=id,organization_id=org_id,name=name,normalized_name=normalized)
        db.add(row)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            existing=await db.get(BrandShortlist,id)
            if existing and existing.organization_id==org_id and existing.normalized_name==normalized:return await ShortlistService.read(db,org_id,id)
            raise FlenzrException('SHORTLIST_EXISTS','A shortlist with this name already exists. Choose it or use another name.',409)
        return await ShortlistService.read(db,org_id,id)

    @staticmethod
    def member_query(id):
        return select(BrandShortlistMember.id,BrandShortlistMember.created_at.label('saved_at'),
            User.is_active,Creator.handle,Creator.display_name,Creator.bio,Creator.niche,Creator.location,Creator.is_verified,Creator.rating).join(Creator,BrandShortlistMember.creator_id==Creator.id).join(User,Creator.user_id==User.id).where(BrandShortlistMember.shortlist_id==id)

    @staticmethod
    def member_view(row):
        data=dict(row);active=data.pop('is_active');id=data.pop('id');saved=data.pop('saved_at')
        return {'id':id,'saved_at':saved,'creator':data if active else None}

    @staticmethod
    async def members(db,org_id,id,page=1,page_size=20):
        shortlist=await ShortlistService.read(db,org_id,id)
        result=await db.execute(ShortlistService.member_query(id).order_by(BrandShortlistMember.created_at.desc(),BrandShortlistMember.id.desc()).offset((page-1)*page_size).limit(page_size))
        return {'shortlist':shortlist,'items':[ShortlistService.member_view(row) for row in result.mappings()],
            'total':shortlist['members_count'],'page':page,'page_size':page_size}

    @staticmethod
    async def lookup(db,org_id,id,handle):
        await ShortlistService.owned(db,org_id,id)
        row=(await db.execute(ShortlistService.member_query(id).where(Creator.handle==handle))).mappings().one_or_none()
        return ShortlistService.member_view(row) if row else None

    @staticmethod
    async def save(db,org_id,id,handle):
        await ShortlistService.owned(db,org_id,id,lock=True)
        creator=(await db.execute(select(Creator.id,User.is_active).join(User,Creator.user_id==User.id).where(Creator.handle==handle))).one_or_none()
        if creator is None:raise EntityNotFoundError('Available creator',handle)
        existing=await db.scalar(select(BrandShortlistMember.id).where(BrandShortlistMember.shortlist_id==id,BrandShortlistMember.creator_id==creator.id))
        if existing:return await ShortlistService.lookup(db,org_id,id,handle)
        if not creator.is_active:raise EntityNotFoundError('Available creator',handle)
        db.add(BrandShortlistMember(shortlist_id=id,creator_id=creator.id))
        try:
            await db.execute(update(BrandShortlist).where(BrandShortlist.id==id).values(updated_at=datetime.now(timezone.utc)))
            await db.commit()
        except IntegrityError:
            await db.rollback()
            existing=await db.scalar(select(BrandShortlistMember.id).where(BrandShortlistMember.shortlist_id==id,BrandShortlistMember.creator_id==creator.id))
            if not existing:raise EntityNotFoundError('Shortlist or available creator',id)
        return await ShortlistService.lookup(db,org_id,id,handle)

    @staticmethod
    async def remove(db,org_id,id,member_id):
        await ShortlistService.owned(db,org_id,id,lock=True)
        result=await db.execute(delete(BrandShortlistMember).where(BrandShortlistMember.shortlist_id==id,BrandShortlistMember.id==member_id))
        if result.rowcount:await db.execute(update(BrandShortlist).where(BrandShortlist.id==id).values(updated_at=datetime.now(timezone.utc)))
        await db.commit()

    @staticmethod
    async def delete_group(db,org_id,id):
        await ShortlistService.owned(db,org_id,id,lock=True)
        await db.execute(delete(BrandShortlistMember).where(BrandShortlistMember.shortlist_id==id))
        await db.execute(delete(BrandShortlist).where(BrandShortlist.id==id,BrandShortlist.organization_id==org_id))
        await db.commit()
