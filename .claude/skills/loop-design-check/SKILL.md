---
name: loop-design-check
description: 定期実行(Routine)や繰り返し動くエージェント処理を新しく作るとき・見直すときに、「止まらずに回り続ける」「自分で合否を甘く判定する」「間違った答えのまま最後まで走る」といった壊れ方をしないかを点検する。点検表を使って確認するだけで、何かを実行・繰り返すものではない。Routineを新設・変更したとき、または夜中の自動処理が止まる・遅れる等の問題が出たときに使う。
---

# 自動処理(ループ・Routine)の点検 — loop-design-check

出典: [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) の `skills/loop-design-check/SKILL.md`(MIT License, Copyright (c) 2026 Affaan Mustafa)を、このプロジェクト向けに日本語で要約・調整したもの。2026-11-21、ユーザー指示「everything-claude-codeから取り込む(loop-design-check)」「チェックする内容を見える化」により取り込み(progress-tracker-dashboard、マネージャールーム)。原文のMIT Licenseの許諾表示は本ファイル末尾に記載。

**これは点検表(読み物)であり、何かを実行したり繰り返したりする仕組みではない。**

## 前提: 判断は人、実行は機械
- 実行(目標との差を詰める)は機械が得意。
- 判断(目標そのものが正しいか、変えるべきか、止めるべきか)は人が持つ。完了の判定・取り返しのつかない操作の最後のスイッチを機械に渡さない(このプロジェクトのルール30「完了への更新はユーザー確認」と同じ考え方)。

## 作るとき(5ステップ)
0. **そもそも作るべきか**: ①週1回以上繰り返す ②確認を自動化できる ③費用(クレジット)が見合う ④実行して結果を見られる道具がある — 1つでも欠けるなら作らない(手作業でよい)。
1. **機械が判定できる終了条件を決める**: 「うまく管理する」ではなく「〇〇に1件追記してpushが成功したら終了」のように、はい/いいえで判定できる形にする。
   - 終了条件と一緒に**やってはいけないこと(境界)**も決める。
   - **失敗時の扱い**(何回やり直したらやめるか、やめたら人にどう知らせるか)を決める。
   - 可能なら、自分の自己申告ではなく外部の事実(コミットが実際にpushされたか、件数が合うか等)で判定する。
2. **種類を選ぶ**: 終わりがある(目標に届いたら止まる)/終わりがなく状態を保つ(変化があった時だけ動く)/定時に起動する(cron)。
3. **骨組み**: 既存の物を保守する処理は「ドキュメント(JSON等)を読み、変化があった時だけ動く」。状態は一方向にだけ進め、「完了」の印は人が付ける。
4. **ブレーキを付ける**: やり直しの上限・強制停止・最後のスイッチは人。ブレーキが無いと空回りしてクレジットを燃やす。
5. **3段階で導入**: ①まず手で1回動かす → ②スキル化 → ③cronで自動化。

## 見直すとき(5つの壊れ方)— 1つでも当てはまれば差し戻す
| # | 壊れ方 | 確認する問い | 対策 |
|---|---|---|---|
| 1 | 目標が抽象的で空回りする | 終了条件を機械がはい/いいえで判定できるか | 判定できる条件に書き換える |
| 2 | 「問題なさそう」で自分で合格にして止まる | 判定する者が実行した本人ではないか/見た目でなく決まった基準か | 外部の事実で照合・別の判定役 |
| 3 | 「通れば良い」だけを見て、ずるをする(テストを消す等) | やってはいけないこと(境界)が書かれているか | 終了条件と境界をセットにする |
| 4 | 途中で人に聞くつもりが、聞かずに間違ったまま最後まで走る | 実行中に初めて確認が要る場面がないか | 確認事項は起動前に全部決めておく |
| 5 | CLAUDE.mdや記憶が古い・肥大化していて、速く回るほど間違える | 依存している文書は新しいか、誰が手入れするか | 文書を分割・定期点検 |

**禁止線(どれか1つでも破るなら自動化しない)**
- 判断は人が持つ(「完了」の印は人が付ける)。
- 取り返しのつかない操作(誤ったPRのマージ・公開・削除・お金)は自動で任せない。
- 自分のルールを書き換えるような処理ほど、人の確認を厳しくする(事後ではなく事前に止める)。

## このプロジェクトでの使い方
- Routineを新設・変更したら、この表で点検し、結果をprogress-tracker-dashboardの`data/ai-config.json`の`web.routineLoopReview`(マネージャアプリ「🔄 ルーティン → 📋 処理一覧」の「🔁 自動処理の点検表」)に1行追加・更新する。
- 当てはまった項目は、直すかどうかをユーザーに相談する(勝手に直さない。ルール10・21)。

---
MIT License (original work)

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
