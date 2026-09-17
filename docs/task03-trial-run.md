# タスク③ develop スキル試走記録

- 日付：2026-08-31
- 対象タスク：天気グラフの系列（Line）が描画されない不具合の修正
- ブランチ：`fix/chart-fragment`
- 成果コミット：`e549c8c`（chore: workflow）/ `612e6ab`（chore: gitignore）/ `cee0d55`（fix: 本体＋テスト）
- Orchestrator：Claude Code (Opus 5) / Worker：Codex CLI v0.147.0 (gpt-5.6-sol)
- 目的：`.claude/skills/develop/SKILL.md` を実タスクで1周回し、タスク④（スキル改善）の材料を集める

---

## 1. 各ステップで実際に行ったこと（時系列）

### 事前（人間からの入力）

人間から「原因は調査済み」として、recharts 2.15.4 が内部で使う react-is@18 の `isFragment()` が
React 19 で false を返すこと、`components/WeatherChart.tsx:237-289` の `<Line>` / `<Area>` が
すべて Fragment の中にあること、修正方針（Fragment を外す）、スコープ外4項目が提示された。

### Step 1: Shape

1. 提示された原因をコードで裏取りした
   - `node_modules/recharts/lib/util/ReactUtils.js` の `toArray()` / `findAllByType()` を読み、
     Fragment の中にだけ再帰する構造と、`type.displayName` で照合する実装を確認
   - `node_modules/recharts/package.json` の `react-is: ^18.3.1` と、`react: 19.1.0` を確認
   - `Children.forEach` は配列を平坦化する（＝配列なら問題ない、Fragment だけが問題）ことを確認
2. `components/WeatherChart.tsx` 全体を読み、Fragment の位置と各系列の props を把握した
3. リポジトリの検証基盤を調査した。ここで**テスト基盤が存在しない**ことが判明
   - `vitest` は devDependencies にあるが、`vitest.config.*` もテストファイルも jsdom も
     `@testing-library/react` も無い（`npm test` は「テストが1件も無い」で失敗する状態）
4. 作業ツリーに未コミット差分（`package.json` への vitest 追加、`package-lock.json`、未追跡の
   `.claude/` `AGENTS.md` `CLAUDE.md` `next-env.d.ts`）があることを確認した
5. 目的／受け入れ条件（8組の period × metric ごとの Line 本数と dataKey）／制約／検証コマンドを文書化した
6. 判断が要る2点を人間に確認した
   - テスト方式：DOM 非依存の構造テスト（新規依存なし）か、jsdom + Testing Library（新規依存あり）か
   - コミット範囲：未コミット差分をどう扱うか
7. 人間の回答：構造テストで可・`vitest.config.ts` 追加可・vitest 関連は fix コミットに含める・
   ワークフローファイルは別コミット・`next-env.d.ts` は .gitignore へ

### Step 2: Review①

1. `.gitignore` に `next-env.d.ts` を追記（人間の指示分）
2. tmux セッションを起動し、その中で Codex を立ち上げた（10:19:52）

   ```bash
   tmux new-session -d -s chart-fragment -x 200 -y 50 -c /home/dev/work/tamable-weather
   tmux send-keys -t chart-fragment 'codex --sandbox workspace-write --ask-for-approval never -C /home/dev/work/tamable-weather' Enter
   ```

3. Codex の「Do you trust the contents of this directory?」に Enter で応答
4. Shape 全文をスクラッチパッドの `review1.md` に書き出し、パスだけを1行で送信して批評を依頼
5. **Review① 1回目の結果：`status: revise`**
   - `required_changes`：`package.json` に `lint` script が無いため `npm run lint` は必ず失敗する。
     一方 `package.json` は変更可能ファイルに含まれていない（＝矛盾）
   - `notes`：コンポーネントが Hook を使っていないため、戻り値を辿る構造テストは実現可能
6. Shape を修正：検証コマンドを `npm run lint` → `npx eslint .` に変更。
   併せて Orchestrator 側で `npx eslint .`（exit 0）と `npm run build`（exit 0）が
   **修正前のコードで通ること**を確認（ベースライン確認）
7. `review1b.md` で再レビューを依頼 → **`status: pass`**（差し戻し1回、上限2回に対して余裕あり）

### Step 3: Delegate

1. 自己完結の実装指示書 `delegate.md` を作成（目的／受け入れ条件8ケース／触ってよいファイル3つ／
   守るインターフェース／禁止事項／検証コマンド4つ／スコープ外4項目／末尾の「不明点は実装せずに質問を返す」）
