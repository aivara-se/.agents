#!/usr/bin/env python3
"""Transcribe a local audio file with faster-whisper.

    python3 transcribe.py <file> [--model base.en] [--language en]

Prints one `[start-end] text` line per segment. The detected language and
probability go to stderr. Decoding is done here, not by faster-whisper,
because its `transcribe(path)` passes `metadata_errors` to a PyAV that no
longer accepts it.
"""
import argparse
import sys

import av
import numpy as np
from faster_whisper import WhisperModel

RATE = 16000


def decode(path: str) -> np.ndarray:
    container = av.open(path)
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="s16", layout="mono", rate=RATE)
    chunks = []
    for frame in container.decode(stream):
        for out in resampler.resample(frame):
            chunks.append(out.to_ndarray().reshape(-1))
    if not chunks:
        raise SystemExit(f"no audio in {path}")
    return np.concatenate(chunks).astype(np.float32) / 32768.0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file")
    parser.add_argument("--model", default="base.en")
    parser.add_argument("--language", default=None)
    args = parser.parse_args()

    audio = decode(args.file)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio,
        beam_size=5,
        vad_filter=False,
        language=args.language,
        condition_on_previous_text=False,
    )
    print(
        f"# {info.duration:.1f}s {info.language} p={info.language_probability:.2f}",
        file=sys.stderr,
    )
    lines = []
    for segment in segments:
        print(f"[{segment.start:.1f}-{segment.end:.1f}] {segment.text.strip()}")
        lines.append(segment.text.strip())
    if not lines:
        print("# no speech detected", file=sys.stderr)


if __name__ == "__main__":
    main()
