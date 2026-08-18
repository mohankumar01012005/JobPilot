import { BaseAdapter } from "./base.adapter.js";

/**
 * Adapter placeholder for Indeed job source.
 * Automated fetching and transformations are not implemented yet.
 */
export class IndeedAdapter extends BaseAdapter {
  constructor() {
    super("indeed", "Indeed Jobs", "not_implemented", true);
  }

  async fetchJobs() {
    throw new Error("Indeed integration is not implemented yet.");
  }

  transform(payload) {
    throw new Error("Indeed payload transformation is not implemented yet.");
  }
}
