/* Finishr – versione indipendente (Supabase) */
var LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0.5" y="0.5" width="99" height="99" rx="22" fill="#EADCC2" stroke="#CDBB98"/><rect x="9" y="38" width="13" height="3.5" rx="1.75" fill="#171512" opacity="0.45"/><rect x="5" y="48" width="15" height="3.5" rx="1.75" fill="#171512" opacity="0.3"/><rect x="11" y="58" width="10" height="3.5" rx="1.75" fill="#171512" opacity="0.45"/><g transform="translate(9 0) skewX(-12)"><rect x="30" y="19" width="15" height="62" rx="4" fill="#171512"/><rect x="30" y="19" width="46" height="15" rx="4" fill="#171512"/></g><path d="M31 46 C 46 41, 58 52, 72 45 L 74 56 C 60 63, 47 52, 32 58 Z" fill="#B5482B"/><path d="M78 43 C 84 39, 88 43, 93 38 L 94 48 C 89 53, 85 49, 80 53 Z" fill="#B5482B"/></svg>';
function logoHtml(size, dark) { return '<div style="display:flex;align-items:center;gap:10px"><span aria-hidden="true" style="display:inline-flex;width:' + size + 'px;height:' + size + 'px">' + LOGO_SVG.replace('<svg ', '<svg width="' + size + '" height="' + size + '" ') + '</span><span style="font-family:\'Barlow Condensed\',Inter,sans-serif;font-weight:700;font-size:' + Math.round(size * 1.05) + 'px;line-height:1;color:#171512">finish<span style="color:#B5482B">r</span></span></div>'; }

(function () {
'use strict';

// =================== utilità ===================
var $ = function (id) { return document.getElementById(id); };
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function num(v) { return parseFloat(String(v == null ? '' : v).replace(',', '.')); }
function int(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtTime(s) { s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x); }
function fmtPace(sk) { if (!isFinite(sk) || sk <= 0) return '—'; var r = Math.round(sk); return Math.floor(r / 60) + ':' + pad2(r % 60) + ' /km'; }
function fmtKm(k) { return Number(k).toLocaleString('it-IT', { maximumFractionDigits: 2 }); }
function fmtN(n) { return Number(n).toLocaleString('it-IT'); }
function fmt1(n) { return Number(n).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function localDateStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function dateIt(s, long) { return new Date(s + 'T12:00:00').toLocaleDateString('it-IT', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }); }
function daysSince(s) { return Math.floor((new Date(todayStr() + 'T12:00:00') - new Date(s + 'T12:00:00')) / 864e5); }
function sid(s) { return String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_'); }
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0); }).join('').slice(0, 3).toUpperCase() || '?'; }
var MESI_L = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
var MESI_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
var COLORS = [['#14532D', 'Verde'], ['#1D4ED8', 'Blu'], ['#B91C1C', 'Rosso'], ['#B45309', 'Ambra'], ['#7C3AED', 'Viola'], ['#111827', 'Nero']];
function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 2800); }

// =================== regole ===================
var HALF = 21.0975, CLOSE_DAYS = 7;
function category(sex, birth, year) {
  if (!sex || !birth) return '—';
  var age = year - birth; if (age < 18) return '—';
  if (age <= 19) return 'J' + sex; if (age <= 22) return 'P' + sex; if (age <= 34) return 'S' + sex;
  if (age >= 60) return 'S' + sex + '60'; return 'S' + sex + (Math.floor(age / 5) * 5);
}
function catLabel(c) { return /60$/.test(c) ? c + '+' : c; }
function band(km) { if (km <= 5) return 1; if (km <= 10) return 2; if (km <= HALF + 0.05) return 3; if (km <= 30) return 4; return 5; }
var BANDS = { 1: 'fino a 5 km', 2: 'oltre 5 fino a 10 km', 3: 'oltre 10 km fino alla mezza', 4: 'oltre la mezza fino a 30 km', 5: 'oltre 30 km' };
function distBonus(km) { if (km >= 42) return 15; if (km > 30) return 10; if (km >= 21) return 5; return 0; }
function placePts(max, n, pos, soglia) { if (!(n >= 1) || !(pos >= 1)) return 0; var frac = n === 1 ? 1 : (n - pos) / (n - 1); return Math.round(max * frac * Math.min(1, n / soglia)); }
function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function isClosed(dateStr) { return daysSince(dateStr) > CLOSE_DAYS; }

// =================== stato ===================
var S = {
  db: null, user: null, uid: null, isOwner: false, ready: false, offline: false,
  members: {}, teams: {}, races: {}, entries: {}, votes: {},
  pts: {}, // entryId -> punti calcolati
  loaded: { members: false, teams: false, races: false, entries: false, votes: false }
};
var ui = { reg: null, onb: null, cls: { kind: 'ind', period: 'season', sex: 'all', cat: 'all', tmode: 'tot' }, race: { route: null }, team: { tab: 'members' }, profile: { chart: 'pts' } };

function me() { return S.members[sid(S.uid)] || null; }
function memberName(uid) { var m = S.members[sid(uid)]; return m ? m.nick : 'Runner'; }
function activeEntries() { return Object.keys(S.entries).map(function (k) { return S.entries[k]; }).filter(function (e) { return e.status !== 'removed' && S.races[e.raceId]; }); }

// =================== motore dei punti ===================
function votesFor(entryId) { return Object.keys(S.votes).map(function (k) { return S.votes[k]; }).filter(function (v) { return v.entryId === entryId; }); }
function entryState(e) {
  var vs = votesFor(e.id), confirms = vs.filter(function (v) { return v.type === 'confirm'; });
  var reps = vs.filter(function (v) { return v.type === 'report'; });
  var repUsers = {}; reps.forEach(function (r) { repUsers[r.uid] = true; }); // contano le segnalazioni di tutti, anche dei compagni di squadra
  var contested = e.status !== 'validated' && Object.keys(repUsers).length >= 2;
  return { confirms: confirms.length, reports: reps.length, contested: contested, confirmUids: confirms.map(function (v) { return v.uid; }), reportUids: reps.map(function (v) { return v.uid; }) };
}
function recompute() {
  var all = activeEntries(), pts = {};
  // raggruppa per gara + percorso
  var groups = {};
  all.forEach(function (e) {
    if (e.official && e.resultId) { // classifica ufficiale: punti sul risultato ufficiale
      var race = S.races[e.raceId], o = e.official, r = { official: true, pos: o.pos, n: o.n || o.pos, cat: o.cat || '—', catPos: o.catPos || 0, catN: o.catN || 0, part: 0, bonus: 0, gen: 0, catPts: 0, imp: 0, impWhy: '', total: 0, closed: isClosed(race.date) };
      if (e.km >= 3) { r.part = 10; r.bonus = distBonus(e.km); r.gen = placePts(20, r.n, r.pos, 10); r.catPts = o.cat ? placePts(10, r.catN, r.catPos, 5) : 0; var im = improvement(e.uid, e.km, e.secs / e.km, race.date, e.id); r.imp = im.v; r.impWhy = im.why; }
      r.total = r.part + r.bonus + r.gen + r.catPts + r.imp; pts[e.id] = r; return;
    }
    var k = e.raceId + '|' + e.km; (groups[k] = groups[k] || []).push(e);
  });
  Object.keys(groups).forEach(function (k) {
    var g = groups[k].slice().sort(function (a, b) { return a.secs - b.secs; });
    var race = S.races[g[0].raceId], year = int(race.date.slice(0, 4));
    var posOf = function (list, e) { var p = 1; for (var i = 0; i < list.length; i++) { if (list[i].secs < e.secs) p++; } return p; };
    var byCat = {};
    g.forEach(function (e) { var m = S.members[sid(e.uid)] || {}; e._cat = category(m.sex, m.birth, year); (byCat[e._cat] = byCat[e._cat] || []).push(e); });
    g.forEach(function (e) {
      var r = { pos: posOf(g, e), n: g.length, cat: e._cat, part: 0, bonus: 0, gen: 0, catPts: 0, imp: 0, impWhy: '', total: 0, closed: isClosed(race.date) };
      var cl = byCat[e._cat] || [e]; r.catPos = posOf(cl, e); r.catN = cl.length;
      if (e.km >= 3) {
        r.part = 10; r.bonus = distBonus(e.km);
        r.gen = placePts(20, r.n, r.pos, 10);
        r.catPts = e._cat === '—' ? 0 : placePts(10, r.catN, r.catPos, 5);
        var im = improvement(e.uid, e.km, e.secs / e.km, race.date, e.id); r.imp = im.v; r.impWhy = im.why;
      }
      r.total = r.part + r.bonus + r.gen + r.catPts + r.imp;
      pts[e.id] = r;
    });
  });
  S.pts = pts;
}
function improvement(uid, km, pace, date, exceptId) {
  var b = band(km);
  var prev = activeEntries().filter(function (e) { return e.uid === uid && e.id !== exceptId && band(e.km) === b && S.races[e.raceId].date < date; })
    .sort(function (x, y) { return S.races[x.raceId].date < S.races[y.raceId].date ? 1 : -1; }).slice(0, 5);
  if (prev.length < 3) return { v: 0, why: 'Servono 3 gare precedenti nella fascia ' + BANDS[b] + ' (ne hai ' + prev.length + ')' };
  var med = median(prev.map(function (e) { return e.secs / e.km; }));
  var d = (pace - med) / med, pct = Math.abs(d * 100).toLocaleString('it-IT', { maximumFractionDigits: 1 });
  if (pace <= med * 0.98) return { v: 5, why: fmtPace(pace) + ' contro la tua mediana di ' + fmtPace(med) + ': ' + pct + '% più veloce' };
  return { v: 0, why: fmtPace(pace) + ' contro la tua mediana di ' + fmtPace(med) + (d < 0 ? ': ' + pct + '% più veloce, serve il 2%' : ': ' + pct + '% più lento') };
}
// periodi: 'season' = anno corrente, 'YYYY-MM' = mese
function inPeriod(dateStr, period) { var y = String(new Date().getFullYear()); return period === 'season' ? dateStr.slice(0, 4) === y : dateStr.slice(0, 7) === period; }
function standingsInd(period, includeOpen) {
  var tot = {};
  activeEntries().forEach(function (e) {
    var r = S.pts[e.id], race = S.races[e.raceId]; if (!r || !inPeriod(race.date, period)) return; if (!r.closed && !includeOpen) return;
    var t = tot[e.uid] = tot[e.uid] || { uid: e.uid, pts: 0, races: 0 }; t.pts += r.total; t.races++;
  });
  return Object.keys(tot).map(function (k) { return tot[k]; }).sort(function (a, b) { return b.pts - a.pts || b.races - a.races; });
}
function standingsTeam(period, mode) {
  var tot = {};
  activeEntries().forEach(function (e) {
    var r = S.pts[e.id], race = S.races[e.raceId]; if (!e.teamId || !S.teams[e.teamId] || !r || !r.closed || !inPeriod(race.date, period)) return;
    var t = tot[e.teamId] = tot[e.teamId] || { teamId: e.teamId, pts: 0, races: 0, ath: {} }; t.pts += r.total; t.races++; t.ath[e.uid] = 1;
  });
  var minG = period === 'season' ? 15 : 3;
  var list = Object.keys(tot).map(function (k) { var t = tot[k]; t.athN = Object.keys(t.ath).length; t.avg = t.pts / t.races; t.ok = mode !== 'avg' || (t.athN >= 3 && t.races >= minG); t.minG = minG; return t; });
  list.sort(function (a, b) { if (a.ok !== b.ok) return a.ok ? -1 : 1; return mode === 'avg' ? b.avg - a.avg : b.pts - a.pts; });
  return list;
}

// =================== dati ===================
var rTimer = null;
function scheduleRender() { if (rTimer) return; rTimer = setTimeout(function () { rTimer = null; if (formView() && S.lastView === route().view) { refreshLight(); return; } render(); }, 30); }
function formView() { var v = route().view; return v === 'registra' || v === 'onboarding' || v === 'modifica' || v === 'cambia'; }
function refreshLight() { if (route().view === 'registra' && ui.reg && ui.reg.step === 'gara') render(); }
var CFG = window.TAPASCIA_CONFIG || {}, sb = null;
var TEAM_COLS = 'id,name,town,color,access,admins,created_by,logo';
function err2msg(e) {
  var m = (e && (e.message || e.error_description)) || '';
  if (/Codice squadra|già cambiato|Esiste già|non trovata|Crea prima|moderatore/i.test(m)) return m;
  if (/row-level security|permission denied/i.test(m)) return 'Operazione non consentita.';
  if (/duplicate key/i.test(m)) return 'Esiste già.';
  if (/fetch|network/i.test(m)) return 'Connessione assente: riprova.';
  return 'Operazione non riuscita' + (m ? ': ' + m : '');
}
async function q(promise, quiet) { var r = await promise; if (r.error) { console.warn(r.error); if (!quiet) toast(err2msg(r.error)); return null; } return r.data === null || r.data === undefined ? true : r.data; }
var loading = false, lastLoad = 0;
async function loadAll() {
  if (loading) return; loading = true;
  try {
    var res = await Promise.all([
      sb.from('profiles').select('id,nick,sex,birth,team_id,team_changes,photo,pbs,bio'),
      sb.from('teams').select(TEAM_COLS),
      sb.from('races').select('id,name,date,town,distances,lat,lon,created_by,official'),
      sb.from('entries').select('id,race_id,user_id,team_id,km,secs,proof,status,track,gpx_ok,gpx,ocr_ok,proof_note,asset_paths,defense,bib,result_id,official').limit(5000),
      sb.from('votes').select('entry_id,user_id,team_id,type,reason').limit(10000),
      sb.from('app_admins').select('user_id'),
      sb.rpc('my_team_code'),
      sb.from('private_profiles').select('first_name,last_name').eq('id', S.uid)
    ]);
    var bad = res.slice(0, 5).filter(function (r) { return r.error; })[0];
    if (bad) throw bad.error;
    var m = {}; res[0].data.forEach(function (p) { m[sid(p.id)] = { uid: p.id, nick: p.nick, sex: p.sex, birth: p.birth, teamId: p.team_id, teamChanges: p.team_changes || {}, photo: p.photo || null, pbs: p.pbs || {}, bio: p.bio || '' }; }); S.members = m;
    var t = {}; res[1].data.forEach(function (x) { t[x.id] = { id: x.id, name: x.name, town: x.town, color: x.color, access: x.access, admins: x.admins || [], createdBy: x.created_by, logo: x.logo || null }; }); S.teams = t;
    var r = {}; res[2].data.forEach(function (x) { r[x.id] = { id: x.id, name: x.name, date: x.date, town: x.town, distances: (x.distances || []).map(Number), lat: x.lat, lon: x.lon, createdBy: x.created_by, official: x.official || {} }; }); S.races = r; S.results = {};
    var e = {}; res[3].data.forEach(function (x) { e[x.id] = { id: x.id, raceId: x.race_id, uid: x.user_id, teamId: x.team_id, km: Number(x.km), secs: x.secs, proof: x.proof, status: x.status, track: x.track, gpxOk: x.gpx_ok, gpx: x.gpx, ocrOk: x.ocr_ok, proofNote: x.proof_note, assetIds: x.asset_paths || [], defense: x.defense, bib: x.bib, resultId: x.result_id, official: x.official }; }); S.entries = e;
    var v = {}; res[4].data.forEach(function (x) { v[x.entry_id + '__' + x.user_id] = { entryId: x.entry_id, uid: x.user_id, teamId: x.team_id, type: x.type, reason: x.reason }; }); S.votes = v;
    S.isOwner = !!(res[5].data && res[5].data.length); S.myCode = res[6].data || null; S.priv = (res[7] && res[7].data && res[7].data[0]) || null;
    S.loaded = { members: true, teams: true, races: true, entries: true, votes: true }; S.offline = false; lastLoad = Date.now();
  } catch (x) { console.warn(x); S.offline = true; if (!lastLoad) S.loaded = { members: true, teams: true, races: true, entries: true, votes: true }; }
  loading = false; recompute(); scheduleRender();
}
async function init() {
  if (!CFG.url || !CFG.anonKey || /INCOLLA/.test(CFG.url + CFG.anonKey)) { fatal('Configurazione mancante: inserisci l’indirizzo e la chiave di Supabase nel file config.js.'); return; }
  if (!window.supabase) { fatal('Non riesco a caricare l’app: controlla la connessione e ricarica la pagina.'); return; }
  sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'PASSWORD_RECOVERY') { ui.auth = { mode: 'newpass' }; S.session = session; S.ready = false; setTimeout(renderAuth, 0); return; }
    var was = S.uid; S.session = session; S.uid = session ? session.user.id : null;
    if (S.uid && S.uid !== was && !(ui.auth && ui.auth.mode === 'newpass')) { S.ready = true; setTimeout(loadAll, 0); }
    if (!S.uid) { S.ready = false; setTimeout(renderAuth, 0); }
  });
  var got = await sb.auth.getSession(); S.session = got.data.session;
  if (!S.session) { renderAuth(); }
  else if (!(ui.auth && ui.auth.mode === 'newpass')) { S.uid = S.session.user.id; S.ready = true; render(); loadAll(); }
  setInterval(function () { if (document.visibilityState === 'visible' && S.uid && S.ready) loadAll(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.uid && S.ready && Date.now() - lastLoad > 15000) loadAll(); });
}
function fatal(msg) { $('main').innerHTML = '<div class="center">' + logoHtml(40, true) + '<p class="hint">' + esc(msg) + '</p></div>'; }

// ---------- accesso ----------
function renderAuth() {
  $('tabs').classList.add('hidden'); closeSheet();
  var a = ui.auth = ui.auth || { mode: 'login', email: '', pass: '' };
  var title = { login: 'Accedi', signup: 'Crea un account', reset: 'Password dimenticata', newpass: 'Nuova password', sent: 'Controlla la posta' }[a.mode];
  var h = '<div class="top" style="min-height:34vh;justify-content:flex-end">' + logoHtml(34) + '<h1 style="font-size:36px;line-height:1.05">ogni gara conta.</h1><p class="sub">Registra le corse che fai, anche non competitive, e scala la classifica con la tua squadra.</p></div><div class="card"><h2>' + title + '</h2>';
  if (a.mode === 'sent') h += '<p class="hint">' + esc(a.msg) + '</p><button class="btn sec" data-act="authMode" data-v="login">Torna all’accesso</button>';
  else if (a.mode === 'newpass') h += '<label for="ap">Nuova password</label><input id="ap" type="password" data-bind="auth.pass" autocomplete="new-password" placeholder="Almeno 8 caratteri"><div class="stack" style="margin-top:14px"><button class="btn" data-act="authNewPass">Salva la password</button></div>';
  else {
    h += '<label for="ae">Email</label><input id="ae" type="email" data-bind="auth.email" value="' + esc(a.email || '') + '" autocomplete="email" inputmode="email" placeholder="nome@esempio.it">';
    if (a.mode !== 'reset') h += '<label for="ap">Password</label><input id="ap" type="password" data-bind="auth.pass" autocomplete="' + (a.mode === 'signup' ? 'new-password' : 'current-password') + '" placeholder="' + (a.mode === 'signup' ? 'Almeno 8 caratteri' : '') + '">';
    h += '<div class="stack" style="margin-top:14px"><button class="btn" data-act="authGo">' + { login: 'Accedi', signup: 'Crea account', reset: 'Inviami il link' }[a.mode] + '</button>';
    if (a.mode === 'login') h += '<button class="btn sec" data-act="authMode" data-v="signup">Sono nuovo: crea un account</button><button class="btn link" data-act="authMode" data-v="reset" style="align-self:center">Password dimenticata?</button>';
    else h += '<button class="btn link" data-act="authMode" data-v="login" style="align-self:center">Ho già un account: accedi</button>';
    h += '</div>';
  }
  $('main').innerHTML = h + '</div>';
}
// =================== router ===================
function route() {
  var h = (location.hash || '').replace('#', '');
  if (S.ready && allLoaded() && !me()) return { view: 'onboarding' };
  if (!h) return { view: 'home' };
  if (h.indexOf('gara-') === 0) return { view: 'gara', id: h.slice(5) };
  if (h.indexOf('atleta-') === 0) return { view: 'atleta', id: h.slice(7) };
  return { view: h };
}
function allLoaded() { return S.loaded.members && S.loaded.teams && S.loaded.races && S.loaded.entries; }
window.addEventListener('hashchange', function () { closeSheet(); render(); window.scrollTo(0, 0); });

