import { BaseAdapter } from "./base.adapter.js";

/**
 * Adapter placeholder for Telegram referral source.
 * Automated fetching and transformations are not implemented yet.
 */
export class TelegramAdapter extends BaseAdapter {
  constructor() {
    super("telegram", "Telegram Referral Channel", "not_implemented", true);
  }

  async fetchJobs() {
    throw new Error("Telegram automated fetching is not implemented yet.");
  }

  transform(payload) {
    throw new Error("Telegram payload transformation is not implemented yet.");
  }
}
