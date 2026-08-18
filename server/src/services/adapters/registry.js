import { ManualAdapter } from "./manual.adapter.js";
import { TelegramAdapter } from "./telegram.adapter.js";
import { LinkedInAdapter } from "./linkedin.adapter.js";
import { IndeedAdapter } from "./indeed.adapter.js";
import { NaukriAdapter } from "./naukri.adapter.js";

import { BaseAdapter } from "./base.adapter.js";

/**
 * Registry class that stores and manages job source adapters.
 */
class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * Registers a source adapter instance.
   * 
   * @param {BaseAdapter} adapter The adapter instance to register
   */
  register(adapter) {
    if (!adapter || !adapter.name) {
      throw new Error("Cannot register invalid adapter. An adapter must expose a 'name'.");
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Unregisters a source adapter by name.
   * 
   * @param {string} name Unique source adapter name
   */
  unregister(name) {
    this.adapters.delete(name);
  }

  /**
   * Retrieves a registered adapter by its source name.
   * 
   * @param {string} name Unique source adapter name
   * @returns {BaseAdapter|undefined} The registered adapter or undefined
   */
  getAdapter(name) {
    return this.adapters.get(name);
  }

  /**
   * Formats all registered adapters into a status list suitable for client APIs.
   * Excludes internal test-source adapter from the public listing.
   * 
   * @returns {Array<Object>} List of registered sources and metadata
   */
  listSources() {
    return Array.from(this.adapters.values())
      .filter((adapter) => adapter.name !== "test-source")
      .map((adapter) => ({
        name: adapter.name,
        displayName: adapter.displayName,
        status: adapter.status,
        supportsAutomatedFetching: adapter.supportsAutomatedFetching,
      }));
  }
}

/**
 * Built-in test source adapter for end-to-end transformation pipeline verification.
 */
class TestSourceAdapter extends BaseAdapter {
  constructor() {
    super("test-source", "Test Source", "available", false);
  }

  transform(payload) {
    return {
      ...payload,
      description: `${payload.description || ""} [transformed]`,
    };
  }
}

// Create a singleton instance of the registry
const registry = new AdapterRegistry();

// Pre-load default adapters
registry.register(new ManualAdapter());
registry.register(new TelegramAdapter());
registry.register(new LinkedInAdapter());
registry.register(new IndeedAdapter());
registry.register(new NaukriAdapter());
registry.register(new TestSourceAdapter());

export { AdapterRegistry };
export default registry;
