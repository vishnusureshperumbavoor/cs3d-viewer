import { API_ENDPOINTS } from "../config/api";

export interface TelegramCompletePayload {
  pipeline: string;
  taskName: string;
  patientName?: string;
  seriesDescription?: string;
  startTimeIst?: string;
  completedTimeIst?: string;
  duration?: string;
  segmentsCount?: number;
}

export const notifyTelegramSegmentationComplete = async (payload: TelegramCompletePayload): Promise<void> => {
  try {
    await fetch(API_ENDPOINTS.TELEGRAM.NOTIFY_COMPLETE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[TelegramService] Failed to send completion notification:", err);
  }
};
