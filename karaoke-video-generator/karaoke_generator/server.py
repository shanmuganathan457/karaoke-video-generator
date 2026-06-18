"""
KaraokeAI FastAPI Backend Server
=================================
This server exposes the karaoke_generator pipeline as a REST API so the
React Native mobile app can upload videos and poll for processing status.

Start with:
    python -m karaoke_generator.server

The server will listen on http://0.0.0.0:8000
Find your local IP with: ipconfig (Windows)
Then update services/api.ts in the mobile-app with your IP.
"""

import asyncio
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ─── Internal imports (using actual class names from the project) ───────────
from karaoke_generator.transcriber import AudioTranscriber
from karaoke_generator.subtitle_generator import SubtitleGenerator
from karaoke_generator.video_processor import VideoProcessor

# ─── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

# ─── App Setup ─────────────────────────────────────────────────────────────
app = FastAPI(title="KaraokeAI Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Job Storage ────────────────────────────────────────────────────────────
JOBS: dict[str, dict] = {}

UPLOAD_DIR = Path("inputs")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


# ─── Response Model ─────────────────────────────────────────────────────────
class JobStatusResponse(BaseModel):
    jobId: str
    status: str
    progress: int
    step: str
    estimatedSeconds: int
    outputUrl: Optional[str] = None
    error: Optional[str] = None


# ─── Background Processing ──────────────────────────────────────────────────
async def process_video(job_id: str, input_path: Path):
    """Run the full karaoke pipeline as a background task."""
    audio_path = OUTPUT_DIR / f"{job_id}_audio.wav"
    ass_path   = OUTPUT_DIR / f"{job_id}.ass"
    output_mp4 = OUTPUT_DIR / f"karaoke_{job_id}.mp4"

    def update(status: str, progress: int, step: str, est: int = 0):
        JOBS[job_id].update({"status": status, "progress": progress, "step": step, "estimatedSeconds": est})
        log.info(f"[{job_id[:8]}] {step} — {progress}%")

    try:
        # Step 1: Extract audio
        update("extracting", 10, "Extracting Audio", 40)
        processor = VideoProcessor()
        await asyncio.to_thread(
            processor.extract_audio, str(input_path), str(audio_path)
        )

        # Step 2: Transcribe with Whisper
        update("transcribing", 30, "Speech Recognition", 30)
        transcriber = AudioTranscriber()
        result = await asyncio.to_thread(transcriber.transcribe, str(audio_path))

        # Step 3: Word-Level timing (already in result)
        update("timing", 65, "Word-Level Timing", 15)
        segments = result["segments"]
        await asyncio.sleep(0.5)

        # Step 4: Generate ASS subtitles
        update("generating", 80, "Subtitle Generation", 10)
        gen = SubtitleGenerator()
        await asyncio.to_thread(gen.generate, segments, str(ass_path))

        # Step 5: Burn subtitles into video
        update("generating", 90, "Burning Subtitles", 5)
        await asyncio.to_thread(
            processor.burn_subtitles, str(input_path), str(ass_path), str(output_mp4)
        )

        # Done!
        JOBS[job_id].update({
            "status": "done",
            "progress": 100,
            "step": "Complete",
            "estimatedSeconds": 0,
            "outputUrl": f"/output/{job_id}",
        })
        log.info(f"[{job_id[:8]}] ✅ Done → {output_mp4}")

    except Exception as e:
        log.error(f"[{job_id[:8]}] ❌ Error: {e}", exc_info=True)
        JOBS[job_id].update({"status": "error", "progress": 0, "step": "Error", "error": str(e)})

    finally:
        # Clean up temp audio
        if audio_path.exists():
            audio_path.unlink()
        # Clean up uploaded input
        if input_path.exists():
            input_path.unlink()


# ─── Routes ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(400, "Only video files accepted.")

    job_id = str(uuid.uuid4())
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    input_path = UPLOAD_DIR / f"{job_id}{suffix}"

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size_kb = input_path.stat().st_size // 1024
    log.info(f"[{job_id[:8]}] Received: {file.filename} ({size_kb} KB)")

    JOBS[job_id] = {
        "status": "queued",
        "progress": 0,
        "step": "Queued",
        "estimatedSeconds": 60,
        "outputUrl": None,
        "error": None,
    }

    asyncio.create_task(process_video(job_id, input_path))
    return {"jobId": job_id, "message": "Processing started."}


@app.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(404, f"Job {job_id} not found.")
    j = JOBS[job_id]
    return JobStatusResponse(
        jobId=job_id,
        status=j["status"],
        progress=j["progress"],
        step=j["step"],
        estimatedSeconds=j["estimatedSeconds"],
        outputUrl=j.get("outputUrl"),
        error=j.get("error"),
    )


@app.get("/output/{job_id}")
async def get_output(job_id: str):
    path = OUTPUT_DIR / f"karaoke_{job_id}.mp4"
    if not path.exists():
        raise HTTPException(404, "Output not ready yet.")
    return FileResponse(str(path), media_type="video/mp4", filename=f"karaoke_{job_id}.mp4")


@app.get("/jobs")
async def list_jobs():
    return {jid: {k: v for k, v in j.items() if k != "error"} for jid, j in JOBS.items()}


# ─── Entry Point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    log.info("🚀 KaraokeAI Server → http://0.0.0.0:8000")
    log.info("📱 Update API_BASE_URL in mobile-app/services/api.ts with your PC IP")
    uvicorn.run("karaoke_generator.server:app", host="0.0.0.0", port=8000, reload=False)
