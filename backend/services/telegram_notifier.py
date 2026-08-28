import os
import requests
from dotenv import load_dotenv

# Load .env from project root or backend folder
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"))

def send_telegram_message(message: str, parse_mode: str = "Markdown") -> bool:
    """Send a notification message via Telegram Bot API if configured."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        return False
    if "your_" in token.lower() or "your_" in str(chat_id).lower():
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    try:
        resp = requests.post(url, json=payload, timeout=8)
        if resp.status_code == 200:
            print(f"[Telegram] Notification sent successfully.")
            return True
        else:
            print(f"[Telegram] Failed to send message ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"[Telegram] Error sending message: {e}")
        return False
