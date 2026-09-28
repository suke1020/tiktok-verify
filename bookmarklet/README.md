# 入力補助ブックマークレット（iPhone × スプレッドシート）

スプレッドシートのプロフィール（1行 = 1人分）を、iPhone Safari のブックマークレットで
ジャンプキャラクターズストアの入力欄に自動入力します。送信・reCAPTCHA は手動です。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `Code.gs` | スプレッドシートに設置する Apps Script（読み取り専用の API） |
| `fill.js` | ブックマークレット本体。入力欄との対応表 `MAP` もここ |
| `index.html` | iPhone でブックマークレットを作るための設定ページ |
| `test/demo.html` | 動作確認用のダミーフォーム |

## スプレッドシート

1行目に A〜Z の見出しを置き、2行目以降にデータを入れます。

```
ProfileName LastName FirstName LastKana FirstKana LastRoman FirstRoman Email Username Password
State City Address Address2 Address3 Tel ZipCode Birth_year Birth_month Birth_day Sex
CardType CardNumber Month Year Cvv
```

- `Cvv`（セキュリティコード）は **Apps Script から送らず、入力もしません**。シートにも保存しないでください。
- 値はシートの「表示どおり」の文字列で渡されます。`01` と `1`、`2028` と `28`、`男` と `男性` などの表記ゆれは自動で吸収します。

## 設置手順

1. スプレッドシート →「拡張機能 > Apps Script」に `Code.gs` を貼り付け、`TOKEN` を自分だけの合言葉に変えて保存
2. 「デプロイ > 新しいデプロイ > ウェブアプリ」（実行: 自分 / アクセス: 全員）→ URL（…/exec）をコピー
3. iPhone で `bookmarklet/index.html`（GitHub Pages 上）を開き、URL と合言葉を入力 → 作成 → コピー
4. Safari で適当なページをブックマークし、そのブックマークの URL を貼り付けたコードに置き換える

## 使い方

入力ページで、ブックマークの「自動入力」をタップします。初回だけプロフィールを選ぶと、同じタブでは
次のページからも同じプロフィールで入力します。「入力内容を消して終了」で選択を解除できます。

サイトの制限で通信できない場合は、パネルの「データページを開く」でデータをコピーし、「貼り付けて入力」に貼り付けます。

## 入力欄の対応を追加する

入力されない項目があるときは、設定ページの「フォーム調査用」ブックマークレットをそのページで実行し、
出力された `name` を `fill.js` の `MAP` の `names` に追加します。