function render() {
  if (!S.ready) { if (sb && !S.session) renderAuth(); return; }
  if (!allLoaded()) { $('main').innerHTML = '<div class="center"><p class="hint">' + (S.offline ? 'Non riesco a raggiungere i dati in questo momento. Controlla la connessione.' : 'Caricamento dei dati…') + '</p></div>'; return; }
  var r = route(), v = r.view, html;
  var tabs = $('tabs'); tabs.classList.toggle('hidden', v === 'onboarding');
  [].forEach.call(tabs.querySelectorAll('a'), function (a) { if (a.dataset.tab === v || (v === 'gara' && a.dataset.tab === 'registra' && false)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (v === 'onboarding') html = vOnboarding();
  else if (v === 'registra') html = vRegistra();
  else if (v === 'gara') html = vGara(r.id);
  else if (v === 'classifiche') html = vClassifiche();
  else if (v === 'squadra') html = vSquadra();
  else if (v === 'profilo') html = vProfilo();
  else if (v === 'atleta') html = r.id === S.uid ? vProfilo() : vProfilo(r.id);
  else if (v === 'modifica') html = vModifica();
  else html = vHome();
  S.lastView = v;
  $('main').innerHTML = (S.offline ? '<div class="note" style="margin:10px 0">I dati potrebbero non essere aggiornati.</div>' : '') + html;
  afterRender(v);
}

// =================== viste ===================
var PB_KEYS = [['5', '5 km'], ['10', '10 km'], ['21.1', 'Mezza'], ['42.2', 'Maratona']];
function avatarHtml(uid, size, dark) { var m = S.members[sid(uid)] || {}, s = size || 38;
  if (m.photo) return '<img class="av" aria-hidden="true" alt="" src="' + esc(publicUrl(m.photo)) + '" style="width:' + s + 'px;height:' + s + 'px;border-radius:' + (s / 2) + 'px;object-fit:cover;padding:0">';
  return '<div class="av" aria-hidden="true" style="width:' + s + 'px;height:' + s + 'px;border-radius:' + (s / 2) + 'px;font-size:' + Math.round(s * 0.42) + 'px' + (dark ? ';background:#171512;color:#EADCC2' : '') + '">' + esc(initials(m.nick || '?')) + '</div>'; }
function bioHtml(t) { return esc(t).replace(/(^|[\s(])@([A-Za-z0-9._]{1,30})/g, function (all, pre, u) { return pre + '<a href="https://instagram.com/' + u + '" target="_blank" rel="noopener noreferrer">@' + u + '</a>'; }); }
function parseTimeStr(t) { t = String(t || '').trim().replace(/[.,'’"]/g, ':'); if (!t) return null; var p = t.split(':').map(function (x) { return x === '' ? NaN : Number(x); }); if (p.some(function (x) { return isNaN(x) || x < 0; })) return NaN; if (p.length === 2) return p[0] * 60 + p[1]; if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]; return NaN; }
function shieldHtml(team, size) { var s = size || 48;
  if (team && team.logo) return '<img class="shield" aria-hidden="true" alt="" src="' + esc(publicUrl(team.logo)) + '" style="width:' + s + 'px;height:' + s + 'px;object-fit:contain;background:transparent;border-radius:0">';
  return '<svg class="shield" aria-hidden="true" viewBox="0 0 24 24" style="width:' + s + 'px;height:' + s + 'px;background:transparent;border-radius:0"><path d="M12 2.5l8.5 3.2v6.3c0 4.9-3.6 8.4-8.5 9.7-4.9-1.3-8.5-4.8-8.5-9.7V5.7z" fill="' + esc(team ? team.color : '#9C9381') + '"/><path d="M8.6 12.2l2.3 2.3 4.5-4.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
function proofPill(e, st) {
  if (e.resultId && e.official && e.status !== 'removed' && !st.contested) return '<span class="pill g">Ufficiale ✓</span>';
  if (e.status === 'validated') return '<span class="pill g">Validata</span>';
  if (st.contested) return '<span class="pill r">In verifica</span>';
  if (e.proof === 'gpx') return '<span class="pill ' + (e.gpxOk ? 'g' : 'n') + '">GPX' + (e.gpxOk ? ' ✓' : '') + '</span>';
  return '<span class="pill n">IMG' + (st.confirms ? ' · ' + st.confirms + ' ✓' : '') + '</span>';
}

// ---------- onboarding ----------
function vOnboarding() {
  var o = ui.onb = ui.onb || { step: 'welcome', first: '', last: '', nick: '', sex: null, birth: '', teamChoice: null, code: '', tq: '', newTeam: '', town: '', color: COLORS[0][0], access: 'open' };
  if (o.step === 'welcome') return '<div class="top" style="min-height:60vh;justify-content:flex-end">' + logoHtml(34) + '<h1 style="font-size:40px;line-height:1.02">ogni gara conta.</h1><p class="sub" style="font-size:15px">Registra le corse che fai, anche non competitive. Accumula punti con la costanza e scala la classifica con la tua squadra.</p><button class="btn" data-act="onbStep" data-v="profilo">Inizia</button></div>';
  if (o.step === 'profilo') {
    var cat = category(o.sex, int(o.birth), new Date().getFullYear()), age = new Date().getFullYear() - int(o.birth);
    var ok = o.nick.trim().length >= 2 && o.sex && int(o.birth) > 1900 && age >= 18 && (o.first || '').trim() && (o.last || '').trim();
    return '<div class="top"><div class="brand">PASSO 1 DI 2</div><h1>Chi sei</h1></div>' +
      '<div class="card"><div class="row2"><div><label for="ofn">Nome</label><input id="ofn" type="text" data-bind="onb.first" value="' + esc(o.first || '') + '" autocomplete="given-name" maxlength="40"></div><div><label for="oln">Cognome</label><input id="oln" type="text" data-bind="onb.last" value="' + esc(o.last || '') + '" autocomplete="family-name" maxlength="40"></div></div>' +
      '<p class="hint">Privati: servono solo a riconoscerti nelle classifiche ufficiali. Gli altri non li vedono.</p>' +
      '<label for="nick">Nome pubblico</label><input id="nick" type="text" data-bind="onb.nick" value="' + esc(o.nick) + '" placeholder="Es. Federico M. oppure un soprannome" maxlength="30">' +
      '<p class="hint">È il nome che vedono gli altri in classifica.</p>' +
      '<label id="lsex">Sesso</label><div class="seg" role="group" aria-labelledby="lsex"><button data-act="onbSex" data-v="F" aria-pressed="' + (o.sex === 'F') + '">Donna</button><button data-act="onbSex" data-v="M" aria-pressed="' + (o.sex === 'M') + '">Uomo</button></div>' +
      '<label for="birth">Anno di nascita</label><input id="birth" type="number" inputmode="numeric" data-bind="onb.birth" data-live="1" value="' + esc(o.birth) + '" placeholder="Es. 1989">' +
      '<div class="okbox" id="catPrev">' + (int(o.birth) && age < 18 ? 'L’app è riservata ai maggiorenni.' : 'Categoria FIDAL: <b>' + esc(catLabel(cat)) + '</b>') + '</div>' +
      '<p class="hint" style="margin-top:12px">Sesso e anno servono solo per la categoria; l’età non viene mostrata. Nome, squadra, tempi e prove delle gare sono visibili agli altri utenti.</p>' +
      '<button class="btn" data-act="onbStep" data-v="squadra" ' + (ok ? '' : 'disabled') + ' id="onbNext">Continua</button></div>';
  }
  if (o.step === 'squadra') {
    var q = o.tq.trim().toLowerCase();
    var teams = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !q || t.name.toLowerCase().indexOf(q) !== -1; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var cnt = teamMemberCount();
    var list = teams.map(function (t) {
      var on = o.teamChoice === t.id;
      return '<button class="radio" role="radio" aria-checked="' + on + '" data-act="onbTeam" data-v="' + esc(t.id) + '" style="flex-direction:row;align-items:center;gap:12px">' + shieldHtml(t, 38) + '<span class="grow"><b>' + esc(t.name) + '</b><small>' + esc((t.town ? t.town + ' · ' : '') + (cnt[t.id] || 0) + ((cnt[t.id] || 0) === 1 ? ' atleta · ' : ' atleti · ') + (t.access === 'invite' ? 'serve il codice' : 'aperta')) + '</small></span></button>';
    }).join('');
    var sel = S.teams[o.teamChoice];
    return '<div class="top"><div class="brand">PASSO 2 DI 2</div><h1>La tua squadra</h1></div>' +
      '<div class="card"><label for="tq">Cerca la tua squadra</label><input id="tq" type="search" data-bind="onb.tq" data-live="1" value="' + esc(o.tq) + '" placeholder="Nome della squadra">' +
      '<div class="stack" role="radiogroup" aria-label="Squadre" style="margin-top:10px" id="teamList">' + (list || '<p class="hint">Ancora nessuna squadra' + (q ? ' con questo nome' : '') + '.</p>') + '</div>' +
      (sel && sel.access === 'invite' ? '<label for="code">Codice squadra</label><input id="code" type="text" data-bind="onb.code" value="' + esc(o.code) + '" placeholder="Te lo dà un compagno di squadra" autocapitalize="characters">' : '') +
      '<div class="stack" style="margin-top:14px"><button class="btn" data-act="onbJoin" ' + (sel ? '' : 'disabled') + '>' + (sel ? 'Entra in ' + esc(sel.name) : 'Scegli una squadra') + '</button>' +
      '<button class="btn sec" data-act="onbStep" data-v="crea">Crea una nuova squadra</button>' +
      '<button class="btn link" data-act="onbSolo" style="align-self:center">Per ora corro senza squadra</button></div></div>';
  }
  if (o.step === 'crea') return teamForm(o, 'onbCreate', 'Crea squadra e continua');
  return '';
}
function teamForm(o, act, label) {
  return '<div class="top"><div class="brand">NUOVA SQUADRA</div><h1>Crea la tua squadra</h1><p class="sub">Sarai l’amministratore: ricevi il codice da dare ai compagni.</p></div>' +
    '<div class="card"><label for="tn">Nome della squadra</label><input id="tn" type="text" data-bind="onb.newTeam" value="' + esc(o.newTeam) + '" maxlength="40" placeholder="Es. Runners del Lago">' +
    '<label for="tt">Comune</label><input id="tt" type="text" data-bind="onb.town" value="' + esc(o.town) + '" maxlength="40" placeholder="Dove vi allenate di solito">' +
    '<label id="lcol">Colore</label><div class="swatches" role="radiogroup" aria-labelledby="lcol">' + COLORS.map(function (c) { return '<button role="radio" aria-label="' + c[1] + '" aria-checked="' + (o.color === c[0]) + '" data-act="onbColor" data-v="' + c[0] + '" style="background:' + c[0] + '"></button>'; }).join('') + '</div>' +
    '<label id="lacc">Chi può entrare?</label><div class="stack" role="radiogroup" aria-labelledby="lacc">' +
    '<button class="radio" role="radio" aria-checked="' + (o.access === 'open') + '" data-act="onbAccess" data-v="open"><b>Aperta a tutti</b><small class="sm">Chiunque la trovi può unirsi</small></button>' +
    '<button class="radio" role="radio" aria-checked="' + (o.access === 'invite') + '" data-act="onbAccess" data-v="invite"><b>Solo con codice</b><small class="sm">Entra chi riceve il codice squadra</small></button></div>' +
    '<div class="stack" style="margin-top:14px"><button class="btn" data-act="' + act + '">' + label + '</button><button class="btn link" data-act="onbStep" data-v="squadra" style="align-self:center">Indietro</button></div></div>';
}
function teamMemberCount() { var c = {}; Object.keys(S.members).forEach(function (k) { var m = S.members[k]; if (m.teamId) c[m.teamId] = (c[m.teamId] || 0) + 1; }); return c; }
function genCode(name) { var b = initials(name).replace(/[^A-Z]/g, '') || 'SQ'; return b + '-' + Math.floor(1000 + Math.random() * 9000); }

// ---------- home ----------
function vHome() {
  var m = me(), season = standingsInd('season'), myIdx = season.findIndex(function (s) { return s.uid === S.uid; });
  var myPts = myIdx >= 0 ? season[myIdx].pts : 0, team = S.teams[m.teamId];
  var mine = activeEntries().filter(function (e) { return e.uid === S.uid; }).sort(function (a, b) { return S.races[a.raceId].date < S.races[b.raceId].date ? 1 : -1; });
  var pending = mine.filter(function (e) { return S.pts[e.id] && !S.pts[e.id].closed; }).reduce(function (s, e) { return s + S.pts[e.id].total; }, 0);
  var cat = category(m.sex, m.birth, new Date().getFullYear());
  var teamTxt = '';
  if (team) { var tt = standingsTeam('season', 'tot'), ta = standingsTeam('season', 'avg'); var pt = tt.findIndex(function (t) { return t.teamId === team.id; }), pa = ta.filter(function (t) { return t.ok; }).findIndex(function (t) { return t.teamId === team.id; });
    teamTxt = '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #D3BF9B;padding-top:12px;gap:8px"><span>' + esc(team.name) + '</span><b style="white-space:nowrap">' + (pt >= 0 ? (pt + 1) + 'ª Totale' : '—') + (pa >= 0 ? ' · ' + (pa + 1) + 'ª Media' : '') + '</b></div>'; }
  var open = Object.keys(S.races).map(function (k) { return S.races[k]; }).filter(function (r) { return !isClosed(r.date) && daysSince(r.date) >= 0; })
    .map(function (r) { r._n = activeEntries().filter(function (e) { return e.raceId === r.id; }).length; return r; }).filter(function (r) { return r._n > 0; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var h = '<div class="top"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div class="sub">Stagione ' + new Date().getFullYear() + '</div><h1>Ciao ' + esc(m.nick.split(' ')[0]) + '</h1></div><span class="pill g">' + esc(catLabel(cat)) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div class="sub">I tuoi punti</div><div class="big num">' + fmtN(myPts) + '</div></div><div style="text-align:right"><div class="sub">Classifica individuale</div><div class="num" style="font-size:24px;font-weight:700">' + (myIdx >= 0 ? (myIdx + 1) + '° <span style="font-size:18px;color:#6E6556">su ' + season.length + '</span>' : '—') + '</div></div></div>' +
    (pending ? '<div class="banner"><span>+' + pending + ' punti in attesa: diventano definitivi alla chiusura delle gare (7 giorni)</span></div>' : '') + teamTxt + '</div>';
  h += '<div class="card"><h3>Hai fatto una gara?</h3><p class="hint">Registrala entro 7 giorni: cercala tra quelle inserite o creala tu.</p><a class="btn" href="#registra">+ Registra una gara</a></div>';
  if (open.length) h += '<h2>Classifiche aperte</h2><div class="list" style="margin-bottom:14px">' + open.map(function (r) {
    var my = mine.filter(function (e) { return e.raceId === r.id; })[0], p = my && S.pts[my.id];
    return '<a class="item" href="#gara-' + esc(r.id) + '"><div class="grow"><b>' + esc(r.name) + '</b><small>' + esc(dateIt(r.date) + ' · ' + r.town + ' · ' + r._n + ' runner') + '</small></div><div class="right"><span class="pill o">chiude tra ' + Math.max(0, CLOSE_DAYS - daysSince(r.date)) + ' gg</span>' + (p ? '<small class="sm">Tu: ' + p.pos + '° · +' + p.total + '</small>' : '') + '</div></a>';
  }).join('') + '</div>';
  h += '<h2>Classifica ' + new Date().getFullYear() + '</h2>' + indList(season.slice(0, 5), true) + '<a class="btn link" href="#classifiche" style="margin:4px 0 14px">Vedi tutte le classifiche</a>';
  h += '<h2>Le tue ultime gare</h2>' + (mine.length ? '<div class="list">' + mine.slice(0, 4).map(entryRow).join('') + '</div>' : '<p class="hint">Ancora nessuna gara registrata.</p>');
  return h;
}
function entryRow(e) {
  var r = S.races[e.raceId], p = S.pts[e.id] || {}, st = entryState(e);
  return '<a class="item" href="#gara-' + esc(r.id) + '"><div style="width:40px;text-align:center;flex-shrink:0"><div class="num" style="font-weight:700;font-size:17px">' + int(r.date.slice(8)) + '</div><div class="sm" style="text-transform:uppercase;font-weight:600">' + MESI[int(r.date.slice(5, 7)) - 1] + '</div></div>' +
    '<div class="grow"><b>' + esc(r.name) + ' · ' + fmtKm(e.km) + ' km</b><small>' + fmtTime(e.secs) + ' · ' + fmtPace(e.secs / e.km) + (p.pos ? ' · ' + p.pos + '° su ' + p.n : '') + '</small><span>' + proofPill(e, st) + '</span></div><b style="color:var(--g)">+' + (p.total || 0) + '</b></a>';
}
function indList(list, compact) {
  if (!list.length) return '<p class="hint">Nessun punto ancora: le classifiche si riempiono quando le gare si chiudono.</p>';
  return '<div class="list">' + list.map(function (s, i) {
    var m = S.members[sid(s.uid)] || {}, t = S.teams[m.teamId];
    return '<a class="item' + (s.uid === S.uid ? ' me' : '') + '" href="#atleta-' + esc(s.uid) + '"><span class="pos">' + (s.pos || (i + 1)) + '</span>' + avatarHtml(s.uid, 34) + '<div class="grow"><b>' + esc(s.uid === S.uid ? 'Tu' : (m.nick || 'Runner')) + '</b><small>' + esc(catLabel(category(m.sex, m.birth, new Date().getFullYear())) + ' · ' + (t ? t.name : 'senza squadra') + ' · ' + s.races + (s.races === 1 ? ' gara' : ' gare')) + '</small></div><b>' + fmtN(s.pts) + '</b></a>';
  }).join('') + '</div>';
}

// ---------- registra ----------
function newReg() { return { step: 'gara', q: '', raceId: null, create: false, name: '', date: todayStr(), town: '', dists: '', km: null, h: '', m: '', s: '', proof: 'gpx', gpx: null, shots: [], bib: '', offQ: null, pdf: null }; }
function vRegistra() {
  var R = ui.reg = ui.reg || newReg();
  var steps = { gara: 1, tempo: 2, prova: 3, ufficiale: 3, pdf: 2, riepilogo: 4 }, n = steps[R.step] || 4;
  var head = R.step === 'fatto' ? '' : '<div class="top"><div class="brand">PASSO ' + n + ' DI 4</div><h1>' + { gara: 'Scegli la gara', tempo: 'Percorso e tempo', prova: 'Carica la prova', ufficiale: 'Trovati in classifica', pdf: 'Classifica ufficiale', riepilogo: 'Riepilogo' }[R.step] + '</h1><div class="bar" style="background:#DCCAA9"><div style="width:' + (n * 25) + '%;background:#B5482B"></div></div></div>';
  if (R.step === 'gara') return head + regGara(R);
  if (R.step === 'tempo') return head + regTempo(R);
  if (R.step === 'prova') return head + regProva(R);
  if (R.step === 'riepilogo') return head + regRiepilogo(R);
  if (R.step === 'ufficiale') return head + regUfficiale(R);
  if (R.step === 'pdf') return head + regPdf(R);
  if (R.step === 'fatto') return regFatto(R);
  return '';
}
function recentRaces() { return Object.keys(S.races).map(function (k) { return S.races[k]; }).filter(function (r) { var d = daysSince(r.date); return d >= 0 && d <= CLOSE_DAYS; }); }
function regGara(R) {
  if (R.create) {
    return '<div class="card"><h3>Nuova gara</h3><p class="hint">Sei il primo a registrarla: gli altri la troveranno.</p>' +
      '<label for="rn">Nome della gara</label><input id="rn" type="text" data-bind="reg.name" value="' + esc(R.name) + '" maxlength="60" placeholder="Es. Corsa di Solaro">' +
      '<div class="row2"><div><label for="rd">Data</label><input id="rd" type="date" data-bind="reg.date" value="' + esc(R.date) + '" max="' + todayStr() + '"></div><div><label for="rt">Comune</label><input id="rt" type="text" data-bind="reg.town" value="' + esc(R.town) + '" maxlength="40" placeholder="Es. Solaro"></div></div>' +
      '<label for="rk">Distanze dei percorsi (km)</label><input id="rk" type="text" inputmode="decimal" data-bind="reg.dists" value="' + esc(R.dists) + '" placeholder="Es. 7, 14 (come sul volantino)"><p class="hint">Separate da virgola. Mezza maratona = 21,097.</p>' +
      '<div class="stack"><button class="btn" data-act="regCreate">Crea e continua</button><button class="btn link" data-act="regCreateOff" style="align-self:center">Annulla</button></div></div>';
  }
  var q = R.q.trim().toLowerCase();
  var list = recentRaces().filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) !== -1 || r.town.toLowerCase().indexOf(q) !== -1; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return '<div class="card"><label for="rq" style="margin-top:0">Che gara hai corso?</label><input id="rq" type="search" data-bind="reg.q" data-live="1" value="' + esc(R.q) + '" placeholder="Nome della gara o comune"><p class="hint">Solo le gare degli ultimi 7 giorni.</p>' +
    '<div class="stack" id="raceList">' + raceListHtml(list, q) + '</div>' +
    '<p class="hint" style="margin-top:14px">Non la trovi? Sei il primo a registrarla.</p><button class="btn sec" data-act="regCreateOn">+ Crea una nuova gara</button></div>';
}
function raceListHtml(list, q) {
  return list.length ? list.map(function (r) {
    var n = activeEntries().filter(function (e) { return e.raceId === r.id; }).length;
    var mine = activeEntries().some(function (e) { return e.raceId === r.id && e.uid === S.uid; });
    return '<button class="radio" data-act="regPick" data-v="' + esc(r.id) + '"><b>' + esc(r.name) + '</b><small class="sm">' + esc(dateIt(r.date) + ' · ' + r.town + ' · ' + r.distances.map(fmtKm).join(' / ') + ' km · ' + n + ' registrati' + (mine ? ' · già registrata da te' : '')) + '</small></button>';
  }).join('') : '<p class="hint">' + (q ? 'Nessuna gara trovata con questo nome.' : 'Nessuna gara negli ultimi 7 giorni.') + '</p>';
}
function regTempo(R) {
  var race = S.races[R.raceId]; var secs = int(R.h) * 3600 + int(R.m) * 60 + int(R.s);
  return '<div class="card"><b>' + esc(race.name) + '</b><div class="sm">' + esc(dateIt(race.date, true) + ' · ' + race.town) + '</div>' +
    '<label id="lper">Che percorso hai fatto?</label><div class="chips" role="group" aria-labelledby="lper">' + race.distances.map(function (d) { return '<button data-act="regKm" data-v="' + d + '" aria-pressed="' + (R.km === d) + '">' + fmtKm(d) + ' km</button>'; }).join('') + (race.distances.length < 6 && !R.addKmOpen ? '<button data-act="regAddKmOpen" aria-pressed="false" style="border-style:dashed">+ Altro</button>' : '') + '</div>' +
    (R.addKmOpen ? '<div class="okbox" style="margin-top:10px"><b>Manca il tuo percorso?</b> Aggiungilo alla gara: sarà disponibile per tutti.<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><input id="addKm" type="text" inputmode="decimal" maxlength="5" data-bind="reg.addKm" value="' + esc(R.addKm || '') + '" placeholder="Es. 5" style="flex:1"><span>km</span><button class="btn" data-act="regAddKm" style="width:auto;padding:0 18px">Aggiungi</button></div><button class="btn link" data-act="regAddKmClose" style="min-height:0;padding:6px 0 0">Annulla</button></div>' : '') +
    (R.km && officialFor(race, R.km) ? '<div class="okbox" style="margin-top:12px"><b>Questa gara ha la classifica ufficiale</b> (' + officialFor(race, R.km).n + ' arrivati). Trovati nella lista: tempo e posizione arrivano da lì, senza altre prove.<button class="btn dark" data-act="regToOff" style="margin-top:10px">Cercami nella classifica ufficiale</button></div>' : '') +
    '<label id="ltime">Tempo</label><div class="row3" role="group" aria-labelledby="ltime"><div><input type="number" inputmode="numeric" aria-label="Ore" data-bind="reg.h" data-live="1" value="' + esc(R.h) + '" placeholder="0"><span class="unit">ore</span></div><div><input type="number" inputmode="numeric" aria-label="Minuti" data-bind="reg.m" data-live="1" value="' + esc(R.m) + '" placeholder="00"><span class="unit">min</span></div><div><input type="number" inputmode="numeric" aria-label="Secondi" data-bind="reg.s" data-live="1" value="' + esc(R.s) + '" placeholder="00"><span class="unit">sec</span></div></div>' +
    '<div class="okbox" style="display:flex;justify-content:space-between"><span>Passo medio</span><b id="paceOut">' + (R.km && secs ? fmtPace(secs / R.km) : '—') + '</b></div>' +
    '<label for="rbib">Numero di pettorale <span class="sm">(facoltativo)</span></label><input id="rbib" type="text" inputmode="numeric" data-bind="reg.bib" value="' + esc(R.bib || '') + '" placeholder="Se la gara ne aveva uno" maxlength="12">' +
    (R.km && officialFor(race, R.km) ? '' : '<button class="btn link" data-act="regToPdf" style="margin-top:6px">Hai il PDF della classifica ufficiale (es. ENDU)? Caricalo</button>') +
    '<div class="stack" style="margin-top:14px"><button class="btn" data-act="regToProva" id="toProva" ' + (R.km && secs ? '' : 'disabled') + '>Continua</button><button class="btn link" data-act="regBack" data-v="gara" style="align-self:center">Indietro</button></div></div>';
}
function regProva(R) {
  var gp = R.proof === 'gpx';
  var h = '<div class="card"><div class="seg" role="group" aria-label="Tipo di prova"><button data-act="regProof" data-v="gpx" aria-pressed="' + gp + '">File GPX</button><button data-act="regProof" data-v="shot" aria-pressed="' + !gp + '">Screenshot</button></div>';
  if (gp) h += '<p class="hint" style="margin-top:10px">Verifica automatica di luogo, data, distanza e tempo. Consigliato.</p><label class="drop"><input type="file" id="gpxFile" accept=".gpx,application/gpx+xml,text/xml"><b>Carica il file GPX</b><span class="sm">Esportalo dall’app del tuo orologio</span></label><div id="proofOut">' + (R.gpx ? gpxHtml(R) : '') + '</div>';
  else h += '<p class="hint" style="margin-top:10px">Insieme devono mostrare distanza, tempo e data: se la tua app li divide su più pagine, carica più screenshot (fino a 4). Il luogo lo confermano gli altri partecipanti.</p>' +
    (R.shots.length < 4 ? '<label class="drop"><input type="file" id="shotFile" accept="image/*" multiple><b>' + (R.shots.length ? 'Aggiungi un altro screenshot' : 'Carica gli screenshot') + '</b><span class="sm">Da Strava, Garmin, Coros, Polar, Salute…</span></label>' : '') +
    '<div id="proofOut">' + (R.shots.length ? shotHtml(R) : '') + '</div>';
  var ready = gp ? !!R.gpx : (R.shots.length > 0 && !R.shots.some(function (x) { return x.status === 'loading'; }));
  h += '<div class="stack" style="margin-top:14px"><button class="btn" data-act="regToRiep" ' + (ready ? '' : 'disabled') + '>Continua</button><button class="btn link" data-act="regBack" data-v="tempo" style="align-self:center">Indietro</button></div></div>';
  return h;
}
function regSecs(R) { return int(R.h) * 3600 + int(R.m) * 60 + int(R.s); }
function previewPoints(R) {
  // simula l'inserimento nel gruppo per stimare i punti
  var race = S.races[R.raceId], fake = { id: '__preview', uid: S.uid, raceId: R.raceId, km: R.km, secs: regSecs(R), status: 'ok', teamId: (me() || {}).teamId || null };
  var saved = S.entries, copy = {}; Object.keys(saved).forEach(function (k) { if (!(saved[k].uid === S.uid && saved[k].raceId === R.raceId)) copy[k] = saved[k]; });
  copy.__preview = fake; S.entries = copy; recompute(); var p = S.pts.__preview; S.entries = saved; recompute();
  return p;
}
function ptsTable(p) {
  var rows = [['Partecipazione', 'Percorso da almeno 3 km', p.part]];
  if (p.bonus) rows.push(['Bonus distanza', 'Mezza, oltre 30 km o maratona', p.bonus]);
  rows.push(['Piazzamento generale', p.pos + '° su ' + p.n + (p.official ? ' (classifica ufficiale)' : '') + (p.n < 10 ? ' (pochi partecipanti, punti ridotti)' : ''), p.gen]);
  rows.push(['Piazzamento di categoria ' + catLabel(p.cat), p.cat === '—' ? 'Categoria non disponibile' : p.catPos + '° su ' + p.catN + (p.catN < 5 ? ' (pochi in categoria, punti ridotti)' : ''), p.catPts]);
  rows.push(['Miglioramento', p.impWhy, p.imp]);
  return '<table class="pts"><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '<small>' + esc(r[1]) + '</small></td><td>' + r[2] + '</td></tr>'; }).join('') + '</tbody></table>';
}
function regRiepilogo(R) {
  var race = S.races[R.raceId], secs = regSecs(R), p = previewPoints(R);
  var proof = R.proof === 'gpx' ? (R.gpx.verdict) : (R.shotVerdict + ' (' + R.shots.length + (R.shots.length === 1 ? ' immagine)' : ' immagini)'));
  return '<div class="card"><table class="pts"><tbody>' +
    '<tr><td>Gara</td><td>' + esc(race.name) + '</td></tr><tr><td>Data e luogo</td><td>' + esc(dateIt(race.date) + ' · ' + race.town) + '</td></tr>' +
    '<tr><td>Percorso</td><td>' + fmtKm(R.km) + ' km</td></tr><tr><td>Tempo</td><td>' + fmtTime(secs) + ' (' + fmtPace(secs / R.km) + ')</td></tr><tr><td>Prova</td><td>' + esc(proof) + '</td></tr></tbody></table></div>' +
    '<div class="card"><h3>Punti stimati</h3><p class="hint">Provvisori: cambiano man mano che gli altri registrano, definitivi dopo 7 giorni.</p>' + ptsTable(p) +
    '<div class="total"><span>Totale stimato</span><span class="num">+' + p.total + '</span></div>' +
    '<p class="hint" style="margin-top:12px">Nome, tempo e prova saranno visibili agli altri partecipanti.</p>' +
    '<div class="stack"><button class="btn" data-act="regSave" id="saveBtn">Invia partecipazione</button><button class="btn link" data-act="regBack" data-v="prova" style="align-self:center">Indietro</button></div></div>';
}
function regFatto(R) {
  var e = S.entries[R.savedId], p = e && S.pts[e.id], race = S.races[R.raceId];
  return '<div class="center"><div style="width:84px;height:84px;border-radius:42px;background:#F5DED5;display:flex;align-items:center;justify-content:center" aria-hidden="true"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#B5482B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
    '<h1>Partecipazione registrata</h1><p class="hint" style="max-width:320px">' + (p ? 'Sei ' + p.pos + '° su ' + p.n + ' nella classifica provvisoria di ' + esc(race.name) + ' (+' + p.total + ' punti stimati).' : '') + ' Diventa definitiva dopo 7 giorni.</p>' +
    '<div class="stack" style="width:100%"><button class="btn" data-act="story" data-v="' + esc(R.savedId) + '">Condividi nelle storie</button><a class="btn sec" href="#gara-' + esc(R.raceId) + '">Vedi la classifica della gara</a><button class="btn link" data-act="regNew" style="align-self:center">Registra un’altra gara</button></div></div>';
}

// ---------- GPX ----------
function hav(a, b) { var R = 6371.0088, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r; var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
function parseGpx(text) {
  var doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Il file non è un GPX valido');
  var pts = [].slice.call(doc.getElementsByTagNameNS('*', 'trkpt')); if (!pts.length) pts = [].slice.call(doc.getElementsByTagNameNS('*', 'rtept'));
  if (pts.length < 2) throw new Error('Nel file non ci sono punti di traccia');
  var out = [], dist = 0, up = 0, last = null;
  pts.forEach(function (p) {
    var lat = parseFloat(p.getAttribute('lat')), lon = parseFloat(p.getAttribute('lon')); if (!isFinite(lat) || !isFinite(lon)) return;
    var t = p.getElementsByTagNameNS('*', 'time')[0], e = p.getElementsByTagNameNS('*', 'ele')[0];
    var ele = e ? parseFloat(e.textContent) : null; if (ele !== null && last !== null && ele > last) up += ele - last; if (ele !== null) last = ele;
    var pt = [lat, lon, t ? Date.parse(t.textContent) : NaN]; if (out.length) dist += hav(out[out.length - 1], pt); out.push(pt);
  });
  var t0 = out[0][2], t1 = out[out.length - 1][2], step = Math.max(1, Math.ceil(out.length / 250));
  var simple = out.filter(function (_, i) { return i % step === 0 || i === out.length - 1; }).map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; });
  return { km: +dist.toFixed(3), secs: (isFinite(t0) && isFinite(t1)) ? Math.round((t1 - t0) / 1000) : null, start: isFinite(t0) ? t0 : null, lat: out[0][0], lon: out[0][1], up: Math.round(up), track: simple };
}
function C(cls, sym, t, d) { return '<li><span class="ic ' + cls + '" aria-hidden="true">' + sym + '</span><div><b>' + esc(t) + '</b><small>' + esc(d) + '</small></div></li>'; }
function gpxChecks(g, race, km, secs) {
  var out = [], bad = 0, warn = 0;
  if (race.lat != null) { var dk = hav([race.lat, race.lon], [g.lat, g.lon]); if (dk <= 3) out.push(C('ok', '✓', 'Luogo', 'Partenza a ' + fmtKm(dk) + ' km da quella della gara')); else { out.push(C('ko', '✕', 'Luogo', 'Partenza a ' + fmtKm(dk) + ' km da quella della gara: sembra un’altra corsa')); bad++; } }
  else out.push(C('in', 'i', 'Luogo', 'Prima traccia di questa gara: la sua partenza diventa il riferimento per gli altri'));
  if (g.start) { var ds = localDateStr(new Date(g.start)); if (ds === race.date) out.push(C('ok', '✓', 'Data e ora', dateIt(ds, true) + ', partenza alle ' + new Date(g.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))); else { out.push(C('ko', '✕', 'Data', 'La traccia è del ' + dateIt(ds) + ', la gara del ' + dateIt(race.date))); bad++; } }
  else { out.push(C('wa', '!', 'Data', 'La traccia non ha orari: data non verificabile')); warn++; }
  var dd = (g.km - km) / km; if (Math.abs(dd) <= 0.10) out.push(C('ok', '✓', 'Distanza', fmtKm(g.km) + ' km misurati, percorso da ' + fmtKm(km) + ' km')); else { out.push(C('ko', '✕', 'Distanza', fmtKm(g.km) + ' km misurati contro ' + fmtKm(km) + ' km del percorso')); bad++; }
  if (g.secs != null) { var dt = Math.abs(g.secs - secs); if (dt <= Math.max(60, secs * 0.02)) out.push(C('ok', '✓', 'Tempo', fmtTime(secs) + ' dichiarato, ' + fmtTime(g.secs) + ' nella traccia')); else { out.push(C('wa', '!', 'Tempo', fmtTime(secs) + ' dichiarato, ' + fmtTime(g.secs) + ' nella traccia (pause?)')); warn++; } }
  return { html: out.join(''), ok: bad === 0 && warn === 0, verdict: bad ? 'GPX con problemi' : (warn ? 'GPX da controllare' : 'GPX verificato') };
}
function gpxHtml(R) {
  var g = R.gpx, race = S.races[R.raceId]; if (g.error) return '<ul class="checks">' + C('ko', '✕', 'File non leggibile', g.error) + '</ul>';
  var c = gpxChecks(g, race, R.km, regSecs(R)); g.verdict = c.verdict; g.ok = c.ok;
  return '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center"><span class="pill ' + (c.ok ? 'g' : 'n') + '">' + c.verdict + '</span>' + (g.secs != null && Math.abs(g.secs - regSecs(R)) > 1 ? '<button class="btn link" data-act="useGpxTime">Usa il tempo del GPX</button>' : '') + '</div>' + trackSvg(g.track) + '<ul class="checks">' + c.html + '</ul>';
}
function trackSvg(pts, h) {
  if (!pts || pts.length < 2) return '';
  var la = pts.map(function (p) { return p[0]; }), lo = pts.map(function (p) { return p[1]; });
  var minLa = Math.min.apply(null, la), maxLa = Math.max.apply(null, la), minLo = Math.min.apply(null, lo), maxLo = Math.max.apply(null, lo);
  var k = Math.cos((minLa + maxLa) / 2 * Math.PI / 180), W = 520, H = h || 140, pad = 12;
  var sx = (maxLo - minLo) * k || 1e-6, sy = (maxLa - minLa) || 1e-6, sc = Math.min((W - 2 * pad) / sx, (H - 2 * pad) / sy), ox = (W - sx * sc) / 2, oy = (H - sy * sc) / 2;
  var P = function (p) { return [ox + (p[1] - minLo) * k * sc, H - oy - (p[0] - minLa) * sc]; };
  var d = pts.map(function (p, i) { var q = P(p); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
  var a = P(pts[0]), b = P(pts[pts.length - 1]);
  return '<svg class="track" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Traccia GPX"><path d="' + d + '" fill="none" stroke="#171512" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="6" fill="#171512"/><circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="6" fill="#C2410C"/></svg>';
}

// ---------- screenshot + OCR ----------
var ocrWorker = null, ocrLoading = null;
function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('script non caricato')); }; document.head.appendChild(s); }); }
function getOcr() {
  if (ocrWorker) return Promise.resolve(ocrWorker); if (ocrLoading) return ocrLoading;
  ocrLoading = Promise.race([
    loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js').then(function () { return Tesseract.createWorker(['ita', 'eng'], 1); }).then(function (w) { ocrWorker = w; return w; }),
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error('tempo scaduto')); }, 90000); })
  ]);
  ocrLoading.catch(function () { ocrLoading = null; });
  return ocrLoading;
}
function analyzeText(text, km, secs, dateStr) {
  var t = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0').replace(/\s+/g, ' '), res = {}, m;
  var nums = (t.match(/\d{1,3}[.,]\d{1,3}/g) || []).map(num), hit = null;
  nums.forEach(function (v) { if (Math.abs(v - km) / km <= 0.10 && (hit === null || Math.abs(v - km) < Math.abs(hit - km))) hit = v; }); res.dist = hit;
  var c = [], re = /(\d{1,2})\s?[:h]\s?(\d{2})\s?[:m'’]\s?(\d{2})/g; while ((m = re.exec(t))) c.push(int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]));
  var re2 = /(?<![\d:])(\d{1,3})\s?[:'’]\s?(\d{2})(?![\d:])/g; while ((m = re2.exec(t))) c.push(int(m[1]) * 60 + int(m[2]));
  var re3 = /(\d{1,2})\s?h\s?(\d{1,2})\s?m(?:in)?\b/gi; while ((m = re3.exec(t))) c.push(int(m[1]) * 3600 + int(m[2]) * 60);
  var th = null; c.forEach(function (x) { if (Math.abs(x - secs) <= Math.max(10, secs * 0.01) && (th === null || Math.abs(x - secs) < Math.abs(th - secs))) th = x; }); res.time = th;
  var low = t.toLowerCase(), mo = int(dateStr.slice(5, 7)), dd = int(dateStr.slice(8, 10));
  res.date = [new RegExp('\\b0?' + dd + '[\\/.\\-]0?' + mo + '\\b'), new RegExp('\\b0?' + dd + '\\s?' + MESI[mo - 1]), new RegExp('\\b' + MESI_EN[mo - 1] + '[a-z]*\\.?\\s?0?' + dd + '\\b'), new RegExp('\\b0?' + dd + '\\s?' + MESI_EN[mo - 1])].some(function (p) { return p.test(low); });
  res.rel = /\b(oggi|ieri|today|yesterday)\b/.test(low);
  return res;
}
function shotHtml(R) {
  var imgs = '<div style="display:grid;grid-template-columns:repeat(' + Math.min(R.shots.length, 2) + ',minmax(0,1fr));gap:8px;margin-top:10px">' + R.shots.map(function (x, i) {
    return '<div style="position:relative"><img class="shot" style="margin:0;width:100%;max-height:220px;object-fit:contain;background:#F3EADB" src="' + esc(x.url) + '" alt="Screenshot ' + (i + 1) + '">' +
      '<button data-act="shotDel" data-v="' + i + '" aria-label="Rimuovi screenshot ' + (i + 1) + '" style="position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:16px;border:0;background:rgba(23,21,18,.75);color:#fff;font-weight:700;cursor:pointer">✕</button>' +
      (x.status === 'loading' ? '<span class="pill n" style="position:absolute;left:6px;bottom:6px">lettura…</span>' : '') + '</div>';
  }).join('') + '</div>';
  if (R.shots.some(function (x) { return x.status === 'loading'; })) return imgs + '<p class="hint" style="margin-top:10px">Lettura degli screenshot in corso…</p>';
  var out = [], ok = 0, done = R.shots.filter(function (x) { return x.status === 'done'; });
  if (!done.length) out.push(C('wa', '!', 'Lettura automatica non disponibile', 'La prova resta valida: la controllano gli altri partecipanti.'));
  else {
    var race = S.races[R.raceId], r = analyzeText(done.map(function (x) { return x.text; }).join('\n'), R.km, regSecs(R), race.date);
    if (r.dist !== null) { out.push(C('ok', '✓', 'Distanza trovata', fmtKm(r.dist) + ' km negli screenshot')); ok++; } else out.push(C('wa', '!', 'Distanza non trovata', 'Non vedo una distanza vicina a ' + fmtKm(R.km) + ' km'));
    if (r.time !== null) { out.push(C('ok', '✓', 'Tempo trovato', fmtTime(r.time) + ' negli screenshot')); ok++; } else out.push(C('wa', '!', 'Tempo non trovato', 'Non vedo ' + fmtTime(regSecs(R)) + ' negli screenshot'));
    if (r.date) { out.push(C('ok', '✓', 'Data trovata', 'La data della gara compare negli screenshot')); ok++; } else out.push(C('wa', '!', r.rel ? 'Data relativa' : 'Data non trovata', r.rel ? 'Dice «oggi» o «ieri»: valida solo se caricato subito' : 'La data della gara non compare: puoi aggiungere uno screenshot che la mostri'));
    if (done.length < R.shots.length) out.push(C('wa', '!', 'Alcune immagini non lette', (R.shots.length - done.length) + ' screenshot non leggibili automaticamente'));
  }
  out.push(C('wa', '!', 'Luogo da confermare', 'Lo verificano gli altri partecipanti nei 7 giorni'));
  R.shotOk = ok === 3; R.shotVerdict = ok === 3 ? 'Screenshot, dati trovati' : 'Screenshot da verificare';
  return '<div style="margin-top:12px"><span class="pill ' + (ok === 3 ? 'g' : 'n') + '">' + R.shotVerdict + '</span></div>' + imgs + '<ul class="checks">' + out.join('') + '</ul>';
}
async function shrinkImage(file) {
  var url = URL.createObjectURL(file), img = new Image(); img.src = url; await img.decode();
  var sc = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.82); });
}

