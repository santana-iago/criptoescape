(function (global) {
  "use strict";

  var curves = {
    default: {
      id: "default",
      nameKey: "curve.default",
      p: 97,
      a: 2,
      b: 7,
      groupOrder: 105,
      factors: [{ prime: 3, exponent: 1 }, { prime: 5, exponent: 1 }, { prime: 7, exponent: 1 }],
      base: [8, 27],
      baseOrder: 105,
      privateKey: 53,
      publicKey: [49, 44],
      points: [
        { id: "P1", point: [61, 18], order: 3, residue: 2 },
        { id: "P2", point: [16, 35], order: 5, residue: 3 },
        { id: "P3", point: [27, 21], order: 7, residue: 4 }
      ],
      expected: { crt: 53, crtModulus: 105 }
    },
    smooth64: {
      id: "smooth64",
      nameKey: "curve.smooth",
      p: 71,
      a: 1,
      b: 3,
      groupOrder: 64,
      factors: [{ prime: 2, exponent: 6 }],
      base: [0, 28],
      baseOrder: 32,
      privateKey: 19,
      publicKey: [1, 17],
      points: [
        { id: "S1", point: [42, 3], order: 4 },
        { id: "S2", point: [10, 27], order: 8 },
        { id: "S3", point: [6, 15], order: 16 }
      ],
      warningKey: "curve.warningSmooth"
    },
    prime79: {
      id: "prime79",
      nameKey: "curve.prime",
      p: 67,
      a: 0,
      b: 7,
      groupOrder: 79,
      factors: [{ prime: 79, exponent: 1 }],
      base: [2, 22],
      baseOrder: 79,
      privateKey: 31,
      publicKey: [48, 7],
      points: [
        { id: "T1", point: [2, 22], order: 79 },
        { id: "T2", point: [4, 2], order: 79 },
        { id: "T3", point: [5, 20], order: 79 }
      ],
      warningKey: "curve.warningPrime"
    },
    mixed34: {
      id: "mixed34",
      nameKey: "curve.mixed",
      p: 43,
      a: 1,
      b: 1,
      groupOrder: 34,
      factors: [{ prime: 2, exponent: 1 }, { prime: 17, exponent: 1 }],
      base: [0, 1],
      baseOrder: 34,
      privateKey: 13,
      publicKey: [21, 9],
      points: [
        { id: "M1", point: [38, 0], order: 2 },
        { id: "M2", point: [11, 15], order: 17 },
        { id: "M3", point: [0, 1], order: 34 }
      ]
    }
  };

  var scenarios = [
    {
      id: "small-subgroup",
      number: 1,
      nameKey: "scenario.small.name",
      summaryKey: "scenario.small.summary",
      causeKey: "scenario.small.cause",
      countermeasureKey: "scenario.small.countermeasure",
      recommendedCurve: "default",
      kind: "escape"
    },
    {
      id: "invalid-point",
      number: 2,
      nameKey: "scenario.invalid.name",
      summaryKey: "scenario.invalid.summary",
      causeKey: "scenario.invalid.cause",
      countermeasureKey: "scenario.invalid.countermeasure",
      recommendedCurve: "default",
      kind: "demonstration",
      samples: [
        { label: "valid", point: [8, 27], relatedB: 7 },
        { label: "related", point: [5, 5], relatedB: 84 },
        { label: "outside", point: [97, 44], relatedB: null }
      ]
    },
    {
      id: "incomplete-validation",
      number: 3,
      nameKey: "scenario.validation.name",
      summaryKey: "scenario.validation.summary",
      causeKey: "scenario.validation.cause",
      countermeasureKey: "scenario.validation.countermeasure",
      recommendedCurve: "default",
      kind: "demonstration",
      cases: [
        { id: "infinity", point: null },
        { id: "outside", point: [97, 44] },
        { id: "wrongSubgroup", point: [61, 18] },
        { id: "valid", point: [8, 27] }
      ]
    },
    {
      id: "weak-parameters",
      number: 4,
      nameKey: "scenario.weak.name",
      summaryKey: "scenario.weak.summary",
      causeKey: "scenario.weak.cause",
      countermeasureKey: "scenario.weak.countermeasure",
      recommendedCurve: "smooth64",
      comparisonCurves: ["smooth64", "mixed34", "prime79"],
      kind: "comparison"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  global.CriptoData = Object.freeze({
    curves: curves,
    scenarios: scenarios,
    getCurve: function (id) { return curves[id] ? clone(curves[id]) : null; },
    getScenario: function (id) {
      var found = scenarios.filter(function (item) { return item.id === id; })[0];
      return found ? clone(found) : null;
    }
  });
})(window);
