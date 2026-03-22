/**
 * Creates a mock of the chrome.storage API for testing.
 * Supports get/set on chrome.storage.local and onChanged listeners.
 */
function createChromeMock(initialStore = {}) {
  const store = { ...initialStore };
  const listeners = [];

  return {
    storage: {
      local: {
        get: jest.fn((defaults, callback) => {
          const result = { ...defaults };
          for (const key of Object.keys(defaults)) {
            if (key in store) {
              result[key] = store[key];
            }
          }
          if (callback) callback(result);
        }),
        set: jest.fn((items, callback) => {
          const changes = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue: value };
            store[key] = value;
          }
          listeners.forEach((fn) => fn(changes, "local"));
          if (callback) callback();
        }),
      },
      onChanged: {
        addListener: jest.fn((fn) => {
          listeners.push(fn);
        }),
        removeListener: jest.fn((fn) => {
          const idx = listeners.indexOf(fn);
          if (idx >= 0) listeners.splice(idx, 1);
        }),
      },
    },
    _store: store,
    _listeners: listeners,
  };
}

module.exports = { createChromeMock };
