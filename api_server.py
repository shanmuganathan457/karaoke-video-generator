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


def align_with_aeneas(audio_path: str, lyrics_text: str) -> list:
    """
    Use aeneas to force-align custom lyrics to audio.
    Returns a list of segments in the same format as Whisper output.
    """
    job_id = str(uuid.uuid4())[:8]
    
    # Write lyrics to a plain text file (one line per segment)
    lyrics_lines = [l.strip() for l in lyrics_text.strip().splitlines() if l.strip()]
    lyrics_file = f"/tmp/lyrics_{job_id}.txt"
    output_json = f"/tmp/aligned_{job_id}.json"
    
    with open(lyrics_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lyrics_lines))
    
    # Build the aeneas task config string
    # l=eng for English/romanized, os=json for output
    # For Tamil/non-Latin, use l=ita or leave language detection (l=auto is not always supported)
    task_config = "task_language=eng|os_task_file_format=json|is_text_type=plain"
    
    # Try direct Python API first, fallback to sys.executable CLI
    try:
        from aeneas.executetask import ExecuteTask
        from aeneas.task import Task

        task = Task(config_string=task_config)
        task.audio_file_path_absolute = audio_path
        task.text_file_path_absolute = lyrics_file
        task.sync_map_file_path_absolute = output_json

        ExecuteTask(task).execute()
        task.output_sync_map_file()
    except Exception as py_err:
        cmd = [
            sys.executable, "-m", "aeneas.tools.execute_task",
            audio_path,
            lyrics_file,
            task_config,
            output_json
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"aeneas failed: {result.stderr or str(py_err)}")
    
    with open(output_json, "r", encoding="utf-8") as f:
        aeneas_data = json.load(f)
    
    # Convert aeneas output to Whisper-style segments
    segments = []
    fragments = aeneas_data.get("fragments", [])
    
    for i, frag in enumerate(fragments):
        begin = float(frag.get("begin", 0))
        end = float(frag.get("end", 0))
        text = " ".join(frag.get("lines", []))
        
        if not text.strip():
            continue
        
        # Build word-level timing by splitting line evenly across duration
        words_list = text.split()
        word_count = len(words_list)
        duration = end - begin
        word_dur = duration / max(word_count, 1)
        
        words = []
        for j, w in enumerate(words_list):
            ws = begin + j * word_dur
            we = ws + word_dur
            words.append({"word": w, "start": round(ws, 3), "end": round(we, 3), "probability": 1.0})
        
        segments.append({
            "id": i,
            "start": begin,
            "end": end,
            "text": text,
            "words": words
        })
    
    # Clean up temp files
    try:
        os.remove(lyrics_file)
        os.remove(output_json)
    except:
        pass
    
    return segments


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
        # Skip Demucs — aeneas doesn't need clean vocals, works on full audio
        if custom_lyrics.strip():
            print(f"[{job_id}] Custom lyrics mode → skipping Demucs, using aeneas forced alignment")
            segments = align_with_aeneas(temp_audio, custom_lyrics)
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