// ---------- pagina gara ----------
function vGara(id) {
  var race = S.races[id]; if (!race) return '<div class="center"><p class="hint">Gara non trovata.</p><a class="btn sec" href="#home">Torna alla home</a></div>';
  var all = activeEntries().filter(function (e) { return e.raceId === id; });
  var routes = race.distances.slice(); all.forEach(function (e) { if (routes.indexOf(e.km) < 0) routes.push(e.km); });
  var withN = routes.map(function (k) { return [k, all.filter(function (e) { return e.km === k; }).length]; });
  var route = ui.race.route != null && routes.indexOf(ui.race.route) >= 0 && ui.race.raceId === id ? ui.race.route : (withN.slice().sort(function (a, b) { return b[1] - a[1]; })[0] || [routes[0]])[0];
  ui.race.route = route; ui.race.raceId = id;
  var list = all.filter(function (e) { return e.km === route; }).sort(function (a, b) { var pa = S.pts[a.id] || {}, pb = S.pts[b.id] || {}; if (pa.official && pb.official) return pa.pos - pb.pos; return a.secs - b.secs; });
  var closed = isClosed(race.date), left = CLOSE_DAYS - daysSince(race.date);
  var creator = S.members[sid(race.createdBy)];
  var h = '<div class="top"><div style="display:flex;justify-content:space-between"><a href="#home" class="btn link" style="color:#171512;padding:0" aria-label="Indietro">← Indietro</a></div>' +
    '<div><div class="sub">' + esc(dateIt(race.date, true) + ' · ' + race.town) + '</div><h1>' + esc(race.name) + '</h1><div class="sub">' + esc('Creata da ' + (creator ? creator.nick : 'un runner') + ' · ' + all.length + ' partecipanti') + '</div></div>' +
    '<div class="banner"><span>' + (closed ? 'Classifica <b>definitiva</b>' : 'Classifica <b>provvisoria</b>: definitiva tra ' + Math.max(0, left) + (Math.max(0, left) === 1 ? ' giorno' : ' giorni')) + '</span></div></div>';
  h += (routes.length > 1 ? '<div class="seg" role="group" aria-label="Percorso" style="margin-bottom:12px">' + withN.map(function (x) { return '<button data-act="raceRoute" data-v="' + x[0] + '" aria-pressed="' + (x[0] === route) + '">' + fmtKm(x[0]) + ' km · ' + x[1] + '</button>'; }).join('') + '</div>' : '');
  var offR = officialFor(race, route);
  if (offR) h += '<div class="okbox" style="margin-bottom:10px"><b>Classifica ufficiale caricata</b>: ' + offR.n + ' arrivati sui ' + fmtKm(route) + ' km. I punti di chi si è riconosciuto si calcolano su questa classifica.' + (offR.by === S.uid && !closed ? '<button class="btn link" data-act="pdfDelete" data-v="' + esc(id) + '" data-km="' + route + '" style="padding:0;margin-top:4px">Eliminala (se è stata letta male)</button>' : '') + '</div>';
  else if (!closed) h += '<button class="btn sec" data-act="pdfFor" data-v="' + esc(id) + '" style="margin-bottom:10px">Carica la classifica ufficiale (PDF)</button>';
  h += '<p class="hint">Tocca un runner per vedere la prova, confermarla o segnalarla.</p>';
  h += list.length ? '<div class="list">' + list.map(function (e) {
    var p = S.pts[e.id] || {}, m = S.members[sid(e.uid)] || {}, t = S.teams[e.teamId], st = entryState(e);
    return '<button class="item' + (e.uid === S.uid ? ' me' : '') + '" data-act="entry" data-v="' + esc(e.id) + '"><span class="pos">' + (p.pos || '') + (p.official ? '<small class="sm" style="display:block;font-weight:400">uff.</small>' : '') + '</span><span class="grow"><b>' + esc(e.uid === S.uid ? m.nick + ' (tu)' : m.nick || 'Runner') + '</b><small>' + esc(catLabel(p.cat || '—') + ' · ' + (t ? t.name : 'senza squadra') + ' · ' + fmtPace(e.secs / e.km)) + '</small></span><span class="right"><b>' + fmtTime(e.secs) + '</b>' + proofPill(e, st) + '</span></button>';
  }).join('') + '</div>' : '<p class="hint">Nessuno ha ancora registrato questo percorso.</p>';
  var mine = all.filter(function (e) { return e.uid === S.uid; })[0];
  if (!mine && !closed) h += '<div style="margin-top:14px"><button class="btn" data-act="regFor" data-v="' + esc(id) + '">C’ero anch’io: registra la mia gara</button></div>';
  return h;
}
function canActOn(e) { var race = S.races[e.raceId]; return e.uid !== S.uid && !isClosed(race.date) && activeEntries().some(function (x) { return x.raceId === e.raceId && x.uid === S.uid; }); }
function isModerator(e) { if (S.isOwner) return true; var m = me(); if (!m || !m.teamId) return false; var t = S.teams[m.teamId]; return t && (t.admins || []).indexOf(S.uid) >= 0 && m.teamId !== e.teamId; }
function entrySheet(id, mode) {
  var e = S.entries[id]; if (!e) return closeSheet();
  var p = S.pts[e.id] || {}, m = S.members[sid(e.uid)] || {}, t = S.teams[e.teamId], st = entryState(e), race = S.races[e.raceId];
  var h = '<div class="panel" role="dialog" aria-label="Dettaglio partecipazione"><div style="width:40px;height:5px;border-radius:3px;background:#DCCFB8;margin:0 auto 12px" aria-hidden="true"></div>';
  if (mode === 'report') {
    var reasons = ['Non era alla gara', 'Tempo non plausibile', 'Screenshot di un’altra corsa', 'Distanza diversa da quella dichiarata'];
    h += '<h2>Cosa non torna?</h2><p class="hint">Partecipazione di ' + esc(m.nick) + '. Chi viene segnalato vede il motivo, non chi l’ha segnalato.</p><div class="stack" role="radiogroup" aria-label="Motivo">' +
      reasons.map(function (r, i) { return '<button class="radio" role="radio" aria-checked="' + (ui.reportReason === i) + '" data-act="repReason" data-v="' + i + '" data-e="' + esc(id) + '"><b>' + esc(r) + '</b></button>'; }).join('') + '</div>' +
      '<div class="stack" style="margin-top:12px"><button class="btn" style="background:#9A3412" data-act="repSend" data-v="' + esc(id) + '" ' + (ui.reportReason == null ? 'disabled' : '') + '>Invia segnalazione</button><button class="btn link" data-act="entry" data-v="' + esc(id) + '" style="align-self:center">Annulla</button></div></div>';
    return openSheet(h);
  }
  h += '<div style="display:flex;justify-content:space-between;gap:10px"><div style="display:flex;gap:10px;align-items:center">' + avatarHtml(e.uid, 44) + '<div><h2 style="margin:0"><a href="#atleta-' + esc(e.uid) + '" data-act="closeSheet" style="color:inherit">' + esc(m.nick || 'Runner') + '</a></h2><div class="sm">' + esc((p.pos ? p.pos + '° su ' + p.n + ' · ' : '') + catLabel(p.cat || '—') + ' · ' + (t ? t.name : 'senza squadra')) + '</div></div></div><div style="text-align:right"><div class="num" style="font-size:22px;font-weight:700">' + fmtTime(e.secs) + '</div><div class="sm">' + fmtPace(e.secs / e.km) + '</div></div></div>';
  if (st.contested) h += '<div class="note">In verifica: segnalata da almeno due partecipanti. ' + (e.uid === S.uid ? 'Puoi aggiungere una prova (GPX o foto) e un messaggio per il moderatore.' : 'Decide un moderatore di un’altra squadra.') + '</div>';
  if (e.defense) h += '<div class="okbox"><b>Risposta di ' + esc(m.nick) + ':</b> ' + esc(e.defense) + '</div>';
  if (e.resultId && e.official) { var o = e.official; h += '<div class="okbox"><b>Risultato ufficiale</b>: ' + o.pos + '° su ' + o.n + (o.cat ? ' · ' + esc(o.cat) + ' ' + o.catPos + '° su ' + o.catN : '') + '<br>Nome nella classifica: <b>' + esc(o.name) + '</b>' + (e.bib ? ' · pettorale ' + esc(e.bib) : '') + '<br><span class="sm">Corrispondenza: ' + [o.surnameOk ? 'cognome' : '', o.bibOk ? 'pettorale' : ''].filter(Boolean).join(' e ') + '</span></div>'; }
  else if (e.proof === 'gpx') h += trackSvg(e.track) + '<div class="okbox">' + esc(e.proofNote || 'GPX caricato') + '</div>';
  else { var ids = e.assetIds || (e.assetId ? [e.assetId] : []); h += (ids.length ? ids.map(function (a, i) { return '<img class="shot" src="' + esc(publicUrl(a)) + '" alt="Screenshot ' + (i + 1) + ' della corsa">'; }).join('') : '<p class="hint">Screenshot non salvato.</p>'); h += ''; }
  if (!e.resultId && e.proof !== 'gpx') h += '<div class="okbox">' + esc(e.proofNote || 'Screenshot') + '</div>';
  if (e.bib && !e.resultId) h += '<p class="sm" style="margin-top:6px">Pettorale ' + esc(e.bib) + '</p>';
  h += '<p class="sm" style="margin-top:10px">' + (st.confirms ? 'Confermata da ' + st.confirms + (st.confirms === 1 ? ' partecipante' : ' partecipanti') : 'Ancora nessuna conferma') + (st.reports ? ' · ' + st.reports + (st.reports === 1 ? ' segnalazione' : ' segnalazioni') : '') + '</p>';
  h += '<table class="pts" style="margin-top:6px"><tbody><tr><td>Punti ' + (p.closed ? 'definitivi' : 'provvisori') + '</td><td>+' + (p.total || 0) + '</td></tr></tbody></table>';
  var acts = '';
  if (canActOn(e)) {
    var confirmed = st.confirmUids.indexOf(S.uid) >= 0, reported = st.reportUids.indexOf(S.uid) >= 0;
    acts += '<button class="btn ' + (confirmed ? 'sec' : 'dark') + '" data-act="confirm" data-v="' + esc(id) + '" aria-pressed="' + confirmed + '">' + (confirmed ? '✓ Hai confermato' : 'Ero lì, confermo') + '</button>';
    acts += reported ? '<button class="btn danger" data-act="unreport" data-v="' + esc(id) + '">Ritira la tua segnalazione</button>' : '<button class="btn danger" data-act="report" data-v="' + esc(id) + '">Segnala un problema</button>';
  } else if (e.uid !== S.uid && !isClosed(race.date)) acts += '<p class="hint">Possono confermare o segnalare solo i partecipanti alla stessa gara.</p>';
  if (e.uid === S.uid) {
    acts += '<button class="btn" data-act="story" data-v="' + esc(id) + '">Condividi nelle storie</button>';
    if (st.contested) acts += '<label for="def">Messaggio per il moderatore</label><input id="def" type="text" maxlength="200" value="' + esc(e.defense || '') + '" placeholder="Es. ho caricato la foto all’arrivo"><button class="btn sec" data-act="defense" data-v="' + esc(id) + '">Invia</button>';
    if (!isClosed(race.date)) acts += '<button class="btn danger" data-act="delEntry" data-v="' + esc(id) + '">Elimina la mia partecipazione</button>';
  }
  if (st.contested && isModerator(e)) acts += '<div class="card" style="margin-top:8px;background:#FBF7F0"><b>Moderazione</b><p class="hint">Sei moderatore: decidi tu.</p><div class="row2"><button class="btn dark" data-act="modOk" data-v="' + esc(id) + '">Valida</button><button class="btn" style="background:var(--bad)" data-act="modRemove" data-v="' + esc(id) + '">Rimuovi</button></div></div>';
  h += '<div class="stack" style="margin-top:12px">' + acts + '<button class="btn link" data-act="closeSheet" style="align-self:center">Chiudi</button></div></div>';
  openSheet(h);
}
function publicUrl(path) { return sb.storage.from('screenshots').getPublicUrl(path).data.publicUrl; }
function openSheet(inner) { $('sheet').innerHTML = '<div class="sheet" data-act="sheetBg">' + inner + '</div>'; var f = $('sheet').querySelector('button,input'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { $('sheet').innerHTML = ''; ui.reportReason = null; }

// ---------- classifiche ----------
function monthsAvailable() { var y = String(new Date().getFullYear()), set = {}; activeEntries().forEach(function (e) { var d = S.races[e.raceId].date; if (d.slice(0, 4) === y) set[d.slice(0, 7)] = 1; }); set[todayStr().slice(0, 7)] = 1; return Object.keys(set).sort().reverse(); }
function vClassifiche() {
  var c = ui.cls, months = monthsAvailable();
  var h = '<div class="top"><h1>Classifiche</h1><div class="seg" role="group" aria-label="Tipo" style="background:#DCCAA9"><button data-act="cls" data-k="kind" data-v="ind" aria-pressed="' + (c.kind === 'ind') + '">Individuale</button><button data-act="cls" data-k="kind" data-v="team" aria-pressed="' + (c.kind === 'team') + '">Squadre</button></div></div>';
  h += '<div class="chips" role="group" aria-label="Periodo" style="margin-bottom:10px">' + [['season', 'Stagione ' + new Date().getFullYear()]].concat(months.map(function (m) { return [m, MESI_L[int(m.slice(5)) - 1].replace(/^./, function (x) { return x.toUpperCase(); })]; })).map(function (o) { return '<button data-act="cls" data-k="period" data-v="' + o[0] + '" aria-pressed="' + (c.period === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  if (c.kind === 'ind') {
    h += '<div class="seg" role="group" aria-label="Sesso" style="margin-bottom:8px">' + [['all', 'Tutti'], ['F', 'Donne'], ['M', 'Uomini']].map(function (o) { return '<button data-act="cls" data-k="sex" data-v="' + o[0] + '" aria-pressed="' + (c.sex === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    if (c.sex !== 'all') h += '<div class="chips" role="group" aria-label="Categoria FIDAL" style="margin-bottom:10px">' + [['all', 'Tutte']].concat(['', '35', '40', '45', '50', '55', '60'].map(function (a) { var code = 'S' + c.sex + a; return [code, catLabel(code)]; })).map(function (o) { return '<button data-act="cls" data-k="cat" data-v="' + o[0] + '" aria-pressed="' + (c.cat === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    var y = new Date().getFullYear();
    var list = standingsInd(c.period).filter(function (s) { var m = S.members[sid(s.uid)] || {}; if (c.sex !== 'all' && m.sex !== c.sex) return false; if (c.cat !== 'all' && category(m.sex, m.birth, y) !== c.cat) return false; return true; });
    var pos = 0, prev = null; list.forEach(function (s, i) { if (s.pts !== prev) pos = i + 1; s.pos = pos; prev = s.pts; });
    h += indList(list);
    var mi = list.findIndex(function (s) { return s.uid === S.uid; });
    h += '<p class="hint" style="margin-top:10px">' + (mi >= 0 ? 'Sei ' + list[mi].pos + '° su ' + list.length + '.' : 'Non sei in questa classifica.') + ' Contano solo le gare chiuse (dopo 7 giorni).</p>';
  } else {
    h += '<div class="seg" role="group" aria-label="Classifica squadre" style="margin-bottom:8px"><button data-act="cls" data-k="tmode" data-v="tot" aria-pressed="' + (c.tmode === 'tot') + '">Totale</button><button data-act="cls" data-k="tmode" data-v="avg" aria-pressed="' + (c.tmode === 'avg') + '">Media per gara</button></div>';
    var minG = c.period === 'season' ? 15 : 3;
    h += '<p class="hint">' + (c.tmode === 'avg' ? 'Punti diviso gare corse. Servono almeno 3 atleti e ' + minG + ' gare ' + (c.period === 'season' ? 'nella stagione.' : 'nel mese.') : 'Somma dei punti di tutti i membri: premia la squadra più presente.') + '</p>';
    var tl = standingsTeam(c.period, c.tmode), myTeam = (me() || {}).teamId, r = 0;
    h += tl.length ? '<div class="list">' + tl.map(function (t) {
      var team = S.teams[t.teamId]; if (t.ok) r++;
      var miss = []; if (t.athN < 3) miss.push((3 - t.athN) + (3 - t.athN === 1 ? ' atleta' : ' atleti')); if (t.races < t.minG) miss.push((t.minG - t.races) + (t.minG - t.races === 1 ? ' gara' : ' gare'));
      return '<div class="item' + (t.teamId === myTeam ? ' me' : '') + (t.ok ? '' : ' out') + '"><span class="pos">' + (t.ok ? r : '–') + '</span>' + shieldHtml(team, 30) + '<div class="grow"><b>' + esc(team.name) + '</b><small>' + esc(t.ok ? t.athN + ' atleti · ' + t.races + ' gare' + (c.tmode === 'avg' ? ' · ' + fmtN(t.pts) + ' pt' : '') : 'Fuori classifica: mancano ' + miss.join(' e ')) + '</small></div><b>' + (t.ok ? (c.tmode === 'avg' ? fmt1(t.avg) : fmtN(t.pts)) : '') + '</b></div>';
    }).join('') + '</div>' : '<p class="hint">Nessuna squadra ha ancora punti in questo periodo.</p>';
  }
  h += '<details class="card" style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">Come si calcolano i punti</summary><div class="hint" style="margin-top:8px">' +
    '<p><b>Partecipazione:</b> 10 punti per ogni gara da almeno 3 km. Bonus: mezza maratona +5, oltre 30 km +10, maratona +15.</p>' +
    '<p><b>Piazzamento:</b> fino a 20 punti nella classifica generale del tuo percorso e fino a 10 in quella di categoria FIDAL. Il primo prende il massimo, l’ultimo 0. Con meno di 10 partecipanti (5 in categoria) i punti si riducono in proporzione.</p>' +
    '<p><b>Miglioramento:</b> +5 se corri almeno il 2% più veloce della mediana delle tue ultime 5 gare nella stessa fascia di distanza (servono almeno 3 gare).</p>' +
    '<p><b>Squadre:</b> Totale = somma dei punti dei membri; Media = totale diviso le gare.</p></div></details>';
  return h;
}

// ---------- squadra ----------
function vSquadra() {
  var m = me(), team = S.teams[m.teamId];
  if (!team) {
    var o = ui.onb = ui.onb || { step: 'squadra', tq: '', code: '', newTeam: '', town: '', color: COLORS[0][0], access: 'open' };
    return '<div class="top"><h1>Squadra</h1><p class="sub">Corri senza squadra. Puoi unirti a una squadra o crearne una: i punti che farai da ora contano anche per lei.</p></div><div class="stack"><button class="btn" data-act="goJoin">Unisciti o crea una squadra</button></div>';
  }
  var y = new Date().getFullYear(), tt = standingsTeam('season', 'tot'), ta = standingsTeam('season', 'avg').filter(function (t) { return t.ok; });
  var pt = tt.findIndex(function (t) { return t.teamId === team.id; }), pa = ta.findIndex(function (t) { return t.teamId === team.id; }), mine = tt[pt];
  var members = Object.keys(S.members).map(function (k) { return S.members[k]; }).filter(function (x) { return x.teamId === team.id; });
  var season = standingsInd('season'), byUid = {}; season.forEach(function (s) { byUid[s.uid] = s; });
  members.sort(function (a, b) { return ((byUid[b.uid] || {}).pts || 0) - ((byUid[a.uid] || {}).pts || 0); });
  var isAdmin = (team.admins || []).indexOf(S.uid) >= 0;
  var h = '<div class="top"><div style="display:flex;gap:14px;align-items:center">' + shieldHtml(team, 56) + '<div><h1>' + esc(team.name) + '</h1><div class="sub">' + esc((team.town ? team.town + ' · ' : '') + members.length + (members.length === 1 ? ' atleta' : ' atleti') + (isAdmin ? ' · sei amministratore' : '')) + '</div></div></div>' +
    '<div class="stats"><div class="stat"><span class="num">' + (pt >= 0 ? (pt + 1) + 'ª' : '—') + '</span><span>Totale' + (mine ? ' · ' + fmtN(mine.pts) : '') + '</span></div><div class="stat"><span class="num">' + (pa >= 0 ? (pa + 1) + 'ª' : '—') + '</span><span>Media' + (pa >= 0 ? ' · ' + fmt1(ta[pa].avg) : '') + '</span></div><div class="stat"><span class="num">' + (mine ? mine.races : 0) + '</span><span>gare in stagione</span></div></div>' +
    (pt > 0 ? '<div class="banner"><span>Nel Totale ' + (tt[pt - 1].pts - mine.pts === 1 ? 'manca 1 punto' : 'mancano ' + fmtN(tt[pt - 1].pts - mine.pts) + ' punti') + ' per raggiungere ' + esc(S.teams[tt[pt - 1].teamId].name) + '</span></div>' : '') + '</div>';
  h += '<div class="seg" role="group" aria-label="Sezione" style="margin-bottom:12px"><button data-act="teamTab" data-v="members" aria-pressed="' + (ui.team.tab === 'members') + '">Atleti</button><button data-act="teamTab" data-v="races" aria-pressed="' + (ui.team.tab === 'races') + '">Gare della squadra</button></div>';
  if (ui.team.tab === 'members') {
    h += '<div class="list">' + members.map(function (x, i) { var s = byUid[x.uid] || { pts: 0, races: 0 }; return '<a class="item' + (x.uid === S.uid ? ' me' : '') + '" href="#atleta-' + esc(x.uid) + '"><span class="pos">' + (i + 1) + '</span>' + avatarHtml(x.uid, 38) + '<div class="grow"><b>' + esc(x.uid === S.uid ? x.nick + ' (tu)' : x.nick) + ((team.admins || []).indexOf(x.uid) >= 0 ? ' · admin' : '') + '</b><small>' + esc(catLabel(category(x.sex, x.birth, y)) + ' · ' + s.races + (s.races === 1 ? ' gara' : ' gare')) + '</small></div><b>' + fmtN(s.pts) + '</b></a>'; }).join('') + '</div>';
  } else {
    var races = {}; activeEntries().forEach(function (e) { if (e.teamId !== team.id) return; var r = races[e.raceId] = races[e.raceId] || { race: S.races[e.raceId], n: 0, pts: 0, best: null }; r.n++; var p = S.pts[e.id]; if (p) { r.pts += p.total; if (!r.best || p.pos < r.best.p.pos) r.best = { e: e, p: p }; } });
    var rl = Object.keys(races).map(function (k) { return races[k]; }).sort(function (a, b) { return a.race.date < b.race.date ? 1 : -1; }), maxN = Math.max.apply(null, rl.map(function (r) { return r.n; }).concat([1]));
    h += rl.length ? '<div class="stack">' + rl.map(function (r) { var rec = r.n === maxN && rl.length > 1; return '<a class="card" style="margin:0;text-decoration:none;color:inherit;display:block" href="#gara-' + esc(r.race.id) + '"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>' + esc(r.race.name) + '</b><div class="sm">' + esc(dateIt(r.race.date) + ' · ' + r.race.town) + '</div></div><b style="color:var(--g)">+' + r.pts + ' pt</b></div><div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div class="bar" style="flex:1;margin:0"><div style="width:' + Math.round(r.n / maxN * 100) + '%;background:' + (rec ? 'var(--o)' : 'var(--g)') + '"></div></div><span class="sm">' + r.n + ' atleti</span></div>' + (r.best ? '<div class="sm" style="margin-top:6px">Migliore: ' + esc(memberName(r.best.e.uid)) + ', ' + r.best.p.pos + '° sui ' + fmtKm(r.best.e.km) + ' km</div>' : '') + (rec ? '<span class="pill g" style="margin-top:6px">Record di partecipazione</span>' : '') + '</a>'; }).join('') + '</div>' : '<p class="hint">La squadra non ha ancora gare.</p>';
  }
  if (isAdmin) h += '<div class="card" style="margin-top:14px"><b>Logo della squadra</b><p class="hint">Compare nelle classifiche e nelle storie. Meglio un’immagine quadrata, con sfondo trasparente (PNG).</p><div style="display:flex;gap:14px;align-items:center">' + shieldHtml(team, 64) + '<label class="btn sec" style="flex:1;position:relative">' + (team.logo ? 'Cambia il logo' : 'Carica il logo') + '<input type="file" id="teamLogoFile" accept="image/png,image/jpeg,image/webp" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>' + (team.logo ? '<button class="btn link" data-act="teamLogoDel" style="margin-top:6px">Togli il logo</button>' : '') + '</div>';
  h += '<div class="card" style="margin-top:14px"><b>Invita un compagno</b><p class="hint">Mandagli il link dell’app e il codice squadra' + (team.access === 'invite' ? ', obbligatorio per entrare' : '') + '.</p><div class="code">' + esc(S.myCode || '—') + '</div><div class="row2" style="margin-top:10px"><button class="btn sec" data-act="copyCode" data-v="' + esc(S.myCode || '') + '">Copia il codice</button><button class="btn sec" data-act="copyInvite" data-v="' + esc(S.myCode || '') + '">Copia l’invito</button></div></div>';
  h += '<button class="btn link" data-act="logout" style="margin:8px auto 0;display:flex">Esci dall’account</button>';
  return h;
}

// ---------- profilo ----------
function vProfilo(uid) {
  uid = uid || S.uid; var isMe = uid === S.uid, m = S.members[sid(uid)];
  if (!m) return '<div class="top"><a href="#classifiche" class="btn link" style="color:#171512;padding:0;align-self:flex-start">← Classifiche</a><h1>Atleta non trovato</h1></div>';
  var y = new Date().getFullYear(), team = S.teams[m.teamId];
  var mine = activeEntries().filter(function (e) { return e.uid === uid; }).sort(function (a, b) { return S.races[a.raceId].date < S.races[b.raceId].date ? 1 : -1; });
  var thisY = mine.filter(function (e) { return S.races[e.raceId].date.slice(0, 4) === String(y); });
  var season = standingsInd('season'), si = season.findIndex(function (s) { return s.uid === uid; });
  var km = thisY.reduce(function (s, e) { return s + e.km; }, 0), towns = {}; thisY.forEach(function (e) { towns[S.races[e.raceId].town.toLowerCase()] = 1; });
  var h = '<div class="top">' + (isMe ? '' : '<a href="javascript:history.back()" class="btn link" style="color:#171512;padding:0;align-self:flex-start;min-height:0;margin-bottom:6px">← Indietro</a>') + '<div style="display:flex;gap:14px;align-items:center">' + avatarHtml(uid, 64, true) + '<div class="grow"><h1>' + esc(m.nick) + '</h1><div class="sub">' + esc(catLabel(category(m.sex, m.birth, y)) + ' · ' + (team ? team.name : 'senza squadra')) + '</div></div>' + (isMe ? '<a class="btn link" href="#modifica" style="color:#171512">Modifica</a>' : (team ? shieldHtml(team, 40) : '')) + '</div>' +
    (m.bio ? '<div class="bio">' + bioHtml(m.bio) + '</div>' : (isMe ? '<a class="bio" href="#modifica" style="display:block;color:var(--mut);text-decoration:none">+ Aggiungi una breve bio</a>' : '')) +
    '<div class="stats"><div class="stat"><span class="num">' + (si >= 0 ? fmtN(season[si].pts) : 0) + '</span><span>punti · ' + (si >= 0 ? (si + 1) + '°' : '—') + '</span></div><div class="stat"><span class="num">' + thisY.length + '</span><span>gare · ' + Object.keys(towns).length + ' comuni</span></div><div class="stat"><span class="num">' + fmtN(Math.round(km)) + '</span><span>km in gara</span></div></div></div>';
  // record personali
  var pbs = m.pbs || {}, anyPb = PB_KEYS.some(function (k) { return pbs[k[0]]; });
  if (anyPb || isMe) h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Record personali</h3>' + (isMe ? '<a href="#modifica" class="sm" style="font-weight:600">' + (anyPb ? 'Modifica' : 'Aggiungi') + '</a>' : '') + '</div>' +
    '<div class="pbgrid">' + PB_KEYS.map(function (k) { var v = pbs[k[0]]; return '<div class="pb"><span>' + k[1] + '</span><b class="num">' + (v ? fmtTime(v) : '—') + '</b>' + (v ? '<small>' + fmtPace(v / Number(k[0])) + '</small>' : '') + '</div>'; }).join('') + '</div>' +
    (isMe && !anyPb ? '<p class="hint" style="margin-top:8px">Aggiungi i tuoi PB: li vedranno anche gli altri atleti.</p>' : '') + '</div>';
  // grafico mensile
  var per = []; for (var i = 0; i < 12; i++) per.push({ pts: 0, secs: 0, km: 0 });
  thisY.forEach(function (e) { var mo = int(S.races[e.raceId].date.slice(5, 7)) - 1, p = S.pts[e.id]; per[mo].pts += p ? p.total : 0; per[mo].secs += e.secs; per[mo].km += e.km; });
  var isPts = ui.profile.chart === 'pts', vals = per.map(function (x) { return isPts ? x.pts : (x.km ? x.secs / x.km : 0); }), nz = vals.filter(function (v) { return v > 0; });
  var maxV = Math.max.apply(null, nz.concat([1])), minV = Math.min.apply(null, nz.concat([maxV]));
  h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>Andamento ' + y + '</h3><div class="seg" role="group" aria-label="Grafico"><button data-act="profChart" data-v="pts" aria-pressed="' + isPts + '">Punti</button><button data-act="profChart" data-v="pace" aria-pressed="' + !isPts + '">Passo</button></div></div><p class="hint">' + (isPts ? 'Punti per mese' : 'Passo medio in gara: barra più alta = più veloce') + '</p>' +
    '<div class="chart" role="img" aria-label="' + (isPts ? 'Punti per mese' : 'Passo medio per mese') + '">' + vals.map(function (v, i) { var hh = !v ? 0 : (isPts ? Math.round(v / maxV * 90) : Math.round(25 + (maxV === minV ? 60 : (maxV - v) / (maxV - minV) * 65))); return '<div><em>' + (v ? (isPts ? v : fmtPace(v).replace(' /km', '')) : '') + '</em><i style="height:' + hh + 'px' + (i === new Date().getMonth() ? ';background:var(--o)' : '') + '"></i><span>' + MESI[i].charAt(0).toUpperCase() + '</span></div>'; }).join('') + '</div></div>';
  // traguardi
  var monthsWith = {}; mine.forEach(function (e) { monthsWith[S.races[e.raceId].date.slice(0, 7)] = 1; });
  var streak = 0, d = new Date(); d.setDate(1); if (!monthsWith[d.getFullYear() + '-' + pad2(d.getMonth() + 1)]) d.setMonth(d.getMonth() - 1); while (monthsWith[d.getFullYear() + '-' + pad2(d.getMonth() + 1)]) { streak++; d.setMonth(d.getMonth() - 1); }
  var myConf = Object.keys(S.votes).filter(function (k) { return S.votes[k].uid === uid && S.votes[k].type === 'confirm'; }).length;
  var bigTeam = mine.some(function (e) { return e.teamId && activeEntries().filter(function (x) { return x.raceId === e.raceId && x.teamId === e.teamId; }).length >= 6; });
  var maxKm = Math.max.apply(null, mine.map(function (e) { return e.km; }).concat([0]));
  var badges = [['Costanza', streak + (streak === 1 ? ' mese' : ' mesi') + ' di fila con una gara (obiettivo 6)', Math.min(1, streak / 6)], ['Giudice di gara', myConf + ' conferme date (obiettivo 10)', Math.min(1, myConf / 10)], ['Squadra unita', 'Una gara con 5 o più compagni', bigTeam ? 1 : 0], ['100 km', fmtN(Math.round(km)) + ' km in gara nella stagione', Math.min(1, km / 100)], ['Esploratore', Object.keys(towns).length + ' di 10 comuni diversi', Math.min(1, Object.keys(towns).length / 10)], ['Mezza', 'Corri una gara da 21 km', maxKm >= 21 ? 1 : 0]];
  h += '<h2>Traguardi</h2><div class="row2" style="margin-bottom:14px">' + badges.map(function (b) { var done = b[2] >= 1; return '<div class="card" style="margin:0;' + (done ? '' : 'background:#FBF7F0;border-style:dashed') + '"><div style="width:34px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;background:' + (done ? '#F5DED5;color:#B5482B' : '#ECE5D8;color:#7A705F') + '" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg></div><b style="display:block;margin-top:6px;font-size:14px">' + esc(b[0]) + '</b><span class="sm">' + esc(b[1]) + '</span>' + (done ? '' : '<div class="bar"><div style="width:' + Math.round(b[2] * 100) + '%"></div></div>') + '</div>'; }).join('') + '</div>';
  h += '<h2>' + (isMe ? 'Le mie gare' : 'Gare') + '</h2>' + (mine.length ? '<div class="list">' + mine.map(entryRow).join('') + '</div>' : '<p class="hint">Ancora nessuna gara.</p>');
  return h;
}
function vModifica() {
  var m = me(), o = ui.edit = ui.edit || { bio: m.bio || '', nick: m.nick, sex: m.sex, birth: String(m.birth), first: (S.priv || {}).first_name || '', last: (S.priv || {}).last_name || '' }; if (!o.pbInit) { PB_KEYS.forEach(function (k) { o['pb_' + k[0].replace('.', '')] = m.pbs && m.pbs[k[0]] ? fmtTime(m.pbs[k[0]]) : ''; }); o.pbInit = true; }
  var y = new Date().getFullYear(), changes = (m.teamChanges || {})[y] || 0;
  return '<div class="top"><a href="#profilo" class="btn link" style="color:#171512;padding:0;align-self:flex-start">← Profilo</a><h1>Modifica profilo</h1></div><div class="card">' +
    '<div style="display:flex;gap:14px;align-items:center;margin-bottom:6px">' + avatarHtml(S.uid, 64, true) + '<div class="stack" style="flex:1;gap:4px"><label class="btn sec" style="position:relative">' + (m.photo ? 'Cambia foto' : 'Aggiungi una foto') + '<input type="file" id="photoFile" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' + (m.photo ? '<button class="btn link" data-act="photoDel" style="min-height:0;padding:4px">Togli la foto</button>' : '') + '</div></div>' +
    '<div class="row2"><div><label for="efn">Nome</label><input id="efn" type="text" maxlength="40" data-bind="edit.first" value="' + esc(o.first) + '"></div><div><label for="eln">Cognome</label><input id="eln" type="text" maxlength="40" data-bind="edit.last" value="' + esc(o.last) + '"></div></div><p class="hint">Privati: servono a riconoscerti nelle classifiche ufficiali.</p>' +
    '<label for="en">Nome pubblico</label><input id="en" type="text" maxlength="30" data-bind="edit.nick" value="' + esc(o.nick) + '">' +
    '<label for="ebio">Bio <span class="sm">(facoltativa, max 160 caratteri)</span></label><textarea id="ebio" maxlength="160" data-bind="edit.bio" placeholder="Es. Saronno · 36 anni · corro per la colazione dopo · @il_tuo_profilo">' + esc(o.bio || '') + '</textarea><p class="hint">La vedono tutti nel tuo profilo. Se scrivi @nome diventa un link al profilo Instagram.</p>' +
    '<label id="es">Sesso</label><div class="seg" role="group" aria-labelledby="es"><button data-act="editSex" data-v="F" aria-pressed="' + (o.sex === 'F') + '">Donna</button><button data-act="editSex" data-v="M" aria-pressed="' + (o.sex === 'M') + '">Uomo</button></div>' +
    '<label for="eb">Anno di nascita</label><input id="eb" type="number" data-bind="edit.birth" value="' + esc(o.birth) + '">' +
    '<h3 style="margin-top:18px">Record personali</h3><p class="hint">Scrivi il tempo come ore:minuti:secondi o minuti:secondi, per esempio 21:30 o 1:38:05. Lascia vuoto se non ce l’hai.</p><div class="row2">' + PB_KEYS.map(function (k) { return '<div><label for="pb' + k[0].replace('.', '') + '">' + k[1] + '</label><input id="pb' + k[0].replace('.', '') + '" type="text" inputmode="numeric" data-bind="edit.pb_' + k[0].replace('.', '') + '" value="' + esc(o['pb_' + k[0].replace('.', '')] || '') + '" placeholder="' + ({ '5': '22:30', '10': '46:00', '21.1': '1:42:00', '42.2': '3:45:00' })[k[0]] + '"></div>'; }).join('') + '</div>' +
    '<div class="stack" style="margin-top:14px"><button class="btn" data-act="editSave">Salva</button></div></div>' +
    '<div class="card"><b>Squadra</b><p class="hint">' + (m.teamId ? 'Sei in ' + esc((S.teams[m.teamId] || {}).name || '') + '. ' : '') + 'Puoi cambiare squadra una volta a stagione; i punti già fatti restano alla squadra di prima.</p>' +
    (changes >= 1 && m.teamId ? '<p class="hint">Hai già cambiato squadra quest’anno.</p>' : '<button class="btn sec" data-act="goJoin">' + (m.teamId ? 'Cambia squadra' : 'Unisciti a una squadra') + '</button>') + '</div>' +
    '<div class="card"><b>I tuoi dati</b><p class="hint">Puoi copiare tutti i tuoi dati o cancellare il tuo profilo: le tue partecipazioni vengono rimosse dalle classifiche.</p><div class="stack"><button class="btn sec" data-act="exportData">Copia i miei dati</button><button class="btn danger" data-act="deleteMe">Cancella il mio profilo</button></div></div>';
}

// ---------- storia e adesivo ----------
var SHIELD_D = 'M12 2.5l8.5 3.2v6.3c0 4.9-3.6 8.4-8.5 9.7-4.9-1.3-8.5-4.8-8.5-9.7V5.7z';
function loadImg(src) { return new Promise(function (res) { if (!src) { res(null); return; } var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; setTimeout(function () { res(null); }, 6000); }); }
function story(id) {
  var e = S.entries[id], team = S.teams[e.teamId];
  var fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("700 100px 'Barlow Condensed'"), document.fonts.load("600 30px Inter"), document.fonts.load("400 30px Inter")]).catch(function () {}) : Promise.resolve();
  var mm = S.members[sid(e.uid)] || {};
  Promise.all([fonts, loadImg(team && team.logo ? publicUrl(team.logo) : null), loadImg(mm.photo ? publicUrl(mm.photo) : null)]).then(function (r) {
    ui.story = { id: id, tab: (ui.story && ui.story.tab) || 'full', full: storyFull(id, r[1], true, r[2]), sticker: storySticker(id, true) };
    storySheet();
  });
}
function storySheet() {
  var st = ui.story, full = st.tab === 'full';
  openSheet('<div class="panel" role="dialog" aria-label="Condividi la gara"><h2>Condividi la gara</h2>' +
    '<div class="seg" role="group" aria-label="Formato" style="margin:10px 0 12px"><button data-act="storyTab" data-v="full" aria-pressed="' + full + '">Storia completa</button><button data-act="storyTab" data-v="sticker" aria-pressed="' + !full + '">Adesivo per foto</button></div>' +
    '<p class="hint">' + (full ? 'Tieni premuto sull’immagine e scegli «Salva» o «Condividi», poi pubblicala come storia.' : 'Salva l’adesivo (sfondo trasparente). In Instagram apri una tua foto, tocca l’icona degli sticker e scegli la foto dell’adesivo dalla galleria.') + '</p>' +
    '<div style="' + (full ? '' : 'background:repeating-conic-gradient(#E9E1D3 0 25%,#FBF7F0 0 50%) 0 0/24px 24px;border-radius:14px;padding:16px') + '"><img src="' + (full ? st.full : st.sticker) + '" alt="' + (full ? 'Storia con il risultato della gara' : 'Adesivo con il risultato della gara') + '" style="width:100%;border-radius:14px;display:block"></div>' +
    '<div class="stack" style="margin-top:12px"><a class="btn" download="finishr-' + (full ? 'storia' : 'adesivo') + '.png" href="' + (full ? st.full : st.sticker) + '">Salva l’immagine</a><button class="btn link" data-act="closeSheet" style="align-self:center">Chiudi</button></div></div>');
}
var SC = { SAND: '#EADCC2', SAND2: '#DCCAA9', SAND3: '#E2D1AF', INK: '#171512', MUT: '#6E6556', TER: '#B5482B', TER2: '#C8573A' };
function cF(w, s, f) { return w + ' ' + s + 'px ' + (f ? "'Barlow Condensed', Inter, sans-serif" : 'Inter, sans-serif'); }
// scrive un testo riducendo il carattere finché entra nella larghezza
function fitText(x, txt, X, Y, maxW, w, size, cond, min) { var s = size; x.font = cF(w, s, cond); while (x.measureText(txt).width > maxW && s > (min || 20)) { s -= 2; x.font = cF(w, s, cond); } x.fillText(txt, X, Y); return s; }
function ellipsize(x, txt, maxW) { if (x.measureText(txt).width <= maxW) return txt; while (txt.length > 1 && x.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1); return txt + '…'; }
function drawShield(x, X, Y, size, color) {
  x.save(); x.translate(X, Y); x.scale(size / 24, size / 24); var p = new Path2D(SHIELD_D); x.fillStyle = color; x.fill(p);
  x.strokeStyle = '#fff'; x.lineWidth = 1.8; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(8.6, 12.2); x.lineTo(10.9, 14.5); x.lineTo(15.4, 10); x.stroke(); x.restore();
}
// icona dell'app disegnata con forme (niente immagini esterne: il canvas resta esportabile)
function drawAppIcon(x, X, Y, S2) {
  x.save(); x.translate(X, Y); x.scale(S2 / 100, S2 / 100);
  x.fillStyle = SC.SAND; rr(x, 0.5, 0.5, 99, 99, 22); x.fill(); x.strokeStyle = '#CDBB98'; x.lineWidth = 1; x.stroke();
  x.fillStyle = SC.INK; [[9, 38, 13, .45], [5, 48, 15, .3], [11, 58, 10, .45]].forEach(function (l) { x.globalAlpha = l[3]; rr(x, l[0], l[1], l[2], 3.5, 1.75); x.fill(); }); x.globalAlpha = 1;
  x.save(); x.translate(9, 0); x.transform(1, 0, Math.tan(-12 * Math.PI / 180), 1, 0, 0); rr(x, 30, 19, 15, 62, 4); x.fill(); rr(x, 30, 19, 46, 15, 4); x.fill(); x.restore();
  x.fillStyle = SC.TER; x.fill(new Path2D('M31 46 C 46 41, 58 52, 72 45 L 74 56 C 60 63, 47 52, 32 58 Z')); x.fill(new Path2D('M78 43 C 84 39, 88 43, 93 38 L 94 48 C 89 53, 85 49, 80 53 Z'));
  x.restore();
}
function drawWordmark(x, X, Y, size, color, icon) {
  var off = 0; if (icon) { drawAppIcon(x, X, Y - size * 0.82, size * 0.95); off = size * 1.15; }
  x.font = cF(700, size, 1); x.fillStyle = color; x.fillText('finish', X + off, Y); x.fillStyle = SC.TER; x.fillText('r', X + off + x.measureText('finish').width, Y);
}
// pista d'atletica stilizzata, con le corsie
function drawMap(x, e, race, X, Y, W, H) {
  x.fillStyle = SC.SAND3; rr(x, X, Y, W, H, 40); x.fill();
  var lanes = 6, lw = 17, px = X + 56, py = Y + 46, tw = W - 112, th = H - 92;
  var cap = function (ins) { rr(x, px + ins, py + ins, tw - 2 * ins, th - 2 * ins, (th - 2 * ins) / 2); };
  cap(0); x.fillStyle = SC.TER; x.fill();
  cap(lanes * lw); x.fillStyle = '#E9DDC4'; x.fill();
  x.strokeStyle = 'rgba(255,253,249,0.9)'; x.lineWidth = 2.5; for (var k = 0; k <= lanes; k++) { cap(k * lw + (k === 0 ? 1.5 : 0) - (k === lanes ? 1.5 : 0)); x.stroke(); }
  // linea d'arrivo sul rettilineo in basso e partenza sfalsata
  var r0 = th / 2, sx = px + r0 + 70, fy0 = py + th - lanes * lw, fy1 = py + th;
  x.strokeStyle = '#FFFDF9'; x.lineWidth = 7; x.beginPath(); x.moveTo(sx, fy0); x.lineTo(sx, fy1); x.stroke();
  for (var c = 0; c < lanes; c++) { x.fillStyle = c % 2 ? SC.INK : '#FFFDF9'; x.fillRect(sx + 6, fy0 + c * lw, 8, lw / 2); x.fillStyle = c % 2 ? '#FFFDF9' : SC.INK; x.fillRect(sx + 6, fy0 + c * lw + lw / 2, 8, lw / 2); }
  x.fillStyle = '#FFFDF9'; x.font = cF(700, 13, 1); x.textAlign = 'center'; for (var n = 0; n < lanes; n++) x.fillText(String(n + 1), sx - 16, fy0 + n * lw + lw * 0.72); x.textAlign = 'left';
  // nel prato: distanza e paese
  var cx = px + tw / 2, cy = py + th / 2;
  x.textAlign = 'center'; x.fillStyle = SC.INK; fitText(x, fmtKm(e.km) + ' km', cx, cy + 34, tw - 2 * lanes * lw - 140, 700, 120, 1, 50);
  x.fillStyle = SC.MUT; x.font = cF(600, 28); x.fillText(race.town.toUpperCase(), cx, cy + 82); x.textAlign = 'left';
}
function proofLabel(e) { return e.resultId ? 'Classifica ufficiale' : e.proof === 'gpx' ? 'GPX verificato' : 'Screenshot'; }
function storyFull(id, teamImg, icon, photo) {
  var e = S.entries[id], p = S.pts[e.id] || {}, race = S.races[e.raceId], m = me(), team = S.teams[e.teamId];
  var season = standingsInd('season', true), si = season.findIndex(function (s) { return s.uid === S.uid; });
  var c = document.createElement('canvas'); c.width = 1080; c.height = 1920; var x = c.getContext('2d');
  x.fillStyle = SC.SAND; x.fillRect(0, 0, 1080, 1920);
  drawWordmark(x, 96, 168, 76, SC.INK, icon);
  x.textAlign = 'right'; x.fillStyle = SC.TER; x.font = cF(700, 40, 1); x.fillText('ogni gara conta.', 984, 160); x.textAlign = 'left';
  x.fillStyle = SC.TER; x.font = cF(600, 34); x.fillText(dateIt(race.date, true) + ' · ' + race.town, 96, 290);
  x.fillStyle = SC.INK; fitText(x, race.name, 96, 400, 888, 700, 120, 1, 64);
  drawMap(x, e, race, 96, 450, 888, 470);
  var stats = [[fmtKm(e.km) + ' km', 'distanza'], [fmtTime(e.secs), 'tempo'], [fmtPace(e.secs / e.km).replace(' /km', ''), 'passo /km']];
  var vs = 92; x.font = cF(700, vs, 1); stats.forEach(function (s) { while (x.measureText(s[0]).width > 268 && vs > 48) { vs -= 2; x.font = cF(700, vs, 1); } });
  stats.forEach(function (s, i) { var X = 96 + i * 304; x.fillStyle = SC.INK; x.font = cF(700, vs, 1); x.fillText(s[0], X, 1060); x.fillStyle = SC.MUT; x.font = cF(400, 28); x.fillText(s[1], X, 1104); });
  x.fillStyle = SC.INK; rr(x, 96, 1150, 888, 290, 48); x.fill();
  x.fillStyle = SC.SAND; x.font = cF(600, 30); x.fillText('Punti' + (p.closed ? '' : ' (provvisori)'), 148, 1215); x.fillStyle = SC.TER2; x.font = cF(700, 210, 1); x.fillText('+' + (p.total || 0), 140, 1395);
  x.fillStyle = SC.SAND; x.textAlign = 'right'; x.font = cF(600, 28); x.fillText('Totale stagione', 932, 1300); x.font = cF(700, 100, 1); x.fillText(si >= 0 ? fmtN(season[si].pts) : String(p.total || 0), 932, 1395); x.textAlign = 'left';
  var bw = 280, by = 1480, bh = 230;
  [['In gara', (p.pos || '—') + '°', 'su ' + (p.n || '—')], ['Categoria', (p.catPos || '—') + '°', catLabel(p.cat || '—')]].forEach(function (b, i) {
    var bx = 96 + i * 304; x.fillStyle = SC.SAND2; rr(x, bx, by, bw, bh, 36); x.fill();
    x.fillStyle = SC.MUT; x.font = cF(600, 26); x.fillText(b[0], bx + 30, by + 52); x.fillStyle = SC.INK; fitText(x, b[1], bx + 30, by + 150, bw - 60, 700, 96, 1, 50); x.fillStyle = SC.MUT; x.font = cF(400, 24); x.fillText(ellipsize(x, b[2], bw - 60), bx + 30, by + 196);
  });
  var tx = 96 + 2 * 304; x.fillStyle = SC.SAND2; rr(x, tx, by, bw, bh, 36); x.fill();
  x.fillStyle = SC.MUT; x.font = cF(600, 26); x.fillText('Squadra', tx + 30, by + 52);
  if (teamImg) { var s0 = 96, r0 = Math.min(s0 / teamImg.width, s0 / teamImg.height); x.drawImage(teamImg, tx + 30, by + 66, teamImg.width * r0, teamImg.height * r0); }
  else drawShield(x, tx + 26, by + 64, 100, team ? team.color : SC.MUT);
  x.fillStyle = SC.INK; x.font = cF(600, 24); x.fillText(ellipsize(x, team ? team.name : 'Senza squadra', bw - 60), tx + 30, by + 196);
  if (photo) { x.save(); x.beginPath(); x.arc(140, 1800, 44, 0, Math.PI * 2); x.clip(); x.drawImage(photo, 96, 1756, 88, 88); x.restore(); }
  else { x.fillStyle = SC.INK; x.beginPath(); x.arc(140, 1800, 44, 0, Math.PI * 2); x.fill(); x.fillStyle = SC.SAND; x.font = cF(700, 36, 1); x.textAlign = 'center'; x.fillText(initials(m.nick), 140, 1813); x.textAlign = 'left'; }
  x.fillStyle = SC.INK; x.font = cF(700, 36); x.fillText(m.nick, 208, 1794); x.fillStyle = SC.MUT; x.font = cF(400, 26); x.fillText(proofLabel(e), 208, 1834);
  return c.toDataURL('image/png');
}
function storySticker(id, icon) {
  var e = S.entries[id], p = S.pts[e.id] || {}, race = S.races[e.raceId];
  var W = 1000, H = 560, c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
  x.fillStyle = 'rgba(23,21,18,0.86)'; rr(x, 0, 0, W, H, 56); x.fill();
  drawWordmark(x, 60, 118, 60, SC.SAND, icon);
  x.textAlign = 'right'; x.fillStyle = SC.TER2; x.font = cF(700, 38, 1); x.fillText('ogni gara conta.', W - 60, 112); x.textAlign = 'left';
  x.fillStyle = SC.SAND2; fitText(x, race.name + ' · ' + dateIt(race.date), 60, 200, W - 120, 600, 36, 0, 22);
  x.strokeStyle = 'rgba(234,220,194,0.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, 240); x.lineTo(W - 60, 240); x.stroke();
  var cols = [[fmtKm(e.km) + ' km', 'distanza'], [fmtTime(e.secs), 'tempo'], [fmtPace(e.secs / e.km).replace(' /km', ''), 'passo /km'], ['+' + (p.total || 0), p.closed ? 'punti' : 'punti (provv.)']];
  var cw = (W - 120) / 4, vs = 96; x.font = cF(700, vs, 1); cols.forEach(function (s) { while (x.measureText(s[0]).width > cw - 24 && vs > 44) { vs -= 2; x.font = cF(700, vs, 1); } });
  cols.forEach(function (s, i) { var X = 60 + i * cw; x.fillStyle = i === 3 ? SC.TER2 : SC.SAND; x.font = cF(700, vs, 1); x.fillText(s[0], X, 380); x.fillStyle = SC.SAND2; x.font = cF(400, 26); x.fillText(s[1], X, 428); });
  if (p.pos) { x.fillStyle = SC.SAND2; x.font = cF(600, 28); x.fillText(p.pos + '° su ' + p.n + (p.catPos ? ' · ' + p.catPos + '° ' + catLabel(p.cat) : ''), 60, 500); }
  return c.toDataURL('image/png');
}
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }


// =================== classifiche ufficiali (PDF ENDU) ===================
var PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var pdfjsP = null;
function getPdfjs() {
  if (!pdfjsP) pdfjsP = import(PDFJS_URL).then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return m; });
  pdfjsP.catch(function () { pdfjsP = null; });
  return pdfjsP;
}
// estrae le righe di testo del PDF, con due spazi dove c'è uno stacco tra colonne
async function pdfLines(file) {
  var lib = await getPdfjs(), buf = await file.arrayBuffer(), doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise, lines = [];
  for (var p = 1; p <= doc.numPages; p++) {
    var page = await doc.getPage(p), tc = await page.getTextContent(), rows = [];
    tc.items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var y = it.transform[5], x = it.transform[4], row = rows.filter(function (r) { return Math.abs(r.y - y) < 2.5; })[0];
      if (!row) { row = { y: y, items: [] }; rows.push(row); }
      row.items.push({ x: x, w: it.width || 0, s: it.str });
    });
    rows.sort(function (a, b) { return b.y - a.y; }).forEach(function (r) {
      r.items.sort(function (a, b) { return a.x - b.x; });
      var out = '', end = null;
      r.items.forEach(function (it) { if (end !== null) out += (it.x - end > 6 ? '  ' : (it.x - end > 0.5 ? ' ' : '')); out += it.s.trim(); end = it.x + it.w; });
      lines.push(out);
    });
  }
  return lines;
}
var CAT_RE = /^(?:[SJPAM][MF](?:\d{2})?|[MF]-?\d{2})$/i;
function timeToSecs(t) { var p = t.split(':').map(function (x) { return parseInt(x, 10); }); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
// legge le righe di una classifica. Due formati: con colonna posizione (pos, pett, atleta…)
// oppure, come molti PDF ENDU, senza posizione e in ordine alfabetico (pett, atleta, anno, sesso…):
// in quel caso la posizione si ricava dal tempo e la categoria da sesso e anno di nascita.
function parseResultLines(lines, year) {
  var header = lines.filter(function (l) { return /pett|atleta|cognome/i.test(l) && !/^\s*\d/.test(l); })[0] || '';
  var hasPos = header ? /(^|\s)(pos|cl|class|posiz|ord|rank)/i.test(header) : true;
  var hasNaz = /\bnaz/i.test(header);
  var rows = [];
  lines.forEach(function (line) {
    var L = line.replace(/\s+$/, ''); var m0 = L.match(/^\s*(\d{1,5})[.°º)]?\s+/); if (!m0) return;
    var lead = m0[1], rest = L.slice(m0[0].length);
    // tempo: il più lungo tra i tempi che non sono passo (/km) né distacco (+)
    var best = 0, re = /(^|[^+\d:])(\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2})(?:[.,]\d+)?(?!\s*\/\s*km)(?![\d:])/g, m;
    while ((m = re.exec(rest))) { var s = timeToSecs(m[2]); if (s > best) best = s; }
    var cols = rest.split(/\s{2,}/).map(function (c) { return c.trim(); }).filter(Boolean);
    var bib = hasPos ? null : lead, name = null, club = null, cat = null, sex = null, birth = null, texts = [];
    if (cols.length >= 2) {
      cols.forEach(function (c) {
        if (/^\d{4}$/.test(c) && +c > 1900 && +c <= (year || 2100)) { if (texts.length && !birth) { birth = +c; return; } }
        if (/^\d{1,6}$/.test(c)) { if (!bib && !texts.length) bib = c; return; }
        if (/^[MF]$/i.test(c)) { if (!sex) sex = c.toUpperCase(); return; }
        if (CAT_RE.test(c)) { if (!cat) cat = c.toUpperCase().replace('-', ''); return; }
        if (/\d{1,2}:\d{2}/.test(c) || /^[+\-]/.test(c) || /\/km|km\/h/i.test(c)) return;
        if (/[A-Za-zÀ-ÿ]{2}/.test(c)) texts.push(c);
      });
      if (hasNaz && texts.length && /^[A-Z]{3}$/.test(texts[texts.length - 1])) texts.pop(); // nazionalità
      name = texts[0] || null; club = texts[1] || null;
    } else {
      var toks = rest.split(/\s+/), i = 0;
      if (hasPos && /^\d{1,6}$/.test(toks[0])) { bib = toks[0]; i = 1; }
      var nm = []; while (i < toks.length && /^[A-ZÀ-Ý'’.\-]{2,}$/.test(toks[i]) && !CAT_RE.test(toks[i])) { nm.push(toks[i]); i++; }
      name = nm.join(' ');
      toks.slice(i).forEach(function (t) { if (!cat && CAT_RE.test(t)) cat = t.toUpperCase().replace('-', ''); else if (!sex && /^[MF]$/.test(t)) sex = t; else if (!birth && /^\d{4}$/.test(t) && +t > 1900 && +t <= (year || 2100)) birth = +t; });
    }
    if (!name || name.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 3) return;
    if (/^(pos|cl|class|nome|cognome|atleta|pett)/i.test(name)) return;
    if (!cat && sex && birth && year && typeof category === 'function') { var c2 = category(sex, birth, year); if (c2 !== '—') cat = c2; }
    rows.push({ pos: hasPos ? parseInt(lead, 10) : null, bib: bib, name: name.replace(/\s+/g, ' ').slice(0, 80), club: club ? club.slice(0, 80) : null, cat: cat, secs: best || null });
  });
  // senza tempo non è un arrivo valido (ritirati, squalificati)
  rows = rows.filter(function (r) { return r.secs; });
  if (hasPos) { var seen = {}; return rows.filter(function (r) { if (seen[r.pos]) return false; seen[r.pos] = 1; return true; }); }
  rows.sort(function (a, b) { return a.secs - b.secs; });
  rows.forEach(function (r, i) { r.pos = i && rows[i - 1].secs === r.secs ? rows[i - 1].pos : i + 1; });
  return rows;
}
function normName(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); }
async function loadResults(raceId) {
  var r = await q(sb.from('results').select('id,race_id,km,pos,bib,name,club,category,secs,claimed_by').eq('race_id', raceId).limit(20000), true);
  S.results = S.results || {}; S.results[raceId] = Array.isArray(r) ? r.map(function (x) { x.km = Number(x.km); return x; }) : [];
  return S.results[raceId];
}
function officialFor(race, km) { return race && race.official && race.official[String(km)] ? race.official[String(km)] : (race && race.official && race.official[fmtKmKey(km)]) || null; }
function fmtKmKey(km) { return String(Number(km)); }

function regUfficiale(R) {
  var race = S.races[R.raceId], off = officialFor(race, R.km), rows = ((S.results || {})[R.raceId] || []).filter(function (x) { return x.km === R.km; });
  if (!S.results || !S.results[R.raceId]) { loadResults(R.raceId).then(function () { if (route().view === 'registra') render(); }); return '<div class="card"><p class="hint">Carico la classifica ufficiale…</p></div>'; }
  var priv = S.priv;
  if (!priv) return '<div class="card"><h3>Prima dicci come ti chiami</h3><p class="hint">Servono per riconoscerti nella classifica ufficiale. Restano privati: gli altri vedono solo il tuo nome pubblico.</p>' +
    '<div class="row2"><div><label for="pf">Nome</label><input id="pf" type="text" data-bind="reg.first" value="' + esc(R.first || '') + '" autocomplete="given-name"></div><div><label for="pl">Cognome</label><input id="pl" type="text" data-bind="reg.last" value="' + esc(R.last || '') + '" autocomplete="family-name"></div></div>' +
    '<div class="stack" style="margin-top:14px"><button class="btn" data-act="savePriv">Continua</button></div></div>';
  var qy = (R.offQ != null ? R.offQ : priv.last_name) || '', nq = normName(qy), sur = normName(priv.last_name), bib = String(R.bib || '').replace(/^0+/, '');
  var list = rows.filter(function (x) { return !nq || normName(x.name).indexOf(nq) !== -1 || (x.bib && x.bib.replace(/^0+/, '') === nq.replace(/^0+/, '')); })
    .map(function (x) { x._score = (bib && x.bib && x.bib.replace(/^0+/, '') === bib ? 2 : 0) + ((' ' + normName(x.name) + ' ').indexOf(' ' + sur + ' ') !== -1 ? 1 : 0); return x; })
    .sort(function (a, b) { return b._score - a._score || a.pos - b.pos; }).slice(0, 40);
  var h = '<div class="card"><b>' + esc(race.name) + ' · ' + fmtKm(R.km) + ' km</b><div class="sm">Classifica ufficiale: ' + (off ? off.n : rows.length) + ' arrivati</div>' +
    '<label for="oq">Cerca il tuo nome o il pettorale</label><input id="oq" type="search" data-bind="reg.offQ" data-live="1" value="' + esc(qy) + '" placeholder="Cognome o numero">' +
    '<label for="ob">Numero di pettorale (facoltativo)</label><input id="ob" type="text" inputmode="numeric" data-bind="reg.bib" data-live="1" value="' + esc(R.bib || '') + '" placeholder="Es. 205" maxlength="12">' +
    '<div class="list" style="margin-top:12px" id="offList">' + offListHtml(list) + '</div>' +
    '<p class="hint" style="margin-top:10px">Non ti trovi? Torna indietro e registra la gara con GPX o screenshot.</p>' +
    '<div class="stack"><button class="btn link" data-act="regBack" data-v="tempo" style="align-self:center">Indietro</button></div></div>';
  return h;
}
function offListHtml(list) {
  if (!list.length) return '<div class="item"><span class="sm">Nessuna riga trovata.</span></div>';
  return list.map(function (x) {
    var mine = x.claimed_by === S.uid, taken = x.claimed_by && !mine;
    return '<button class="item' + (mine ? ' me' : '') + (taken ? ' out' : '') + '" data-act="offPick" data-v="' + esc(x.id) + '" ' + (taken ? 'disabled' : '') + '><span class="pos">' + x.pos + '</span><span class="grow"><b>' + esc(x.name) + '</b><small>' + esc([x.bib ? 'pett. ' + x.bib : '', x.category || '', x.club || ''].filter(Boolean).join(' · ')) + '</small></span><span class="right"><b>' + (x.secs ? fmtTime(x.secs) : '') + '</b>' + (x._score >= 2 ? '<span class="pill g">pettorale ✓</span>' : x._score === 1 ? '<span class="pill g">cognome ✓</span>' : '') + (taken ? '<span class="pill n">già scelta</span>' : mine ? '<span class="pill g">sei tu</span>' : '') + '</span></button>';
  }).join('');
}
function offPointsPreview(R, row) {
  var race = S.races[R.raceId], off = officialFor(race, R.km), rows = S.results[R.raceId].filter(function (x) { return x.km === R.km; });
  var n = off ? off.n : rows.length, catRows = row.category ? rows.filter(function (x) { return x.category === row.category; }) : [];
  var p = { pos: row.pos, n: n, cat: row.category || '—', catPos: row.category ? 1 + catRows.filter(function (x) { return x.pos < row.pos; }).length : 0, catN: catRows.length, part: 10, bonus: distBonus(R.km), official: true };
  p.gen = placePts(20, n, p.pos, 10); p.catPts = row.category ? placePts(10, p.catN, p.catPos, 5) : 0;
  var im = row.secs ? improvement(S.uid, R.km, row.secs / R.km, race.date, null) : { v: 0, why: 'Tempo non presente nella classifica' }; p.imp = im.v; p.impWhy = im.why;
  p.total = p.part + p.bonus + p.gen + p.catPts + p.imp; return p;
}
function offConfirmSheet(rowId) {
  var R = ui.reg, row = S.results[R.raceId].filter(function (x) { return x.id === rowId; })[0]; if (!row) return;
  var priv = S.priv || {}, surOk = (' ' + normName(row.name) + ' ').indexOf(' ' + normName(priv.last_name) + ' ') !== -1;
  var bibOk = R.bib && row.bib && String(R.bib).replace(/^0+/, '') === row.bib.replace(/^0+/, '');
  var p = offPointsPreview(R, row);
  var h = '<div class="panel" role="dialog" aria-label="Conferma risultato ufficiale"><h2>Sei tu?</h2><table class="pts"><tbody>' +
    '<tr><td>Nome in classifica</td><td>' + esc(row.name) + '</td></tr><tr><td>Posizione</td><td>' + row.pos + '° su ' + p.n + '</td></tr>' +
    (row.bib ? '<tr><td>Pettorale</td><td>' + esc(row.bib) + '</td></tr>' : '') + (row.category ? '<tr><td>Categoria</td><td>' + esc(row.category) + ' · ' + p.catPos + '° su ' + p.catN + '</td></tr>' : '') +
    (row.secs ? '<tr><td>Tempo</td><td>' + fmtTime(row.secs) + ' (' + fmtPace(row.secs / R.km) + ')</td></tr>' : '') + '</tbody></table>';
  if (!surOk && !bibOk) h += '<div class="note">Il cognome del tuo profilo (' + esc(priv.last_name || '') + ') non compare in questa riga: per sceglierla inserisci il numero di pettorale, che deve coincidere.</div><label for="cb">Numero di pettorale</label><input id="cb" type="text" inputmode="numeric" data-bind="reg.bib" value="' + esc(R.bib || '') + '" maxlength="12">';
  else h += '<div class="okbox">Corrispondenza: ' + [surOk ? 'cognome' : '', bibOk ? 'pettorale' : ''].filter(Boolean).join(' e ') + ' ✓</div>';
  h += '<h3 style="margin-top:14px">Punti stimati</h3><p class="hint">Calcolati sulla classifica ufficiale, con tutti gli arrivati.</p>' + ptsTable(p) + '<div class="total"><span>Totale stimato</span><span class="num">+' + p.total + '</span></div>' +
    '<p class="hint" style="margin-top:10px">Gli altri partecipanti vedranno che ti sei riconosciuto in questa riga.</p>' +
    '<div class="stack"><button class="btn" data-act="offClaim" data-v="' + esc(row.id) + '">Sì, sono io</button><button class="btn link" data-act="closeSheet" style="align-self:center">Annulla</button></div></div>';
  openSheet(h);
}
function regPdf(R) {
  var race = S.races[R.raceId], P = R.pdf || {};
  var h = '<div class="card"><b>' + esc(race.name) + '</b><div class="sm">' + esc(dateIt(race.date, true) + ' · ' + race.town) + '</div>' +
    '<p class="hint" style="margin-top:10px">Carica il PDF con la classifica completa (per esempio da ENDU). La carichi una volta per tutti: poi ognuno si riconosce nella lista.</p>' +
    '<label class="drop"><input type="file" id="pdfFile" accept="application/pdf,.pdf"><b>' + (P.name ? esc(P.name) : 'Scegli il PDF della classifica') + '</b><span class="sm">Viene letto sul tuo telefono</span></label>';
  if (P.status === 'loading') h += '<p class="hint" style="margin-top:10px">Lettura del PDF…</p>';
  if (P.status === 'error') h += '<div class="note">' + esc(P.err) + '</div>';
  if (P.rows) {
    var withCat = P.rows.filter(function (x) { return x.cat; }).length;
    h += '<div class="okbox">Arrivati letti: <b>' + P.rows.length + '</b> · con categoria ' + withCat + '</div>' +
      '<label id="lpk">Questa classifica è del percorso da</label><div class="chips" role="group" aria-labelledby="lpk">' + race.distances.map(function (d) { var has = !!officialFor(race, d); return '<button data-act="pdfKm" data-v="' + d + '" aria-pressed="' + (P.km === d) + '" ' + (has ? 'disabled title="già caricata"' : '') + '>' + fmtKm(d) + ' km' + (has ? ' ✓' : '') + '</button>'; }).join('') + '</div>' +
      '<p class="hint" style="margin-top:12px">Controlla le prime righe: devono avere posizione, nome e tempo giusti.</p><div class="list">' +
      P.rows.slice(0, 8).map(function (x) { return '<div class="item"><span class="pos">' + x.pos + '</span><span class="grow"><b>' + esc(x.name) + '</b><small>' + esc([x.bib ? 'pett. ' + x.bib : '', x.cat || '', x.club || ''].filter(Boolean).join(' · ')) + '</small></span><b>' + (x.secs ? fmtTime(x.secs) : '—') + '</b></div>'; }).join('') + '</div>' +
      '<div class="stack" style="margin-top:14px"><button class="btn" data-act="pdfUpload" ' + (P.km ? '' : 'disabled') + '>Le righe sono giuste: carica la classifica</button></div>';
  }
  h += '<div class="stack"><button class="btn link" data-act="regBack" data-v="tempo" style="align-self:center">Indietro</button></div></div>';
  return h;
}

// =================== azioni ===================
var ACT = {
  onbStep: function (el) { ui.onb.step = el.dataset.v; render(); },
  onbSex: function (el) { ui.onb.sex = el.dataset.v; render(); },
  onbTeam: function (el) { ui.onb.teamChoice = el.dataset.v; render(); },
  onbColor: function (el) { ui.onb.color = el.dataset.v; render(); },
  onbAccess: function (el) { ui.onb.access = el.dataset.v; render(); },
  onbSolo: function () { saveMember(null); },
  onbJoin: function () { var t = S.teams[ui.onb.teamChoice]; if (!t) return; if (t.access === 'invite' && !String(ui.onb.code || '').trim()) { toast('Inserisci il codice squadra'); return; } saveMember(t.id); },
  onbCreate: async function (el) {
    var o = ui.onb, name = o.newTeam.trim(); if (name.length < 2) { toast('Scrivi il nome della squadra'); return; }
    el.disabled = true; if (!(await ensureProfile())) { el.disabled = false; return; }
    var id = await q(sb.rpc('create_team', { p_name: name, p_town: o.town.trim(), p_color: o.color, p_access: o.access }));
    if (!id) { el.disabled = false; return; }
    toast('Squadra creata: sei l’amministratore'); ui.onb = null; await loadAll(); location.hash = '#squadra';
  },
  goJoin: function () { ui.onb = { step: 'squadra', tq: '', code: '', newTeam: '', town: '', color: COLORS[0][0], access: 'open', joining: true }; ui.joinMode = true; location.hash = '#cambia'; },
  regCreateOn: function () { ui.reg.create = true; ui.reg.name = ui.reg.q; render(); },
  regCreateOff: function () { ui.reg.create = false; render(); },
  regCreate: async function (el) {
    var R = ui.reg, name = R.name.trim(), town = R.town.trim(), dists = String(R.dists).split(/[;,\s]+/).map(num).filter(function (x) { return x > 0 && x < 400; });
    if (name.length < 3 || !town || !R.date || !dists.length) { toast('Compila nome, data, comune e distanze'); return; }
    if (daysSince(R.date) > CLOSE_DAYS || daysSince(R.date) < 0) { toast('Si possono registrare solo gare degli ultimi 7 giorni'); return; }
    var dup = recentRaces().filter(function (r) { return r.date === R.date && r.town.toLowerCase() === town.toLowerCase(); })[0];
    if (dup && !R.dupOk) { R.dupOk = true; toast('Esiste già «' + dup.name + '» a ' + dup.town + ' in questa data: se è la stessa, sceglila dall’elenco. Premi di nuovo per crearla comunque.'); return; }
    el.disabled = true; dists = dists.map(function (d) { return Math.round(d * 1000) / 1000; }).sort(function (a, b) { return a - b; });
    var row = await q(sb.from('races').insert({ name: name, date: R.date, town: town, distances: dists, created_by: S.uid }).select('id').single());
    if (!row) { el.disabled = false; return; }
    S.races[row.id] = { id: row.id, name: name, date: R.date, town: town, distances: dists, createdBy: S.uid, lat: null, lon: null };
    R.raceId = row.id; R.km = dists.length === 1 ? dists[0] : null; R.create = false; R.step = 'tempo'; render();
  },
  regPick: function (el) { var R = ui.reg, race = S.races[el.dataset.v]; R.raceId = race.id; var ex = activeEntries().filter(function (e) { return e.raceId === race.id && e.uid === S.uid; })[0];
    if (ex) { R.km = ex.km; R.h = String(Math.floor(ex.secs / 3600)); R.m = String(Math.floor(ex.secs % 3600 / 60)); R.s = String(ex.secs % 60); R.editId = ex.id; R.bib = ex.bib || ''; if (ex.resultId) { R.step = 'ufficiale'; R.offQ = null; toast('Ti sei già riconosciuto nella classifica ufficiale'); render(); return; } toast('L’avevi già registrata: puoi modificarla'); } else { R.km = race.distances.length === 1 ? race.distances[0] : null; R.editId = null; }
    R.step = 'tempo'; render(); },
  regFor: function (el) { ui.reg = newReg(); location.hash = '#registra'; setTimeout(function () { ACT.regPick({ dataset: { v: el.dataset.v } }); }, 0); },
  regKm: function (el) { ui.reg.km = num(el.dataset.v); render(); },
  regAddKmOpen: function () { ui.reg.addKmOpen = true; ui.reg.addKm = ''; render(); setTimeout(function () { var i = $('addKm'); if (i) i.focus(); }, 50); },
  regAddKmClose: function () { ui.reg.addKmOpen = false; render(); },
  regAddKm: async function (el) { var R = ui.reg, k = Math.round(num(String(R.addKm || '').replace(',', '.')) * 10) / 10;
    if (!(k >= 1 && k <= 100)) { toast('Scrivi la distanza in km, per esempio 5 o 21,1'); return; }
    el.disabled = true; var d = await q(sb.rpc('add_race_distance', { p_race: R.raceId, p_km: k })); el.disabled = false; if (!d) return;
    S.races[R.raceId].distances = d.map(Number); R.km = k; R.addKmOpen = false; toast('Percorso da ' + fmtKm(k) + ' km aggiunto'); render(); },
  photoDel: async function () { if (await q(sb.rpc('set_my_photo', { p_path: null }))) { toast('Foto tolta'); await loadAll(); render(); } },
  regBack: function (el) { ui.reg.step = el.dataset.v; render(); },
  regToProva: function () { ui.reg.step = 'prova'; render(); },
  regProof: function (el) { ui.reg.proof = el.dataset.v; render(); },
  regToRiep: function () { ui.reg.step = 'riepilogo'; render(); },
  useGpxTime: function () { var t = ui.reg.gpx.secs; ui.reg.h = String(Math.floor(t / 3600)); ui.reg.m = String(Math.floor(t % 3600 / 60)); ui.reg.s = String(t % 60); render(); },
  regSave: async function (el) {
    var R = ui.reg, race = S.races[R.raceId]; el.disabled = true; el.textContent = 'Invio…';
    var data = { km: R.km, secs: regSecs(R), proof: R.proof, track: null, gpx: null, gpx_ok: false, ocr_ok: false, asset_paths: [], bib: String(R.bib || '').trim().slice(0, 12) || null };
    if (R.proof === 'gpx') { var g = R.gpx; data.track = g.track; data.gpx_ok = !!g.ok; data.gpx = { km: g.km, secs: g.secs, start: g.start, lat: g.lat, lon: g.lon, up: g.up }; data.proof_note = (g.verdict + ': ' + fmtKm(g.km) + ' km' + (g.start ? ', partenza alle ' + new Date(g.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '')).slice(0, 200); }
    else {
      data.ocr_ok = !!R.shotOk; data.proof_note = R.shotVerdict + ' (' + R.shots.length + (R.shots.length === 1 ? ' immagine)' : ' immagini)');
      for (var i = 0; i < R.shots.length; i++) {
        var bl = R.shots[i].blob || R.shots[i].file; if (!bl) continue;
        var path = S.uid + '/' + R.raceId + '-' + Date.now() + '-' + i + '.jpg';
        var up = await sb.storage.from('screenshots').upload(path, bl, { contentType: bl.type || 'image/jpeg', upsert: false });
        if (up.error) { console.warn(up.error); toast('Uno screenshot non è stato caricato'); } else data.asset_paths.push(path);
      }
    }
    var ok;
    if (R.editId) ok = await q(sb.from('entries').update(data).eq('id', R.editId).select('id').single());
    else { data.race_id = R.raceId; data.user_id = S.uid; ok = await q(sb.from('entries').insert(data).select('id').single()); }
    if (!ok) { el.disabled = false; el.textContent = 'Invia partecipazione'; return; }
    if (R.proof === 'gpx' && race.lat == null && R.gpx.ok) await q(sb.from('races').update({ lat: R.gpx.lat, lon: R.gpx.lon }).eq('id', race.id), true);
    R.savedId = ok.id; await loadAll(); R.step = 'fatto'; render();
  },
  regNew: function () { ui.reg = newReg(); render(); },
  regToOff: function () { ui.reg.step = 'ufficiale'; ui.reg.offQ = null; render(); },
  regToPdf: function () { ui.reg.step = 'pdf'; ui.reg.pdf = null; render(); },
  pdfFor: function (el) { ui.reg = newReg(); location.hash = '#registra'; setTimeout(function () { ACT.regPick({ dataset: { v: el.dataset.v } }); ui.reg.step = 'pdf'; render(); }, 0); },
  pdfKm: function (el) { ui.reg.pdf.km = num(el.dataset.v); render(); },
  pdfUpload: async function (el) {
    var R = ui.reg, P = R.pdf; el.disabled = true; el.textContent = 'Caricamento…';
    var n = await q(sb.rpc('upload_results', { p_race: R.raceId, p_km: P.km, p_rows: P.rows }));
    if (n === null) { el.disabled = false; el.textContent = 'Le righe sono giuste: carica la classifica'; return; }
    toast('Classifica caricata: ' + n + ' righe'); await loadAll(); await loadResults(R.raceId); R.km = P.km; R.step = 'ufficiale'; R.offQ = null; render();
  },
  pdfDelete: async function (el) { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Tocca di nuovo per eliminare la classifica'; return; }
    if (await q(sb.rpc('delete_results', { p_race: el.dataset.v, p_km: num(el.dataset.km) }))) { toast('Classifica eliminata'); loadAll(); } },
  savePriv: async function () { var R = ui.reg, f = (R.first || '').trim(), l = (R.last || '').trim(); if (!f || !l) { toast('Scrivi nome e cognome'); return; }
    if (await q(sb.from('private_profiles').insert({ id: S.uid, first_name: f, last_name: l }))) { S.priv = { first_name: f, last_name: l }; render(); } },
  offPick: function (el) { offConfirmSheet(el.dataset.v); },
  offClaim: async function (el) { var R = ui.reg; el.disabled = true; var bibIn = $('cb'); if (bibIn) R.bib = bibIn.value;
    var id = await q(sb.rpc('claim_result', { p_result: el.dataset.v, p_bib: String(R.bib || '').trim() || null }));
    if (!id) { el.disabled = false; return; }
    closeSheet(); await loadAll(); R.savedId = id; R.step = 'fatto'; render(); },
  shotDel: function (el) { var R = ui.reg, x = R.shots.splice(int(el.dataset.v), 1)[0]; if (x && x.url) URL.revokeObjectURL(x.url); render(); },
  raceRoute: function (el) { ui.race.route = num(el.dataset.v); render(); },
  entry: function (el) { ui.reportReason = null; entrySheet(el.dataset.v); },
  report: function (el) { ui.reportReason = null; entrySheet(el.dataset.v, 'report'); },
  repReason: function (el) { ui.reportReason = int(el.dataset.v); entrySheet(el.dataset.e, 'report'); },
  repSend: async function (el) {
    var e = S.entries[el.dataset.v], reasons = ['Non era alla gara', 'Tempo non plausibile', 'Screenshot di un’altra corsa', 'Distanza diversa da quella dichiarata'];
    var ok = await q(sb.from('votes').insert({ entry_id: e.id, user_id: S.uid, type: 'report', reason: reasons[ui.reportReason] }));
    if (ok) { toast('Segnalazione inviata. Con la segnalazione di un secondo partecipante si apre la verifica.'); closeSheet(); loadAll(); }
  },
  unreport: async function (el) { var e = S.entries[el.dataset.v]; if (await q(sb.from('votes').delete().eq('entry_id', e.id).eq('user_id', S.uid))) toast('Segnalazione ritirata'); closeSheet(); loadAll(); },
  confirm: async function (el) {
    var e = S.entries[el.dataset.v], st = entryState(e);
    if (st.confirmUids.indexOf(S.uid) >= 0) await q(sb.from('votes').delete().eq('entry_id', e.id).eq('user_id', S.uid));
    else await q(sb.from('votes').insert({ entry_id: e.id, user_id: S.uid, type: 'confirm' }));
    await loadAll(); entrySheet(e.id);
  },
  defense: async function (el) { var v = ($('def') || {}).value || ''; if (await q(sb.from('entries').update({ defense: v.slice(0, 200) }).eq('id', el.dataset.v))) { toast('Messaggio inviato'); closeSheet(); loadAll(); } },
  delEntry: async function (el) { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Tocca di nuovo per eliminare'; return; } if (await q(sb.from('entries').delete().eq('id', el.dataset.v))) toast('Partecipazione eliminata'); closeSheet(); loadAll(); },
  modOk: async function (el) { if (await q(sb.rpc('moderate', { p_entry: el.dataset.v, p_status: 'validated' }))) { toast('Partecipazione validata'); closeSheet(); loadAll(); } },
  modRemove: async function (el) { if (await q(sb.rpc('moderate', { p_entry: el.dataset.v, p_status: 'removed' }))) { toast('Partecipazione rimossa dalle classifiche'); closeSheet(); loadAll(); } },
  closeSheet: closeSheet,
  sheetBg: function (el, ev) { if (ev.target === el) closeSheet(); },
  story: function (el) { story(el.dataset.v); },
  storyTab: function (el) { ui.story.tab = el.dataset.v; storySheet(); },
  teamLogoDel: async function () { var t = S.teams[me().teamId]; if (await q(sb.rpc('set_team_logo', { p_team: t.id, p_path: null }))) { toast('Logo tolto'); loadAll(); } },
  cls: function (el) { ui.cls[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'sex') ui.cls.cat = 'all'; render(); },
  teamTab: function (el) { ui.team.tab = el.dataset.v; render(); },
  profChart: function (el) { ui.profile.chart = el.dataset.v; render(); },
  copyCode: function (el) { try { navigator.clipboard.writeText(el.dataset.v).then(function () { toast('Codice copiato'); }, function () { toast('Copia non riuscita: il codice è ' + el.dataset.v); }); } catch (x) { toast('Il codice è ' + el.dataset.v); } },
  editSex: function (el) { ui.edit.sex = el.dataset.v; render(); },
  editSave: async function () {
    var o = ui.edit, b = int(o.birth); if (o.nick.trim().length < 2 || !o.sex || b < 1900 || new Date().getFullYear() - b < 18) { toast('Controlla i dati'); return; }
    if ((o.first || '').trim() && (o.last || '').trim()) { var pv = { first_name: o.first.trim(), last_name: o.last.trim() };
      if (!(await q(S.priv ? sb.from('private_profiles').update(pv).eq('id', S.uid) : sb.from('private_profiles').insert(Object.assign({ id: S.uid }, pv))))) return; S.priv = pv; }
    var pbs = {}, bad = null; PB_KEYS.forEach(function (k) { var t = parseTimeStr(o['pb_' + k[0].replace('.', '')]); if (t === null) return; if (!(t >= 600 && t <= 36000)) bad = k[1]; else pbs[k[0]] = Math.round(t); });
    if (bad) { toast('Controlla il record: ' + bad + ' (es. 21:30 o 1:38:05)'); return; }
    if (await q(sb.from('profiles').update({ nick: o.nick.trim(), sex: o.sex, birth: b, pbs: pbs, bio: (o.bio || '').trim().slice(0, 160) || null }).eq('id', S.uid))) { ui.edit = null; toast('Profilo aggiornato'); await loadAll(); location.hash = '#profilo'; }
  },
  exportData: function () { var data = { profilo: me(), partecipazioni: activeEntries().filter(function (e) { return e.uid === S.uid; }).map(function (e) { return { gara: S.races[e.raceId].name, data: S.races[e.raceId].date, km: e.km, tempo: fmtTime(e.secs), punti: (S.pts[e.id] || {}).total }; }) };
    try { navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(function () { toast('Dati copiati negli appunti'); }, function () { toast('Copia non riuscita'); }); } catch (x) { toast('Copia non riuscita'); } },
  deleteMe: async function (el) {
    if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Tocca di nuovo per cancellare tutto'; return; }
    await q(sb.from('entries').delete().eq('user_id', S.uid), true); await q(sb.from('profiles').delete().eq('id', S.uid), true);
    ui.onb = null; toast('Profilo cancellato'); await sb.auth.signOut(); location.hash = '';
  },
  logout: async function () { await sb.auth.signOut(); ui.auth = null; ui.onb = null; ui.reg = null; location.hash = ''; },
  copyInvite: function (el) {
    var t = 'Unisciti alla mia squadra su Finishr! Apri ' + location.origin + location.pathname + ' e crea un account' + (el.dataset.v ? ', poi usa il codice squadra ' + el.dataset.v : '') + '.';
    try { navigator.clipboard.writeText(t).then(function () { toast('Invito copiato: incollalo su WhatsApp'); }, function () { toast(t); }); } catch (x) { toast(t); }
  },
  authMode: function (el) { ui.auth = ui.auth || {}; ui.auth.mode = el.dataset.v; renderAuth(); },
  authGo: async function (el) {
    var a = ui.auth, email = (a.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Scrivi un indirizzo email valido'); return; }
    var r;
    if (a.mode !== 'reset' && (a.pass || '').length < 8) { toast('La password deve avere almeno 8 caratteri'); return; }
    el.disabled = true;
    if (a.mode === 'reset') { r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (!r.error) { a.mode = 'sent'; a.msg = 'Se l’indirizzo è registrato, ti abbiamo mandato un link per scegliere una nuova password.'; } }
    else if (a.mode === 'signup') { r = await sb.auth.signUp({ email: email, password: a.pass, options: { emailRedirectTo: location.origin + location.pathname } }); if (!r.error && !r.data.session) { a.mode = 'sent'; a.msg = 'Ti abbiamo mandato un’email: apri il link per confermare l’indirizzo, poi torna qui e accedi.'; } }
    else r = await sb.auth.signInWithPassword({ email: email, password: a.pass });
    if (r.error) { el.disabled = false; toast(/Invalid login/i.test(r.error.message) ? 'Email o password sbagliate' : /not confirmed/i.test(r.error.message) ? 'Conferma prima l’indirizzo dal link che ti abbiamo mandato' : /already registered/i.test(r.error.message) ? 'Questa email ha già un account: accedi' : err2msg(r.error)); return; }
    if (a.mode === 'sent') renderAuth();
  },
  authNewPass: async function (el) {
    if ((ui.auth.pass || '').length < 8) { toast('Almeno 8 caratteri'); return; } el.disabled = true;
    var r = await sb.auth.updateUser({ password: ui.auth.pass }); if (r.error) { el.disabled = false; toast(err2msg(r.error)); return; }
    toast('Password aggiornata'); ui.auth = null; S.uid = S.session.user.id; S.ready = true; location.hash = '#home'; loadAll();
  }
};
async function ensureProfile() {
  if (me()) return true; var o = ui.onb;
  var ok = await q(sb.from('profiles').insert({ id: S.uid, nick: o.nick.trim(), sex: o.sex, birth: int(o.birth) }));
  if (ok) { S.members[sid(S.uid)] = { uid: S.uid, nick: o.nick.trim(), sex: o.sex, birth: int(o.birth), teamId: null, teamChanges: {} };
    if ((o.first || '').trim() && (o.last || '').trim()) { await q(sb.from('private_profiles').insert({ id: S.uid, first_name: o.first.trim(), last_name: o.last.trim() }), true); S.priv = { first_name: o.first.trim(), last_name: o.last.trim() }; } }
  return !!ok;
}
async function saveMember(teamId) {
  if (!(await ensureProfile())) return;
  var o = ui.onb || {}, cur = (me() || {}).teamId || null;
  if (teamId !== cur) { var ok = await q(sb.rpc('join_team', { p_team: teamId, p_code: (o.code || '').trim() || null })); if (!ok) return; }
  toast(teamId ? 'Sei entrato in ' + ((S.teams[teamId] || {}).name || 'squadra') : 'Ora corri senza squadra');
  ui.onb = null; await loadAll(); location.hash = teamId ? '#squadra' : '#home'; render();
}

// vista "cambia squadra" riusa l'onboarding
var _route = route;
route = function () { var r = _route(); if (r.view === 'cambia') return { view: 'cambia' }; return r; };
var _vOnb = vOnboarding;
function vCambia() { ui.onb = ui.onb || { step: 'squadra', tq: '', code: '', newTeam: '', town: '', color: COLORS[0][0], access: 'open' }; if (ui.onb.step === 'welcome' || ui.onb.step === 'profilo') ui.onb.step = 'squadra'; return '<a href="#profilo" class="btn link" style="margin-top:10px">← Annulla</a>' + _vOnb(); }

// =================== eventi ===================
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]'); if (!el) return;
  var fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'BUTTON' && el.disabled) return;
  if (el.dataset.act !== 'sheetBg') ev.preventDefault();
  fn(el, ev);
});
document.addEventListener('input', function (ev) {
  var el = ev.target, b = el.dataset && el.dataset.bind; if (!b) return;
  var parts = b.split('.'), obj = ui[parts[0]]; if (!obj) return; obj[parts[1]] = el.value;
  if (el.dataset.live) liveUpdate(b);
});
function liveUpdate(b) {
  if (b === 'reg.q') { var q = ui.reg.q.trim().toLowerCase(); $('raceList').innerHTML = raceListHtml(recentRaces().filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) !== -1 || r.town.toLowerCase().indexOf(q) !== -1; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }), q); }
  else if (b === 'reg.h' || b === 'reg.m' || b === 'reg.s') { var R = ui.reg, s = regSecs(R); $('paceOut').textContent = R.km && s ? fmtPace(s / R.km) : '—'; $('toProva').disabled = !(R.km && s); }
  else if (b === 'onb.birth') { var o = ui.onb, age = new Date().getFullYear() - int(o.birth); $('catPrev').innerHTML = int(o.birth) && age < 18 ? 'L’app è riservata ai maggiorenni.' : 'Categoria FIDAL: <b>' + esc(catLabel(category(o.sex, int(o.birth), new Date().getFullYear()))) + '</b>'; onbValid(); }
  else if (b === 'reg.offQ' || (b === 'reg.bib' && ui.reg && ui.reg.step === 'ufficiale')) {
    var R2 = ui.reg, rows2 = ((S.results || {})[R2.raceId] || []).filter(function (x) { return x.km === R2.km; }), nq2 = normName(R2.offQ != null ? R2.offQ : ''), sur2 = normName((S.priv || {}).last_name), bib2 = String(R2.bib || '').replace(/^0+/, '');
    var l2 = rows2.filter(function (x) { return !nq2 || normName(x.name).indexOf(nq2) !== -1 || (x.bib && x.bib.replace(/^0+/, '') === nq2); }).map(function (x) { x._score = (bib2 && x.bib && x.bib.replace(/^0+/, '') === bib2 ? 2 : 0) + ((' ' + normName(x.name) + ' ').indexOf(' ' + sur2 + ' ') !== -1 ? 1 : 0); return x; }).sort(function (a, b) { return b._score - a._score || a.pos - b.pos; }).slice(0, 40);
    var ol = $('offList'); if (ol) ol.innerHTML = offListHtml(l2);
  }
  else if (b === 'onb.tq') { var sc = document.activeElement; render(); var i = $('tq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}
function onbValid() { var o = ui.onb, b = $('onbNext'); if (b) b.disabled = !(o.nick.trim().length >= 2 && o.sex && int(o.birth) > 1900 && new Date().getFullYear() - int(o.birth) >= 18 && (o.first || '').trim() && (o.last || '').trim()); }
document.addEventListener('keyup', function (ev) { if (ev.target.dataset && /^onb\.(nick|first|last)$/.test(ev.target.dataset.bind || '')) onbValid(); });
document.addEventListener('change', function (ev) {
  var el = ev.target;
  if (el.id === 'gpxFile' && el.files[0]) { var f = el.files[0], r = new FileReader(); r.onload = function () { try { ui.reg.gpx = parseGpx(r.result); } catch (e) { ui.reg.gpx = { error: e.message }; } if (ui.reg.gpx.error) ui.reg.gpx = null, toast('File non leggibile: non è un GPX valido'); render(); }; r.readAsText(f); }
  if (el.id === 'photoFile' && el.files[0]) {
    (async function (file) {
      try {
        var url = URL.createObjectURL(file), img = new Image(); img.src = url; await img.decode();
        var N = 400, c = document.createElement('canvas'); c.width = N; c.height = N; var side = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, N, N); URL.revokeObjectURL(url);
        var bl = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.85); }), path = S.uid + '/avatar-' + Date.now() + '.jpg';
        var up = await sb.storage.from('screenshots').upload(path, bl, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        if (await q(sb.rpc('set_my_photo', { p_path: path }))) { toast('Foto aggiornata'); await loadAll(); render(); }
      } catch (x) { toast('Non riesco a caricare questa foto'); }
    })(el.files[0]);
  }
  if (el.id === 'teamLogoFile' && el.files[0]) {
    (async function (file) {
      try {
        var url = URL.createObjectURL(file), img = new Image(); img.src = url; await img.decode();
        var N = 512, c = document.createElement('canvas'); c.width = N; c.height = N; var r = Math.min(N / img.width, N / img.height), w = img.width * r, h2 = img.height * r;
        c.getContext('2d').drawImage(img, (N - w) / 2, (N - h2) / 2, w, h2); URL.revokeObjectURL(url);
        var bl = await new Promise(function (res) { c.toBlob(res, 'image/png'); }), t = S.teams[me().teamId], path = S.uid + '/team-' + t.id + '-' + Date.now() + '.png';
        var up = await sb.storage.from('screenshots').upload(path, bl, { contentType: 'image/png', upsert: false });
        if (up.error) throw up.error;
        if (await q(sb.rpc('set_team_logo', { p_team: t.id, p_path: path }))) { toast('Logo caricato'); loadAll(); }
      } catch (x) { toast('Non riesco a caricare questa immagine'); }
    })(el.files[0]);
  }
  if (el.id === 'pdfFile' && el.files[0]) {
    var pf = el.files[0], RR = ui.reg; RR.pdf = { name: pf.name, status: 'loading' }; render();
    pdfLines(pf).then(function (lines) { var rows = parseResultLines(lines, int(S.races[RR.raceId].date.slice(0, 4))); if (rows.length < 2) throw new Error('Non ho trovato righe di classifica in questo PDF.');
      RR.pdf = { name: pf.name, rows: rows, km: RR.km && !officialFor(S.races[RR.raceId], RR.km) ? RR.km : (S.races[RR.raceId].distances.length === 1 ? S.races[RR.raceId].distances[0] : null) }; render(); })
      .catch(function (err) { RR.pdf = { name: pf.name, status: 'error', err: (err && err.message && /righe/.test(err.message)) ? err.message : 'Non riesco a leggere questo PDF. Se è una scansione (immagine) non contiene testo leggibile.' }; render(); });
  }
  if (el.id === 'shotFile' && el.files.length) {
    var R = ui.reg, files = [].slice.call(el.files, 0, 4 - R.shots.length);
    files.forEach(function (file) {
      var cur = { url: URL.createObjectURL(file), status: 'loading', file: file }; R.shots.push(cur);
      shrinkImage(file).then(function (bl) { cur.blob = bl; }).catch(function () { cur.blob = file; });
      getOcr().then(function (w) { return w.recognize(file); }).then(function (out) { if (R.shots.indexOf(cur) < 0) return; cur.status = 'done'; cur.text = out.data.text || ''; render(); })
        .catch(function (err) { if (R.shots.indexOf(cur) < 0) return; cur.status = 'fail'; cur.err = err && err.message; render(); });
    });
    render();
  }
});
function afterRender(v) { }

// collega la vista "cambia"
var _render = render;
render = function () {
  if (S.ready && allLoaded() && route().view === 'cambia') { S.lastView = 'cambia'; $('tabs').classList.remove('hidden'); $('main').innerHTML = vCambia(); return; }
  _render();
};
var _saveMember = saveMember;

init();
})();
