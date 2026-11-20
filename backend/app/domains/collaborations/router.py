from fastapi import APIRouter, Depends, Query, Response
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
from .messages import MessageService
from .schemas import MessageCreate, MessageRead, MessagePage
from .feedback import FeedbackService
from .schemas import FeedbackCreate, FeedbackRead, FeedbackWorkspace
from .schemas import ProofConfirmationCreate, ProofConfirmationRead
from .schemas import PublishingProofCreate, PublishingProofRead, PublishingProofWorkspace
from .schemas import CompletionCreate, CompletionRead, DeliveryRead, DeliveryCreate, DeliveryWorkspace, DeliveryReviewCreate, DeliveryReviewRead
from .schemas import AgreementRead, AgreementStatus, ProposalAccept
from .schemas import ProposalWorkspace, ProposalDraftRead, ProposalDraftSave, ProposalRevisionRead, ProposalSend

from .files import CollaborationFiles
from .storage import MIME_EXTENSIONS
from app.core.config import settings
from .schemas import FileUploadCreate, FileUploadTicket, FileUploadLimits, CollaborationFileRead, FileDownload

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


async def private_response(response: Response):
    response.headers['Cache-Control'] = 'no-store'


@router.get('/{record_id}/files/limits', response_model=FileUploadLimits, dependencies=[Depends(private_response)])
async def file_limits(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await DeliveryService.collaboration(db, user.id, record_id)
    return dict(max_bytes=settings.COLLABORATION_FILE_MAX_BYTES, content_types=list(MIME_EXTENSIONS))


@router.get('/{record_id}/files', response_model=list[CollaborationFileRead], dependencies=[Depends(private_response)])
async def draft_files(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationFiles.draft_list(db, user.id, record_id)


@router.post('/{record_id}/files', response_model=FileUploadTicket, dependencies=[Depends(private_response)])
async def reserve_file(record_id: str, body: FileUploadCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationFiles.reserve(db, user.id, record_id, body)


@router.post('/{record_id}/files/{file_id}/finish', response_model=CollaborationFileRead, dependencies=[Depends(private_response)])
async def finish_file(record_id: str, file_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationFiles.finish(db, user.id, record_id, file_id)


@router.delete('/{record_id}/files/{file_id}', dependencies=[Depends(private_response)])
async def remove_file(record_id: str, file_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationFiles.remove(db, user.id, record_id, file_id)


@router.post('/{record_id}/files/{file_id}/download', response_model=FileDownload, dependencies=[Depends(private_response)])
async def download_file(record_id: str, file_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await CollaborationFiles.download(db, user.id, record_id, file_id)


@router.get('/{record_id}/feedback', response_model=FeedbackWorkspace, dependencies=[Depends(private_response)])
async def feedback_workspace(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await FeedbackService.workspace(db, user.id, record_id)


@router.post('/{record_id}/feedback', response_model=FeedbackRead, dependencies=[Depends(private_response)])
async def submit_feedback(record_id: str, body: FeedbackCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await FeedbackService.submit(db, user.id, record_id, body)


@router.get('/{record_id}/messages', response_model=MessagePage, dependencies=[Depends(private_response)])
async def list_messages(record_id: str, before: int | None = Query(None, ge=1, le=2147483647), limit: int = Query(20, ge=1, le=50),
                        user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MessageService.list(db, user.id, record_id, before, limit)


@router.post('/{record_id}/messages', response_model=MessageRead, dependencies=[Depends(private_response)])
async def send_message(record_id: str, body: MessageCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MessageService.send(db, user.id, record_id, body)
