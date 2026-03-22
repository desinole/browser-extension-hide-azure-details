/**
 * Creates a mock of the chrome.* APIs for testing.
 * Supports storage, tabs, runtime, and contextMenus.
 */
function createChromeMock(initialStore = {}) {
  const store = { ...initialStore };
  const listeners = [];
  let mockTabs = [];

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
    tabs: {
      query: jest.fn((_queryInfo, callback) => {
        if (callback) callback(mockTabs);
      }),
      sendMessage: jest.fn(),
    },
    runtime: {
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },
    contextMenus: {
      create: jest.fn(),
      onClicked: {
        addListener: jest.fn(),
      },
    },
    _store: store,
    _listeners: listeners,
    _setTabs: (tabs) => {
      mockTabs = tabs;
    },
  };
}

module.exports = { createChromeMock };
