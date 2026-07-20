global.window = global;
global.navigator = { language: "pt-BR" };
global.document = { documentElement: { lang: "pt-BR" } };
global.localStorage = {
  data: {},
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
  setItem: function (key, value) { this.data[key] = String(value); }
};

require("../assets/js/math.js");
require("../assets/data/scenarios.js");
require("../assets/data/evaluations.js");
require("../assets/js/i18n.js");
require("../assets/js/storage.js");
require("../assets/js/tests.js");

var memory = {};
var adapter = {
  put: async function (value) { memory[value.id] = JSON.parse(JSON.stringify(value)); return value; },
  get: async function (id) { return memory[id] || null; },
  remove: async function (id) { delete memory[id]; },
  importMany: async function (payload) {
    var sessions = Array.isArray(payload) ? payload : payload.sessions;
    for (var item of sessions) await this.put(item);
    return sessions.length;
  }
};

CriptoTests.run(adapter).then(function (results) {
  results.forEach(function (item) {
    console.log((item.passed ? "PASS" : "FAIL") + "  " + item.name + (item.detail ? " — " + item.detail : ""));
  });
  var failed = results.filter(function (item) { return !item.passed; });
  console.log("\n" + (results.length - failed.length) + "/" + results.length + " tests passed");
  process.exitCode = failed.length ? 1 : 0;
}).catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
