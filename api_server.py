import sys, os, uuid, json, tempfile, subprocess
sys.path.insert(0, os.getcwd())

# Monkey Patch: fix av library bug on Python 3.13
import av
_orig_av_open = av.open
def _patched_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)
av.open = _patched_av_open

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from karaoke_generator.transcriber import AudioTranscriber
from karaoke_generator.subtitle_generator import SubtitleGenerator
from karaoke_generator.video_processor import VideoProcessor
from karaoke_generator.vocal_separator import VocalSeparator

app = FastAPI(title="KaraokeAI Backend API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("/tmp", exist_ok=True)
app.mount("/files", StaticFiles(directory="/tmp"), name="files")

@app.get("/")
def root():
    return {"status": "KaraokeAI Backend is running!", "version": "2.1.0"}


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except:
        return 180.0  # default 3 minutes if ffprobe fails


def align_lyrics_proportional(audio_path: str, lyrics_text: str) -> list:
    """
    Simple proportional alignment: spread lyrics lines evenly across audio duration.
    Used as fallback when Whisper alignment is unavailable.
    """
    duration = get_audio_duration(audio_path)
    lyrics_lines = [l.strip() for l in lyrics_text.strip().splitlines() if l.strip()]
    if not lyrics_lines:
        return []
    
    seg_duration = duration / len(lyrics_lines)
    segments = []
    for i, line in enumerate(lyrics_lines):
        begin = i * seg_duration
        end = begin + seg_duration
        words_list = line.split()
        word_count = len(words_list)
        word_dur = seg_duration / max(word_count, 1)
        words = []
        for j, w in enumerate(words_list):
            ws = begin + j * word_dur
            we = ws + word_dur
            words.append({"word": w, "start": round(ws, 3), "end": round(we, 3), "probability": 1.0})
        segments.append({
            "id": i,
            "start": round(begin, 3),
            "end": round(end, 3),
            "text": line,
            "words": words
        })
    return segments


def align_with_whisper_prompt(audio_path: str, lyrics_text: str) -> list:
    """
    Use faster-whisper with custom lyrics as initial_prompt to guide transcription.
    This forces Whisper to transcribe using the provided lyrics as context,
    giving accurate word-level timestamps — no aeneas needed!
    Falls back to proportional alignment if Whisper fails.
    """
    try:
        from faster_whisper import WhisperModel

        print("[align] Loading Whisper model for guided transcription...")
        model = WhisperModel("base", device="cuda" if _cuda_available() else "cpu", compute_type="int8")

        # Use custom lyrics as initial_prompt — Whisper will match them to audio
        lyrics_clean = lyrics_text.strip().replace("\n", " ")
        
        segments_iter, info = model.transcribe(
            audio_path,
            initial_prompt=lyrics_clean,
            word_timestamps=True,
            vad_filter=False,
            beam_size=5,
        )
        
        segments = []
        for i, seg in enumerate(segments_iter):
            words = []
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3)
                    })
            segments.append({
                "id": i,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words
            })
        
        print(f"[align] Whisper guided transcription done: {len(segments)} segments")
        return segments

    except Exception as e:
        print(f"[align] Whisper guided mode failed ({e}), falling back to proportional alignment")
        return align_lyrics_proportional(audio_path, lyrics_text)


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except:
        return False




@app.post("/generate")
async def generate_karaoke(
    video: UploadFile = File(...),
    language: str = Form(default=""),
    romanize: str = Form(default="true"),
    custom_lyrics: str = Form(default="")
):
    job_id = str(uuid.uuid4())[:8]
    input_path = f"/tmp/input_{job_id}.mp4"
    temp_audio = f"/tmp/audio_{job_id}.wav"
    vocals_audio = None
    try:
        with open(input_path, "wb") as f:
            f.write(await video.read())
        
        processor = VideoProcessor()
        processor.extract_audio(input_path, temp_audio)

        # ── FORCED ALIGNMENT path (custom lyrics provided) ──
        # Use Whisper guided transcription — no aeneas needed!
        if custom_lyrics.strip():
            print(f"[{job_id}] Custom lyrics mode → Whisper guided alignment (no Demucs needed)")
            segments = align_with_whisper_prompt(temp_audio, custom_lyrics)
            detected_lang = language if language else "und"
        else:
            # ── AUTO TRANSCRIPTION path (Whisper) ──
            # Demucs needed here — clean vocals improves Whisper accuracy
            print(f"[{job_id}] Auto mode → running Demucs + Whisper transcription")
            vocals_audio, _ = VocalSeparator.separate(temp_audio)
            transcriber = AudioTranscriber()
            result = transcriber.transcribe(
                vocals_audio,
                language=language if language else None,
                vad_filter=False
            )
            segments = result["segments"]
            detected_lang = result["language"]

        return JSONResponse({
            "job_id": job_id,
            "video_url": f"/files/input_{job_id}.mp4",
            "segments": segments,
            "language": detected_lang,
            "mode": "forced_alignment" if custom_lyrics.strip() else "whisper"
        })
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})


class ExportRequest(BaseModel):
    job_id: str
    segments: List[Dict[Any, Any]]
    font_size: int = 24
    alignment: int = 2
    romanize: bool = True
    language: str = "en"

@app.post("/export")
async def export_video(req: ExportRequest):
    input_path = f"/tmp/input_{req.job_id}.mp4"
    output_ass = f"/tmp/karaoke_{req.job_id}.ass"
    output_video = f"/tmp/output_{req.job_id}.mp4"
    try:
        sub_gen = SubtitleGenerator()
        processor = VideoProcessor()
        sub_gen.generate(req.segments, output_ass, romanize=req.romanize, language=req.language)
        processor.burn_subtitles(input_path, output_ass, output_video)
        return {"video_url": f"/files/output_{req.job_id}.mp4"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

class DownloadRequest(BaseModel):
    url: str

@app.post("/download_link")
async def download_link(req: DownloadRequest):
    """Download video from YouTube or Instagram using yt-dlp."""
    try:
        import yt_dlp
    except ImportError:
        return JSONResponse(status_code=500, content={"error": "yt-dlp not installed. Run !pip install yt-dlp"})
        
    job_id = str(uuid.uuid4())[:8]
    output_path = f"/tmp/downloaded_{job_id}.mp4"
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"[{job_id}] Downloading link: {req.url}")
            ydl.download([req.url])
            
        return {"video_url": f"/files/downloaded_{job_id}.mp4"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
