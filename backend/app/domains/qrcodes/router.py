from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.domains.identity.models import User
from app.domains.qrcodes.schemas import QRCodeRequest, QRCodeResponse
from app.domains.qrcodes.services import QRCodeService

router = APIRouter(prefix="/qrcodes", tags=["QR Codes"])


@router.post("/generate", response_model=QRCodeResponse)
async def generate_qr_code(
    body: QRCodeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generates a high-resolution, styled QR code for a creator's public profile or tracked link.
    """
    return QRCodeService.generate_qr(body)
