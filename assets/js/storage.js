(function (global) {
  "use strict";

  var DB_NAME = "criptoescape";
  var STORE = "sessions";
  var DB_VERSION = 2;
  var FALLBACK_KEY = "criptoescape.sessions.v2";

  function migrate(session) {
    var value = Object.assign({}, session);
    if (!value.schemaVersion || value.schemaVersion < 2) {
      value.schemaVersion = 2;
      value.openResponses = value.openResponses || {};
      value.attempts = value.attempts || {};
      value.hints = value.hints || [];
      value.steps = value.steps || {};
      value.pausedMs = value.pausedMs || 0;
      value.activeMs = value.activeMs || 0;
    }
    return value;
  }

  function validSession(value) {
    return value && typeof value === "object" && typeof value.id === "string" && value.id.length <= 120;
  }

  function fallbackRead() {
    try {
      var parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(validSession).map(migrate) : [];
    } catch (error) {
      return [];
    }
  }

  function fallbackWrite(sessions) {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(sessions));
  }

  function IndexedDbAdapter() {
    this.db = null;
    this.fallback = false;
  }

  IndexedDbAdapter.prototype.open = function () {
    var self = this;
    if (!global.indexedDB) {
      self.fallback = true;
      return Promise.resolve(self);
    }
    return new Promise(function (resolve) {
      var request;
      try { request = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (error) { self.fallback = true; resolve(self); return; }
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = function () { self.db = request.result; resolve(self); };
      request.onerror = function () { self.fallback = true; resolve(self); };
      request.onblocked = function () { self.fallback = true; resolve(self); };
    });
  };

  IndexedDbAdapter.prototype.all = function () {
    var self = this;
    if (self.fallback || !self.db) return Promise.resolve(fallbackRead());
    return new Promise(function (resolve, reject) {
      var request = self.db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = function () { resolve(request.result.map(migrate)); };
      request.onerror = function () { reject(request.error); };
    });
  };

  IndexedDbAdapter.prototype.get = function (id) {
    var self = this;
    if (self.fallback || !self.db) return Promise.resolve(fallbackRead().filter(function (item) { return item.id === id; })[0] || null);
    return new Promise(function (resolve, reject) {
      var request = self.db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onsuccess = function () { resolve(request.result ? migrate(request.result) : null); };
      request.onerror = function () { reject(request.error); };
    });
  };

  IndexedDbAdapter.prototype.put = function (session) {
    var self = this;
    var value = migrate(session);
    if (!validSession(value)) return Promise.reject(new Error("invalidSession"));
    if (self.fallback || !self.db) {
      var sessions = fallbackRead().filter(function (item) { return item.id !== value.id; });
      sessions.push(value);
      fallbackWrite(sessions);
      return Promise.resolve(value);
    }
    return new Promise(function (resolve, reject) {
      var request = self.db.transaction(STORE, "readwrite").objectStore(STORE).put(value);
      request.onsuccess = function () { resolve(value); };
      request.onerror = function () { reject(request.error); };
    });
  };

  IndexedDbAdapter.prototype.remove = function (id) {
    var self = this;
    if (self.fallback || !self.db) {
      fallbackWrite(fallbackRead().filter(function (item) { return item.id !== id; }));
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var request = self.db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      request.onsuccess = function () { resolve(); };
      request.onerror = function () { reject(request.error); };
    });
  };

  IndexedDbAdapter.prototype.clear = function () {
    var self = this;
    if (self.fallback || !self.db) {
      fallbackWrite([]);
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var request = self.db.transaction(STORE, "readwrite").objectStore(STORE).clear();
      request.onsuccess = function () { resolve(); };
      request.onerror = function () { reject(request.error); };
    });
  };

  IndexedDbAdapter.prototype.importMany = function (input) {
    var self = this;
    var list = Array.isArray(input) ? input : input && Array.isArray(input.sessions) ? input.sessions : [input];
    list = list.filter(validSession).map(migrate);
    return list.reduce(function (chain, session) {
      return chain.then(function () { return self.put(session); });
    }, Promise.resolve()).then(function () { return list.length; });
  };

  function preference(key, value) {
    var storageKey = "criptoescape.pref." + key;
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(storageKey));
      localStorage.setItem(storageKey, JSON.stringify(value));
      return value;
    } catch (error) {
      return value === undefined ? null : value;
    }
  }

  global.CriptoStorage = Object.freeze({
    schemaVersion: DB_VERSION,
    create: function () { return new IndexedDbAdapter().open(); },
    migrate: migrate,
    validSession: validSession,
    preference: preference
  });
})(window);
