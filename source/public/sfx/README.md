# SFX / BGM drop-in folder

Optional real audio files override the built-in Web Audio tones / procedural BGM.

## SFX

Put short clips here named after the sound id:

- `ui.mp3`
- `buy.mp3`
- `merge.mp3`
- `reroll.mp3`
- `equip.mp3`
- `battle.mp3`
- `hit.mp3`
- `skill.mp3`
- `heal.mp3`
- `defeat.mp3`
- `win.mp3`
- `lose.mp3`

Also accepts `.ogg` / `.wav`. Keep clips short (under ~0.6s) for combat spam.

## BGM

Title / lobby music:

- `bgm.mp3` (or `.ogg` / `.wav`)

If present, it loops on the intro screen. If missing, a soft procedural ambient pad plays instead.
Mute in the UI stops both SFX and BGM.
