/*
 * ジャンプキャラクターズストア 入力補助ブックマークレット（本体）
 * このファイルは設定ページ（index.html）でブックマークレットに変換して使う。
 * 注意: ブックマークレット化のため「//」形式のコメントは使わないこと。
 */
(function () {
  var CFG = { gasUrl: '__GAS_URL__', token: '__TOKEN__' };

  /*
   * 列 → 入力欄の対応表
   *   names : 入力欄の name / id（完全一致）。複数あれば全部に入力（確認用欄など）
   *   labels: 入力欄のラベル・placeholder（空白や記号を除いて完全一致）
   *   type  : 値の変換方法（digits = 数字だけにする）
   * 調査用ブックマークレットで確認できたページの項目をここに追加していく。
   */
  var MAP = {
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
    Year: { labels: ['有効期限(年)'] }
  };

  /* 性別などの表記ゆれ */
  var SYNONYMS = [
    ['男', '男性', 'male', 'm', 'man'],
    ['女', '女性', 'female', 'f', 'woman'],
    ['その他', '回答しない', '無回答', 'other']
  ];

  var P = '__ssfill';
  var KEY_ROW = P + '_row';
  var KEY_DATA = P + '_data';
  var configured = CFG.gasUrl.indexOf('http') === 0;

  function store(k, v) {
    try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {}
  }
  function load(k) {
    try { return sessionStorage.getItem(k); } catch (e) { return null; }
  }

  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
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
      if (a.length !== b.length && (a.length === 2 || b.length === 2)) return a.slice(-2) === b.slice(-2);
    }
    for (var i = 0; i < SYNONYMS.length; i++) {
      var g = SYNONYMS[i].map(norm);
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0) return true;
    }
    return false;
  }

  function labelText(l) {
    var c = l.cloneNode(true);
    c.querySelectorAll('input,select,textarea').forEach(function (x) { x.remove(); });
    return c.textContent;
  }

  function labelsOf(el) {
    var out = [];
    if (el.labels) for (var i = 0; i < el.labels.length; i++) out.push(labelText(el.labels[i]));
    ['placeholder', 'aria-label', 'title'].forEach(function (a) { if (el.getAttribute(a)) out.push(el.getAttribute(a)); });
    var by = el.getAttribute('aria-labelledby');
    if (by) by.split(/\s+/).forEach(function (id) { var t = document.getElementById(id); if (t) out.push(t.innerText); });
    return out.map(norm);
  }

  function candidates() {
    var list = [];
    document.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (/^(hidden|submit|button|image|reset|file|search)$/.test(el.type)) return;
      if (el.disabled || el.readOnly) return;
      if (el.name === 'g-recaptcha-response') return;
      list.push(el);
    });
    return list;
  }

  function findTargets(col, els) {
    var m = MAP[col] || {};
    var names = (m.names || []).concat([col]);
    var hit = els.filter(function (el) {
      return names.indexOf(el.name) >= 0 || (el.id && names.indexOf(el.id) >= 0);
    });
    if (!hit.length && m.labels && m.labels.length) {
      var want = m.labels.map(norm);
      hit = els.filter(function (el) {
        return labelsOf(el).some(function (l) { return want.indexOf(l) >= 0; });
      });
    }
    return hit;
  }

  function setNative(el, value) {
    var proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
  }

  function fire(el) {
    ['input', 'change', 'blur'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }

  function optionLabel(el) {
    return el.labels && el.labels[0] ? labelText(el.labels[0]) : '';
  }

  function fillOne(el, value) {
    if (el.tagName === 'SELECT') {
      var opts = [].slice.call(el.options);
      var o = opts.filter(function (x) { return sameValue(x.value, value); })[0] ||
        opts.filter(function (x) { return sameValue(x.text, value); })[0] ||
        opts.filter(function (x) { var t = norm(x.text); return t && norm(value) && t.indexOf(norm(value)) === 0; })[0];
      if (!o) return false;
      setNative(el, o.value);
      fire(el);
      return true;
    }
    if (el.type === 'radio') {
      var group = el.name ? [].slice.call(document.querySelectorAll('input[type=radio]')).filter(function (r) { return r.name === el.name; }) : [el];
      var r = group.filter(function (x) { return sameValue(x.value, value) || sameValue(optionLabel(x), value); })[0];
      if (!r) return false;
      if (!r.checked) r.click();
      return true;
    }
    if (el.type === 'checkbox') {
      var on = /^(true|1|yes|on|はい|○|◯|✓|レ)$/i.test(String(value).trim());
      if (el.checked !== on) el.click();
      return true;
    }
    setNative(el, value);
    fire(el);
    return true;
  }

  function convert(col, value) {
    var m = MAP[col] || {};
    value = String(value == null ? '' : value).trim();
    if (m.type === 'digits') value = value.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/\D/g, '');
    return value;
  }

  function fill(data) {
    var els = candidates();
    var done = [];
    var failed = [];
    var usedRadioGroups = {};
    Object.keys(data).forEach(function (col) {
      var value = convert(col, data[col]);
      if (value === '') return;
      var targets = findTargets(col, els);
      if (!targets.length) return;
      var okAny = false;
      targets.forEach(function (el) {
        if (el.type === 'radio') {
          if (usedRadioGroups[el.name]) return;
          usedRadioGroups[el.name] = true;
        }
        if (fillOne(el, value)) {
          okAny = true;
          el.style.outline = '2px solid #2e7d32';
          el.style.outlineOffset = '1px';
        }
      });
      (okAny ? done : failed).push(col);
    });
    return { done: done, failed: failed };
  }

  /* ---------- 通信 ---------- */
  function api(params) {
    params.token = CFG.token;
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(CFG.gasUrl + '?' + q, { redirect: 'follow', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || '取得に失敗しました'); return j; });
  }

  /* ---------- 画面 ---------- */
  var old = document.getElementById(P);
  if (old) old.remove();
  var panel = document.createElement('div');
  panel.id = P;
  panel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;background:#fff;color:#222;' +
    'border:2px solid #1565c0;border-radius:12px;padding:12px;font:15px/1.5 -apple-system,sans-serif;' +
    'box-shadow:0 4px 20px rgba(0,0,0,.3);max-height:60vh;overflow:auto;text-align:left';
  document.body.appendChild(panel);

  function btn(label, onClick, primary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:12px;font-size:16px;border-radius:8px;' +
      'border:1px solid #1565c0;' + (primary ? 'background:#1565c0;color:#fff' : 'background:#fff;color:#1565c0');
    b.onclick = onClick;
    return b;
  }

  function render(html, buttons) {
    panel.innerHTML = '';
    var d = document.createElement('div');
    d.innerHTML = html;
    panel.appendChild(d);
    (buttons || []).forEach(function (b) { panel.appendChild(b); });
    panel.appendChild(btn('閉じる', function () { panel.remove(); }));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function showResult(name, res) {
    var html = '<b>' + esc(name) + '</b><br>';
    html += res.done.length ? '✅ 入力: ' + res.done.length + '項目（' + esc(res.done.join(', ')) + '）'
      : '⚠️ このページで入力できる項目が見つかりませんでした';
    if (res.failed.length) html += '<br>❌ 選択肢が合わず入力できず: ' + esc(res.failed.join(', '));
    html += '<br><small>内容を確認してから、送信・認証（reCAPTCHA）はご自身で行ってください。</small>';
    render(html, [
      btn('プロフィールを変更', function () { store(KEY_ROW, null); store(KEY_DATA, null); start(); }),
      btn('入力内容を消して終了', function () { store(KEY_ROW, null); store(KEY_DATA, null); panel.remove(); })
    ]);
  }

  function pasteMode(msg) {
    var buttons = [btn('貼り付けて入力', function () {
      var t = prompt('コピーしたデータを貼り付けてください');
      if (!t) return;
      try {
        var j = JSON.parse(t.trim());
        var data = j.data || j;
        store(KEY_DATA, JSON.stringify(data));
        showResult(data.ProfileName || '貼り付けデータ', fill(data));
      } catch (e) { alert('データの形式が正しくありません'); }
    }, true)];
    if (configured) {
      buttons.unshift(btn('データページを開く', function () {
        window.open(CFG.gasUrl + '?action=page&token=' + encodeURIComponent(CFG.token), '_blank');
      }));
    }
    render('⚠️ ' + esc(msg), buttons);
  }

  function useRow(row) {
    render('読み込み中…');
    api({ action: 'get', row: row }).then(function (j) {
      store(KEY_ROW, String(row));
      showResult(j.data.ProfileName || row + '行目', fill(j.data));
    }).catch(function (e) {
      pasteMode('シートから取得できませんでした（' + e.message + '）。データページでコピーして貼り付けてください。');
    });
  }

  function start() {
    var cached = load(KEY_DATA);
    if (cached) {
      var data = JSON.parse(cached);
      return showResult(data.ProfileName || '貼り付けデータ', fill(data));
    }
    if (!configured) return pasteMode('シートの URL が設定されていません。');
    var row = load(KEY_ROW);
    if (row) return useRow(row);
    render('プロフィール一覧を読み込み中…');
    api({ action: 'list' }).then(function (j) {
      if (!j.profiles.length) return render('シートにデータがありません。');
      render('<b>入力するプロフィールを選択</b>', j.profiles.map(function (p) {
        return btn(p.name + '（' + p.row + '行目）', function () { useRow(p.row); });
      }));
    }).catch(function (e) {
      pasteMode('シートから取得できませんでした（' + e.message + '）。データページでコピーして貼り付けてください。');
    });
  }

  start();
})();
