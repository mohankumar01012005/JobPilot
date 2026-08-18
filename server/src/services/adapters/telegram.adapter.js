import { BaseAdapter } from "./base.adapter.js";
import { parseTelegramMessage } from "../telegramParser.js";

/**
 * Adapter implementation for Telegram referral source.
 */
export class TelegramAdapter extends BaseAdapter {
  constructor() {
    super("telegram", "Telegram Referral Channel", "available", true);
  }

  /**
   * Automated fetching can be executed via polling or webhook.
   * Actual integration with Telegram API is handled in the controller ingest trigger.
   */
  async fetchJobs() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Telegram credentials (token or chat ID) are not configured.");
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    if (!response.ok) {
      throw new Error(`Telegram API responded with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram Bot API Error: ${data.description}`);
    }

    const updates = data.result || [];
    
    // Filter updates for the target chat/channel
    const messages = updates
      .map((update) => {
        const msg = update.message || update.channel_post;
        if (!msg) return null;

        const msgChatId = String(msg.chat.id);
        const msgChatUsername = msg.chat.username ? msg.chat.username.toLowerCase() : "";
        const cleanTargetChat = String(chatId).trim().replace(/^@/, "").toLowerCase();

        const isTargetChat = msgChatId === String(chatId).trim() || msgChatUsername === cleanTargetChat;
        if (!isTargetChat) return null;

        return {
          messageId: String(msg.message_id),
          chatId: msg.chat.username || String(msg.chat.id),
          text: msg.text || msg.caption || "",
          date: msg.date,
          updateId: update.update_id,
        };
      })
      .filter(Boolean);

    return messages;
  }

  /**
   * Confirms updates on the Telegram server so they are marked as read.
   * 
   * @param {number} highestUpdateId The highest update_id processed in this batch
   */
  async confirmUpdates(highestUpdateId) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !highestUpdateId) return;

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${highestUpdateId + 1}&limit=1`);
      if (!response.ok) {
        console.error(`[Telegram Adapter] Failed to confirm updates: API responded with status ${response.status}`);
      }
    } catch (err) {
      console.error("[Telegram Adapter] Failed to confirm updates:", err.message);
    }
  }

  /**
   * Transforms raw Telegram message data into standard ingestion format.
   * 
   * @param {Object} payload Raw Telegram message payload e.g. { text, messageId, chatId, date }
   * @returns {Object} Structured normalized job payload
   */
  transform(payload) {
    if (!payload || !payload.text) {
      throw new Error("Invalid payload: Message text is required.");
    }

    const { text, messageId, chatId, date } = payload;
    
    const parsed = parseTelegramMessage(text, messageId, chatId, date);
    if (!parsed) {
      throw new Error("Message was ignored because it does not represent a valid job or referral post.");
    }

    return parsed;
  }
}
