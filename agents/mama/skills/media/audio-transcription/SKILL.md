---
name: audio-transcription
description: Transcribe a voice note or audio file locally with Whisper.
when-to-use: A chat voice message arrives with "could not be transcribed automatically", or a local audio file needs text.
---

# Audio transcription

A voice note the gateway could not transcribe is still a message. Decode it locally and read it; do not guess the content or ask the user to retype without trying.

## Procedure

1. Take the path from the delivery note. Confirm it is audio: `file <path>` answers `Ogg data, Opus audio` for a Telegram voice note.
2. Install the model once per sandbox: `python3 -m pip install --quiet faster-whisper`. It pulls `ctranslate2`, `pyav` and `numpy`, and downloads a model (~75–150 MB) on first use.
3. Run `scripts/transcribe.py <path>`; add `--model small.en` when the clip is long or names matter. It prints one `[start-end] text` line per segment and the detected language on stderr.
4. Quote the transcript back in the reply, then act on it. If a single word changes the meaning, ask instead of acting.

## Pitfalls

- **`WhisperModel.transcribe(path)` raises `TypeError: open() got an unexpected keyword argument 'metadata_errors'`** on a newer PyAV than faster-whisper expects. Do not downgrade: decode the file yourself and pass a float32 array. `scripts/transcribe.py` does that with `av.AudioResampler(format="s16", layout="mono", rate=16000)`.
- A short note is cheap: a three-second clip costs a few seconds of CPU. Transcribe before concluding anything about intent.
- `tiny.en` mangles names and numbers; `base.en` is the floor for an instruction, `small.en` for anything acted on.
- VAD filtering drops a quiet first word. Leave it off for a one-line note; read `language_probability` before trusting a language you did not expect.
- The audio may be private. Run it locally; do not upload it to a transcription service unless the user allows it.
