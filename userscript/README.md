# JCS 自動入力（iPhone Userscripts × スプレッドシート）

スプレッドシートのプロフィール（1行 = 1人分）を、iPhone Safari の拡張機能「Userscripts」で
ジャンプキャラクターズストアの入力欄に入力します。**送信・reCAPTCHA・セキュリティコードは手動**です。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `jumpcs-autofill.user.js` | Userscripts に入れるスクリプト本体。入力欄との対応表 `MAP` もここ |
| `Code.gs` | スプレッドシートに設置する Apps Script（読み取り専用。合言葉必須、Cvv は送らない） |
| `test/demo.html` | 動作確認用のダミーフォーム |

## スプレッドシート

1行目に A〜Z の見出し、2行目以降にデータ。

```
ProfileName LastName FirstName LastKana FirstKana LastRoman FirstRoman Email Username Password
State City Address Address2 Address3 Tel ZipCode Birth_year Birth_month Birth_day Sex
CardType CardNumber Month Year Cvv
```

値はシートの「表示どおり」の文字列で渡されます。`01`/`1`、`2028`/`28`、`男`/`男性` などの表記ゆれは自動で吸収します。

## 設置手順

### 1. Apps Script（スプレッドシート側・PC推奨）
1. スプレッドシート →「拡張機能 > Apps Script」に `Code.gs` を貼り付け、`TOKEN` を自分だけの合言葉に変えて保存
2. 「デプロイ > 新しいデプロイ > 種類: ウェブアプリ」（次のユーザーとして実行: 自分 / アクセスできるユーザー: 全員）
3. 初回は Google の権限確認が出るので許可 → 発行された URL（…/exec）を控える

### 2. Userscripts（iPhone側）
1. App Store で「Userscripts」（無料）をインストール
2. 設定 → アプリ → Safari → 機能拡張 → Userscripts をオン、「すべての Web サイト」または jumpcs.shueisha.co.jp を「許可」
3. Userscripts アプリを開き、スクリプトの保存フォルダを指定
4. Safari で対象サイトを開き、アドレスバーの「ぁあ」（拡張機能）→ Userscripts →「＋」→ New JS
5. `jumpcs-autofill.user.js` の内容を全部貼り付けて保存

### 3. 初回設定
対象サイトを開くと右下に「自動入力」ボタンが出ます。押して「設定する」→ Apps Script の URL と合言葉を入力。

## 使い方

1. 入力ページで「自動入力」ボタンを押す
2. 初回だけプロフィールを選ぶ（以後は同じプロフィールを使う。「プロフィールを変更」で切替）
3. 入力された欄は緑枠。内容を確認し、送信・reCAPTCHA はご自身で

## 入力されない項目があるとき

パネルの「調査」を押すと、そのページの入力欄一覧（入力値は含まない）がコピーされます。
それを開発者に送る → `MAP` の `names` に追加 → スクリプトを上書き、で対応します。
