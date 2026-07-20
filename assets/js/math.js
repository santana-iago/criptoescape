(function (global) {
  "use strict";

  var INF = null;

  function mod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var next = a % b;
      a = b;
      b = next;
    }
    return a;
  }

  function inverse(value, modulus) {
    var oldR = modulus;
    var r = mod(value, modulus);
    var oldS = 0;
    var s = 1;
    while (r !== 0) {
      var quotient = Math.floor(oldR / r);
      var nextR = oldR - quotient * r;
      var nextS = oldS - quotient * s;
      oldR = r;
      r = nextR;
      oldS = s;
      s = nextS;
    }
    return oldR === 1 ? mod(oldS, modulus) : null;
  }

  function isPrime(value) {
    if (!Number.isSafeInteger(value) || value < 2) return false;
    if (value % 2 === 0) return value === 2;
    for (var divisor = 3; divisor * divisor <= value; divisor += 2) {
      if (value % divisor === 0) return false;
    }
    return true;
  }

  function normalizeCurve(curve) {
    return { p: curve.p, a: mod(curve.a, curve.p), b: mod(curve.b, curve.p) };
  }

  function discriminant(curve) {
    var c = normalizeCurve(curve);
    return mod(4 * c.a * c.a * c.a + 27 * c.b * c.b, c.p);
  }

  function validateCurve(curve, maxPrime) {
    var issues = [];
    maxPrime = maxPrime || 997;
    if (!curve || !Number.isSafeInteger(curve.p) || !Number.isSafeInteger(curve.a) || !Number.isSafeInteger(curve.b)) {
      issues.push("integerParameters");
      return { valid: false, issues: issues };
    }
    if (!isPrime(curve.p)) issues.push("primeModulus");
    if (curve.p > maxPrime) issues.push("curveTooLarge");
    if (curve.p > 3 && discriminant(curve) === 0) issues.push("singularCurve");
    return { valid: issues.length === 0, issues: issues, normalized: normalizeCurve(curve) };
  }

  function inField(point, curve) {
    return point !== INF && Array.isArray(point) && point.length === 2 &&
      Number.isSafeInteger(point[0]) && Number.isSafeInteger(point[1]) &&
      point[0] >= 0 && point[0] < curve.p && point[1] >= 0 && point[1] < curve.p;
  }

  function lhs(y, curve) {
    return mod(y * y, curve.p);
  }

  function rhs(x, curve) {
    return mod(mod(x * x, curve.p) * x + curve.a * x + curve.b, curve.p);
  }

  function onCurve(point, curve) {
    if (point === INF) return true;
    return inField(point, curve) && lhs(point[1], curve) === rhs(point[0], curve);
  }

  function equal(left, right) {
    if (left === INF || right === INF) return left === right;
    return left[0] === right[0] && left[1] === right[1];
  }

  function add(left, right, curve) {
    if (left === INF) return right;
    if (right === INF) return left;
    var p = curve.p;
    var x1 = left[0];
    var y1 = left[1];
    var x2 = right[0];
    var y2 = right[1];
    if (x1 === x2 && mod(y1 + y2, p) === 0) return INF;
    var numerator = x1 === x2 && y1 === y2 ? 3 * x1 * x1 + curve.a : y2 - y1;
    var denominator = x1 === x2 && y1 === y2 ? 2 * y1 : x2 - x1;
    var denominatorInverse = inverse(denominator, p);
    if (denominatorInverse === null) throw new Error("nonInvertibleDenominator");
    var slope = mod(mod(numerator, p) * denominatorInverse, p);
    var x3 = mod(slope * slope - x1 - x2, p);
    var y3 = mod(slope * (x1 - x3) - y1, p);
    return [x3, y3];
  }

  function multiply(scalar, point, curve) {
    if (!Number.isSafeInteger(scalar)) throw new Error("invalidScalar");
    if (scalar < 0) return multiply(-scalar, [point[0], mod(-point[1], curve.p)], curve);
    var result = INF;
    var addend = point;
    var remaining = scalar;
    while (remaining > 0) {
      if (remaining % 2 === 1) result = add(result, addend, curve);
      addend = add(addend, addend, curve);
      remaining = Math.floor(remaining / 2);
    }
    return result;
  }

  function enumeratePoints(curve, operationLimit) {
    var limit = operationLimit || 1000000;
    if (curve.p * curve.p > limit) throw new Error("operationLimit");
    var points = [];
    for (var x = 0; x < curve.p; x += 1) {
      var expected = rhs(x, curve);
      for (var y = 0; y < curve.p; y += 1) {
        if (lhs(y, curve) === expected) points.push([x, y]);
      }
    }
    return points;
  }

  function groupOrder(curve, operationLimit) {
    return enumeratePoints(curve, operationLimit).length + 1;
  }

  function pointOrder(point, curve, knownGroupOrder) {
    if (point === INF) return 1;
    if (!onCurve(point, curve)) throw new Error("pointNotOnCurve");
    var ceiling = knownGroupOrder || groupOrder(curve);
    var accumulator = INF;
    for (var n = 1; n <= ceiling; n += 1) {
      accumulator = add(accumulator, point, curve);
      if (accumulator === INF) return n;
    }
    throw new Error("orderNotFound");
  }

  function factorize(value) {
    var remaining = value;
    var factors = [];
    for (var divisor = 2; divisor * divisor <= remaining; divisor += 1) {
      var exponent = 0;
      while (remaining % divisor === 0) {
        exponent += 1;
        remaining /= divisor;
      }
      if (exponent) factors.push({ prime: divisor, exponent: exponent });
    }
    if (remaining > 1) factors.push({ prime: remaining, exponent: 1 });
    return factors;
  }

  function factorText(value) {
    return factorize(value).map(function (factor) {
      return factor.exponent === 1 ? String(factor.prime) : factor.prime + "^" + factor.exponent;
    }).join(" · ");
  }

  function crt(residues, moduli) {
    if (!residues.length || residues.length !== moduli.length) throw new Error("invalidCongruences");
    var total = moduli.reduce(function (product, item) { return product * item; }, 1);
    var sum = 0;
    var steps = [];
    moduli.forEach(function (modulus, index) {
      var partial = total / modulus;
      var partialInverse = inverse(partial, modulus);
      if (partialInverse === null) throw new Error("nonCoprimeModuli");
      var term = residues[index] * partial * partialInverse;
      sum += term;
      steps.push({ modulus: modulus, partial: partial, inverse: partialInverse, term: term });
    });
    return { value: mod(sum, total), modulus: total, steps: steps };
  }

  function validatePublicPoint(point, curve, expectedOrder) {
    var checks = {
      notInfinity: point !== INF,
      inField: inField(point, curve),
      onCurve: point !== INF && onCurve(point, curve),
      expectedOrder: false
    };
    if (checks.onCurve && expectedOrder) {
      checks.expectedOrder = multiply(expectedOrder, point, curve) === INF;
      if (checks.expectedOrder) {
        factorize(expectedOrder).forEach(function (factor) {
          if (multiply(expectedOrder / factor.prime, point, curve) === INF) checks.expectedOrder = false;
        });
      }
    }
    return { valid: checks.notInfinity && checks.inField && checks.onCurve && checks.expectedOrder, checks: checks };
  }

  function formatPoint(point) {
    return point === INF ? "O" : "(" + point[0] + ", " + point[1] + ")";
  }

  global.CryptoMath = Object.freeze({
    INF: INF,
    mod: mod,
    gcd: gcd,
    inverse: inverse,
    isPrime: isPrime,
    discriminant: discriminant,
    validateCurve: validateCurve,
    inField: inField,
    lhs: lhs,
    rhs: rhs,
    onCurve: onCurve,
    equal: equal,
    add: add,
    multiply: multiply,
    enumeratePoints: enumeratePoints,
    groupOrder: groupOrder,
    pointOrder: pointOrder,
    factorize: factorize,
    factorText: factorText,
    crt: crt,
    validatePublicPoint: validatePublicPoint,
    formatPoint: formatPoint
  });
})(window);
