import { BaseAdapter } from "./base.adapter.js";

/**
 * Adapter placeholder for Naukri job source.
 * Automated fetching and transformations are not implemented yet.
 */
export class NaukriAdapter extends BaseAdapter {
  constructor() {
    super("naukri", "Naukri Jobs", "not_implemented", true);
  }

  async fetchJobs() {
    throw new Error("Naukri integration is not implemented yet.");
  }

  transform(payload) {
    throw new Error("Naukri payload transformation is not implemented yet.");
  }
}