2. 受け入れ条件に「**元コードでテストが失敗することを確認して報告に含めること**」を明記した
3. 同一 tmux セッションへ送信。Codex は 3分07秒で完了報告
   - `components/WeatherChart.tsx`：Fragment 除去
   - `components/WeatherChart.test.tsx`（新規）：8ケースの構造テスト
   - `vitest.config.ts`（新規）：Oxc の JSX automatic 変換
   - 自己申告の検証結果：`npm test` 8 passed / `tsc --noEmit` / `eslint .` / `npm run build` すべて成功

### Step 4: Review②

Codex の報告を鵜呑みにせず、以下をすべて自分で実行した。

1. **diff を全部読んだ**（`git diff -- components/WeatherChart.tsx`、`WeatherChart.test.tsx`、`vitest.config.ts` 全文）
   - Fragment 4箇所が除去され、props と描画順序が保存されていることを確認
   - スコープ外のファイルが変更されていないことを `git status --short` で確認
2. **検証コマンドを自分で実行した**：`npm test`（8 passed, 10:27:13）/ `npx tsc --noEmit`（exit 0）/
   `npx eslint .`（exit 0）/ `npm run build`（exit 0）
3. **テストの中身を確認した**：skip なし、アサーションは `dataKeys` の配列一致と Fragment 不在の2点で、
   受け入れ条件1・2を実際に検証している
4. **テストが赤になることを自分で確認した**（SKILL.md に記述はないが実施）
   - `git stash push -- components/WeatherChart.tsx` で旧コードに戻して `npm test` → **8/8 失敗**（10:27:26）
   - `git stash pop` で復元し、内容が一致することを `diff -q` で確認
5. **recharts 本体の挙動で裏を取った**（同上、SKILL.md に記述なし）
   - 使い捨てテストから `recharts/lib/util/ReactUtils` の `findAllByType()` を直接呼んだ
   - 修正前：`flattened children types = defs,CartesianGrid,XAxis,YAxis,Tooltip,Symbol(react.fragment)`、
     **Line 検出数 0**
   - 修正後：全ケースで期待本数（48h→1、7d 温度／体感→2、7d 降水／風速→1）を検出
   - 使い捨てテストは削除済み（10:28:55）
6. 差し戻しは 0 回。`status: pass`

### Step 5: Ship

1. `.gitignore` に `*.tsbuildinfo` を追記（`npx tsc --noEmit` が生成する `tsconfig.tsbuildinfo` が
   未追跡で残ったため。create-next-app の既定に合わせた）
2. 人間の指示に沿って3コミットに分割
3. 変更概要／検証結果／残存リスク6点を報告
4. `tmux kill-session -t chart-fragment` でセッションを畳んだ

---

## 2. SKILL.md の記述で不足していた点・曖昧だった点

### 2-1. Codex との通信手段が一切書かれていない（最大の不足）

SKILL.md にある tmux 関連の記述は次の1行だけ。

```
tmux new-session -d -s <task-name>
```

これだけでは空のシェルが立ち上がるだけで、実際には以下がすべて未定義だった。

| 必要だったこと | 実際に使ったもの |
|---|---|
| Codex の起動方法とフラグ | `codex --sandbox workspace-write --ask-for-approval never -C <dir>` |
| 初回の信頼確認への応答 | `tmux send-keys -t <session> Enter` |
| プロンプトの送信 | `tmux send-keys -t <session> -l "<1行>"` → 別コマンドで `Enter` |
| 長文プロンプトの渡し方 | ファイルに書き出し、パスだけを送る |
| 出力の読み取り | `tmux capture-pane -pt <session> \| grep -n .` |
| 画面外の読み取り | `tmux capture-pane -pt <session> -S -200` |
| 完了判定 | `Working (Ns • esc to interrupt)` の消失をポーリング |

承認フラグの指定は特に重要で、既定のままだと Codex が承認プロンプトで停止し、
tmux 越しでは実質デッドロックになる。ここは SKILL.md に明記すべき。

### 2-2. 「検証コマンド」がリポジトリに存在するかの確認が求められていない

SKILL.md は Step 1 で「検証コマンド — Codex自身が実行して通すもの」とだけ書いており、
そのコマンドが実在するか、**修正前のコードで通るか**を確かめる手順がない。
今回はまさにここで Review① の差し戻しが発生した（詳細は §4）。

Shape の段階で「検証コマンドを Orchestrator 自身がベースライン実行して確認する」を
明示的な手順にすべきだった。

### 2-3. テスト基盤が無いリポジトリでの扱いが未定義

SKILL.md は「テスト実行を含めることを原則とする」と書くが、テストランナーが未設定の場合に
どうするかが書かれていない。今回は「テスト基盤の構築コストが修正本体を上回りかねない」という
トレードオフが発生し、人間の判断を仰ぐことになった。
「テスト基盤が無い場合、その整備をタスクに含めるか別タスクにするかを Shape で明示する」旨の記述が要る。

