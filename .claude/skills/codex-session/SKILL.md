---
name: codex-session
description: tmux上でCodexの対話セッションを起動し、プロンプトの送信・出力の読み取り・完了待ち・セッション破棄を行う。develop SkillのReview①・Delegate・差し戻しでCodexへ指示を送るときに使う。
---

# codex-session

Codexへ委譲するための対話セッションを、tmux越しに操作する手順。

Codexは端末上で動くTUIであり、標準入出力のパイプでは扱えない。`tmux send-keys` で画面へ打ち込み、`tmux capture-pane` で画面を読む。

セッションをいつ起動し、何を送るかはdevelop Skillが決める。このSkillは「どう送るか」だけを持つ。

## 読み替えるもの

コマンド中の `<...>` はプレースホルダ。実際の値に置き換えて実行する。

| プレースホルダ | 入れる値 | 例 |
| --- | --- | --- |
| `<task-name>` | セッション名。セッションはタスク単位で起動するため、タスクを表す名前を使う | `chart-fragment`、`weekly-stats` |
| `<repo-path>` | 対象リポジトリの絶対パス | `/home/dev/work/tamable-weather` |
| `<work-dir>` | プロンプトを置く一時ディレクトリ | `/tmp/codex-prompts` |

## develop Skillとの対応

| develop のStep | このSkillの節 |
| --- | --- |
| Step 1: Shape | なし（セッション起動前） |
| Step 2: Review① | 1 → 2 → 3 → 4（reviseなら 3 → 4 を繰り返す） |
| Step 3: Delegate | 3 → 4 |
| Step 4: Review② | なし（差し戻すときだけ 3 → 4） |
| Step 5: Ship | 5 |

3と4は送るたびに繰り返す。1回ずつ通す手順ではない。

## 1. セッションを起動する

```bash
tmux new-session -d -s <task-name> -x 200 -y 50 -c <repo-path>
tmux send-keys -t <task-name> 'codex --sandbox workspace-write --ask-for-approval never -C <repo-path>' Enter
```

- `--ask-for-approval never` は必須。承認プロンプトが出るとtmux越しでは応答できず、セッションが詰まる
- `--sandbox workspace-write` でファイル編集とテスト実行を許可する
- `-x 200 -y 50` はデタッチ状態の既定ペインが狭く、TUIの出力が折り返されて読めなくなるため広げている
- 起動が auto mode に拒否されたら、回り込まずに止まり、人に起動を頼む（人が `!` を付けて起動コマンドを打つ）。同じ設定でも、通る場合と拒否される場合がある

## 2. 起動時のプロンプトに応答する

起動直後は画面が空に見える。まず中身を読む。

```bash
sleep 3
tmux capture-pane -pt <task-name> | grep -n . | head -30
```

`grep -n .` は空行を落として行番号を付けるため。TUIは空行が多く、素の `capture-pane` では `tail` しても中身が出ないことがある。

**何が出ているかを確認してから応答する。Enterを条件反射で送らない。** 起動時に出るものは一定ではない。

- 信頼確認（Do you trust the contents of this directory?）→ 承認する方を選ぶ
- アップデート確認（Update available!）→ Skip を選ぶ
- 何も出ていない（入力欄が表示されている）→ 応答不要。3へ

**選択肢の並び順は一定ではない。** `Down` を決まった回数送るのではなく、`capture-pane` で `›` の位置を読み、目的の選択肢に付いていることを確認してから Enter を送る。既定の選択が破壊的な操作（アップデートの実行、`No, exit` によるセッション終了）であることがある。

```bash
tmux send-keys -t <task-name> Down
sleep 1
tmux capture-pane -pt <task-name> | grep -n . | head -30   # ›の位置を確認
tmux send-keys -t <task-name> Enter
```

**応答後の再描画は遅い。** 2秒では前の画面のままのことがある。変化がなければ、送り直す前にもう一度読む。

```bash
sleep 5
tmux capture-pane -pt <task-name> | grep -n . | head -30
```

入力欄（モデル名とディレクトリが並ぶ行や、プレースホルダ文言）が見えたら準備完了。続けて別のプロンプトが出ることもあるので、その場合は同じ要領で応答する。

画面が空のままなら、Codexが生きているかを確認する。

```bash
tmux list-panes -t <task-name> -F '#{pane_pid} #{pane_current_command} #{pane_width}x#{pane_height}'
# → 16597 codex 200x50
```

## 3. プロンプトを送る

**長文は直接打たず、ファイルに書いてパスを送る。** TUIは改行を受け取った時点で送信するため、複数行のプロンプトをそのまま流すと途中で分割送信される。

```bash
cat > <work-dir>/review1.md <<'EOF'
（プロンプト全文）
EOF

tmux send-keys -t <task-name> -l "レビュー依頼です。<work-dir>/review1.md を読んで、その指示に従ってください。"
sleep 1
tmux send-keys -t <task-name> Enter
```

守ること。

- **`-l`（literal）で本文を打ち、Enterは別コマンドに分ける。** 1回の `send-keys` に本文とEnterを混ぜると、入力欄が描画を終える前に確定してしまうことがある
- **メッセージを `/` で始めない。** パスから書き始めるとCodexのスラッシュコマンド補完に食われる（`/tmp/...` が `/model tmp...` と解釈された実例がある）。先頭に「レビュー依頼です。」「実装依頼です。」のような文字を置く。文言は何でもよく、`/` で始まらないことだけが条件

## 4. 完了を待つ

Codexの作業中は画面下部に `Working (Ns • esc to interrupt)` が出る。消えるまでポーリングする。

```bash
for i in $(seq 1 40); do
  sleep 15
  if ! tmux capture-pane -pt <task-name> | grep -q "esc to interrupt"; then break; fi
done
tmux capture-pane -pt <task-name> | grep -n . | tail -30
```

上限の目安は、批評（Review①）で12回、実装（Delegate）で40回。Bashツールのタイムアウトを上限より長く設定しておく。

報告が画面からはみ出したときは、スクロールバックまで遡る。

```bash
tmux capture-pane -pt <task-name> -S -200 | grep -n . | sed -n '/実装完了しました/,$p'
```

## 5. セッションを畳む

```bash
tmux kill-session -t <task-name>
```

## 注意

- **TUIの画面構造（選択肢の並び順、文言、表示の遅延）は一定ではない。** 画面を読んでから応答する。決め打ちで送らない。2・3・4の注意点はいずれもこの原則の具体例
- 人間はいつでも `tmux attach -t <task-name>` でペインを覗き、介入できる（デタッチは `Ctrl+b` のあと `d`）
- 検証（diffの確認、テスト・build・lintの実行）はこのセッションの外で、Orchestrator自身が行う。Codexの完了報告を検証の代わりにしない