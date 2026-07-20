(function (global) {
  "use strict";

  function result(name, passed, detail) {
    return { name: name, passed: Boolean(passed), detail: detail || "" };
  }

  function samePoint(left, right) {
    return global.CryptoMath.equal(left, right);
  }

  async function run(storage) {
    var M = global.CryptoMath;
    var curve = global.CriptoData.getCurve("default");
    var results = [];
    function check(name, test, detail) {
      try { results.push(result(name, Boolean(test()), detail)); }
      catch (error) { results.push(result(name, false, error.message)); }
    }

    check("mod(-1, 97) = 96", function () { return M.mod(-1, 97) === 96; });
    check("inverse(5, 97) = 39", function () { return M.inverse(5, 97) === 39; });
    check("P + O = P", function () { return samePoint(M.add(curve.base, M.INF, curve), curve.base); });
    check("P + (-P) = O", function () { return M.add(curve.base, [8, 70], curve) === M.INF; });
    check("point doubling", function () { return samePoint(M.add(curve.base, curve.base, curve), M.multiply(2, curve.base, curve)); });
    check("scalar multiplication", function () { return samePoint(M.multiply(53, curve.base, curve), [49, 44]); });
    check("curve membership", function () { return M.onCurve([61, 18], curve) && !M.onCurve([5, 5], curve); });
    check("default group order = 105", function () { return M.groupOrder(curve) === 105; });
    check("default point orders = 3, 5, 7", function () {
      return curve.points.map(function (item) { return M.pointOrder(item.point, curve, 105); }).join(",") === "3,5,7";
    });
    check("base point order = 105", function () { return M.pointOrder(curve.base, curve, 105) === 105; });
    check("CRT solution = 53 mod 105", function () {
      var solution = M.crt([2, 3, 4], [3, 5, 7]);
      return solution.value === 53 && solution.modulus === 105;
    });
    check("53 · (8,27) = (49,44)", function () { return samePoint(M.multiply(53, [8, 27], curve), [49, 44]); });
    check("prime validation", function () { return M.validateCurve({ p: 97, a: 2, b: 7 }).valid && !M.validateCurve({ p: 91, a: 2, b: 7 }).valid; });
    check("singular curve validation", function () { return !M.validateCurve({ p: 59, a: 2, b: 1 }).valid; });
    check("public point validation", function () {
      return M.validatePublicPoint(curve.base, curve, 105).valid && !M.validatePublicPoint(curve.points[0].point, curve, 105).valid;
    });
    check("pre/post grading", function () {
      var preAnswers = { pre_mod: 33, pre_curve: 0, pre_order: 0, pre_lagrange: 0, pre_crt: 0, pre_validation: 0 };
      return global.CriptoEvaluations.score(global.CriptoEvaluations.pre, preAnswers).percent === 100;
    });
    check("curve switching data", function () { return global.CriptoData.getCurve("prime79").groupOrder === 79; });
    check("language switching", function () {
      var before = global.CriptoI18n.getLocale();
      global.CriptoI18n.setLocale("en");
      var passed = global.CriptoI18n.t("yes") === "yes";
      global.CriptoI18n.setLocale(before);
      return passed;
    });
    check("session migration", function () {
      var migrated = global.CriptoStorage.migrate({ id: "old-session", schemaVersion: 1 });
      return migrated.schemaVersion === 2 && migrated.openResponses && migrated.steps;
    });

    if (storage) {
      var temp = {
        id: "debug-" + Date.now(), schemaVersion: 2, mode: "student", status: "active",
        startedAt: new Date().toISOString(), openResponses: {}, attempts: {}, hints: [], steps: {}
      };
      try {
        await storage.put(temp);
        var restored = await storage.get(temp.id);
        results.push(result("persistence and resume", restored && restored.id === temp.id));
        var imported = Object.assign({}, temp, { id: temp.id + "-imported" });
        var count = await storage.importMany({ schemaVersion: 2, sessions: [imported] });
        results.push(result("JSON import", count === 1 && (await storage.get(imported.id)) !== null));
        await storage.remove(temp.id);
        await storage.remove(imported.id);
      } catch (error) {
        results.push(result("persistence and import", false, error.message));
      }
    }
    return results;
  }

  global.CriptoTests = Object.freeze({ run: run });
})(window);
