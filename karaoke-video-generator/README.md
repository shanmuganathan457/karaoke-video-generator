# 🎤 Karaoke Video Creator (Modular Python Pipeline)

A premium, modular Python-based utility that converts any input video into a synchronized karaoke video. It uses AI models to extract speech, transcribes the lyrics with word-level timestamps, automatically transliterates non-Latin characters (like Tamil to phonetic Tanglish), styles them in the ASS karaoke format, and burns the subtitles back onto the original video while preserving the audio track.

---

## 🚀 Key Features

* **High-Accuracy AI Transcription:** Powered by Faster-Whisper (`large-v3`) for word-level precision.
* **Smart Transliteration (Tanglish/ASCII):** Automatically detects non-Latin scripts (like Tamil) and converts them phonetically to English characters (e.g. `"தமிழ்"` becomes `"thamizh"`) using specialized Indic libraries, with standard ASCII fallback.
* **Lossless Audio Preservation:** Retains the original audio quality (`acodec='copy'`) without any compression loss.
* **VAD Optimization for Music:** Voice Activity Detection (VAD) is disabled by default to prevent filtering out sustained singing notes, quiet vocal overlays, or whispered lyrics.
* **Standard SubStation Alpha (ASS) Styling:** Outputs a beautifully styled subtitle file supporting the standard ASS `\k` karaoke highlight animation (text changes from white to yellow as it is sung).

---

## 📊 Core Workflow

```mermaid
graph TD
    A[Input Video] --> B[1. Audio Extraction]
    B --> C[2. AI Word-Level Transcription]
    C --> D[3. Subtitle Generation & Transliteration]
    D --> E[4. Subtitle Burn-In & Audio Muxing]
    E --> F[Output Karaoke Video]
```

---

## 🛠️ Prerequisites

Before running the generator, ensure you have the following installed on your system:

1. **Python 3.10 or newer**
2. **FFmpeg** (Ensure it is added to your system's global environment variables/PATH)
   * **Windows (Chocolatey):** `choco install ffmpeg`
   * **macOS (Homebrew):** `brew install ffmpeg`
   * **Linux (Ubuntu/Debian):** `sudo apt install ffmpeg`

---

## 📦 Setup & Installation

1. **Navigate to the project directory:**
   ```bash
   cd karaoke-video-generator
   ```

2. **Create and activate a virtual environment (Recommended):**
   ```bash
   python -m venv venv
   # On Windows (CMD/PowerShell):
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r karaoke_generator/requirements.txt
   ```

---

## 💻 How to Run

Run the coordinator module from the project root directory:

```bash
python -m karaoke_generator.main <input_video> [<output_video>] [options]
```

### CLI Arguments & Options

| Argument | Description | Default |
| :--- | :--- | :--- |
| `input` | Path to the input video file (e.g., `mysong.mp4`). *(Required)* | N/A |
| `output` | Path to save the final output video. *(Optional)* | `output.mp4` |
| `--ass` | Path to save the raw generated SubStation Alpha `.ass` subtitles file. | `karaoke.ass` |
| `--language`, `-l` | Language code (e.g. `ta` for Tamil, `hi` for Hindi, `en` for English). | Auto-detected |
| `--no-romanize` | Disables phonetic transliteration. Lyrics will remain in native scripts. | Romanization is active |
| `--vad` | Enables Voice Activity Detection (useful for speech, but disabled by default for music). | `False` |

### Examples

* **Default Run (Auto-Language, Romanized, Audio Retained):**
  ```bash
  python -m karaoke_generator.main mysong.mp4 output_karaoke.mp4
  ```

* **Manually Specify Tamil Language with No VAD (Optimal for Tamil Songs):**
  ```bash
  python -m karaoke_generator.main mysong.mp4 output_karaoke.mp4 --language ta
  ```

* **Keep Native Tamil/Hindi Script (Do Not Transliterate to English Letters):**
  ```bash
  python -m karaoke_generator.main mysong.mp4 output_karaoke.mp4 --no-romanize
  ```

---

## 📂 Project Structure

```
karaoke-video-generator/
│
├── karaoke_generator/
│   ├── __init__.py
│   ├── main.py                 # CLI Coordinator & Steps Pipeline
│   ├── transcriber.py          # Faster-Whisper transcription wrapper
│   ├── subtitle_generator.py   # SubStation Alpha (ASS) karaoke generation & transliterators
│   ├── video_processor.py      # FFmpeg wrapper (extract audio, burn captions with audio map)
│   ├── config.py               # Custom font sizes, colors (&HAABBGGRR format), and Whisper defaults
│   └── requirements.txt        # Project packages (faster-whisper, pysubs2, ffmpeg-python, anyascii, tamil-translite)
│
├── README.md                   # Project Documentation
└── package.json                # (Optional) Node/Vite developer portal structure
```

---

## 🎨 Subtitle Customization

You can open `karaoke_generator/config.py` to customize the karaoke presentation style:

* **`FONT_SIZE`**: Set to `14` by default for a clean, non-intrusive presentation layout.
* **`PRIMARY_COLOR`**: Style of the text *before* it is sung (Default is White `&H00FFFFFF`).
* **`SECONDARY_COLOR`**: Style of the text *as it is being sung* (Default is Yellow `&H0000FFFF`).
