from fastapi import APIRouter
from pydantic import BaseModel
from services.telegram_notifier import send_telegram_message, get_ist_time_str

router = APIRouter(prefix="/telegram", tags=["Telegram Notifications"])

class TelegramCompleteRequest(BaseModel):
    pipeline: str = "MONAI"  # "MONAI" or "TotalSegmentator"
    taskName: str
    patientName: str = "Anonymous"
    seriesDescription: str = "CT Series"
    startTimeIst: str = ""
    completedTimeIst: str = ""
    duration: str = ""
    segmentsCount: int = 1

@router.post("/notify-complete")
def notify_segmentation_complete(payload: TelegramCompleteRequest):
    """Sends Telegram completion alert just before the segmentation is rendered in the UI."""
    completed_ist = payload.completedTimeIst or get_ist_time_str()
    icon = "🔬" if "monai" in payload.pipeline.lower() else "🧬"
    framework = "MONAI 1.6.0 + highdicom" if "monai" in payload.pipeline.lower() else "TotalSegmentator"

    msg = (
        f"✅ *{payload.pipeline} Inference Succeeded*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Model*: `{payload.taskName}`\n"
        f"• *Patient*: `{payload.patientName}`\n"
        f"• *Series*: `{payload.seriesDescription}`\n"
        f"• *Start Time (IST)*: `{payload.startTimeIst or 'Standard IST'}`\n"
        f"• *Completion Time (IST)*: `{completed_ist}`\n"
        f"• *Execution Time*: `{payload.duration}`\n"
        f"• *Structures*: `{payload.segmentsCount} segments generated`\n"
        f"• *Status*: `Reflecting in Viewer UI` {icon}"
    )
    sent = send_telegram_message(msg)
    return {"status": "success", "sent": sent}
