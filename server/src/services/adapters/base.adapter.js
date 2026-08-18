/**
 * Base abstract class/interface for job source adapters.
 * Each adapter should extend this class and implement the required fields and methods.
 */
export class BaseAdapter {
  constructor(name, displayName, status, supportsAutomatedFetching) {
    this.name = name;
    this.displayName = displayName;
    this.status = status; // "available" | "not_implemented"
    this.supportsAutomatedFetching = supportsAutomatedFetching;
  }

  /**
   * Fetches new jobs from the external source automatically.
   * Should be overridden by extending classes that support automated fetching.
   * 
   * @returns {Promise<Array>} List of raw job payloads
   */
  async fetchJobs() {
    throw new Error(`Automated fetching is not implemented or supported for source: ${this.name}`);
  }

  /**
   * Transforms raw source-specific payload into the generic format expected by the ingestion service.
   * 
   * @param {Object} payload Source-specific raw job payload
   * @returns {Object} Normalized/generic job payload
   */
  transform(payload) {
    throw new Error(`Payload transformation is not implemented for source: ${this.name}`);
  }
}
