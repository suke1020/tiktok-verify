// ==UserScript==
// @name         JCS 自動入力
// @description  スプレッドシートのプロフィールをジャンプキャラクターズストアの入力欄に入力する（送信はしない）
// @version      0.3.1
// @match        https://jumpcs.shueisha.co.jp/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.setClipboard
// @run-at       document-idle
// @inject-into  content
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ブックマークレットとして2回目以降に実行されたときは、パネルを開くだけ
  if (window.__jcsfillStart && document.getElementById('__jcsfill')) { window.__jcsfillStart(); return; }

  // ===== 列 → 入力欄の対応表 =====
  //   names : 入力欄の name / id（完全一致）。複数あれば全部に入力（確認用欄など）
  //   labels: 入力欄のラベル・placeholder（空白や記号を除いて完全一致）
  //   type  : 'digits' = 数字だけにして入力
  // 「調査」ボタンで分かった name をここに追加していく。
  const MAP = {
    Email: { names: ['uid'], labels: ['メールアドレス'] },
    Password: { names: ['pwd'], labels: ['パスワード'] },
    LastName: { labels: ['姓', 'お名前(姓)', '氏名(姓)'] },
    FirstName: { labels: ['名', 'お名前(名)', '氏名(名)'] },
    LastKana: { labels: ['セイ', 'フリガナ(セイ)', 'お名前(セイ)'] },
    FirstKana: { labels: ['メイ', 'フリガナ(メイ)', 'お名前(メイ)'] },
    LastRoman: { labels: [] },
    FirstRoman: { labels: [] },
    Username: { labels: [] },
    State: { labels: ['都道府県'] },
    City: { labels: ['市区町村'] },
    Address: { labels: ['番地', '町名番地', '町域番地'] },
    Address2: { labels: ['建物名', '建物名部屋番号'] },
    Address3: { labels: [] },
    Tel: { labels: ['電話番号'], type: 'digits' },
    ZipCode: { labels: ['郵便番号'], type: 'digits' },
    Birth_year: { labels: ['生年月日(年)'] },
    Birth_month: { labels: ['生年月日(月)'] },
    Birth_day: { labels: ['生年月日(日)'] },
    Sex: { labels: ['性別'] },
    CardType: { labels: ['カード種類', 'カードの種類', 'カードブランド'] },
    CardNumber: { labels: ['カード番号'], type: 'digits' },
    Month: { labels: ['有効期限(月)'] },
    Year: { labels: ['有効期限(年)'] },
  };

  // 選択肢の表記ゆれ（同じグループ内は同じ値とみなす）
  const SYNONYMS = [
    ['男', '男性', 'male', 'm', 'man'],
    ['女', '女性', 'female', 'f', 'woman'],
    ['その他', '回答しない', '無回答', 'other'],
  ];

  // スプレッドシートの列の並び（A〜Z）。コピーした1行をこの順で振り分ける
  const COLS = ['ProfileName', 'LastName', 'FirstName', 'LastKana', 'FirstKana', 'LastRoman', 'FirstRoman',
    'Email', 'Username', 'Password', 'State', 'City', 'Address', 'Address2', 'Address3', 'Tel', 'ZipCode',
    'Birth_year', 'Birth_month', 'Birth_day', 'Sex', 'CardType', 'CardNumber', 'Month', 'Year', 'Cvv'];
  const NEVER_FILL = ['ProfileName', 'Cvv']; // セキュリティコードは入力しない

  const ID = '__jcsfill';
  const hasGM = typeof GM !== 'undefined';

  // ---------- 保存 ----------
  // Userscripts では拡張機能の保存領域（この iPhone の中）、
  // ブックマークレットではタブを閉じると消える sessionStorage を使う
  async function getVal(k) {
    if (hasGM && GM.getValue) return GM.getValue(k, '');
    try { return sessionStorage.getItem(ID + k) || ''; } catch (e) { return ''; }
  }
  async function setVal(k, v) {
    if (hasGM && GM.setValue) return GM.setValue(k, v);
    try { sessionStorage.setItem(ID + k, v); } catch (e) {}
  }
  async function delVal(k) {
    if (hasGM && GM.deleteValue) return GM.deleteValue(k);
    try { sessionStorage.removeItem(ID + k); } catch (e) {}
  }

  // ---------- 貼り付けデータの読み取り ----------
  // スプレッドシートからコピーした文字（タブ区切り、改行を含むセルは "…" 囲み）を行の配列にする
  function parseTSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    text = text.replace(/\r\n?/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"' && cell === '') quoted = true;
      else if (c === '\t') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    row.push(cell);
    rows.push(row);
    return rows;
  }

  function toProfiles(text) {
    return parseTSV(text.trim())
      .filter((r) => r.some((v) => v.trim() !== ''))
      .filter((r) => r[0].trim() !== 'ProfileName') // 見出し行ごとコピーした場合は除く
      .map((r) => {
        const d = {};
        COLS.forEach((c, i) => { d[c] = (r[i] || '').trim(); });
        if (!d.ProfileName) d.ProfileName = (d.LastName + ' ' + d.FirstName).trim() || '(名前なし)';
        return d;
      });
  }

  async function getProfiles() {
    try { return JSON.parse((await getVal('profiles')) || '[]'); } catch (e) { return []; }
  }

  // ---------- 入力 ----------
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/必須|任意|※/g, '')
      .replace(/[\s　*:：・\-－]/g, '')
      .toLowerCase();
  }

  function sameValue(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return false;
    if (a === b) return true;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      if (parseInt(a, 10) === parseInt(b, 10)) return true;
      // 西暦4桁 と 下2桁（2028 と 28）
      if (a.length !== b.length && (a.length === 2 || b.length === 2)) return a.slice(-2) === b.slice(-2);
    }
    return SYNONYMS.some((g) => {
      const n = g.map(norm);
      return n.includes(a) && n.includes(b);
    });
  }

  function labelText(l) {
    const c = l.cloneNode(true);
    c.querySelectorAll('input,select,textarea').forEach((x) => x.remove());
    return c.textContent;
  }

  function labelsOf(el) {
    const out = [];
    if (el.labels) for (const l of el.labels) out.push(labelText(l));
    for (const a of ['placeholder', 'aria-label', 'title']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
    const by = el.getAttribute('aria-labelledby');
    if (by) by.split(/\s+/).forEach((id) => { const t = document.getElementById(id); if (t) out.push(t.textContent); });
    return out.map(norm);
  }

  function candidates() {
    return [...document.querySelectorAll('input,select,textarea')].filter((el) =>
      !/^(hidden|submit|button|image|reset|file|search)$/.test(el.type) &&
      !el.disabled && !el.readOnly &&
      el.name !== 'g-recaptcha-response' &&
      !el.closest('#' + ID));
  }

  function findTargets(col, els) {
    const m = MAP[col] || {};
    const names = (m.names || []).concat([col]);
    let hit = els.filter((el) => names.includes(el.name) || (el.id && names.includes(el.id)));
    if (!hit.length && m.labels && m.labels.length) {
      const want = m.labels.map(norm);
      hit = els.filter((el) => labelsOf(el).some((l) => want.includes(l)));
    }
    return hit;
  }

  function setNative(el, value) {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    for (const t of ['input', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true }));
  }

  function fillOne(el, value) {
    if (el.tagName === 'SELECT') {
      const opts = [...el.options];
      const v = norm(value);
      const o = opts.find((x) => sameValue(x.value, value)) ||
        opts.find((x) => sameValue(x.text, value)) ||
        opts.find((x) => v && norm(x.text).startsWith(v));
      if (!o) return false;
      setNative(el, o.value);
      return true;
    }
    if (el.type === 'radio') {
      const group = el.name ? [...document.querySelectorAll('input[type=radio]')].filter((r) => r.name === el.name) : [el];
      const r = group.find((x) => sameValue(x.value, value) || (x.labels && x.labels[0] && sameValue(labelText(x.labels[0]), value)));
      if (!r) return false;
      if (!r.checked) r.click();
      return true;
    }
    if (el.type === 'checkbox') {
      const on = /^(true|1|yes|on|はい|○|◯|✓|レ)$/i.test(String(value).trim());
      if (el.checked !== on) el.click();
      return true;
    }
    setNative(el, value);
    return true;
  }

  function convert(col, value) {
    value = String(value == null ? '' : value).trim();
    if ((MAP[col] || {}).type === 'digits') {
      value = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, '');
    }
    return value;
  }

  function fill(data) {
    const els = candidates();
    const res = { done: [], failed: [], notFound: [] };
    const usedRadio = new Set();
    for (const col of Object.keys(data)) {
      if (NEVER_FILL.includes(col)) continue;
      const value = convert(col, data[col]);
      if (value === '') continue;
      const targets = findTargets(col, els);
      if (!targets.length) { res.notFound.push(col); continue; }
      let ok = false;
      for (const el of targets) {
        if (el.type === 'radio') {
          if (usedRadio.has(el.name)) continue;
          usedRadio.add(el.name);
        }
        if (fillOne(el, value)) {
          ok = true;
          el.style.outline = '2px solid #2e7d32';
          el.style.outlineOffset = '1px';
        }
      }
      (ok ? res.done : res.failed).push(col);
    }
    return res;
  }

  // ---------- フォーム調査（入力欄の一覧をコピー。値は含めない） ----------
  function survey() {
    const list = [...document.querySelectorAll('input,select,textarea')]
      .filter((e) => e.type !== 'hidden' && !e.closest('#' + ID))
      .map((e) => {
        let l = e.labels && e.labels.length ? labelText(e.labels[0]) : '';
        if (!l) {
          const t = e.closest('tr,dl,li,div');
          if (t) l = (t.querySelector('th,dt,label') || t).textContent.slice(0, 40);
        }
        const o = { tag: e.tagName.toLowerCase(), type: e.type, name: e.name, id: e.id, label: l.replace(/\s+/g, ' ').trim() };
        if (e.placeholder) o.placeholder = e.placeholder;
        if (e.type === 'radio' || e.type === 'checkbox') o.value = e.value;
        if (e.tagName === 'SELECT') o.options = [...e.options].slice(0, 60).map((x) => x.value + '=' + x.text.trim());
        return o;
      });
    return location.href + '\n' + JSON.stringify(list);
  }

  async function copy(text) {
    if (hasGM && GM.setClipboard) { await GM.setClipboard(text); return; }
    await navigator.clipboard.writeText(text);
  }

  // ---------- 画面 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const root = document.createElement('div');
  root.id = ID;
  root.innerHTML = `
    <style>
      #${ID} { all: initial; }
      #${ID} * { box-sizing: border-box; font: 15px/1.5 -apple-system, "Hiragino Sans", sans-serif; }
      #${ID} .fab { position: fixed; left: 8px; top: 40%; z-index: 2147483646; padding: 12px 14px;
        border: 0; border-radius: 24px; background: #1565c0; color: #fff; font-weight: 700;
        box-shadow: 0 3px 10px rgba(0,0,0,.3); }
      #${ID} .panel { position: fixed; left: 8px; right: 8px; top: calc(env(safe-area-inset-top) + 8px); z-index: 2147483647; display: none;
        background: #fff; color: #222; border: 2px solid #1565c0; border-radius: 12px; padding: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,.3); max-height: 60vh; overflow: auto; text-align: left; }
      #${ID} .panel.open { display: block; }
      #${ID} button.b { display: block; width: 100%; margin: 6px 0; padding: 12px; font-size: 16px;
        border-radius: 8px; border: 1px solid #1565c0; background: #fff; color: #1565c0; }
      #${ID} button.b.primary { background: #1565c0; color: #fff; }
      #${ID} .row { display: flex; gap: 8px; }
      #${ID} .row button.b { flex: 1; }
      #${ID} small { font-size: 12px; color: #666; }
    </style>
    <button type="button" class="fab">自動入力</button>
    <div class="panel"><div class="body"></div><div class="btns"></div></div>`;
  // body 直下だとサイトの CSS（transform 等）でボタンが画面外に出ることがあるため html 直下に置く。
  // サイトの処理で消された場合は付け直す。
  const mount = () => { if (!root.isConnected) document.documentElement.appendChild(root); };
  mount();
  setInterval(mount, 1000);

  const panel = root.querySelector('.panel');
  const body = root.querySelector('.body');
  const btns = root.querySelector('.btns');

  function btn(label, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'b' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  function render(html, buttons = [], footer = true) {
    panel.classList.add('open');
    body.innerHTML = html;
    btns.innerHTML = '';
    buttons.forEach((b) => btns.appendChild(b));
    if (footer) {
      const r = document.createElement('div');
      r.className = 'row';
      r.appendChild(btn('調査', doSurvey));
      r.appendChild(btn('消去', clearData));
      r.appendChild(btn('閉じる', () => panel.classList.remove('open')));
      btns.appendChild(r);
    }
  }

  async function doSurvey() {
    try {
      await copy(survey());
      alert('このページの入力欄の情報をコピーしました。開発者に貼り付けて送ってください。');
    } catch (e) {
      prompt('コピーできませんでした。全選択してコピーしてください', survey());
    }
  }

  function pasteScreen() {
    render(`<b>スプレッドシートの行を貼り付け</b><br>
      <small>Google スプレッドシートアプリで行番号をタップして行を選択 →「コピー」→ 下の枠を長押しして「ペースト」。
      複数行をまとめて貼ると、一覧から選べます。</small>
      <textarea class="paste" rows="4" style="width:100%;margin-top:8px;font-size:16px;border:1px solid #999;border-radius:8px;padding:8px"></textarea>`,
    [btn('読み込む', async () => {
      const list = toProfiles(root.querySelector('.paste').value);
      if (!list.length) { alert('データがありません。行をコピーしてから貼り付けてください。'); return; }
      await setVal('profiles', JSON.stringify(list));
      if (list.length === 1) return useProfile(0);
      chooseScreen(list);
    }, 'primary')]);
  }

  function chooseScreen(list) {
    render(`<b>入力するプロフィールを選択</b>`, list.map((p, i) => btn(p.ProfileName, () => useProfile(i)))
      .concat([btn('貼り直す', pasteScreen)]));
  }

  async function useProfile(i) {
    const list = await getProfiles();
    if (!list[i]) return pasteScreen();
    await setVal('current', String(i));
    showResult(list[i].ProfileName, fill(list[i]));
  }

  function showResult(name, res) {
    let html = `<b>${esc(name)}</b><br>`;
    html += res.done.length
      ? `✅ 入力: ${res.done.length}項目<br><small>${esc(res.done.join(', '))}</small>`
      : '⚠️ このページで入力できる項目は見つかりませんでした';
    if (res.failed.length) html += `<br>❌ 選択肢が合わず入力できず: ${esc(res.failed.join(', '))}`;
    if (res.notFound.length) html += `<br><small>このページに無い列: ${esc(res.notFound.join(', '))}</small>`;
    html += '<br><small>内容を確認し、送信・reCAPTCHA はご自身で行ってください。セキュリティコードは手入力です。</small>';
    render(html, [btn('プロフィールを変更', async () => {
      const list = await getProfiles();
      if (list.length > 1) chooseScreen(list); else pasteScreen();
    })]);
  }

  async function clearData() {
    if (!confirm('記憶しているプロフィールをすべて消去しますか？')) return;
    await delVal('profiles');
    await delVal('current');
    pasteScreen();
  }

  async function start() {
    const list = await getProfiles();
    const cur = await getVal('current');
    if (list.length && cur !== '' && list[cur]) return useProfile(Number(cur));
    if (list.length > 1) return chooseScreen(list);
    pasteScreen();
  }

  root.querySelector('.fab').onclick = start;
  window.__jcsfillStart = start;
  if (!hasGM) start(); // ブックマークレットとして実行されたときはすぐパネルを開く
})();
