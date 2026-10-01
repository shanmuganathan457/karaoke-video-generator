import sys, os, uuid
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
from typing import List, Dict, Any

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
    return {"status": "KaraokeAI Backend is running!", "version": "2.0.0"}

@app.post("/generate")
async def generate_karaoke(
    video: UploadFile = File(...),
    language: str = Form(default="")
):
    job_id = str(uuid.uuid4())[:8]
    input_path = f"/tmp/input_{job_id}.mp4"
    temp_audio = f"/tmp/audio_{job_id}.wav"
    vocals_audio = None
    try:
        with open(input_path, "wb") as f:
            f.write(await video.read())
        processor = VideoProcessor()
        transcriber = AudioTranscriber()
        processor.extract_audio(input_path, temp_audio)
        vocals_audio, _ = VocalSeparator.separate(temp_audio)
        result = transcriber.transcribe(
            vocals_audio,
            language=language if language else None,
            vad_filter=False
        )
        return JSONResponse({
            "job_id": job_id,
            "video_url": f"/files/input_{job_id}.mp4",
            "segments": result["segments"],
            "language": result["language"]
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


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
