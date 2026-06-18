# Karaoke Video Generator

A production-quality Python project to create karaoke-style videos with synchronized word-level highlighting.

## Features
- **High Precision**: Uses `faster-whisper` for word-level timestamps.
- **Multilingual**: Auto-detects and supports multiple languages.
- **ASS Subtitles**: Generates Advanced SubStation Alpha subtitles with standard karaoke tags (`\k`).
- **FFmpeg Integration**: Automatic audio extraction and subtitle burning.
- **Modular Design**: Easy to extend or integrate into other workflows.

## Prerequisites
- Python 3.11+
- [FFmpeg](https://ffmpeg.org/download.html) installed and added to YOUR PATH.

## Installation

1. Clone or download this project.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the generator from the command line:

```bash
python -m karaoke_generator.main input.mp4 output_karaoke.mp4
```

### Options
- `input`: (Required) Path to the input video.
- `output`: (Optional) Path to save the processed video (defaults to `output.mp4`).
- `--ass`: (Optional) Path to save the separate subtitle file (defaults to `karaoke.ass`).

## Architecture
- `main.py`: Entry point and workflow orchestration.
- `transcriber.py`: Audio transcription engine.
- `subtitle_generator.py`: ASS file creation and karaoke tag logic.
- `video_processor.py`: FFmpeg wrapper for multimedia operations.
- `config.py`: Centralized settings for models and styling.

## Subtitle Styling
The defaults are:
- **Font**: Arial, Size 24
- **Normal Color**: White
- **Highlight Color**: Yellow (synchronized with audio)
- **Position**: Bottom-Center

## Error Handling
The project includes comprehensive logging and handles common failures such as:
- Missing input files.
- FFmpeg errors during processing.
- Transcription failures.
- File permission issues.
