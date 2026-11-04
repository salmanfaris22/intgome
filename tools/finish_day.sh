#!/bin/zsh
# finish_day.sh N...: render -> cut intro (v2) -> add bg music -> trash v1. Full v2 pipeline per day.
set -e
R=~/Documents/reels/2026-11-03_30-day-series
for n in "$@"; do
  id=d$(printf %02d $n)
  $R/engine/render.sh $id
  python3 -u $R/tools/trim_intro.py $n
  python3 -u $R/tools/add_bgm.py $n
  for f in $R/exports/day$(printf %02d $n)_*_v1.mp4 ~/Desktop/30-day-series/day$(printf %02d $n)_*_v1.mp4; do trash "$f"; done
  echo "DONE day $n"
done