### 2-4. 作業ツリーの事前状態の確認が手順にない

今回は開始時点で `package.json` / `package-lock.json` に未コミット差分があり、未追跡ファイルも4つあった。
これは Step 5 のコミット範囲に直結するが、SKILL.md には確認手順も、混在時の扱いも書かれていない。
Shape に「`git status` を確認し、既存の未コミット差分をどう扱うか決める（または人間に確認する）」を入れるべき。

### 2-5. Step 5 の「commitが許可されていれば」の判断基準が曖昧

誰がどの時点で許可するのかが書かれていない。今回は人間が Step 1 の回答の中でコミット範囲まで
指示したため解決したが、指示がなければ Ship で止まって確認待ちになっていた。
また**コミットの粒度・分割方針**についての記述が一切なく、今回の3分割はすべて人間の指示による。

### 2-6. Review② の「テストの中身を確認する」が静的な確認にとどまっている

SKILL.md は「アサーションが骨抜きになっていないか、skipで回避されていないか」までしか求めていない。
これはコードを読むだけの確認で、**そのテストが本当にバグを捕まえるか**は保証しない。
今回は自分の判断で「旧コードでテストが落ちること」を確認し、8/8 失敗を実測した。
この赤確認を手順に格上げすべき。

### 2-7. `notes` の扱いは書かれているが、Orchestrator 側の `notes` の記録先がない

「`notes` を過剰実装の理由にしない」とはあるが、拾わなかった `notes` をどこに残すかは未定義。
今回は Ship の「残存リスク」に混ぜて報告した（条件式の重複、vitest の CJS 警告など）。

### 2-8. スコープ外項目の扱いが「報告する」止まり

CLAUDE.md には「スコープ外の変更を見つけたら報告する」とあるが、報告先・記録先が定義されていない。
今回の残存リスク6点（`<Area>` が無視される問題、recharts × React 19 の根本原因が未解決、など）は
会話に流れただけで、追跡可能な形にはなっていない。

---

## 3. SKILL.md の記述と実際の動きが違った点

### 3-1. tmux セッションは「起動するだけ」では機能しなかった

SKILL.md は Step 2 の見出しを「Review①（tmuxセッション起動を含む）」とし、`tmux new-session` 1行で
済むかのように読める。実際には、起動 → Codex 立ち上げ → 信頼確認への応答 → 描画待ち、の4段階が必要で、
起動直後の `capture-pane` は空を返した（Codex がまだ TUI を描いていないため）。
「セッションが起きている＝Codex と話せる」ではない。

### 3-2. 「Codexに送る」は1コマンドでは終わらなかった

送信は `send-keys -l` で本文、続けて別コマンドで `Enter` の2段階にする必要があった。
1回の `send-keys` に本文と Enter を混ぜると、TUI の入力欄が描画を終える前に確定するおそれがある。

さらに、**メッセージ本文をそのまま流し込めない**。TUI は改行を受け取った時点で送信するため、
複数行の Shape / 指示書は途中で分割送信されてしまう。今回はプロンプトを
`review1.md` / `review1b.md` / `delegate.md` の3ファイルに書き出し、
「このファイルを読んで指示に従ってください」という1行だけを送る方式で回避した。
SKILL.md はこの制約に触れていない。

### 3-3. 先頭が `/` のメッセージが TUI のスラッシュコマンド補完に食われた

`review1b.md` を送った際、本文が `/tmp/...` で始まったため、Codex の入力欄には
`/model tmpclaude-1001/...` と表示された（スラッシュコマンド補完が反応した）。
結果的に Codex はファイルを正しく読んだが、事故になり得る。
以降は先頭に「実装依頼です。」のような文字列を置いて回避した。

### 3-4. 差し戻し上限「2回」は Review① と Review② で消費実績が非対称だった

SKILL.md は Review① にも Review② にも同じ「2回まで」を課しているが、
実際には Review①（設計の矛盾を突く）で1回消費し、Review②（実装の検証）では0回だった。
今回の1周では、Review① を丁寧にやるほど Review② の差し戻しが減るという関係が観測された
（§4 のとおり、Review① の指摘は Review② での差し戻し1回に相当する）。

### 3-5. Step 4 の3項目だけでは検証として不十分だった

SKILL.md の Step 4 は「diff を読む」「検証コマンドを実行する」「テストの中身を確認する」の3項目。
今回はこれに加えて、旧コードでの赤確認と、recharts 本体の `findAllByType()` を直接呼ぶ挙動確認を
自分の判断で追加した。後者によって初めて
「recharts から見て Fragment がどう見えていたか（`Symbol(react.fragment)` が子として積まれ、Line 検出数 0）」
が実測で裏付けられた。SKILL.md の3項目のままなら、構造テストが通ったことをもって
「recharts が系列を認識するはず」という推測で完了していた。

