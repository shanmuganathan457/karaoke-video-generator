# Karaoke Video Generator Package

This is the core Python module of the Karaoke Video Generator application. It implements audio vocal separation, automated speech recognition with word-level timestamps, subtitle generation, and video rendering.

## Core Modules

- **`main.py`**: CLI entrypoint and pipeline coordinator.
- **`vocal_separator.py`**: Uses `demucs` to isolate vocals from accompaniment.
- **`transcriber.py`**: Uses `faster-whisper` for speech-to-text transcription.
- **`transliterator.py`**: Uses `aksharamukha` and `tamil-translite` for multilingual Romanization (Devanagari, Telugu, Kannada, Malayalam, Tamil).
- **`subtitle_generator.py`**: Creates Advanced SubStation Alpha (`.ass`) karaoke timing tags (`\k`).
- **`video_processor.py`**: Wrapper for `ffmpeg` audio extraction and subtitle burn-in.
- **`config.py`**: Stylistic options (colors, fonts) and model parameters.
- **`server.py`**: FastAPI rest server to integrate with the mobile application.

## Installation

```bash
pip install -r requirements.txt
```

## CLI Usage

```bash
python -m karaoke_generator.main input.mp4 output.mp4 --romanize
```
