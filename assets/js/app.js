(function () {
  'use strict';

  var M = window.CryptoMath;
  var Data = window.CriptoData;
  var Eval = window.CriptoEvaluations;
  var I18n = window.CriptoI18n;
  var Store = window.CriptoStorage;
  var main = document.getElementById('main-content');
  var live = document.getElementById('live-region');
  var storage;
  var state = {
    mode: 'free',
    curve: Data.getCurve('default'),
    scenario: Data.getScenario('small-subgroup'),
    step: 0,
    done: [false, false, false, false, false],
    verified: {},
    ordersConfirmed: false,
    oracle: null,
    keyConfirmed: false,
    safeRun: false,
    session: null,
    lastTick: Date.now(),
    hiddenAt: null,
    order: { base: null, acc: null, count: 0 },
    dashboard: [],
    filter: { query: '', status: 'all', sort: 'startedAt', direction: -1 }
  };

  function t(key, values) { return I18n.t(key, values); }
  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function esc(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character];
    });
  }
  function point(value) { return M.formatPoint(value); }
  function equation(curve) { return 'y² ≡ x³ + ' + curve.a + 'x + ' + curve.b + ' (mod ' + curve.p + ')'; }
  function factorText(curve) { return curve.groupOrder + ' = ' + M.factorText(curve.groupOrder); }
  function announce(message) {
    live.textContent = '';
    window.setTimeout(function () { live.textContent = message; }, 20);
  }
  function message(id, kind, value) {
    var node = document.getElementById(id);
    if (!node) return;
    node.className = 'message show ' + kind;
    node.textContent = value;
    announce(value);
  }
  function duration(ms) {
    var seconds = Math.max(0, Math.round((ms || 0) / 1000));
    return seconds < 60 ? seconds + ' ' + t('time.second') :
      Math.floor(seconds / 60) + ' ' + t('time.minute') + ' ' + (seconds % 60) + ' ' + t('time.second');
  }
  function randomId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() :
      'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function shortId(value) { return value ? value.slice(-8).toUpperCase() : ''; }
  function kv(label, value) {
    return '<div class="kv"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }
  function setView(markup) {
    main.innerHTML = '<section class="view">' + markup + '</section>';
    bindOpenAnswers();
    qa('[data-step]', main).forEach(function (button) {
      button.addEventListener('click', function () { goStep(Number(button.dataset.step)); });
    });
  }
  function header(index, title, lead) {
    return '<span class="badge">' + esc(t('step.of', { current: index + 1, total: 6 })) + '</span>' +
      '<div class="tag decorative">' + esc(t(state.scenario.nameKey)) + ' · F' + state.curve.p + '</div>' +
      '<h1>' + esc(title) + '</h1><p class="lead">' + esc(lead) + '</p>';
  }
  function nav(previous, next, disabled, label) {
    return '<div class="nav-row">' +
      (previous === null ? '<span></span>' : '<button class="button" type="button" data-step="' + previous + '">' + esc(t('action.back')) + '</button>') +
      (next === null ? '' : '<button class="button primary" type="button" data-step="' + next + '"' + (disabled ? ' disabled' : '') + '>' + esc(label || t('action.next')) + '</button>') +
      '</div>';
  }
  function openAnswer(id) {
    var prompt = Eval.openPrompts.filter(function (item) { return item.id === id; })[0];
    if (!prompt) return '';
    var value = state.session && state.session.openResponses[id] || '';
    return '<article class="open-response card"><h3>' + esc(t('open.optional')) + '</h3>' +
      '<label class="field-label" for="open-' + id + '">' + esc(I18n.localized(prompt.prompt)) + '</label>' +
      '<textarea id="open-' + id + '" data-open="' + id + '" maxlength="1000">' + esc(value) + '</textarea>' +
      '<div class="counter"><span>' + esc(t('open.saved')) + '</span><span id="count-' + id + '">' +
      esc(t('open.count', { count: value.length, max: 1000 })) + '</span></div></article>';
  }
  function bindOpenAnswers() {
    qa('[data-open]', main).forEach(function (textarea) {
      textarea.addEventListener('input', function () {
        if (state.session) state.session.openResponses[textarea.dataset.open] = textarea.value;
        var counter = document.getElementById('count-' + textarea.dataset.open);
        if (counter) counter.textContent = t('open.count', { count: textarea.value.length, max: textarea.maxLength });
        save();
      });
    });
  }
  function applyTranslations(root) {
    qa('[data-i18n]', root || document).forEach(function (node) { node.textContent = t(node.dataset.i18n); });
    document.documentElement.lang = I18n.getLocale();
    document.getElementById('language-select').value = I18n.getLocale();
  }
  function newSession(classCode) {
    var now = new Date().toISOString();
    return {
      schemaVersion: Store.schemaVersion, id: randomId(), anonymous: true,
      classCode: String(classCode || '').trim().slice(0, 40), mode: 'student',
      language: I18n.getLocale(), curveId: state.curve.id, curve: { p: state.curve.p, a: state.curve.a, b: state.curve.b },
      scenarioId: state.scenario.id, status: 'active', startedAt: now, updatedAt: now, completedAt: null,
      activeMs: 0, pausedMs: 0, currentStep: 'pretest', progress: 0,
      steps: {}, attempts: {}, hints: [], responses: {}, openResponses: {}, preTest: null, postTest: null
    };
  }
  function tick() {
    var now = Date.now();
    var delta = Math.max(0, Math.min(now - state.lastTick, 5000));
    state.lastTick = now;
    if (!state.session || document.hidden || state.session.status !== 'active') return;
    state.session.activeMs += delta;
    var key = state.session.currentStep;
    if (key) {
      state.session.steps[key] = state.session.steps[key] ||
        { visits: 1, activeMs: 0, startedAt: new Date().toISOString(), completedAt: null };
      state.session.steps[key].activeMs += delta;
    }
  }
  function save() {
    if (!storage || !state.session) return Promise.resolve();
    tick();
    state.session.updatedAt = new Date().toISOString();
    state.session.language = I18n.getLocale();
    state.session.curveId = state.curve.id;
    state.session.scenarioId = state.scenario.id;
    state.session.progress = state.done.filter(Boolean).length / state.done.length;
    state.session.activity = {
      step: state.step,
      done: state.done.slice(),
      verified: Object.assign({}, state.verified),
      ordersConfirmed: state.ordersConfirmed,
      oracle: state.oracle,
      keyConfirmed: state.keyConfirmed,
      safeRun: state.safeRun
    };
    return storage.put(state.session).then(function () {
      document.getElementById('mobile-session').textContent = t('session.anonymous') + ' ' + shortId(state.session.id);
    }).catch(function () {});
  }
  function touchStep(key) {
    if (!state.session) return;
    var step = state.session.steps[key] || { visits: 0, activeMs: 0, startedAt: null, completedAt: null };
    step.visits += 1;
    if (!step.startedAt) step.startedAt = new Date().toISOString();
    state.session.steps[key] = step;
    state.session.currentStep = key;
    state.lastTick = Date.now();
    save();
  }
  function attempt(key) {
    if (!state.session) return;
    state.session.attempts[key] = (state.session.attempts[key] || 0) + 1;
    save();
  }
  function complete(index) {
    state.done[index] = true;
    if (state.session) {
      var key = 'step' + index;
      state.session.steps[key] = state.session.steps[key] ||
        { visits: 1, activeMs: 0, startedAt: new Date().toISOString(), completedAt: null };
      state.session.steps[key].completedAt = state.session.steps[key].completedAt || new Date().toISOString();
    }
    updateNavigation();
    save();
  }
  function reset(keepSession) {
    state.step = 0;
    state.done = [false, false, false, false, false];
    state.verified = {};
    state.ordersConfirmed = false;
    state.oracle = null;
    state.keyConfirmed = false;
    state.safeRun = false;
    state.order = { base: null, acc: null, count: 0 };
    if (state.session && !keepSession) {
      state.session.status = 'abandoned';
      storage.put(state.session);
      state.session = null;
    }
  }
  function labels() {
    return [t('step.context'), t('step.validate'), t('step.orders'), t('step.crt'), t('step.defense'), t('step.report')];
  }
  function updateNavigation() {
    var node = document.getElementById('step-nav');
    node.textContent = '';
    if (state.mode === 'instructor') {
      var dashboard = document.createElement('button');
      dashboard.className = 'nav-button active';
      dashboard.textContent = t('nav.dashboard');
      node.appendChild(dashboard);
    } else if (state.scenario.kind !== 'escape') {
      var lab = document.createElement('button');
      lab.className = 'nav-button active' + (state.done[0] ? ' done' : '');
      lab.textContent = state.scenario.number + '. ' + t(state.scenario.nameKey);
      node.appendChild(lab);
    } else {
      labels().forEach(function (label, index) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'nav-button' + (index === state.step ? ' active' : '') + (index > 0 && state.done[index - 1] ? ' done' : '');
        button.textContent = (index + 1) + '. ' + label;
        button.addEventListener('click', function () { goStep(index); });
        node.appendChild(button);
      });
    }
    var total = state.scenario.kind === 'escape' ? 5 : 1;
    var done = state.scenario.kind === 'escape' ? state.done.filter(Boolean).length : (state.done[0] ? 1 : 0);
    var percent = Math.round(done / total * 100);
    document.getElementById('progress-fill').style.width = percent + '%';
    q('.progress-track').setAttribute('aria-valuenow', String(percent));
    document.getElementById('progress-text').textContent = t('nav.stepsDone', { done: done, total: total });
  }
  function populateSelectors() {
    var curveSelect = document.getElementById('curve-select');
    curveSelect.textContent = '';
    ['default', 'smooth64', 'prime79', 'mixed34'].forEach(function (id) {
      var curve = Data.getCurve(id);
      var option = document.createElement('option');
      option.value = id;
      option.textContent = t(curve.nameKey);
      curveSelect.appendChild(option);
    });
    var custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = t('curve.custom');
    curveSelect.appendChild(custom);
    curveSelect.value = state.curve.id === 'custom' || state.curve.id === 'custom-pending' ? 'custom' : state.curve.id;
    var scenarioSelect = document.getElementById('scenario-select');
    scenarioSelect.textContent = '';
    Data.scenarios.forEach(function (scenario) {
      var option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.number + '. ' + t(scenario.nameKey);
      scenarioSelect.appendChild(option);
    });
    scenarioSelect.value = state.scenario.id;
  }
  function goStep(index) {
    state.step = Math.max(0, Math.min(5, index));
    document.body.classList.remove('menu-open');
    document.getElementById('menu-button').setAttribute('aria-expanded', 'false');
    touchStep('step' + state.step);
    render();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function renderContext() {
    var curve = state.curve;
    setView(header(0, t('step.context'), t('context.lead')) +
      '<div class="grid"><div class="stack"><article class="card"><h3>' + esc(t('context.parameters')) + '</h3>' +
      kv(t('context.curve'), equation(curve)) + kv(t('context.field'), 'F' + curve.p) +
      kv(t('context.groupOrder'), curve.groupOrder) + kv(t('context.factorization'), factorText(curve)) +
      kv(t('context.base'), point(curve.base)) + kv(t('context.baseOrder'), curve.baseOrder) +
      kv(t('context.public'), point(curve.publicKey)) + kv(t('context.private'), t('context.unknown')) +
      '</article><div class="notice">' + esc(t('context.educational')) +
      (curve.warningKey ? ' ' + esc(t(curve.warningKey)) : '') + '</div></div>' +
      '<div class="stack"><article class="card"><h3>' + esc(t('context.log')) + '</h3><div class="console" role="log">' +
      '<span class="dim">[10:02:11] handshake / F' + curve.p + '</span>\n' +
      curve.points.map(function (item) { return '<span class="warn">[10:02] P = ' + point(item.point) + ' → d·P</span>'; }).join('\n') +
      '\n<span class="bad">WARNING: public-key validation missing</span></div></article>' +
      '<article class="card"><h3>' + esc(t('context.mission')) + '</h3><ul class="check-list">' +
      labels().slice(1).map(function (label, index) { return '<li class="' + (state.done[index] ? 'done' : '') + '">' + esc(label) + '</li>'; }).join('') +
      '</ul></article></div></div>' + openAnswer('hypothesis') + nav(null, 1, false, t('action.start')));
  }
  function allVerified() {
    return state.curve.points.every(function (item) { return state.verified[item.point.join(',')] === true; });
  }
  function renderValidation() {
    var curve = state.curve;
    var first = curve.points[0].point;
    setView(header(1, t('step.validate'), t('validate.lead')) +
      '<div class="grid"><article class="card"><h3>' + esc(t('validate.calculator')) + '</h3>' +
      '<div class="field-row"><div class="field"><label for="vx">x</label><input id="vx" type="number" value="' + first[0] + '"></div>' +
      '<div class="field"><label for="vy">y</label><input id="vy" type="number" value="' + first[1] + '"></div>' +
      '<div class="field"><label for="vlhs">y² mod ' + curve.p + ' (' + esc(t('validate.yours')) + ')</label><input id="vlhs" type="number"></div>' +
      '<div class="field"><label for="vrhs">x³ + ' + curve.a + 'x + ' + curve.b + ' mod ' + curve.p + '</label><input id="vrhs" type="number"></div></div>' +
      '<div class="button-row"><button class="button primary" id="validate-point" type="button">' + esc(t('action.validate')) + '</button>' +
      curve.points.map(function (item) { return '<button class="button small" type="button" data-point="' + item.point.join(',') + '">' + item.id + ' ' + point(item.point) + '</button>'; }).join('') +
      '<button class="button small" type="button" data-point="5,5">(5, 5)</button></div>' +
      '<div id="validation-message" class="message" aria-live="polite"></div></article>' +
      '<article class="card"><h3>' + esc(t('validate.checked')) + '</h3><div class="table-wrap"><table><thead><tr><th scope="col">P</th><th scope="col">y²</th><th scope="col">x³+ax+b</th><th scope="col">' + esc(t('validate.member')) + '</th></tr></thead><tbody id="validation-table"></tbody></table></div></article></div>' +
      nav(0, 2, !allVerified()));
    renderValidationRows();
    qa('[data-point]', main).forEach(function (button) {
      button.addEventListener('click', function () {
        var pair = button.dataset.point.split(',');
        document.getElementById('vx').value = pair[0];
        document.getElementById('vy').value = pair[1];
        document.getElementById('vlhs').value = '';
        document.getElementById('vrhs').value = '';
      });
    });
    document.getElementById('validate-point').addEventListener('click', validatePoint);
  }
  function renderValidationRows() {
    var body = document.getElementById('validation-table');
    body.textContent = '';
    var keys = Object.keys(state.verified);
    if (!keys.length) {
      var row = body.insertRow();
      var cell = row.insertCell();
      cell.colSpan = 4;
      cell.textContent = t('validate.none');
      return;
    }
    keys.forEach(function (key) {
      var value = key.split(',').map(Number);
      var row = body.insertRow();
      [point(value), M.lhs(value[1], state.curve), M.rhs(value[0], state.curve), state.verified[key] ? t('yes') : t('no')].forEach(function (text) {
        row.insertCell().textContent = text;
      });
    });
  }
  function validatePoint() {
    attempt('membership');
    var values = ['vx', 'vy', 'vlhs', 'vrhs'].map(function (id) { return Number(document.getElementById(id).value); });
    if (!values.every(Number.isInteger)) {
      message('validation-message', 'error', t('validate.missing'));
      return;
    }
    var x = values[0], y = values[1], left = M.lhs(y, state.curve), right = M.rhs(x, state.curve);
    if (M.mod(values[2], state.curve.p) !== left || M.mod(values[3], state.curve.p) !== right) {
      message('validation-message', 'error', t('validate.wrong', { p: state.curve.p }));
      return;
    }
    var belongs = M.onCurve([x, y], state.curve);
    state.verified[x + ',' + y] = belongs;
    message('validation-message', belongs ? 'ok' : 'info', belongs ?
      t('validate.correctMember', { value: left }) : t('validate.correctNotMember', { left: left, right: right }));
    renderValidationRows();
    if (allVerified()) {
      complete(0);
      var next = q('[data-step="2"]', main);
      if (next) next.disabled = false;
    }
  }

  function renderOrders() {
    var curve = state.curve;
    setView(header(2, t('step.orders'), t('orders.lead')) +
      '<div class="grid"><article class="card"><h3>' + esc(t('orders.adder')) + '</h3>' +
      '<div class="field-row"><div class="field wide"><label for="point-select">P</label><select id="point-select">' +
      curve.points.concat([{ id: 'G', point: curve.base }]).map(function (item) {
        return '<option value="' + item.point.join(',') + '">' + item.id + ' = ' + point(item.point) + '</option>';
      }).join('') + '</select></div></div>' +
      '<div class="button-row"><button class="button" id="add-point" type="button">' + esc(t('orders.add')) +
      '</button><button class="button" id="reset-point" type="button">' + esc(t('orders.reset')) + '</button></div>' +
      '<div class="console" id="order-log" role="log" aria-live="polite"></div><div class="field-row">' +
      curve.points.map(function (item, index) {
        return '<div class="field"><label for="order-' + index + '">' + esc(t('orders.answer', { id: item.id })) +
          '</label><input id="order-' + index + '" type="number"></div>';
      }).join('') + '</div><div class="button-row"><button class="button primary" id="check-orders" type="button">' +
      esc(t('action.checkOrders')) + '</button></div><div id="order-message" class="message" aria-live="polite"></div></article>' +
      '<article class="card"><h3>' + esc(t('oracle.title')) + '</h3><p>' +
      esc(curve.id === 'default' ? t('scenario.small.summary') : t('orders.unsuitable')) +
      '</p><button class="button primary" id="oracle-button" type="button"' + (!state.ordersConfirmed ? ' disabled' : '') + '>' +
      esc(t('action.oracle')) + '</button><div class="console" id="oracle-log" role="log">' +
      esc(t('oracle.wait')) + '</div></article></div>' + openAnswer('orderImportance') + nav(1, 3, !state.oracle));
    resetOrder();
    document.getElementById('point-select').addEventListener('change', resetOrder);
    document.getElementById('reset-point').addEventListener('click', resetOrder);
    document.getElementById('add-point').addEventListener('click', addOrder);
    document.getElementById('check-orders').addEventListener('click', checkOrders);
    document.getElementById('oracle-button').addEventListener('click', runOracle);
    if (state.oracle) showOracle();
  }
  function resetOrder() {
    var select = document.getElementById('point-select');
    if (!select) return;
    state.order.base = select.value.split(',').map(Number);
    state.order.acc = M.INF;
    state.order.count = 0;
    document.getElementById('order-log').textContent = 'P = ' + point(state.order.base) + '\n0·P = O';
  }
  function addOrder() {
    state.order.acc = M.add(state.order.acc, state.order.base, state.curve);
    state.order.count += 1;
    var ending = state.order.acc === M.INF;
    document.getElementById('order-log').textContent += '\n' + state.order.count + '·P = ' + point(state.order.acc) +
      (ending ? '  ← ord(P) = ' + state.order.count : '');
    if (ending) {
      state.order.acc = M.INF;
      state.order.count = 0;
    }
  }
  function checkOrders() {
    attempt('orders');
    var wrong = [];
    state.curve.points.forEach(function (item, index) {
      var actual = M.pointOrder(item.point, state.curve, state.curve.groupOrder);
      if (Number(document.getElementById('order-' + index).value) !== actual) wrong.push(item.id);
    });
    if (wrong.length) {
      message('order-message', 'error', t('orders.wrong', { points: wrong.join(', ') }));
      return;
    }
    state.ordersConfirmed = true;
    complete(1);
    message('order-message', 'ok', t('orders.correct'));
    document.getElementById('oracle-button').disabled = false;
  }
  function runOracle() {
    var residues = [], moduli = [];
    state.curve.points.forEach(function (item) {
      var order = M.pointOrder(item.point, state.curve, state.curve.groupOrder);
      var response = M.multiply(state.curve.privateKey, item.point, state.curve);
      var residue = 0;
      for (var candidate = 0; candidate < order; candidate += 1) {
        if (M.equal(M.multiply(candidate, item.point, state.curve), response)) {
          residue = candidate;
          break;
        }
      }
      residues.push(residue);
      moduli.push(order);
    });
    var pairwise = true;
    for (var i = 0; i < moduli.length; i += 1) {
      for (var j = i + 1; j < moduli.length; j += 1) {
        if (M.gcd(moduli[i], moduli[j]) !== 1) pairwise = false;
      }
    }
    state.oracle = { residues: residues, moduli: moduli, pairwise: pairwise };
    if (state.session) state.session.responses.oracle = state.oracle;
    showOracle();
    var next = q('[data-step="3"]', main);
    if (next) next.disabled = false;
    save();
  }
  function showOracle() {
    var log = document.getElementById('oracle-log');
    if (!log || !state.oracle) return;
    var lines = state.curve.points.map(function (item, index) {
      return '→ ' + item.id + ' = ' + point(item.point) + ' | ord = ' + state.oracle.moduli[index] +
        '\n← d·P = ' + point(M.multiply(state.curve.privateKey, item.point, state.curve)) +
        ' | d ≡ ' + state.oracle.residues[index] + ' (mod ' + state.oracle.moduli[index] + ')';
    });
    if (!state.oracle.pairwise) lines.push('\n' + t('orders.unsuitable'));
    log.textContent = lines.join('\n');
  }
  function renderCrt() {
    var usable = state.oracle && state.oracle.pairwise;
    var solution = usable ? M.crt(state.oracle.residues, state.oracle.moduli) : null;
    setView(header(3, t('step.crt'), t('crt.lead')) +
      '<div class="grid"><div class="stack"><article class="card"><h3>' + esc(t('crt.evidence')) +
      '</h3><div class="evidence-grid">' + (state.oracle ? state.oracle.residues.map(function (residue, index) {
        return '<div class="evidence"><small>ord = ' + state.oracle.moduli[index] + '</small><b>' +
          state.curve.points[index].id + ' ' + point(state.curve.points[index].point) +
          '</b><b class="result">d ≡ ' + residue + ' (mod ' + state.oracle.moduli[index] + ')</b></div>';
      }).join('') : '') + '</div></article><article class="card"><h3>' + esc(t('crt.rebuild')) + '</h3>' +
      (usable ? '<div class="field-row"><div class="field"><label for="key-guess">d mod ' + solution.modulus +
        '</label><input id="key-guess" type="number"></div></div><div class="button-row"><button class="button primary" id="check-key" type="button">' +
        esc(t('action.checkKey')) + '</button><button class="button" id="show-hint" type="button">' +
        esc(t('action.hint')) + '</button></div><div id="key-message" class="message" aria-live="polite"></div>' +
        '<div id="crt-hint" class="console" hidden></div>' :
        '<div class="notice">' + esc(t('orders.unsuitable')) + '</div>') + '</article></div>' +
      '<article class="card"><h3>' + esc(t('context.private')) + '</h3><div class="big-number">' +
      (state.keyConfirmed ? state.curve.privateKey : '— — —') + '</div><div class="root-cause"><strong>' +
      esc(t('report.root')) + '</strong><span>' + esc(t(state.scenario.causeKey)) + '</span></div></article></div>' +
      openAnswer('congruences') + nav(2, 4, usable ? !state.keyConfirmed : false));
    if (usable) {
      document.getElementById('check-key').addEventListener('click', function () { checkKey(solution); });
      document.getElementById('show-hint').addEventListener('click', function () { showHint(solution); });
    }
  }
  function checkKey(solution) {
    attempt('crt');
    var guess = Number(document.getElementById('key-guess').value);
    if (!Number.isInteger(guess) || M.mod(guess, solution.modulus) !== solution.value) {
      message('key-message', 'error', t('crt.wrong'));
      return;
    }
    state.keyConfirmed = true;
    q('.big-number', main).textContent = solution.value;
    message('key-message', 'ok', t('crt.correct', {
      point: point(M.multiply(solution.value, state.curve.base, state.curve))
    }));
    complete(2);
    q('[data-step="4"]', main).disabled = false;
  }
  function showHint(solution) {
    if (state.session) state.session.hints.push({ id: 'crt', at: new Date().toISOString(), step: 3 });
    var box = document.getElementById('crt-hint');
    box.hidden = false;
    box.textContent = 'M = ' + solution.modulus + '\n' + solution.steps.map(function (step, index) {
      return 'M' + (index + 1) + ' = ' + step.partial + '; inverse = ' + step.inverse + '; term = ' + step.term;
    }).join('\n') + '\n\nd = ' + solution.value + ' (mod ' + solution.modulus + ')';
    announce(t('crt.hintUsed'));
    save();
  }
  function renderDefense() {
    setView(header(4, t('step.defense'), t('defense.lead')) +
      '<div class="grid"><article class="card"><h3>' + esc(t('defense.comparison')) +
      '</h3><div class="button-row"><button class="button" id="run-vulnerable" type="button">' +
      esc(t('action.vulnerable')) + '</button><button class="button primary" id="run-safe" type="button">' +
      esc(t('action.safe')) + '</button></div><div id="defense-log" class="console" role="log"></div></article>' +
      '<article class="card"><div class="table-wrap"><table><thead><tr><th scope="col">' + esc(t('defense.check')) +
      '</th><th scope="col">' + esc(t('defense.vulnerable')) + '</th><th scope="col">' + esc(t('defense.safe')) +
      '</th></tr></thead><tbody>' + ['field', 'membership', 'infinity', 'subgroup'].map(function (key) {
        return '<tr><td>' + esc(t('defense.' + key)) + '</td><td>✗ ' + esc(t('no')) +
          '</td><td>✓ ' + esc(t('yes')) + '</td></tr>';
      }).join('') + '<tr><td>' + esc(t('defense.leaks')) + '</td><td>' + state.curve.points.length +
      '</td><td>0</td></tr></tbody></table></div></article></div>' + openAnswer('countermeasure') +
      nav(3, 5, !state.safeRun));
    document.getElementById('run-vulnerable').addEventListener('click', function () { runDefense(false); });
    document.getElementById('run-safe').addEventListener('click', function () { runDefense(true); });
  }
  function runDefense(safe) {
    var lines = ['== ' + t(safe ? 'defense.safe' : 'defense.vulnerable') + ' =='];
    state.curve.points.forEach(function (item) {
      var check = M.validatePublicPoint(item.point, state.curve, state.curve.baseOrder);
      lines.push(item.id + ' ' + point(item.point));
      lines.push(safe ?
        '  field=' + check.checks.inField + ', curve=' + check.checks.onCurve + ', infinity=' +
          check.checks.notInfinity + ', subgroup=' + check.checks.expectedOrder + '\n  ' + (check.valid ? 'ACCEPT' : 'REJECT → 0 leaked residues') :
        '  d·P = ' + point(M.multiply(state.curve.privateKey, item.point, state.curve)) + ' → residue exposed');
    });
    document.getElementById('defense-log').textContent = lines.join('\n');
    if (safe) {
      state.safeRun = true;
      complete(3);
      q('[data-step="5"]', main).disabled = false;
    }
  }
  function renderReport() {
    var solution = state.oracle && state.oracle.pairwise ? M.crt(state.oracle.residues, state.oracle.moduli) : null;
    var missing = Eval.openPrompts.filter(function (prompt) {
      return !state.session || !state.session.openResponses[prompt.id];
    }).length;
    setView(header(5, t('step.report'), t('report.lead')) +
      '<div class="grid"><article class="card"><h3>CriptoEscape / ' + esc(t(state.scenario.nameKey)) +
      '</h3><div class="console">' + esc(equation(state.curve)) + '\n#E = ' + factorText(state.curve) +
      '\nG = ' + point(state.curve.base) + '\nQ = ' + point(state.curve.publicKey) +
      (solution ? '\n\nd ≡ ' + solution.value + ' (mod ' + solution.modulus + ')\n' + solution.value +
        '·G = ' + point(M.multiply(solution.value, state.curve.base, state.curve)) : '') +
      '\n\n' + esc(t('report.root')) + ': ' + esc(t(state.scenario.causeKey)) +
      '\n' + esc(t('report.countermeasure')) + ': ' + esc(t(state.scenario.countermeasureKey)) +
      '</div></article><div class="stack"><article class="card"><h3>' + esc(t('report.math')) +
      '</h3><ul class="check-list"><li class="done">Congruências / modular arithmetic</li>' +
      '<li class="done">Ordem de elementos / element order</li><li class="done">Teorema de Lagrange</li>' +
      '<li class="done">Teorema Chinês do Resto</li><li class="done">Validação de chaves públicas</li>' +
      '</ul></article><div class="notice">' + esc(t('report.openMissing', { count: missing })) +
      '</div></div></div>' + openAnswer('reflection') +
      '<div class="nav-row"><button class="button" type="button" data-step="4">' + esc(t('action.back')) + '</button>' +
      '<button class="button primary" id="finish-activity" type="button">' + esc(t('action.finish')) + '</button></div>');
    complete(4);
    document.getElementById('finish-activity').addEventListener('click', function () {
      if (state.mode === 'student') renderAssessment('post');
      else announce(t('session.completed'));
    });
  }
  function scenarioMarkup() {
    var scenario = state.scenario;
    var lab;
    if (scenario.id === 'invalid-point') {
      lab = '<article class="card"><p class="mono">E: ' + equation(state.curve) +
        '</p><p class="mono">E′: y² ≡ x³ + 2x + 84 (mod 97)</p><button class="button primary" id="run-scenario">' +
        esc(t('action.analyze')) + '</button><div class="table-wrap"><table><thead><tr><th>P</th><th>0≤x,y&lt;p</th>' +
        '<th>E</th><th>E′</th><th>decision</th></tr></thead><tbody id="scenario-results"></tbody></table></div></article>';
    } else if (scenario.id === 'incomplete-validation') {
      lab = '<article class="card"><button class="button primary" id="run-scenario">' + esc(t('action.analyze')) +
        '</button><div class="table-wrap"><table><thead><tr><th>case</th><th>P</th><th>field</th><th>curve</th>' +
        '<th>subgroup</th><th>decision</th></tr></thead><tbody id="scenario-results"></tbody></table></div></article>';
    } else {
      lab = '<div class="grid three-columns">' + scenario.comparisonCurves.map(function (id) {
        var curve = Data.getCurve(id);
        var largest = M.factorize(curve.groupOrder).reduce(function (max, factor) {
          return Math.max(max, factor.prime);
        }, 0);
        return '<article class="card"><h3>' + esc(t(curve.nameKey)) + '</h3>' + kv('E', equation(curve)) +
          kv('#E', factorText(curve)) + kv('largest prime', largest) + kv('≈ √largest', Math.ceil(Math.sqrt(largest))) +
          '</article>';
      }).join('') + '</div><div class="button-row"><button class="button primary" id="run-scenario">' +
        esc(t('action.analyze')) + '</button></div><div id="scenario-results" class="message"></div>';
    }
    return '<div class="tag">' + esc(t('scenario')) + ' ' + scenario.number + '</div><h1>' +
      esc(t(scenario.nameKey)) + '</h1><p class="lead">' + esc(t(scenario.summaryKey)) + '</p>' + lab +
      '<div class="grid"><div class="root-cause"><strong>' + esc(t('report.root')) + '</strong><span>' +
      esc(t(scenario.causeKey)) + '</span></div><article class="card"><h3>' + esc(t('report.countermeasure')) +
      '</h3><p>' + esc(t(scenario.countermeasureKey)) + '</p></article></div>' +
      openAnswer(scenario.id === 'invalid-point' ? 'hypothesis' : 'countermeasure') +
      (state.mode === 'student' && state.done[0] ?
        '<div class="button-row"><button class="button primary" id="scenario-posttest">' + esc(t('action.finish')) +
        '</button></div>' : '');
  }
  function renderScenario() {
    setView(scenarioMarkup());
    document.getElementById('run-scenario').addEventListener('click', runScenario);
    var post = document.getElementById('scenario-posttest');
    if (post) post.addEventListener('click', function () { renderAssessment('post'); });
  }
  function addCells(body, values) {
    var row = body.insertRow();
    values.forEach(function (value) { row.insertCell().textContent = value; });
  }
  function runScenario() {
    attempt('scenario-' + state.scenario.id);
    if (state.scenario.id === 'invalid-point') {
      var related = { p: 97, a: 2, b: 84 };
      var body = document.getElementById('scenario-results');
      body.textContent = '';
      state.scenario.samples.forEach(function (sample) {
        var inField = M.inField(sample.point, state.curve);
        var original = M.onCurve(sample.point, state.curve);
        var other = inField && M.onCurve(sample.point, related);
        addCells(body, [point(sample.point), inField ? t('yes') : t('no'), original ? t('yes') : t('no'),
          other ? t('yes') : t('no'), original ? 'ACCEPT' : 'REJECT']);
      });
    } else if (state.scenario.id === 'incomplete-validation') {
      var target = document.getElementById('scenario-results');
      target.textContent = '';
      state.scenario.cases.forEach(function (item) {
        var check = M.validatePublicPoint(item.point, state.curve, state.curve.baseOrder);
        addCells(target, [item.id, point(item.point), check.checks.inField ? t('yes') : t('no'),
          check.checks.onCurve ? t('yes') : t('no'), check.checks.expectedOrder ? t('yes') : t('no'),
          check.valid ? 'ACCEPT' : 'REJECT']);
      });
    } else {
      message('scenario-results', 'ok', t('scenario.weak.summary'));
    }
    complete(0);
    if (state.mode === 'student' && !document.getElementById('scenario-posttest')) {
      var button = document.createElement('button');
      button.id = 'scenario-posttest';
      button.className = 'button primary';
      button.textContent = t('action.finish');
      button.addEventListener('click', function () { renderAssessment('post'); });
      main.appendChild(button);
    }
  }
  function renderCustom() {
    setView('<div class="tag">' + esc(t('curve.custom')) + '</div><h1>' + esc(t('custom.title')) +
      '</h1><form id="custom-form" class="card" novalidate><div class="field-row">' +
      ['p', 'a', 'b'].map(function (name) {
        return '<div class="field"><label for="custom-' + name + '">' + name +
          '</label><input id="custom-' + name + '" name="' + name + '" type="number" required></div>';
      }).join('') + '<div class="field"><label for="custom-gx">' + esc(t('custom.baseX')) +
      '</label><input id="custom-gx" name="gx" type="number" required></div><div class="field"><label for="custom-gy">' +
      esc(t('custom.baseY')) + '</label><input id="custom-gy" name="gy" type="number" required></div>' +
      '<div class="field"><label for="custom-private">' + esc(t('custom.private')) +
      '</label><input id="custom-private" name="privateKey" type="number"></div></div>' +
      '<div class="field wide"><label for="custom-points">' + esc(t('custom.points')) +
      '</label><textarea id="custom-points" name="points" maxlength="240" aria-describedby="custom-help"></textarea>' +
      '<small id="custom-help">' + esc(t('custom.pointsHelp')) + '</small></div><div class="button-row">' +
      '<button class="button primary" type="submit">' + esc(t('custom.calculate')) +
      '</button></div><div id="custom-message" class="message" aria-live="polite"></div></form>');
    document.getElementById('custom-form').addEventListener('submit', validateCustom);
  }
  function validateCustom(event) {
    event.preventDefault();
    var data = new FormData(event.currentTarget);
    var curve = { p: Number(data.get('p')), a: Number(data.get('a')), b: Number(data.get('b')) };
    var validation = M.validateCurve(curve, 997);
    if (!validation.valid) {
      message('custom-message', 'error', validation.issues.map(function (issue) { return t('custom.' + issue); }).join(' '));
      return;
    }
    curve = validation.normalized;
    var base = [Number(data.get('gx')), Number(data.get('gy'))];
    if (!M.onCurve(base, curve)) {
      message('custom-message', 'error', t('custom.baseInvalid'));
      return;
    }
    var rawPoints = String(data.get('points') || '').split(/\n+/).map(function (line) {
      return line.trim();
    }).filter(Boolean).slice(0, 12);
    var points = [];
    for (var i = 0; i < rawPoints.length; i += 1) {
      var pair = rawPoints[i].split(',').map(Number);
      if (pair.length !== 2 || !M.onCurve(pair, curve)) {
        message('custom-message', 'error', t('custom.pointInvalid', { point: rawPoints[i] }));
        return;
      }
      points.push(pair);
    }
    var order;
    try { order = M.groupOrder(curve, 1000000); }
    catch (error) {
      message('custom-message', 'error', t('custom.curveTooLarge'));
      return;
    }
    var baseOrder = M.pointOrder(base, curve, order);
    var privateKey = Number(data.get('privateKey'));
    if (!Number.isInteger(privateKey) || privateKey <= 0) privateKey = 2;
    privateKey = M.mod(privateKey, baseOrder) || 1;
    if (!points.length) points = [base];
    state.curve = {
      id: 'custom', nameKey: 'curve.custom', p: curve.p, a: curve.a, b: curve.b,
      groupOrder: order, factors: M.factorize(order), base: base, baseOrder: baseOrder,
      privateKey: privateKey, publicKey: M.multiply(privateKey, base, curve),
      points: points.map(function (value, index) {
        return { id: 'C' + (index + 1), point: value, order: M.pointOrder(value, curve, order) };
      })
    };
    reset(true);
    Store.preference('curve', 'custom');
    message('custom-message', 'ok', t('custom.valid', {
      order: order, baseOrder: baseOrder, factors: M.factorText(order)
    }) + ' ' + t('custom.warning'));
    window.setTimeout(function () { goStep(0); }, 750);
  }

  function assessmentQuestion(question, index) {
    var prompt = esc((index + 1) + '. ' + I18n.localized(question.prompt));
    if (question.type === 'choice') {
      return '<fieldset class="question"><legend>' + prompt + '</legend><div class="question-options">' +
        question.options.map(function (option, optionIndex) {
          return '<label><input type="radio" name="' + question.id + '" value="' + optionIndex +
            '"><span>' + esc(I18n.localized(option)) + '</span></label>';
        }).join('') + '</div></fieldset>';
    }
    if (question.type === 'likert') {
      return '<fieldset class="question"><legend>' + prompt + '</legend><div class="scale-labels"><span>' +
        esc(t('evaluation.scale1')) + '</span><span>' + esc(t('evaluation.scale5')) +
        '</span></div><div class="likert">' + [1, 2, 3, 4, 5].map(function (number) {
          return '<label><input class="sr-only" type="radio" name="' + question.id + '" value="' +
            number + '"><span>' + number + '</span></label>';
        }).join('') + '</div></fieldset>';
    }
    if (question.type === 'open') {
      return '<div class="question"><label class="field-label" for="' + question.id + '">' + prompt +
        '</label><textarea id="' + question.id + '" name="' + question.id + '" maxlength="' +
        (question.maxLength || 1000) + '"></textarea></div>';
    }
    return '<div class="question field"><label for="' + question.id + '">' + prompt +
      '</label><input id="' + question.id + '" name="' + question.id + '" type="number"></div>';
  }
  function renderAssessment(kind) {
    var questions = kind === 'pre' ? Eval.pre : Eval.post;
    var title = kind === 'pre' ? t('step.pretest') : t('step.posttest');
    setView('<div class="tag">' + esc(t('mode.student')) + '</div><h1>' + esc(title) +
      '</h1><p class="lead">' + esc(t('evaluation.instructions')) +
      '</p><form id="assessment-form" class="assessment" novalidate>' +
      questions.map(assessmentQuestion).join('') +
      '<div id="assessment-message" class="message" aria-live="polite"></div><div class="button-row">' +
      '<button class="button primary" type="submit">' + esc(t('action.saveAssessment')) +
      '</button></div></form>');
    state.session.currentStep = kind + 'test';
    touchStep(kind + 'test');
    document.getElementById('assessment-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submitAssessment(kind, questions, event.currentTarget);
    });
    updateNavigation();
    main.focus();
  }
  function submitAssessment(kind, questions, form) {
    var data = new FormData(form);
    var answers = {};
    var missing = false;
    questions.forEach(function (question) {
      var value = data.get(question.id);
      if (question.type !== 'open' && (value === null || value === '')) missing = true;
      if (value !== null) answers[question.id] = value;
    });
    if (missing) {
      message('assessment-message', 'error', t('evaluation.required'));
      return;
    }
    var key = kind === 'pre' ? 'preTest' : 'postTest';
    state.session[key] = {
      answers: answers,
      score: Eval.score(questions, answers),
      completedAt: new Date().toISOString()
    };
    message('assessment-message', 'ok', t('evaluation.saved'));
    save().then(function () {
      if (kind === 'pre') goStep(0);
      else finishStudent();
    });
  }
  function finishStudent() {
    state.session.status = 'completed';
    state.session.completedAt = new Date().toISOString();
    save();
    var pre = state.session.preTest ? state.session.preTest.score.percent : 0;
    var post = state.session.postTest ? state.session.postTest.score.percent : 0;
    setView('<div class="tag">CriptoEscape</div><h1>' + esc(t('session.completed')) +
      '</h1><p class="lead">' + esc(t('privacy.notice')) + '</p><div class="metric-grid">' +
      metric(t('dashboard.pre'), pre + '%') + metric(t('dashboard.post'), post + '%') +
      metric(t('dashboard.gain'), (post - pre) + ' p.p.') + '</div>');
    announce(t('session.completed'));
  }
  function metric(label, value) {
    return '<div class="metric"><small>' + esc(label) + '</small><b>' + esc(value) + '</b></div>';
  }
  function filtered() {
    var query = state.filter.query.toLowerCase();
    return state.dashboard.filter(function (session) {
      var status = state.filter.status === 'all' || session.status === state.filter.status;
      var haystack = (session.id + ' ' + (session.classCode || '') + ' ' +
        (session.curveId || '') + ' ' + (session.scenarioId || '')).toLowerCase();
      return status && (!query || haystack.indexOf(query) !== -1);
    }).sort(function (left, right) {
      var a = left[state.filter.sort] || '';
      var b = right[state.filter.sort] || '';
      return (a < b ? -1 : a > b ? 1 : 0) * state.filter.direction;
    });
  }
  function average(values) {
    return values.length ? Math.round(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length) : 0;
  }
  function dashboardTable(sessions) {
    if (!sessions.length) return '<article class="card"><p>' + esc(t('dashboard.noSessions')) + '</p></article>';
    return '<article class="card"><div class="table-wrap"><table><caption>' + esc(t('dashboard.sessions')) +
      '</caption><thead><tr><th><button class="button small" data-sort="id">' + esc(t('dashboard.session')) +
      '</button></th><th>' + esc(t('dashboard.class')) + '</th><th>' + esc(t('curve')) + ' / ' +
      esc(t('scenario')) + '</th><th><button class="button small" data-sort="status">' +
      esc(t('dashboard.status')) + '</button></th><th><button class="button small" data-sort="activeMs">' +
      esc(t('dashboard.time')) + '</button></th><th>' + esc(t('dashboard.pre')) + '</th><th>' +
      esc(t('dashboard.post')) + '</th><th>' + esc(t('dashboard.gain')) + '</th><th>' +
      esc(t('dashboard.details')) + '</th></tr></thead><tbody>' + sessions.map(function (session) {
        var pre = session.preTest && session.preTest.score ? session.preTest.score.percent : null;
        var post = session.postTest && session.postTest.score ? session.postTest.score.percent : null;
        var gain = pre !== null && post !== null ? post - pre : null;
        return '<tr><td class="mono">' + esc(shortId(session.id)) + '</td><td>' + esc(session.classCode || '—') +
          '</td><td>' + esc((session.curveId || '—') + ' / ' + (session.scenarioId || '—')) + '</td><td>' +
          esc(t('status.' + session.status)) + '</td><td>' + esc(duration(session.activeMs)) + '</td><td>' +
          (pre === null ? '—' : pre + '%') + '</td><td>' + (post === null ? '—' : post + '%') + '</td><td>' +
          (gain === null ? '—' : gain) + '</td><td><button class="button small" data-detail="' +
          esc(session.id) + '">+</button></td></tr><tr id="detail-' + esc(session.id) +
          '" hidden><td colspan="9"><div class="session-detail"></div></td></tr>';
      }).join('') + '</tbody></table></div></article>';
  }
  function conceptChart(sessions) {
    var totals = {};
    sessions.forEach(function (session) {
      [session.preTest, session.postTest].forEach(function (assessment) {
        if (!assessment || !assessment.score) return;
        assessment.score.details.forEach(function (detail) {
          totals[detail.concept] = totals[detail.concept] || { correct: 0, total: 0 };
          totals[detail.concept].total += 1;
          if (detail.correct) totals[detail.concept].correct += 1;
        });
      });
    });
    var keys = Object.keys(totals);
    if (!keys.length) return '';
    var svg = '<svg viewBox="0 0 720 ' + (keys.length * 42 + 20) +
      '" role="img" aria-label="' + esc(t('dashboard.questionPerformance')) +
      '" style="width:100%;height:auto">';
    keys.forEach(function (key, index) {
      var percent = Math.round(totals[key].correct / totals[key].total * 100);
      var y = index * 42 + 12;
      svg += '<text x="0" y="' + (y + 14) + '" fill="#e8eef7" font-size="13">' + esc(key) +
        '</text><rect x="190" y="' + y + '" width="480" height="18" rx="9" fill="#08101c"></rect>' +
        '<rect x="190" y="' + y + '" width="' + (4.8 * percent) +
        '" height="18" rx="9" fill="#4da3ff"></rect><text x="680" y="' + (y + 14) +
        '" fill="#e8eef7" font-size="13">' + percent + '%</text>';
    });
    return '<article class="card"><h3>' + esc(t('dashboard.questionPerformance')) + '</h3>' + svg + '</svg></article>';
  }
  function stepChart(sessions) {
    var totals = {};
    sessions.forEach(function (session) {
      Object.keys(session.steps || {}).forEach(function (key) {
        totals[key] = totals[key] || [];
        totals[key].push(session.steps[key].activeMs || 0);
      });
    });
    var keys = Object.keys(totals);
    if (!keys.length) return '';
    return '<article class="card"><h3>' + esc(t('dashboard.stepTime')) + '</h3><div class="chart">' +
      keys.map(function (key) {
        var value = average(totals[key]);
        return '<div class="chart-row"><span>' + esc(key) + '</span><span class="chart-track"><span class="chart-bar" style="width:' +
          Math.min(100, value / 600) + '%"></span></span><span>' + esc(duration(value)) + '</span></div>';
      }).join('') + '</div></article>';
  }
  function perceptionChart(sessions) {
    var questions = ['post_learning', 'post_difficulty', 'post_clarity', 'post_escape'];
    var labels = {
      post_learning: 'Aprendizagem / learning',
      post_difficulty: 'Dificuldade / difficulty',
      post_clarity: 'Clareza / clarity',
      post_escape: 'Escape room'
    };
    var rows = questions.map(function (id) {
      var values = sessions.filter(function (session) {
        return session.postTest && session.postTest.answers && session.postTest.answers[id];
      }).map(function (session) { return Number(session.postTest.answers[id]); });
      return { id: id, value: values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 0 };
    }).filter(function (item) { return item.value > 0; });
    if (!rows.length) return '';
    return '<article class="card"><h3>Percepção / perception (1–5)</h3><div class="chart">' + rows.map(function (item) {
      return '<div class="chart-row"><span>' + esc(labels[item.id]) + '</span><span class="chart-track"><span class="chart-bar" style="width:' +
        (item.value / 5 * 100) + '%"></span></span><span>' + item.value.toFixed(1) + '</span></div>';
    }).join('') + '</div></article>';
  }
  async function renderDashboard() {
    state.dashboard = await storage.all();
    var sessions = filtered();
    var completed = sessions.filter(function (session) { return session.status === 'completed'; });
    var abandoned = sessions.filter(function (session) { return session.status === 'abandoned'; });
    var pre = sessions.filter(function (session) { return session.preTest; }).map(function (session) { return session.preTest.score.percent; });
    var post = sessions.filter(function (session) { return session.postTest; }).map(function (session) { return session.postTest.score.percent; });
    setView('<div class="tag">' + esc(t('mode.instructor')) + '</div><h1>' + esc(t('dashboard.title')) +
      '</h1><p class="notice">' + esc(t('dashboard.localNotice')) + '</p><div class="metric-grid">' +
      metric(t('dashboard.sessions'), sessions.length) + metric(t('dashboard.completed'), completed.length) +
      metric(t('dashboard.abandoned'), abandoned.length) +
      metric(t('dashboard.avgTime'), duration(average(sessions.map(function (session) { return session.activeMs || 0; })))) +
      metric(t('dashboard.avgPre'), average(pre) + '%') + metric(t('dashboard.avgPost'), average(post) + '%') +
      '</div><article class="card"><div class="field-row"><div class="field wide"><label for="dashboard-search">' +
      esc(t('dashboard.search')) + '</label><input id="dashboard-search" type="search" value="' +
      esc(state.filter.query) + '"></div><div class="field"><label for="dashboard-status">' +
      esc(t('dashboard.filterStatus')) + '</label><select id="dashboard-status"><option value="all">' +
      esc(t('dashboard.all')) + '</option><option value="active">' + esc(t('status.active')) +
      '</option><option value="completed">' + esc(t('status.completed')) +
      '</option><option value="abandoned">' + esc(t('status.abandoned')) +
      '</option></select></div></div><div class="button-row"><button class="button" id="export-json">' +
      esc(t('dashboard.exportJson')) + '</button><button class="button" id="export-csv">' +
      esc(t('dashboard.exportCsv')) + '</button><button class="button" id="export-open">' +
      esc(t('dashboard.exportOpen')) + '</button><label class="button" for="import-json">' +
      esc(t('dashboard.import')) + '</label><input class="sr-only" id="import-json" type="file" accept=".json,application/json" multiple>' +
      '<button class="button danger" id="clear-data">' + esc(t('dashboard.clear')) +
      '</button></div><div id="dashboard-message" class="message" aria-live="polite"></div></article>' +
      dashboardTable(sessions) + conceptChart(sessions) + stepChart(sessions) + perceptionChart(sessions) +
      '<article class="card"><h3>' + esc(t('dashboard.openAnswers')) + '</h3><p>' +
      sessions.reduce(function (count, session) {
        return count + Object.keys(session.openResponses || {}).filter(function (key) { return session.openResponses[key]; }).length;
      }, 0) + '</p></article>');
    document.getElementById('dashboard-status').value = state.filter.status;
    bindDashboard();
    updateNavigation();
  }
  function bindDashboard() {
    document.getElementById('dashboard-search').addEventListener('change', function (event) {
      state.filter.query = event.target.value;
      renderDashboard();
    });
    document.getElementById('dashboard-status').addEventListener('change', function (event) {
      state.filter.status = event.target.value;
      renderDashboard();
    });
    qa('[data-sort]', main).forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.filter.sort === button.dataset.sort) state.filter.direction *= -1;
        else state.filter.sort = button.dataset.sort;
        renderDashboard();
      });
    });
    qa('[data-detail]', main).forEach(function (button) {
      button.addEventListener('click', function () { showDetail(button.dataset.detail); });
    });
    document.getElementById('export-json').addEventListener('click', exportJson);
    document.getElementById('export-csv').addEventListener('click', exportCsv);
    document.getElementById('export-open').addEventListener('click', exportOpen);
    document.getElementById('import-json').addEventListener('change', importJson);
    document.getElementById('clear-data').addEventListener('click', clearData);
  }
  function showDetail(id) {
    var session = state.dashboard.filter(function (item) { return item.id === id; })[0];
    var row = document.getElementById('detail-' + id);
    if (!session || !row) return;
    row.hidden = !row.hidden;
    if (row.hidden) return;
    var detail = q('.session-detail', row);
    detail.textContent = '';
    var pre = document.createElement('pre');
    pre.className = 'mono';
    pre.textContent = 'ID: ' + session.id + '\nstarted: ' + session.startedAt + '\nupdated: ' +
      session.updatedAt + '\n' + t('dashboard.attempts') + ': ' + JSON.stringify(session.attempts || {}) +
      '\n' + t('dashboard.hints') + ': ' + (session.hints || []).length + '\npaused: ' + duration(session.pausedMs);
    detail.appendChild(pre);
    Object.keys(session.openResponses || {}).forEach(function (key) {
      var heading = document.createElement('strong');
      var paragraph = document.createElement('p');
      heading.textContent = key;
      paragraph.textContent = session.openResponses[key] || '—';
      detail.appendChild(heading);
      detail.appendChild(paragraph);
    });
  }
  function csv(value) {
    return '"' + String(value === undefined || value === null ? '' : value).replace(/"/g, '""') + '"';
  }
  function download(name, content, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type }));
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function payload() {
    return { application: 'CriptoEscape', schemaVersion: Store.schemaVersion, exportedAt: new Date().toISOString(), sessions: filtered() };
  }
  function exportJson() {
    download('criptoescape-sessions.json', JSON.stringify(payload(), null, 2), 'application/json');
  }
  function exportCsv() {
    var headers = ['id', 'classCode', 'status', 'startedAt', 'activeMs', 'curveId', 'scenarioId', 'language', 'prePercent', 'postPercent', 'gain', 'attempts', 'hints'];
    var rows = filtered().map(function (session) {
      var pre = session.preTest ? session.preTest.score.percent : '';
      var post = session.postTest ? session.postTest.score.percent : '';
      return [session.id, session.classCode, session.status, session.startedAt, session.activeMs, session.curveId,
        session.scenarioId, session.language, pre, post, pre !== '' && post !== '' ? post - pre : '',
        JSON.stringify(session.attempts || {}), (session.hints || []).length].map(csv).join(',');
    });
    download('criptoescape-results.csv', [headers.map(csv).join(',')].concat(rows).join('\n'), 'text/csv;charset=utf-8');
  }
  function exportOpen() {
    var rows = [['sessionId', 'classCode', 'promptId', 'response'].map(csv).join(',')];
    filtered().forEach(function (session) {
      Object.keys(session.openResponses || {}).forEach(function (key) {
        rows.push([session.id, session.classCode || '', key, session.openResponses[key] || ''].map(csv).join(','));
      });
    });
    download('criptoescape-open-responses.csv', rows.join('\n'), 'text/csv;charset=utf-8');
  }
  async function importJson(event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    var total = 0;
    try {
      for (var index = 0; index < files.length; index += 1) {
        total += await storage.importMany(JSON.parse(await files[index].text()));
      }
      await renderDashboard();
      message('dashboard-message', 'ok', t('dashboard.imported', { count: total }));
    } catch (error) {
      message('dashboard-message', 'error', t('dashboard.invalidImport'));
    }
  }
  async function clearData() {
    if (!window.confirm(t('dashboard.confirmClear'))) return;
    await storage.clear();
    state.session = null;
    renderDashboard();
  }
  async function renderDebug() {
    var results = await window.CriptoTests.run(storage);
    var passed = results.filter(function (item) { return item.passed; }).length;
    setView('<div class="tag">?debug=1</div><h1>' + esc(t('debug.title')) + '</h1><p class="lead">' +
      esc(t('debug.summary', { passed: passed, total: results.length })) + '</p><ul class="debug-list">' +
      results.map(function (item) {
        return '<li class="' + (item.passed ? 'pass' : 'fail') + '"><strong>' +
          esc(item.passed ? t('debug.passed') : t('debug.failed')) + ':</strong> ' + esc(item.name) +
          (item.detail ? ' — ' + esc(item.detail) : '') + '</li>';
      }).join('') + '</ul>');
  }
  function render() {
    populateSelectors();
    applyTranslations();
    updateNavigation();
    if (new URLSearchParams(location.search).get('debug') === '1') {
      renderDebug();
      return;
    }
    if (state.mode === 'instructor') {
      renderDashboard();
      return;
    }
    if (state.curve.id === 'custom-pending') {
      renderCustom();
      return;
    }
    if (state.scenario.kind !== 'escape') {
      renderScenario();
      return;
    }
    [renderContext, renderValidation, renderOrders, renderCrt, renderDefense, renderReport][state.step]();
  }
  function configurationAllowed() {
    return !state.session || state.session.status !== 'active' || window.confirm(t('session.confirmReset'));
  }
  function applyPreferences() {
    var preferences = {
      textSize: document.getElementById('text-size').value,
      reduceMotion: document.getElementById('reduce-motion').checked,
      highContrast: document.getElementById('high-contrast').checked,
      readable: document.getElementById('readable-font').checked,
      hideDecorations: document.getElementById('hide-decorations').checked
    };
    document.body.classList.toggle('text-large', preferences.textSize === 'large');
    document.body.classList.toggle('text-larger', preferences.textSize === 'larger');
    document.body.classList.toggle('reduce-motion', preferences.reduceMotion);
    document.body.classList.toggle('high-contrast', preferences.highContrast);
    document.body.classList.toggle('readable', preferences.readable);
    document.body.classList.toggle('hide-decorations', preferences.hideDecorations);
    Store.preference('accessibility', preferences);
  }
  function bindPreferences() {
    var preferences = Store.preference('accessibility') ||
      { textSize: 'normal', reduceMotion: false, highContrast: false, readable: false, hideDecorations: false };
    document.getElementById('text-size').value = preferences.textSize;
    document.getElementById('reduce-motion').checked = preferences.reduceMotion;
    document.getElementById('high-contrast').checked = preferences.highContrast;
    document.getElementById('readable-font').checked = preferences.readable;
    document.getElementById('hide-decorations').checked = preferences.hideDecorations;
    qa('input, select', document.getElementById('preferences-form')).forEach(function (input) {
      input.addEventListener('change', applyPreferences);
    });
    applyPreferences();
  }
  function bindGlobal() {
    var menu = document.getElementById('menu-button');
    menu.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', t(open ? 'menu.close' : 'menu.open'));
    });
    document.addEventListener('click', function (event) {
      if (document.body.classList.contains('menu-open') && !event.target.closest('.sidebar') && !event.target.closest('#menu-button')) {
        document.body.classList.remove('menu-open');
        menu.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
        document.body.classList.remove('menu-open');
        menu.focus();
      }
    });
    document.getElementById('language-select').addEventListener('change', function (event) {
      I18n.setLocale(event.target.value);
      render();
    });
    document.getElementById('curve-select').addEventListener('change', function (event) {
      var id = event.target.value;
      if (!configurationAllowed()) {
        event.target.value = state.curve.id;
        return;
      }
      reset(true);
      state.curve = id === 'custom' ? { id: 'custom-pending' } : Data.getCurve(id);
      Store.preference('curve', id);
      render();
    });
    document.getElementById('scenario-select').addEventListener('change', function (event) {
      if (!configurationAllowed()) {
        event.target.value = state.scenario.id;
        return;
      }
      reset(true);
      state.scenario = Data.getScenario(event.target.value);
      state.curve = Data.getCurve(state.scenario.recommendedCurve);
      Store.preference('scenario', state.scenario.id);
      render();
    });
    document.getElementById('preferences-button').addEventListener('click', function () {
      document.getElementById('preferences-dialog').showModal();
    });
    document.getElementById('restart-button').addEventListener('click', function () {
      if (!configurationAllowed()) return;
      reset(false);
      state.mode = 'free';
      render();
      document.getElementById('entry-dialog').showModal();
    });
    bindPreferences();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        tick();
        state.hiddenAt = Date.now();
        save();
      } else {
        if (state.session && state.hiddenAt) state.session.pausedMs += Date.now() - state.hiddenAt;
        state.hiddenAt = null;
        state.lastTick = Date.now();
      }
    });
    window.addEventListener('pagehide', function () { tick(); save(); });
  }
  async function bindEntry() {
    var dialog = document.getElementById('entry-dialog');
    var active = (await storage.all()).filter(function (session) {
      return session.status === 'active' && session.mode === 'student';
    }).sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
    qa('[data-mode]', dialog).forEach(function (button) {
      button.addEventListener('click', function () {
        var mode = button.dataset.mode;
        if (mode === 'student') {
          document.getElementById('class-code-field').hidden = false;
          document.getElementById('student-entry-actions').hidden = false;
          document.getElementById('resume-session').hidden = !active.length;
          document.getElementById('class-code').focus();
          return;
        }
        state.mode = mode;
        dialog.close();
        render();
      });
    });
    document.getElementById('student-continue').addEventListener('click', function () {
      state.mode = 'student';
      state.session = newSession(document.getElementById('class-code').value);
      storage.put(state.session);
      dialog.close();
      renderAssessment('pre');
    });
    document.getElementById('resume-session').addEventListener('click', function () {
      if (!active.length) return;
      state.mode = 'student';
      state.session = active[0];
      state.curve = Data.getCurve(state.session.curveId) || state.curve;
      state.scenario = Data.getScenario(state.session.scenarioId) || state.scenario;
      if (state.session.activity) {
        state.step = Number(state.session.activity.step) || 0;
        state.done = Array.isArray(state.session.activity.done) ? state.session.activity.done.slice(0, 5) : state.done;
        while (state.done.length < 5) state.done.push(false);
        state.verified = state.session.activity.verified || {};
        state.ordersConfirmed = Boolean(state.session.activity.ordersConfirmed);
        state.oracle = state.session.activity.oracle || null;
        state.keyConfirmed = Boolean(state.session.activity.keyConfirmed);
        state.safeRun = Boolean(state.session.activity.safeRun);
      } else {
        state.step = /^step\d$/.test(state.session.currentStep) ? Number(state.session.currentStep.slice(-1)) : 0;
      }
      state.lastTick = Date.now();
      dialog.close();
      if (state.session.currentStep === 'pretest' && !state.session.preTest) renderAssessment('pre');
      else render();
    });
  }
  async function init() {
    storage = await Store.create();
    var savedCurve = Store.preference('curve');
    var savedScenario = Store.preference('scenario');
    if (savedCurve && Data.getCurve(savedCurve)) state.curve = Data.getCurve(savedCurve);
    if (savedScenario && Data.getScenario(savedScenario)) state.scenario = Data.getScenario(savedScenario);
    bindGlobal();
    await bindEntry();
    applyTranslations();
    render();
    if (new URLSearchParams(location.search).get('debug') !== '1') {
      document.getElementById('entry-dialog').showModal();
    }
    window.setInterval(function () { tick(); save(); }, 5000);
  }
  init();
})();
