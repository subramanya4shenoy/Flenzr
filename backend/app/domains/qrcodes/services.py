import base64
import io
import qrcode
from qrcode.constants import ERROR_CORRECT_M

from app.domains.qrcodes.schemas import QRCodeRequest, QRCodeResponse


class QRCodeService:
    @staticmethod
    def generate_qr(req: QRCodeRequest) -> QRCodeResponse:
        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=req.box_size,
            border=req.border,
        )
        qr.add_data(req.url)
        qr.make(fit=True)

        img = qr.make_image(
            fill_color=req.fill_color,
            back_color=req.back_color,
        )

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        data_url = f"data:image/png;base64,{encoded}"

        return QRCodeResponse(
            data_url=data_url,
            target_url=req.url,
        )
