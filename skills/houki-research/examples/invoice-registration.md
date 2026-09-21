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
{ "tool": "resolve_abbreviation", "args": { "abbr": "インボイス" } }
// → resolved: { abbr: "消法", formal: "消費税法", law_id: "363AC0000000108", source_mcp_hint: "houki-egov",
//               aliases: ["消費税", "インボイス", "インボイス制度", "適格請求書", "適格請求書等保存方式", "適格請求書発行事業者", …] }
//   in_scope: false, hint: "このエントリは houki-egov の管轄です。houki-egov-mcp で取得してください。"
//   実測: houki-nta-mcp v0.20.0（2026-09-21）。「インボイス」は消費税法の alias で、正式名称は制度名ではなく法令名で返る
```

### ステップ ③: 法律本文を取得 (houki-egov-mcp)

「消費税法のどの条か」が分からないので、条文本文の横断検索 `search_fulltext` で条を探してから `get_law` で本文を取る。`search_law` は法令名の検索なので、「適格請求書発行事業者の登録」のような条の見出しでは 0 件になる（`total_count: 0`）。

```jsonc
{ "tool": "search_fulltext", "args": { "keyword": "消費税法 適格請求書発行事業者の登録" } }
// → source: "bulk", count: 2
//   hits[0]: { law_title: "消費税法", article_num: "57の2", caption: "（適格請求書発行事業者の登録等）",
//              chapter_path: "第五章　雑則", score_reasons: ["fts rank -2.60 → base 0.206", "article_caption_match"] }
//   hits[1]: { law_title: "消費税法", article_num: "附則(137) 44", caption: "（適格請求書発行事業者の登録等に関する経過措置）",
//              score_reasons: [..., "article_caption_match", "supplementary_provision"] }
//   実測: houki-egov-mcp v0.15.1（2026-09-21）。ローカル DB が無いと source が "api-fallback" になり、search_law の結果が fallback に入る

{ "tool": "get_law", "args": { "law_name": "消費税法", "article": "57の2" } }
// → 条文本文（第 1 項〜第 12 項）+ meta: { law_id: "363AC0000000108", title: "消費税法", law_num: "昭和六十三年法律第百八号", retrieved_at, url }
//   実測: houki-egov-mcp v0.15.1（2026-09-21）。get_law の応答に legal_status は付かない
```

法律の拘束力（国民を拘束する）は `get_law` の応答には入っていない。citation に書くときは `explain_law_type` の応答を根拠にする:

```jsonc
{ "tool": "explain_law_type", "args": { "name": "法律" } }
// → info: { law_type_code: "Act", enacting_body: "国会（衆議院・参議院）", hierarchy_rank: 2,
//           binds_citizens: true, can_set_penalties: true, … }
//   実測: houki-egov-mcp v0.15.1（2026-09-21）。binds_courts は返さない。裁判所を拘束することは SKILL.md の階層の説明を根拠にする
```

### ステップ ④: 通達による解釈を取得 (houki-nta-mcp)

```jsonc
{ "tool": "nta_get_tsutatsu", "args": { "name": "消基通", "clause": "1-7-2" } }
// → 「登録番号の構成」の通達本文
// + legal_status: { binds_citizens: false, binds_courts: false, binds_tax_office: true, note: "通達は行政内部文書。…" }
// + base_laws: ["消費税法", "消費税法施行令", "消費税法施行規則"]
// + next_actions: [{ action: "delegate_to_mcp", example: { mcp: "houki-egov", tool: "get_law", law_name: "消費税法" } }]
//   実測: houki-nta-mcp v0.20.0（2026-09-21、format: "json"）
```

### ステップ ⑤: 改正履歴を検索

```jsonc
{
  "tool": "nta_search_kaisei_tsutatsu",
  "args": { "keyword": "インボイス", "taxonomy": "shohi", "hasPdf": true, "limit": 5 }
}
// → 改正通達一覧 (例: docId="0025004-026" の 2025-04-01 付け改正)
```

### ステップ ⑥: 添付 PDF の読み方を取得

```jsonc
{
  "tool": "nta_inspect_pdf_meta",
  "args": { "docType": "kaisei", "docId": "0025004-026", "kind": "comparison", "save": true }
}
// → attachedPdfs:
//   [
//     { kind: "comparison", title: "別紙 1 (新旧対照表)", url: "...01.pdf", sizeKb: 221,
//       read_strategy: "tables",
//       layout_note: "改正後と改正前を左右 2 列に並べた表。国税庁の新旧対照表は左が改正後、右が改正前のことが多いが、見出し行で確かめる。…" }
//   ]
// + saved:
//   [ { url: "...01.pdf", path: "/Users/me/.cache/houki-nta-mcp/files/kaisei/0025004-026/01.pdf", bytes: 226304, cached: false } ]
// + next_actions:
//   [
//     { action: "pdf-reader-mcp:extract_tables", reason: "新旧対照表を表として取る。…", example: { file_path: "/Users/me/.cache/houki-nta-mcp/files/kaisei/0025004-026/01.pdf" } },
//     { action: "read_pdf", reason: "pdf-reader-mcp が無いときは、使っている PDF 読み取りツールに url（save: true で保存したときは path）を渡す。…", example: { url: "...01.pdf", path: "/Users/me/.cache/houki-nta-mcp/files/kaisei/0025004-026/01.pdf" } }
//   ]
```

`kind: "comparison"` で新旧対照表だけに絞り、`save: true` でファイルを置く（houki-nta-mcp v0.19.0 以上）。

### ステップ ⑦: 新旧対照表 PDF を表として取る

pdf-reader-mcp があるので、`next_actions[0].example` をそのまま `extract_tables` に渡す:

```jsonc
{
  "tool": "extract_tables",
  "args": {
    "file_path": "/Users/me/.cache/houki-nta-mcp/files/kaisei/0025004-026/01.pdf",
    "pages": "1"
  }
}
// → Markdown table:
// | 改正後 | 改正前 |
// |---|---|
// | …第２条第 16 項《定義》… | …第２条第 15 項《定義》… |
```

見出し行が「改正後 | 改正前」なので左が改正後。第 16 項（改正後）と第 15 項（改正前）は番号がずれているが、内容（《定義》）で対応を取る。pdf-reader-mcp が無い環境なら、`next_actions` の `read_pdf` の `path` を手元の PDF 読み取りツールに渡し、`layout_note` のとおり左右 2 列の表として読む。

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
- 消費税法 第 57 条の 2「適格請求書発行事業者の登録等」(昭和六十三年法律第百八号)
  ([e-Gov 法令検索](https://laws.e-gov.go.jp/law/363AC0000000108))
  > 取得: 2026-09-21T... / `binds_citizens=true` (`explain_law_type { name: "法律" }` の応答。裁判所を拘束することは法律の階層による)

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
