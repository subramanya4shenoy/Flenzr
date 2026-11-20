from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.domains.identity.models import User
from .schemas import CollaborationCreate, CollaborationRead, CollaborationPage
from .service import CollaborationService
from .calendar import CollaborationCalendar
from .schemas import CalendarPage
from .proposals import ProposalService
from .agreements import AgreementService
from .deliveries import DeliveryService
from .proof import PublishingProofService
from .schemas import ProofConfirmationCreate, ProofConfirmationRead
from .schemas import PublishingProofCreate, PublishingProofRead, PublishingProofWorkspace
from .schemas import CompletionCreate, CompletionRead, DeliveryRead, DeliveryCreate, DeliveryWorkspace, DeliveryReviewCreate, DeliveryReviewRead
from .schemas import AgreementRead, AgreementStatus, ProposalAccept
from .schemas import ProposalWorkspace, ProposalDraftRead, ProposalDraftSave, ProposalRevisionRead, ProposalSend

router = APIRouter(prefix='/collaborations', tags=['Collaborations'])


@router.post('', response_model=CollaborationRead)
async def create_collaboration(body: CollaborationCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationService.create(db, user.id, body)


@router.get('', response_model=CollaborationPage)
async def list_collaborations(page: int = Query(1, ge=1, le=10000), page_size: int = Query(20, ge=1, le=50),
                              user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationService.list(db, user.id, page, page_size)


@router.get('/calendar', response_model=CalendarPage)
async def calendar(month: str = Query(..., max_length=7), day: int | None = Query(None, ge=1, le=31),
                   page: int = Query(1, ge=1, le=10000), page_size: int = Query(20, ge=1, le=50),
                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationCalendar.read(db, user.id, month, day, page, page_size)


@router.get('/{record_id}', response_model=CollaborationRead)
async def read_collaboration(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationService.read(db, user.id, record_id)


@router.get('/{record_id}/proposals', response_model=ProposalWorkspace)
async def proposal_workspace(record_id: str, page: int = Query(1, ge=1, le=10000), page_size: int = Query(10, ge=1, le=50),
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ProposalService.workspace(db, user.id, record_id, page, page_size)


@router.put('/{record_id}/proposals/draft', response_model=ProposalDraftRead)
async def save_proposal_draft(record_id: str, body: ProposalDraftSave, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ProposalService.save(db, user.id, record_id, body)


@router.post('/{record_id}/proposals/send', response_model=ProposalRevisionRead)
async def send_proposal(record_id: str, body: ProposalSend, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ProposalService.send(db, user.id, record_id, body)


@router.post('/{record_id}/proposals/accept', response_model=AgreementStatus)
async def accept_proposal(record_id: str, body: ProposalAccept, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await AgreementService.accept(db, user.id, record_id, body)


@router.get('/{record_id}/agreement', response_model=AgreementRead)
async def read_agreement(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await AgreementService.read(db, user.id, record_id)


@router.get('/{record_id}/deliveries', response_model=DeliveryWorkspace)
async def delivery_workspace(record_id: str, page: int = Query(1, ge=1, le=10000), page_size: int = Query(10, ge=1, le=50),
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await DeliveryService.workspace(db, user.id, record_id, page, page_size)


@router.post('/{record_id}/deliveries', response_model=DeliveryRead)
async def submit_delivery(record_id: str, body: DeliveryCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await DeliveryService.submit(db, user.id, record_id, body)


@router.post('/{record_id}/deliveries/{delivery_id}/review', response_model=DeliveryReviewRead)
async def review_delivery(record_id: str, delivery_id: str, body: DeliveryReviewCreate,
                          user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await DeliveryService.review(db, user.id, record_id, delivery_id, body)


@router.post('/{record_id}/complete', response_model=CompletionRead)
async def complete_collaboration(record_id: str, body: CompletionCreate,
                                 user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await DeliveryService.complete(db, user.id, record_id, body)


@router.get('/{record_id}/publishing-proof', response_model=PublishingProofWorkspace)
async def publishing_proof(record_id: str, page: int = Query(1, ge=1, le=10000), page_size: int = Query(10, ge=1, le=50),
                           user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await PublishingProofService.workspace(db, user.id, record_id, page, page_size)


@router.post('/{record_id}/publishing-proof', response_model=PublishingProofRead)
async def save_publishing_proof(record_id: str, body: PublishingProofCreate,
                                user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await PublishingProofService.save(db, user.id, record_id, body)


@router.post('/{record_id}/publishing-proof/{proof_id}/confirm', response_model=ProofConfirmationRead)
async def confirm_publishing_proof(record_id: str, proof_id: str, body: ProofConfirmationCreate,
                                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await PublishingProofService.confirm(db, user.id, record_id, proof_id, body)
