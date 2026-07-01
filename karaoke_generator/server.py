"""
KaraokeAI FastAPI Backend Server
=================================
This server exposes the karaoke_generator pipeline as a REST API so the
React Native mobile app can upload videos and poll for processing status.
It also supports JWT authentication, JSON file-based database, and real project storage.

Start with:
    python -m karaoke_generator.server

The server will listen on http://0.0.0.0:8000
"""

import asyncio
import logging
import os
import shutil
import uuid
import re
import ffmpeg
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

# ─── Internal imports ──────────────────────────────────────────────────────
from karaoke_generator.transcriber import AudioTranscriber
from karaoke_generator.subtitle_generator import SubtitleGenerator
from karaoke_generator.video_processor import VideoProcessor
from karaoke_generator.database import db
from karaoke_generator.auth import (
    get_current_user_id,
    verify_password,
    get_password_hash,
    create_access_token
)

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
THUMBNAIL_DIR = Path("thumbnails")

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
THUMBNAIL_DIR.mkdir(exist_ok=True)

# ─── Request / Response Models ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class SubscriptionRequest(BaseModel):
    plan: str

class JobStatusResponse(BaseModel):
    jobId: str
    status: str
    progress: int
    step: str
    estimatedSeconds: int
    outputUrl: Optional[str] = None
    error: Optional[str] = None

# Helper for basic email verification
def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email))

# ─── Background Processing ──────────────────────────────────────────────────
async def process_video(job_id: str, input_path: Path, user_id: str, duration: float):
    """Run the full karaoke pipeline as a background task."""
    audio_path = OUTPUT_DIR / f"{job_id}_audio.wav"
    ass_path   = OUTPUT_DIR / f"{job_id}.ass"
    output_mp4 = OUTPUT_DIR / f"karaoke_{job_id}.mp4"
    vocals_path = None
    instrumental_path = None

    def update(status: str, progress: int, step: str, est: int = 0):
        JOBS[job_id].update({"status": status, "progress": progress, "step": step, "estimatedSeconds": est})
        db.update_project(job_id, {"status": status})
        log.info(f"[{job_id[:8]}] {step} — {progress}%")

    try:
        # Step 1: Extract audio
        update("extracting", 10, "Extracting Audio", 40)
        processor = VideoProcessor()
        await asyncio.to_thread(
            processor.extract_audio, str(input_path), str(audio_path)
        )

        # Step 1b: Vocal Separation using Demucs
        update("separating", 20, "Vocal Separation", 50)
        from karaoke_generator.vocal_separator import VocalSeparator
        vocals_path, instrumental_path = await asyncio.to_thread(
            VocalSeparator.separate, str(audio_path)
        )

        # Step 2: Transcribe vocals with Whisper
        update("transcribing", 40, "Speech Recognition", 30)
        transcriber = AudioTranscriber()
        # Retrieve job metadata
        job_meta = JOBS.get(job_id, {})
        lang_param = job_meta.get("language")
        lyrics_prompt = job_meta.get("lyrics")
        
        result = await asyncio.to_thread(
            transcriber.transcribe,
            vocals_path,
            language=lang_param,
            vad_filter=True,   # Enable Silero VAD to skip instrumental sections and prevent hallucinations
            initial_prompt=lyrics_prompt,
        )

        # Step 3: Word-Level timing
        update("timing", 70, "Word-Level Timing", 15)
        segments = result["segments"]
        detected_language = result.get("language", None)
        await asyncio.sleep(0.5)

        # Step 4: Generate ASS subtitles
        update("generating", 85, "Subtitle Generation", 10)
        gen = SubtitleGenerator()
        await asyncio.to_thread(
            gen.generate,
            segments,
            str(ass_path),
            romanize=True,
            language=detected_language
        )

        # Step 5: Burn subtitles into video
        update("generating", 95, "Burning Subtitles", 5)
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
        
        db.update_project(job_id, {
            "status": "completed",
            "duration": duration,
            "output_path": str(output_mp4),
            "subtitle_path": str(ass_path)
        })
        log.info(f"[{job_id[:8]}] ✅ Done → {output_mp4}")

    except Exception as e:
        log.error(f"[{job_id[:8]}] ❌ Error: {e}", exc_info=True)
        JOBS[job_id].update({"status": "error", "progress": 0, "step": "Error", "error": str(e)})
        
        db.update_project(job_id, {
            "status": "failed",
            "error_message": str(e)
        })
        
        # Refund token on failure
        user = db.get_user_by_id(user_id)
        if user:
            db.update_user(user_id, {"tokens": user.get("tokens", 5) + 1})

    finally:
        # Clean up temp audio and separated tracks
        if audio_path.exists():
            try:
                audio_path.unlink()
            except Exception as ce:
                log.warning(f"Could not delete temp audio path {audio_path}: {ce}")
        if vocals_path and os.path.exists(vocals_path):
            try:
                os.remove(vocals_path)
            except Exception as ce:
                log.warning(f"Could not delete vocals path {vocals_path}: {ce}")
        if instrumental_path and os.path.exists(instrumental_path):
            try:
                os.remove(instrumental_path)
            except Exception as ce:
                log.warning(f"Could not delete instrumental path {instrumental_path}: {ce}")
        # Clean up uploaded input
        if input_path.exists():
            try:
                input_path.unlink()
            except Exception as ce:
                log.warning(f"Could not delete input path {input_path}: {ce}")