### 3-6. Step 5 の「tmuxセッションを畳む」は記述どおり機能した

ここは記述と実際が一致。`tmux kill-session -t chart-fragment` で完了。

---

## 4. Review① の指摘内容と、それがなければ何が起きていたか

### 指摘内容（`status: revise`）

> `required_changes`: package.json に lint script が存在しないため、指定された `npm run lint` は必ず失敗します。
> 一方で package.json は変更可能ファイルに含まれていません。検証コマンドから `npm run lint` を外すか、
> package.json の変更を許可して lint script を追加する必要があります。

Shape が **自己矛盾していた**という指摘。「必ず失敗するコマンドを通せ」と要求しつつ、
それを通せるようにする手段（`package.json` の編集）を制約で封じていた。
`eslint` と `eslint-config-next` と `eslint.config.mjs` は揃っていたので、
私は「lint は動く」と思い込み、script の実在を確認していなかった。

### 対応

検証コマンドを `npm run lint` → `npx eslint .` に変更。
併せて Orchestrator 側で修正前のコードに対して `npx eslint .`（exit 0）と `npm run build`（exit 0）を
実行し、ベースラインで通ることを確認した。再レビューで `status: pass`。

### この指摘がなかった場合に起きたこと

Codex は Step 3 で実装後に検証コマンドを実行し、`npm error Missing script: "lint"` に突き当たる。
そこからの分岐は3つで、いずれも損失が出た。

1. **制約を破って `package.json` に lint script を追加する**
   → 「触ってよいファイル」の違反。私は Review② の diff 確認で気づき、差し戻し1回を消費。
   さらに、その追加が人間の指示した「vitest 追加分だけを fix コミットに含める」というコミット設計を汚す
2. **検証失敗のまま完了報告する**
   → CLAUDE.md の「テスト・build・lint等の失敗を自分の判断で覆さない。失敗している状態でcommitしない」に抵触。
   私は Review② で失敗を再現し、差し戻し1回を消費
3. **実装せずに質問を返す**（AGENTS.md 的にはこれが正しい振る舞い）
   → 最も健全だが、実装前の1往復は Review① での1往復と同じコスト。
   ただし Codex が指示書を読んだ後・実装の途中で気づく形になるため、
   すでに書き始めた実装を捨てる可能性がある

つまり **Review① の1往復は、Review② の差し戻し1回（または Delegate 中の往復1回）を前倒しで消費したもの**で、
コストはほぼ等価。違いは、Review① なら**実装が1行も書かれていない時点で**矛盾が解消される点にある。

副次的な効果として、この指摘をきっかけに私は
「検証コマンドがベースラインで通ることを Orchestrator 自身が確認する」という手順を追加した。
その結果、Step 4 で `npm run build` が通ったとき、それが**私の変更によって通ったのか元から通っていたのか**を
区別できた。この確認がなければ、build の成功を過大評価していた可能性がある。

### `notes` の扱い

> `notes`: DOMを使わず WeatherChart(props) の戻り値を辿る構造テストは、
> 現状コンポーネントがHookを使用していないため実現可能です。

これは非拘束の裏付けコメントであり、対応義務はない。ただし
「Hook を使っていないから関数として直接呼べる」という前提は、
今後 `WeatherChart` に Hook が追加されると構造テストが壊れることを意味する。
**残存リスクとして記録しておく価値があった**が、今回は Ship の報告に含めなかった（記録漏れ）。

---

## 5. タスク④（スキル改善）への申し送り

優先度順の候補。

| # | 改善案 | 根拠 |
|---|---|---|
| 1 | Codex との通信プロトコル（起動フラグ／`send-keys -l` ＋ 別 Enter ／プロンプトはファイル経由／`capture-pane` ／完了ポーリング／先頭 `/` 回避）を SKILL.md に明記 | §2-1, §3-1, §3-2, §3-3 |
| 2 | Step 1 に「検証コマンドのベースライン実行」を手順として追加 | §2-2, §4 |
| 3 | Step 4 に「テストが旧コードで赤になることの確認」を追加 | §2-6, §3-5 |
| 4 | Step 1 に「`git status` で作業ツリーの事前状態を確認する」を追加 | §2-4 |
| 5 | Step 5 にコミット粒度・分割方針の指針を追加 | §2-5 |
| 6 | テスト基盤が無いリポジトリでの分岐（整備を含めるか別タスクにするか）を Step 1 に明記 | §2-3 |
| 7 | 拾わなかった `notes` とスコープ外項目の記録先を定義 | §2-7, §2-8, §4 |
