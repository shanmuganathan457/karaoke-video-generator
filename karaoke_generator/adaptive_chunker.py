import os
import wave
import tempfile
import logging
from typing import List, Dict, Any
from .chunk_merger import merge_overlapping_segments

from .config import CHUNK_LENGTH_SECONDS, CHUNK_OVERLAP_SECONDS

logger = logging.getLogger(__name__)

def transcribe_overlapping_chunks(
    model, 
    audio_path: str, 
    transcribe_kwargs: Dict[str, Any], 
    chunk_len: float = CHUNK_LENGTH_SECONDS, 
    overlap: float = CHUNK_OVERLAP_SECONDS
) -> List[Dict[str, Any]]:
    """Slices audio into overlapping wave files and transcribes them using the shared Whisper model."""
    logger.info(f"Executing Overlapping Chunk Inference (Window: {chunk_len}s, Overlap: {overlap}s)...")
    
    with wave.open(audio_path, 'rb') as wf:
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        params = wf.getparams()
        total_duration = n_frames / framerate
        
    chunks_bounds = []
    start = 0.0
    while start < total_duration:
        end = min(start + chunk_len, total_duration)
        chunks_bounds.append((start, end))
        if end >= total_duration:
            break
        start += (chunk_len - overlap)

    chunks_words = []
    
    for c_idx, (c_start, c_end) in enumerate(chunks_bounds):
        # Create a temp file inside the workspace /scratch or os temp dir
        temp_fd, temp_path = tempfile.mkstemp(suffix=".wav", dir="scratch")
        os.close(temp_fd)
        
        try:
            # Write chunk audio segment
            with wave.open(audio_path, 'rb') as infile:
                infile.setpos(int(c_start * framerate))
                frames_to_read = int((c_end - c_start) * framerate)
                frames = infile.readframes(frames_to_read)
                with wave.open(temp_path, 'wb') as outfile:
                    outfile.setparams(params)
                    outfile.writeframes(frames)
            
            # Transcribe the chunk
            segments, _ = model.transcribe(temp_path, **transcribe_kwargs)
            
            chunk_word_list = []
            for segment in segments:
                if segment.words:
                    for word in segment.words:
                        chunk_word_list.append({
                            "start": c_start + word.start,
                            "end": c_start + word.end,
                            "word": word.word,
                            "probability": word.probability,
                            "avg_logprob": segment.avg_logprob,
                            "compression_ratio": segment.compression_ratio
                        })
            chunks_words.append(chunk_word_list)
            
        except Exception as e:
            logger.error(f"Error transcribing overlap chunk {c_idx}: {e}")
            chunks_words.append([])
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as ex:
                    logger.warning(f"Could not remove temp chunk file {temp_path}: {ex}")

    # Stitch the segments back together
    return merge_overlapping_segments(chunks_words, chunks_bounds, overlap)