# ─── Auth Routes ─────────────────────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    if not is_valid_email(req.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    hashed = get_password_hash(req.password)
    try:
        user = db.create_user(email=req.email, hashed_password=hashed, name=req.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = create_access_token(data={"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user["plan"],
            "tokens": user["tokens"],
            "project_count": user["project_count"]
        }
    }

@app.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = db.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = create_access_token(data={"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user["plan"],
            "tokens": user["tokens"],
            "project_count": user["project_count"]
        }
    }

# Endpoint for standard OAuth2 form logins (e.g. swagger UI)
@app.post("/auth/token", response_model=TokenResponse)
async def login_oauth2_form(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = create_access_token(data={"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user["plan"],
            "tokens": user["tokens"],
            "project_count": user["project_count"]
        }
    }

@app.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user["plan"],
        "tokens": user["tokens"],
        "project_count": user["project_count"]
    }

@app.post("/auth/subscribe")
async def subscribe(req: SubscriptionRequest, user_id: str = Depends(get_current_user_id)):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Award tokens based on plan tier
    tokens = 5
    if req.plan == "Pro":
        tokens = 100
    elif req.plan == "Enterprise":
        tokens = 1000
        
    updated = db.update_user(user_id, {"plan": req.plan, "tokens": tokens})
    return {
        "status": "success",
        "user": {
            "id": updated["id"],
            "email": updated["email"],
            "name": updated["name"],
            "plan": updated["plan"],
            "tokens": updated["tokens"],
            "project_count": updated["project_count"]
        }
    }

# ─── Project Routes ───────────────────────────────────────────────────────────
@app.get("/projects")
async def list_user_projects(user_id: str = Depends(get_current_user_id)):
    projects = db.get_projects_by_user(user_id)
    # Add helper URLs to response
    response_projects = []
    for p in projects:
        p_copy = p.copy()
        p_copy["outputUrl"] = f"/output/{p['id']}" if p.get("status") == "completed" else None
        p_copy["thumbnailUrl"] = f"/thumbnail/{p['id']}"
        response_projects.append(p_copy)
    return response_projects

from pydantic import BaseModel
class RenameProjectRequest(BaseModel):
    name: str

@app.put("/projects/{project_id}")
async def rename_project(project_id: str, request: RenameProjectRequest, user_id: str = Depends(get_current_user_id)):
    """Rename an existing project."""
    projects = db.get_projects_by_user(user_id)
    project = next((p for p in projects if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    with db.lock:
        data = db._load_data()
        data["projects"][project_id]["name"] = request.name
        db._save_data(data)
        
    return {"message": "Project renamed successfully", "name": request.name}

@app.delete("/projects/{project_id}")
async def delete_user_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    project = db.get_project_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check ownership
    if project.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
        
    # Delete database record
    success = db.delete_project(project_id, user_id)
    if not success:
         raise HTTPException(status_code=500, detail="Failed to delete project from database")
         
    # Clean up associated files
    input_path = UPLOAD_DIR / f"{project_id}.mp4"
    if input_path.exists():
        try: input_path.unlink()
        except: pass
        
    output_mp4 = OUTPUT_DIR / f"karaoke_{project_id}.mp4"
    if output_mp4.exists():
        try: output_mp4.unlink()
        except: pass
        
    ass_path = OUTPUT_DIR / f"{project_id}.ass"
    if ass_path.exists():
        try: ass_path.unlink()
        except: pass
        
    thumb_path = THUMBNAIL_DIR / f"{project_id}.jpg"
    if thumb_path.exists():
        try: thumb_path.unlink()
        except: pass

    # Clean up transcoded files
    for transcoded in OUTPUT_DIR.glob(f"karaoke_{project_id}_*"):
        try: transcoded.unlink()
        except: pass

    return {"status": "success", "message": "Project deleted successfully"}

@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    lyrics: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    # Verify user token balance
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("tokens", 0) <= 0:
        raise HTTPException(status_code=400, detail="Insufficient tokens. Please upgrade your subscription.")

    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files accepted.")

    job_id = str(uuid.uuid4())
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    input_path = UPLOAD_DIR / f"{job_id}{suffix}"

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size_kb = input_path.stat().st_size // 1024
    log.info(f"[{job_id[:8]}] Received: {file.filename} ({size_kb} KB)")

    # Probe duration and generate thumbnail
    duration = 0.0
    processor = VideoProcessor()
    
    try:
        probe = ffmpeg.probe(str(input_path))
        duration = float(probe.get('format', {}).get('duration', 0.0))
    except Exception as e:
        log.warning(f"Could not probe video duration: {e}")
        
    # Generate thumbnail immediately
    thumbnail_path = THUMBNAIL_DIR / f"{job_id}.jpg"
    try:
        await asyncio.to_thread(processor.generate_thumbnail, str(input_path), str(thumbnail_path))
    except Exception as e:
        log.warning(f"Could not generate initial thumbnail: {e}")

    # Register project in database
    db.create_project(
        user_id=user_id,
        name=file.filename or "video.mp4",
        language=language or "Auto",
        input_path=str(input_path),
        project_id=job_id
    )
    
    # Deduct 1 token from user
    db.update_user(user_id, {"tokens": max(0, user.get("tokens", 5) - 1)})

    # Initialize in-memory progress tracker
    JOBS[job_id] = {
        "status": "queued",
        "progress": 0,
        "step": "Queued",
        "estimatedSeconds": 60,
        "outputUrl": None,
        "error": None,
        "language": language,
        "lyrics": lyrics,
    }

    asyncio.create_task(process_video(job_id, input_path, user_id, duration))
    return {"jobId": job_id, "message": "Processing started."}

@app.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str):
    # Check in-memory first
    if job_id in JOBS:
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
        
    # Query database as backup
    project = db.get_project_by_id(job_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {job_id} not found.")
        
    status_str = project.get("status", "unknown")
    progress = 100 if status_str == "completed" else 0
    step = "Complete" if status_str == "completed" else status_str.capitalize()
    error_msg = project.get("error_message") if status_str == "failed" else None
    output_url = f"/output/{job_id}" if status_str == "completed" else None
    
    return JobStatusResponse(
        jobId=job_id,
        status=status_str,
        progress=progress,
        step=step,
        estimatedSeconds=0,
        outputUrl=output_url,
        error=error_msg
    )

# Lock map to serialize transcoding requests for the same target file
TRANSCODE_LOCKS: dict[str, asyncio.Lock] = {}

def get_transcode_lock(cache_key: str) -> asyncio.Lock:
    if cache_key not in TRANSCODE_LOCKS:
        TRANSCODE_LOCKS[cache_key] = asyncio.Lock()
    return TRANSCODE_LOCKS[cache_key]

@app.get("/output/{job_id}")
async def get_output(job_id: str, quality: Optional[str] = None, format: Optional[str] = None):
    base_path = OUTPUT_DIR / f"karaoke_{job_id}.mp4"
    if not base_path.exists():
        raise HTTPException(status_code=404, detail="Output not ready yet.")
        
    if not quality and not format:
        return FileResponse(str(base_path), media_type="video/mp4", filename=f"karaoke_{job_id}.mp4")

    # Normalize parameters
    quality = quality or "1080p"
    format_ext = (format or "MP4").lower()
    
    # Target filename and path
    transcoded_name = f"karaoke_{job_id}_{quality}.{format_ext}"
    transcoded_path = OUTPUT_DIR / transcoded_name
    temp_path = OUTPUT_DIR / f"karaoke_{job_id}_{quality}_tmp.{format_ext}"  # Use real ext so FFmpeg picks correct muxer
    
    lock = get_transcode_lock(transcoded_name)
    
    async with lock:
        if not transcoded_path.exists():
            try:
                log.info(f"[{job_id[:8]}] On-demand transcoding: quality={quality}, format={format_ext}")
                processor = VideoProcessor()
                
                await asyncio.to_thread(
                    processor.transcode, str(base_path), str(temp_path), quality, format_ext
                )
                
                if temp_path.exists():
                    if transcoded_path.exists():
                        transcoded_path.unlink()
                    temp_path.rename(transcoded_path)
                    
            except Exception as e:
                log.error(f"[{job_id[:8]}] Transcoding failed: {e}")
                if temp_path.exists():
                    try: temp_path.unlink()
                    except: pass
                # Fallback to default MP4
                return FileResponse(str(base_path), media_type="video/mp4", filename=f"karaoke_{job_id}.mp4")
                
    media_type = "video/mp4" if format_ext == "mp4" else "video/quicktime"
    return FileResponse(str(transcoded_path), media_type=media_type, filename=transcoded_name)

@app.get("/thumbnail/{project_id}")
async def get_thumbnail(project_id: str):
    thumb_path = THUMBNAIL_DIR / f"{project_id}.jpg"
    if not thumb_path.exists():
        # Let's see if we can generate it on-the-fly from the output MP4
        output_mp4 = OUTPUT_DIR / f"karaoke_{project_id}.mp4"
        if output_mp4.exists():
            try:
                processor = VideoProcessor()
                processor.generate_thumbnail(str(output_mp4), str(thumb_path))
                return FileResponse(str(thumb_path), media_type="image/jpeg")
            except:
                pass
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(thumb_path), media_type="image/jpeg")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

# ─── Entry Point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    log.info("🚀 KaraokeAI Server → http://0.0.0.0:8000")
    uvicorn.run("karaoke_generator.server:app", host="0.0.0.0", port=8000, reload=False)
