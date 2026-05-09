# CITATION — 引用標準フォーマット

`houki-research-skill` 経由で複数 MCP を組み合わせた回答を返すとき、**法令の階層を明示した citation** を必ず末尾に付ける。回答内容そのものより citation の整合性が重要なケース (改正履歴の確認・条文間の関係整理など) では、**citation は本文と同等の重み**で扱う。

## 基本原則

1. **法令の階層を明示する** — 法律 / 政令 / 省令 / 通達 / 改正 / 判例 / 参考資料 を **見出しで分ける**
2. **`legal_status` を引用する** — 通達・QA・タックスアンサー等は法的拘束力の限界を必ず注釈
3. **取得時刻 (`fetched_at`) を含める** — 各 MCP が返す ISO 8601 のタイムスタンプ
4. **永続リンクを優先** — 一次情報 (`sourceUrl`) のリンクを必ず張る
5. **加工した内容には注釈** — pdf-reader-mcp の `extract_tables` / `split_columns` 経由は明示する

## 標準フォーマット

回答末尾に以下のフォーマットで `## Sources` セクションを置く。階層は **法令の上位 → 下位** の順。

```markdown
## Sources

### 法律 (法的根拠 / 国会制定)
- 消費税法 第 57 条の 2「適格請求書発行事業者の登録」
  ([e-Gov 法令検索](https://elaws.e-gov.go.jp/...))
  > 取得: 2026-05-07T10:23:00+09:00 / `binds_citizens=true` `binds_courts=true`

### 政令 / 省令
- 消費税法施行令 第 70 条の 5
  ([e-Gov 法令検索](https://elaws.e-gov.go.jp/...))
  > 取得: 2026-05-07T10:23:01+09:00

### 行政解釈 (税務署員のみ拘束)
- 消費税法基本通達 1-7-2「登録番号の構成」
  ([国税庁](https://www.nta.go.jp/law/tsutatsu/...))
  > 取得: 2026-05-07T10:23:02+09:00 / `binds_citizens=false` `binds_tax_office=true`
  > **注**: 通達は行政内部文書。納税者・裁判所には直接的拘束力なし
  > (最高裁 昭和 43.12.24 墓地埋葬法事件)。

### 改正履歴 (新旧対照表)
- 消費税法基本通達 一部改正 (2025-04-01) docId=`0025004-026`
  ([国税庁](https://www.nta.go.jp/law/tsutatsu/kihon/shohi/kaisei/0025004-026/))
  - 添付 PDF「別紙 1 (新旧対照表 / 5p)」
    [PDF link](https://www.nta.go.jp/law/tsutatsu/kihon/shohi/kaisei/0025004-026/pdf/01.pdf)
    > pdf-reader-mcp の `extract_tables` で表構造のまま抽出 (改正後 / 改正前)。

### 参考情報 (拘束力なし)
- タックスアンサー No.1125「医療費控除の対象となる介護保険制度下での施設サービスの対価」
  ([国税庁](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1125.htm))
  > 取得: 2026-05-07T10:23:05+09:00 / `binds_citizens=false`
  > **注**: 国税庁の参考解説資料。法的拘束力なし。
```

## 階層ラベルと出典の対応表

| Citation の見出し | 出典 MCP | `legal_status` の典型値 |
|---|---|---|
| 法律 (法的根拠 / 国会制定) | `houki-egov-mcp` | binds_citizens=true / binds_courts=true |
| 政令 / 省令 | `houki-egov-mcp` | 同上 |
| 行政解釈 (通達) | `houki-nta-mcp` | binds_tax_office=true / binds_citizens=false |
| 改正履歴 (新旧対照表) | `houki-nta-mcp` + `pdf-reader-mcp` | 同上 + 添付 PDF メタ |
| 文書回答事例 | `houki-nta-mcp` | すべて false (参考情報) |
| 参考情報 (タックスアンサー / QA) | `houki-nta-mcp` | すべて false |
| 判例 (将来) | `houki-court-mcp` (構想中) | binds_courts=true (最高裁判決時) |
| 裁決 (将来) | `houki-saiketsu-mcp` (構想中) | binds_tax_office=true |

## 加工した PDF の引用

`pdf-reader-mcp` の機能で **表構造を再構成 / カラム分離した結果**を引用する場合、加工方法を明記する。これにより読者は「LLM が独自に表を作った」のではなく「PDF の構造が反映されている」ことを判別できる。

| 抽出方法 | citation の注釈例 |
|---|---|
| `extract_tables` (Tagged PDF Table → Markdown) | `> Tagged PDF の <Table> 構造を pdf-reader-mcp の extract_tables で Markdown 化` |
| `read_text` + `split_columns: 2` (Untagged 多カラム) | `> Untagged PDF を split_columns: 2 で左右カラムに分離して抽出` |
| `read_text` + `compact_whitespace: true` | `> read_text + compact_whitespace で連続全角空白を縮約` |
| `read_text` (デフォルト) | (注釈不要) |

## ユーザーの問いと citation の最低粒度

| 問いの種類 | 最低限求められる citation |
|---|---|
| 制度の概観 | 法律 + 通達 (1 階層ずつ) |
| 改正点の整理 | 法律 + 改正前後の通達 (新旧対照表 PDF へのリンク必須) |
| 略称の意味 | houki-abbreviations の正式名 + source_mcp_hint |
| 個別事案への当てはめ | 上記すべて + **業法独占規定の注意喚起** ([`BUSINESS-LAW.md`](BUSINESS-LAW.md)) |

## メンテナンス方針

- 新しい MCP が family に加わったら、§「階層ラベルと出典の対応表」を更新
- pdf-reader-mcp の新 tool が出たら、§「加工した PDF の引用」を更新
- 利用者から「この citation は分かりにくい」というフィードバックがあれば標準を磨く
