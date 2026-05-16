#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'keyword_patterns' config.schema.yaml
rg -Fq "'feat\\(M(\\d+)\\):'" config.schema.yaml
rg -Fq "'M(\\d+)-'" config.schema.yaml
rg -Fq "'milestone-(\\d+)'" config.schema.yaml
rg -q 'Keyword.*keyword_patterns|提交消息匹配配置的 `keyword_patterns`' skills/init/SKILL.md
rg -q 'Keyword milestone.*M0-scaffold|Keyword milestone.*命名' skills/init/SKILL.md

echo "s32-import-history-keyword: PASS"
