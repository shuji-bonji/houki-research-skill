# CITATION — 引用標準フォーマット

`houki-research-skill` 経由で複数 MCP を組み合わせた回答を返すとき、**法令の階層を明示した citation** を必ず末尾に付ける。回答内容そのものより citation の整合性が重要なケース (改正履歴の確認・条文間の関係整理など) では、**citation は本文と同等の重み**で扱う。

## 基本原則

1. **法令の階層を明示する** — 法律 / 政令 / 省令 / 通達 / 改正 / 判例 / 参考資料 を **見出しで分ける**
2. **`legal_status` を引用する** — 通達・QA・タックスアンサー等は法的拘束力の限界を必ず注釈
3. **取得時刻 (`fetched_at`) を含める** — 各 MCP が返す ISO 8601 のタイムスタンプ。houki-nta-mcp の取得ツールが `source: "db"` を返したときは、ローカル DB に取り込んだ日時であって呼び出した時刻ではない。その値をそのまま書く (houki-nta-mcp v0.16.0 以上)
4. **永続リンクを優先** — 一次情報 (`sourceUrl`) のリンクを必ず張る
5. **加工した内容には注釈** — pdf-reader-mcp の `extract_tables` / `split_columns` 経由は明示する
6. **国税庁の索引から消えた文書には印を添える** — `index_status: "removed_from_index"` が付いた文書は、現在の取扱いを示すものではない。`orphaned_at` (索引から消えたことを最初に確認した日時) と、現在の取扱いは最新の通達で確認する旨を注に書く。見出しは元の種別 (行政解釈 / 参考情報) のままにし、専用の見出しは作らない (houki-nta-mcp v0.17.0 以上)

## 標準フォーマット

回答末尾に以下のフォーマットで `## Sources` セクションを置く。階層は **法令の上位 → 下位** の順。

```markdown
## Sources

### 法律 (法的根拠 / 国会制定)
- 消費税法 第 57 条の 2「適格請求書発行事業者の登録等」(昭和六十三年法律第百八号)
  ([e-Gov 法令検索](https://laws.e-gov.go.jp/law/363AC0000000108))
  > 取得: 2026-09-21T16:25:05+09:00 / `binds_citizens=true` (`explain_law_type { name: "法律" }` の応答)

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
- 事務運営指針「<題名>」docId=`<docId>`  ← 索引から外れた文書の書き方
  ([国税庁](https://www.nta.go.jp/law/jimu-unei/...))
  > 取得: 2026-09-07T00:00:00+09:00 (ローカル DB に取り込んだ日時) / `index_status: removed_from_index` / `orphaned_at`: 2026-10-01
  > **注**: 国税庁の索引から外れている (2026-10-01 の bulk download で確認)。過去の課税期間の判断では意味を持つ場合があるが、**現在の取扱いを示すものではない**。出典 URL は 404 になることがあり、本文はローカル DB から読んだ

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
- 質疑応答事例「個人事業者が所有するゴルフ会員権の譲渡」(消費税 02/19)
  ([国税庁](https://www.nta.go.jp/law/shitsugi/shohi/02/19.htm))
  > 取得: 2026-09-11 (JST) / `binds_citizens=false` / `binds_tax_office=false`
  > **注**: 国税庁の参考資料。令和7年8月1日現在の法令・通達等に基づいて作成 (`qa.basisDate`: 2025-08-01)。個別の取引に当てはめると異なる課税関係が生じうる旨の断り書きがある (`qa.notice`)。根拠は上の「法律」「行政解釈」に挙げた条文と通達 (【関係法令通達】: 消費税法第2条第1項第8号、消費税法基本通達5-1-1)
```

## 引用を書き出す前に確かめる (verify_citations)

`## Sources` を書く前に、法律・政令・省令の引用を **houki-egov-mcp の `verify_citations`** にまとめて渡し、その条 (指定があれば項・号) が e-Gov の法令にあることを確かめる (houki-egov-mcp v0.11.0 以上)。1 件ずつ `get_law` を呼ぶ代わりに 1 回で済み、存在しない引用が混ざっていてもツール全体はエラーにならない。

```jsonc
{
  "citations": [
    { "law_name": "消法", "article": "57の2", "label": "消費税法 第57条の2" },
    { "law_name": "消費税法施行令", "article": "70の5", "label": "消費税法施行令 第70条の5" }
  ]
}
```

