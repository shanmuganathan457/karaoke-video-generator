import os
import wave
import tempfile
import logging
from typing import Dict, Any

from .config import BEAM_SIZE_FALLBACK

logger = logging.getLogger(__name__)

def recover_problematic_segment(
    model,
    audio_path: str,
    seg: Dict[str, Any],
    idx: int,
    transcribe_kwargs: Dict[str, Any],
    force_language: bool = False
) -> Dict[str, Any]:
    """Attempts to recover a low-confidence segment by running localized, high-beam transcription."""
    c_start, c_end = seg["start"], seg["end"]
    
    # Slice the specific segment audio
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav", dir="scratch")
    os.close(temp_fd)
    
    try:
        with wave.open(audio_path, 'rb') as infile:
            framerate = infile.getframerate()
            infile.setpos(int(c_start * framerate))
            frames_to_read = int((c_end - c_start) * framerate)
            frames = infile.readframes(frames_to_read)
            
            with wave.open(temp_path, 'wb') as outfile:
                outfile.setparams(infile.getparams())
                outfile.writeframes(frames)
                
        # Enhanced parameter configurations
        fallback_kwargs = transcribe_kwargs.copy()
        fallback_kwargs.update({
            "beam_size": BEAM_SIZE_FALLBACK,
            "temperature": 0.0,
            "vad_filter": False  # Disable VAD locally on this short slice
        })
        
        # If user did not force a global language, pop it to let Whisper auto-detect this segment
        if not force_language:
            fallback_kwargs.pop("language", None)
            
        f_segments, _ = model.transcribe(temp_path, **fallback_kwargs)
        f_segments = list(f_segments)
        
        if f_segments and f_segments[0].words:
            recovered_words = []
            for word in f_segments[0].words:
                recovered_words.append({
                    "start": c_start + word.start,
                    "end": c_start + word.end,
                    "word": word.word,
                    "probability": word.probability
                })
            
            seg["words"] = recovered_words
            seg["text"] = f_segments[0].text
            logger.info(f"Segment [{c_start:.2f}s - {c_end:.2f}s] successfully recovered: '{seg['text']}'")
            
    except Exception as ex:
        logger.warning(f"Recovery failed for segment at {c_start:.2f}s - {c_end:.2f}s: {ex}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as ex:
                logger.warning(f"Could not remove temp recovery file {temp_path}: {ex}")
                
    return seg
