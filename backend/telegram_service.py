import httpx
import logging
from urllib.parse import urlencode

logger = logging.getLogger("telegram_service")

BOT_TOKEN = "8611884504:AAE6Aca8wJPRiyJK1Pf-soWNf8Ry2fnAxNI"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

# Default fallback if not provided
DEFAULT_WEB_APP_URL = "https://metallica-graduate-kid-bind.trycloudflare.com"

async def delete_telegram_message(telegram_id: int, message_id: int):
    """Safely delete a message via Telegram Bot API."""
    if not message_id:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{BASE_URL}/deleteMessage",
                json={"chat_id": telegram_id, "message_id": message_id}
            )
    except Exception as e:
        logger.warning(f"Could not delete message {message_id} for user {telegram_id}: {e}")

async def send_approval_message(
    telegram_id: int,
    name: str,
    surname: str,
    phone: str,
    web_app_url: str = DEFAULT_WEB_APP_URL,
    pending_message_id: int = None
) -> bool:
    """Send approval notification with Mini App button to driver."""
    # Delete pending notice if it exists
    if pending_message_id:
        await delete_telegram_message(telegram_id, pending_message_id)

    # Build WebApp URL with user query params
    params = urlencode({"phone": phone, "name": name, "surname": surname})
    full_url = f"{web_app_url}{'?' if '?' not in web_app_url else '&'}{params}"

    text = (
        "🎉 Tabriklaymiz!\n\n"
        "Siz haydovchilikka qabul qilindingiz. Haydovchi tizimi faol!\n\n"
        "Ishni boshlash uchun ilovaga kiring va joylashuvingizni yoqing.\n"
        "Istalgan vaqtda pastki chat menyusidagi «Ilovani ochish» tugmasi orqali ilovani to'g'ridan-to'g'ri ochishingiz mumkin."
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Set Chat Menu Button permanently for driver (no icon)
            await client.post(
                f"{BASE_URL}/setChatMenuButton",
                json={
                    "chat_id": telegram_id,
                    "menu_button": {
                        "type": "web_app",
                        "text": "Ilovani ochish",
                        "web_app": {"url": full_url}
                    }
                }
            )

            # 2. Send single combined approval message without inline button (button is in chat menu)
            res = await client.post(
                f"{BASE_URL}/sendMessage",
                json={
                    "chat_id": telegram_id,
                    "text": text,
                    "reply_markup": {
                        "remove_keyboard": True
                    }
                }
            )
            data = res.json()
            if not data.get("ok"):
                logger.error(f"Telegram API error: {data}")
                return False
            return True
    except Exception as e:
        logger.error(f"Error sending Telegram approval message: {e}")
        return False

async def send_rejection_message(
    telegram_id: int,
    pending_message_id: int = None
) -> bool:
    """Send rejection message to driver and ensure menu button is commands."""
    if pending_message_id:
        await delete_telegram_message(telegram_id, pending_message_id)

    text = (
        "Hurmatli nomzod!\n\n"
        "Afsuski, sizning arizangiz ma'muriyat tomonidan ko'rib chiqilib, rad etildi."
    )

    payload = {
        "chat_id": telegram_id,
        "text": text
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Ensure menu button is commands (NO Ilovani ochish)
            await client.post(
                f"{BASE_URL}/setChatMenuButton",
                json={
                    "chat_id": telegram_id,
                    "menu_button": {"type": "commands"}
                }
            )
            res = await client.post(f"{BASE_URL}/sendMessage", json=payload)
            data = res.json()
            return data.get("ok", False)
    except Exception as e:
        logger.error(f"Error sending Telegram rejection message: {e}")
        return False

async def reset_driver_bot_state(
    telegram_id: int,
    pending_message_id: int = None
) -> bool:
    """Reset driver bot state: removes chat menu button, clears messages, and shows initial registration prompt."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Reset Chat Menu Button to commands (removes 'Ilovani ochish' button)
            await client.post(
                f"{BASE_URL}/setChatMenuButton",
                json={
                    "chat_id": telegram_id,
                    "menu_button": {"type": "commands"}
                }
            )

            # 2. Safely delete messages in chat history (around last known message ID)
            if pending_message_id:
                start_id = max(1, pending_message_id - 10)
                end_id = pending_message_id + 30
                for mid in range(start_id, end_id):
                    try:
                        await client.post(
                            f"{BASE_URL}/deleteMessage",
                            json={"chat_id": telegram_id, "message_id": mid}
                        )
                    except Exception:
                        pass

            # 3. Send fresh initial welcome message with 'Haydovchi bo'lish' button
            payload = {
                "chat_id": telegram_id,
                "text": "Haydovchi tizimiga xush kelibsiz.",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "Haydovchi bo'lish", "callback_data": "start_registration"}]
                    ]
                }
            }
            res = await client.post(f"{BASE_URL}/sendMessage", json=payload)
            data = res.json()
            return data.get("ok", False)
    except Exception as e:
        logger.error(f"Error resetting driver bot state for {telegram_id}: {e}")
        return False

