"""Compose the original looping ambient score '深处的微光' without samples.

Requires numpy and either ffmpeg on PATH or imageio-ffmpeg.
Run from the repository root:
  python3 tools/hi3d-compose-music.py --output cave-assets/audio/hi3d-deep-light.mp3
"""

import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

import numpy as np

RATE = 32000
BEAT = 60 / 64
BAR = 4 * BEAT
SECONDS = 32 * BAR


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def compose():
    count = round(RATE * SECONDS)
    mix = np.zeros((count, 2), dtype=np.float32)
    rng = np.random.default_rng(20261108)

    def add(signal, when, level, pan=0):
        start = round(when * RATE) % count
        signal = np.asarray(signal, dtype=np.float32)
        stereo = signal[:, None] * np.array([
            math.cos((pan + 1) * math.pi / 4),
            math.sin((pan + 1) * math.pi / 4)
        ], dtype=np.float32)[None, :] * level
        first = min(len(signal), count - start)
        mix[start:start + first] += stereo[:first]
        if first < len(signal):
            mix[:len(signal) - first] += stereo[first:]

    def pad(note, when, duration, level, pan):
        t = np.arange(round((duration + 3.5) * RATE)) / RATE
        f = frequency(note)
        envelope = np.minimum(t / 1.8, 1) * np.clip((duration + 3.5 - t) / 3.5, 0, 1)
        envelope *= 0.88 + 0.12 * np.sin(2 * np.pi * .11 * t)
        signal = (np.sin(2 * np.pi * f * t) +
                  .28 * np.sin(2 * np.pi * f * 1.0012 * t + .5) +
                  .13 * np.sin(2 * np.pi * 2 * f * t)) / 1.41
        add(signal * envelope, when, level, pan)

    def piano(note, when, level, pan=0):
        t = np.arange(round(5.5 * RATE)) / RATE
        f = frequency(note)
        envelope = (1 - np.exp(-t / .012)) * np.exp(-t / 1.45)
        envelope *= np.clip((5.5 - t) / .9, 0, 1)
        signal = (np.sin(2 * np.pi * f * t) +
                  .35 * np.sin(2 * np.pi * 2.001 * f * t) * np.exp(-t / 1.2) +
                  .13 * np.sin(2 * np.pi * 3.002 * f * t) * np.exp(-t / .65) +
                  .045 * np.sin(2 * np.pi * 5 * f * t) * np.exp(-t / .25))
        add(signal * envelope, when, level, pan)

    def bell(note, when, level, pan=0):
        t = np.arange(round(7.5 * RATE)) / RATE
        f = frequency(note)
        envelope = (1 - np.exp(-t / .028)) * np.exp(-t / 2.15)
        envelope *= np.clip((7.5 - t) / 1.5, 0, 1)
        signal = (np.sin(2 * np.pi * f * t) +
                  .18 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 1.3))
        add(signal * envelope, when, level, pan)

    chords = [
        (38, [50, 57, 60, 64, 65], [69, 74, 72, 65]),
        (34, [46, 53, 57, 60, 62], [65, 69, 72, 74]),
        (41, [48, 53, 57, 60, 67], [67, 69, 72, 76]),
        (36, [48, 55, 60, 62, 64], [67, 64, 62, 60]),
        (31, [43, 50, 53, 57, 58], [65, 69, 70, 74]),
        (38, [50, 57, 60, 64, 65], [69, 65, 64, 62]),
        (34, [46, 53, 57, 60, 62], [65, 69, 72, 74]),
        (33, [45, 52, 55, 57, 62], [69, 67, 64, 62]),
    ]
    for phrase in range(16):
        bass, chord, melody = chords[phrase % 8]
        start = phrase * 2 * BAR
        energy = 0.88 if phrase < 4 else 1.0 if phrase < 12 else 0.9
        for index, note in enumerate(chord):
            pad(note, start - .6 + index * .06, 2 * BAR, .026 * energy,
                (index - 2) * .32)
        pad(bass, start, 2 * BAR - .5, .042 * energy, 0)
        for index, offset in enumerate((.5, 2.5, 4.25, 6.25)):
            when = start + offset * BEAT + rng.uniform(-.025, .025)
            piano(melody[index], when, (.064 if index == 0 else .049) * energy,
                  rng.uniform(-.3, .3))
        for index, offset in enumerate((1.5, 3.5, 5.5, 7.0)):
            piano(chord[(index + phrase) % len(chord)] + 12,
                  start + offset * BEAT, .014 * energy, (-1) ** index * .52)
        if phrase % 2 == 0:
            bell(melody[0] + 12, start + 1.0 * BEAT, .015, -.55)
        if phrase >= 8 and phrase % 2:
            bell(melody[2], start + 6.5 * BEAT, .018, .48)

    # Circular stereo reflections preserve the loop seam, including reverb tails.
    dry = mix.copy()
    for seconds, gain, swap in ((.23, .12, True), (.41, .14, False),
                                (.71, .11, True), (1.13, .08, False),
                                (1.67, .05, True), (2.41, .03, False)):
        reflection = np.roll(dry[:, ::-1] if swap else dry, round(seconds * RATE), axis=0)
        mix += reflection * gain
    mix -= np.mean(mix, axis=0, keepdims=True)
    rms = float(np.sqrt(np.mean(mix ** 2)))
    gain = min(.09 / max(rms, 1e-9), .88 / max(float(np.max(np.abs(mix))), 1e-9))
    mix *= gain
    return mix


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit('Output already exists; preserve it and choose a new path.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    audio = compose()
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix='hi3d-music-') as directory:
        wav = Path(directory) / 'hi3d-deep-light.wav'
        with wave.open(str(wav), 'wb') as stream:
            stream.setnchannels(2)
            stream.setsampwidth(2)
            stream.setframerate(RATE)
            stream.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())
        subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-i', str(wav),
                        '-codec:a', 'libmp3lame', '-b:a', '192k',
                        '-metadata', 'title=深处的微光',
                        '-metadata', 'comment=Original sample-free ambient composition for Lightwall Exploration',
                        str(args.output)], check=True)
    print(json.dumps({
        'output': str(args.output), 'duration_seconds': SECONDS,
        'sample_rate': RATE, 'channels': 2,
        'rms_dbfs': round(20 * math.log10(float(np.sqrt(np.mean(audio ** 2))))),
        'peak': round(float(np.max(np.abs(audio))), 4),
        'bytes': args.output.stat().st_size
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
