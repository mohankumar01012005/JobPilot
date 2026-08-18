import { BaseAdapter } from "./base.adapter.js";

/**
 * Adapter placeholder for LinkedIn job source.
 * Automated fetching and transformations are not implemented yet.
 */
export class LinkedInAdapter extends BaseAdapter {
  constructor() {
    super("linkedin", "LinkedIn Jobs", "not_implemented", true);
  }

  async fetchJobs() {
    throw new Error("LinkedIn integration is not implemented yet.");
  }

  transform(payload) {
    throw new Error("LinkedIn payload transformation is not implemented yet.");
  }
}
