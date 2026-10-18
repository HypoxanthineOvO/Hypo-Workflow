#!/usr/bin/env bash
# Extract one key frame per shot from the rendered film and tile them.
set -euo pipefail
cd "$(dirname "$0")/.."
VID=out/hypo-workflow-3.mp4
DIR=out/keyframes
rm -rf "$DIR" && mkdir -p "$DIR"
i=0
while read -r fr name; do
  [ -z "$fr" ] && continue
  ffmpeg -nostdin -y -loglevel error -ss "$(python3 -c "print($fr/30)")" -i "$VID" -frames:v 1 "$DIR/$(printf %02d $i)-$name.png"
  i=$((i+1))
done < scripts/keyframes.txt
ffmpeg -y -loglevel error -pattern_type glob -i "$DIR/*.png" \
  -vf "scale=640:360,pad=656:376:8:8:color=0x060708,tile=4x5:color=0x060708" -frames:v 1 out/contact-sheet.png
echo "contact sheet: out/contact-sheet.png ($i frames)"
