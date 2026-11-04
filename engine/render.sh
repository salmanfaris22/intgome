#!/bin/zsh
# render.sh d01 -> exports/ (master + IG spec) and ~/Desktop/30-day-series/
set -e
id=$1; ID=${id:u}; R=~/Documents/reels/2026-11-03_30-day-series
cd $R/engine
mkdir -p out $R/exports ~/Desktop/30-day-series
slug=$(python3 -c "import json;s=json.load(open('$R/reels/$id/spec.json'));print(s['title'].lower().replace(' ','-'))")
[ -n "$SKIP_RENDER" ] || npx remotion render $ID out/$id.mp4 --concurrency=3 --crf=14 --jpeg-quality=95 --audio-codec=aac --audio-bitrate=320k --gl=angle --log=error
name="day$(echo $id | tr -d d)_${slug}_v1.mp4"
ffmpeg -v error -y -i out/$id.mp4 -vf "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p" -c:v libx264 -preset slow -crf 17 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a copy -movflags +faststart $R/exports/$name
cp $R/exports/$name ~/Desktop/30-day-series/$name
echo "OUT $R/exports/$name"
