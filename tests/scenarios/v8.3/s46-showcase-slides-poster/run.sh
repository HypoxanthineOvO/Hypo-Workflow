#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"

cd "$repo_root"

rg -q 'slides.md' skills/showcase/SKILL.md
rg -q 'Mermaid' skills/showcase/SKILL.md
rg -q 'poster.png' skills/showcase/SKILL.md
rg -q 'OPENAI_API_KEY' skills/showcase/SKILL.md
rg -q 'poster failure must not fail the whole Showcase run|海报失败不得使整个 Showcase 运行失败' skills/showcase/SKILL.md
rg -q 'api_key_env' config.schema.yaml
rg -q '1024x1536' config.schema.yaml
rg -q 'style' config.schema.yaml

echo "s46-showcase-slides-poster: PASS"
