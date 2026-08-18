import { BaseAdapter } from "./base.adapter.js";

/**
 * Adapter handling manual/generic job entries.
 * Manual entries are inputted directly in standard format and do not require transformation.
 */
export class ManualAdapter extends BaseAdapter {
  constructor() {
    super("manual", "Manual Ingestion", "available", false);
  }

  /**
   * Manual source does not support automated fetching.
   */
  async fetchJobs() {
    throw new Error("Manual source does not support automated fetching.");
  }

  /**
   * For manual ingestion, payloads are passed as-is.
   */
  transform(payload) {
    return payload;
  }
}
