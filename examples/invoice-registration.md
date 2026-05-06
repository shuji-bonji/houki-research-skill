# Example — 「インボイス制度の登録番号の扱いは?」

`workflows/tax-research.md` の典型ワークフローを **「インボイス制度における適格請求書発行事業者の登録番号」** という具体的な問いに適用した完全 walkthrough。LLM 向けの few-shot 例として保存。

## 問い

> インボイス制度における適格請求書発行事業者の登録番号の扱いについて、法律本文と通達と最近の改正点を併せて教えてください。

## 期待される Skill の動作

### ステップ ①: 業法独占判定

問いには「**私の**」「**うちの**」など個別具体の主語が含まれていない → **境界 ① (制度の概観)** に該当。注意喚起なしで進める。

### ステップ ②: 略称解決

「インボイス」が含まれるので念のため houki-abbreviations 系で確認:

```jsonc
{ "tool": "resolve_abbreviation", "args": { "name": "インボイス" } }
// → { formal: "適格請求書等保存方式", source_mcp_hint: "nta" / "egov" }
```

### ステップ ③: 法律本文を取得 (houki-egov-mcp)

```jsonc
{ "tool": "search_law", "args": { "keyword": "適格請求書発行事業者の登録" } }
// → 消費税法 第 57 条の 2

{ "tool": "get_law", "args": { "lawNumber": "消費税法", "article": "57の2" } }
// → 条文本文 + legal_status (binds_citizens=true / binds_courts=true)
```

### ステップ ④: 通達による解釈を取得 (houki-nta-mcp)

```jsonc
{ "tool": "nta_get_tsutatsu", "args": { "name": "消基通", "clause": "1-7-2" } }
// → 「登録番号の構成」の通達本文
// + legal_status (binds_tax_office=true / binds_citizens=false)
```

### ステップ ⑤: 改正履歴を検索

```jsonc
{
  "tool": "nta_search_kaisei_tsutatsu",
  "args": { "keyword": "インボイス", "taxonomy": "shohi", "hasPdf": true, "limit": 5 }
}
// → 改正通達一覧 (例: docId="0025004-026" の 2025-04-01 付け改正)
```

### ステップ ⑥: 添付 PDF メタを取得

```jsonc
{
  "tool": "nta_inspect_pdf_meta",
  "args": { "docType": "kaisei", "docId": "0025004-026" }
}
// → attachedPdfs:
//   [
//     { kind: "comparison", title: "別紙 1 (新旧対照表)", url: "...", sizeKb: 221 },
//     { kind: "attachment", title: "別紙 2", url: "...", sizeKb: 449 }
//   ]
// + reader_hints.examples:
//   [
//     { kind: "comparison",  tool: "extract_tables", args: { url: "...01.pdf" } },
//     { kind: "attachment",  tool: "extract_tables", args: { url: "...02.pdf" } }
//   ]
```

### ステップ ⑦: 新旧対照表 PDF を表抽出 (pdf-reader-mcp)

`reader_hints.examples` の最優先 (`comparison`) を実行:

```jsonc
{
  "tool": "extract_tables",
  "args": {
    "file_path": "<前段で取得した URL を read_url で fetch するか、ローカルパス>",
    "pages": "1"
  }
}
// → Markdown table:
// | 改正後 | 改正前 |
// |---|---|
// | …第２条第 16 項《定義》… | …第２条第 15 項《定義》… |
```

### ステップ ⑧: 階層を明示した回答

````markdown
## インボイス制度の適格請求書発行事業者の登録番号について

### 法的根拠
**消費税法 第 57 条の 2** が、適格請求書発行事業者の登録に関する規定です。
登録番号は同条第 4 項に基づき「**適格請求書発行事業者登録簿**」に登載されます。

### 登録番号の構成 (通達による解釈)
**消費税法基本通達 1-7-2「登録番号の構成」** により、登録番号は次の区分で構成されます:

- **法人番号を有する課税事業者**:
  ローマ字大文字「**T**」 + 法人番号 (行政手続における特定の個人を識別するための番号の利用等に関する法律 第 2 条第 16 項)
- **法人番号を有しない事業者** (個人事業主・人格のない社団等):
  通達 1-7-2 (2) に規定される 13 桁の番号

### 2025 年改正 (新旧対照表より)
2025 年 4 月 1 日付の改正 (docId=0025004-026) では、以下の点が変更されました:

| 改正前 | 改正後 |
|---|---|
| 法人番号法 第 2 条 第 **15** 項 を引用 | 第 **16** 項 に変更 (法人番号法の改正に対応) |

(※ 上記表は新旧対照表 PDF を pdf-reader-mcp の `extract_tables` で抽出した結果)

## Sources

### 法律 (法的根拠 / 国会制定)
- 消費税法 第 57 条の 2「適格請求書発行事業者の登録」
  ([e-Gov 法令検索](https://elaws.e-gov.go.jp/...))
  > 取得: 2026-05-07T... / `binds_citizens=true` `binds_courts=true`

### 行政解釈 (通達 / 税務署員のみ拘束)
- 消費税法基本通達 1-7-2「登録番号の構成」
  ([国税庁](https://www.nta.go.jp/law/tsutatsu/...))
  > 取得: 2026-05-07T... / `binds_tax_office=true` `binds_citizens=false`
  > **注**: 通達は行政内部文書。納税者・裁判所には直接的拘束力なし
  > (最高裁 昭和 43.12.24 墓地埋葬法事件)

### 改正履歴 (新旧対照表)
- 消費税法基本通達 一部改正 (2025-04-01) docId=`0025004-026`
  ([国税庁](https://www.nta.go.jp/law/tsutatsu/kihon/shohi/kaisei/0025004-026/))
  - 添付 PDF「別紙 1 (新旧対照表 / 5p)」
    [PDF link](https://www.nta.go.jp/law/tsutatsu/kihon/shohi/kaisei/0025004-026/pdf/01.pdf)
    > pdf-reader-mcp の `extract_tables` で表構造のまま抽出 (改正後 / 改正前)
````

## なぜこのフローが効くのか

この problem 設計のポイントは:

1. **法律 → 通達 → 改正の階層が縦串で揃う**: 利用者は「条文がどう改正されたか」を法律本文に紐づけて確認できる
2. **`extract_tables` が改正前 / 改正後を機械的に分離する**: pdf-reader-mcp v0.3.0 以降の機能。`read_text` だと両カラムが連結し、LLM は判別不能 (Issue #2 のフィードバックループの成果)
3. **`legal_status` の階層が citation に反映される**: 「通達は内部文書」が明示され、利用者は「実務判断は税理士へ」と自分で判断できる

## アンチパターン

❌ houki-egov-mcp を呼ばず、houki-nta-mcp の通達本文だけで答える → 法的根拠が抜ける
❌ `extract_tables` 未使用で `read_text` だけ呼ぶ → 改正後 / 改正前が混在し誤読を招く
❌ `legal_status` を citation で省略する → 通達と法律が同列に扱われる
❌ 「あなたの場合」と個別判断に踏み込む → 税理士法 52 条への抵触リスク

## 関連

- [`workflows/tax-research.md`](../workflows/tax-research.md) — このフローの抽象版
- [`docs/BUSINESS-LAW.md`](../docs/BUSINESS-LAW.md) — 業法独占規定の境界
- [`docs/CITATION.md`](../docs/CITATION.md) — citation 標準