`label` に citation に書く文字列をそのまま入れておくと、`results[]` の各件と `## Sources` の各行が 1 対 1 で対応する。

### 判定ごとの扱い

| `status` | `code` | citation での扱い |
|---|---|---|
| `found` | — | そのまま書く。`law.title` を正式名称に、`article.caption` を条見出しに、`law.url` をリンクに使う |
| `not_found` | `ARTICLE_NOT_FOUND` | **その引用は citation から外す。** 条番号を書き間違えた可能性が高いので、`next_actions` の `get_toc` で正しい条番号を探し直す |
| `not_found` | `LAW_NOT_FOUND` | 法令名を書き間違えた可能性が高い。`resolve_abbreviation` → `search_law` で引き直す |
| `not_found` | `INVALID_ARTICLE_NUM` | 条番号・号番号の書き方の誤り (「30-2」など)。「30の2」の形に直して呼び直す |
| `not_found` | `OUT_OF_SCOPE` | 通達・QA などを法令として引こうとしている。houki-nta-mcp の取得ツールで引き直し、citation の見出しも「行政解釈」「参考情報」に移す |
| `ambiguous` | (なし) | 法令名が e-Gov の法令名と完全一致していない。`candidates[]` から指したい法令を選び、その `law_id` で呼び直す。**どれか 1 つを推測して citation に書かない** |
| `ambiguous` | `INVALID_ARGUMENT` | 項が複数ある条で項を書かずに号だけを引いている。本文を読んでどの項の号かを決め、`paragraph` を足して呼び直す |

`summary.all_found` が true のときだけ「引用はすべて実在を確認した」と書いてよい。false のまま残した引用があるなら、その行に「実在を確認できていない」と注を付ける。

### 確かめていないこと

`verify_citations` が確かめるのは **条文が実在するか** だけで、その条文が回答の主張を支えるかどうかは判定していない。「`verify_citations` で確認済み」は「引用が正しい」の意味では使わない。

e-Gov に問い合わせられなかったときは、件ごとの判定ではなくツール全体が `SOURCE_TIMEOUT` / `SOURCE_UNAVAILABLE` / `SOURCE_API_ERROR` になる。このときは引用を消さず、citation に「実在確認は e-Gov に接続できず未実施」と注記する ([`ERROR-HANDLING.md`](ERROR-HANDLING.md))。

通達・タックスアンサー・質疑応答事例・判例は `verify_citations` の対象外で、houki-nta-mcp の取得ツールが返した `docId` と `sourceUrl` をそのまま citation に書く。

## 階層ラベルと出典の対応表

| Citation の見出し | 出典 MCP | 拘束力の典型値と出所 |
|---|---|---|
| 法律 (法的根拠 / 国会制定) | `houki-egov-mcp` | binds_citizens=true (`get_law` の応答には無い。`explain_law_type { name: "法律" }` の `info.binds_citizens` を根拠にする。houki-egov-mcp v0.15.1 は `binds_courts` を返さない) |
| 政令 / 省令 | `houki-egov-mcp` | 同上 (`explain_law_type { name: "政令" }` / `{ name: "省令" }`) |
| 行政解釈 (通達) | `houki-nta-mcp` | binds_tax_office=true / binds_citizens=false |
| 改正履歴 (新旧対照表) | `houki-nta-mcp` + `pdf-reader-mcp` | 同上 + 添付 PDF メタ |
| 文書回答事例 | `houki-nta-mcp` | すべて false (参考情報) |
| 参考情報 (タックスアンサー / QA) | `houki-nta-mcp` | すべて false |
| 索引から外れた資料 | `houki-nta-mcp` | 元の種別のまま (`index_status` で区別) |
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
| 個別事案への当てはめ | 上記すべて + **業法独占規定の注意喚起** ([`BUSINESS-LAW.md`](BUSINESS-LAW.md))。返す範囲は [応答型](BUSINESS-LAW.md#応答型) に従う (結論・可否・金額の確定・書類の文案は返さない) |

## メンテナンス方針

- 新しい MCP が family に加わったら、§「階層ラベルと出典の対応表」を更新
- pdf-reader-mcp の新 tool が出たら、§「加工した PDF の引用」を更新
- 利用者から「この citation は分かりにくい」というフィードバックがあれば標準を磨く
