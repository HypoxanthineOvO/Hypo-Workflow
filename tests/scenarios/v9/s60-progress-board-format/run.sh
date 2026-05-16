#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

progress=".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/PROGRESS.md"
spec="references/progress-spec.md"
patch_skill="skills/patch/SKILL.md"

test -f "$progress"
test -f "$spec"
test -f "$patch_skill"

grep -Fq '> 最后更新：' "$progress"
grep -Fq '## 当前状态' "$progress"
grep -Fq '## Milestone 进度' "$progress"
grep -Fq '| # | Feature | Milestone | 状态 | 摘要 |' "$progress"
grep -Fq '## 时间线' "$progress"
grep -Fq '| 时间 | 类型 | 事件 | 结果 |' "$progress"
grep -Fq '## Patch 轨道' "$progress"
grep -Fq '| Patch | 状态 | 时间 | 摘要 |' "$progress"
grep -Fq '## Deferred 项' "$progress"

grep -Fq 'board-style summary' "$spec"
grep -Fq 'Do not append standalone one-line entries' "$spec"
grep -Eq 'refresh `.pipeline/PROGRESS.md` board tables|刷新 `.pipeline/PROGRESS.md`' "$patch_skill"
grep -Eq 'Do not append standalone one-line progress entries|不要向 `PROGRESS.md` 底部追加独立的单行进度条目' "$patch_skill"

echo "s60 passed"
