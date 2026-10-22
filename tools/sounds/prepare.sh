#!/usr/bin/env bash
# South Paw · tools/sounds/prepare.sh
# Rebuilds game/assets/sounds/*.mp3 from the recordings in ./originals:
# trims each to the part the game uses, makes it mono and evens out the loudness so no punch is quieter than another.
# Needs ffmpeg.  Run:  cd tools/sounds && bash prepare.sh
set -e
O=../../game/assets/sounds
I=originals
mono="-ac 1 -ar 32000"
# punches: one hit each, 0.5 s, loudness -12 LUFS
punch(){ ffmpeg -y -v error -ss "$2" -i "$I/$1" -t 0.5 $mono -af "apad=pad_dur=0.6,atrim=0:0.5,afade=t=out:st=0.36:d=0.14,loudnorm=I=-12:TP=-0.5" -ar 32000 -b:a 96k "$O/$3.mp3"; }
punch punch-hit-realistic.mp3     4.78 punch   # the hit sits at 4.78 s in this file
punch punch-hard-face-impact.mp3  0    face
punch punch-heavy-body-impact.mp3 0    body
# bells
ffmpeg -y -v error -i $I/boxing-bell.mp3 -t 3.4 $mono -af "afade=t=out:st=2.9:d=0.5,loudnorm=I=-15:TP=-1" -ar 32000 -b:a 64k $O/bell.mp3
ffmpeg -y -v error -i $I/boxing-bell-round-end.mp3 -t 1.7 $mono -af "afade=t=out:st=1.3:d=0.4,loudnorm=I=-15:TP=-1" -ar 32000 -b:a 64k $O/bellEnd.mp3
# crowd reactions
ffmpeg -y -v error -i $I/crowd-cheer-and-yell.mp3 $mono -af "afade=t=in:d=0.15,afade=t=out:st=13.6:d=0.9,loudnorm=I=-18:TP=-1" -ar 32000 -b:a 56k $O/cheer.mp3
ffmpeg -y -v error -i $I/reaction_2.m4a $mono -af "afade=t=out:st=3.6:d=0.6,loudnorm=I=-18:TP=-1" -ar 32000 -b:a 56k $O/react2.mp3
ffmpeg -y -v error -i $I/reaction_liver-ko.m4a $mono -af "afade=t=out:st=9.8:d=1,loudnorm=I=-18:TP=-1" -ar 32000 -b:a 56k $O/livko.mp3
# ambience loops (quieter, they play under everything)
ffmpeg -y -v error -i $I/round_start_sound.m4a -t 28.2 $mono -af "loudnorm=I=-22:TP=-2" -ar 32000 -b:a 48k $O/introAmb.mp3
ffmpeg -y -v error -i $I/round_sound.m4a -ss 0.7 -t 67 $mono -af "loudnorm=I=-22:TP=-2" -ar 32000 -b:a 48k $O/roundAmb.mp3
echo "Sounds written to $O"
