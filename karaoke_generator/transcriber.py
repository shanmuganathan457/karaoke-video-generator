import os
import logging
from typing import Dict, Any, Optional
from faster_whisper import WhisperModel
from .config import (
    WHISPER_MODEL, DEVICE, COMPUTE_TYPE,
    BEAM_SIZE_NORMAL, BEAM_SIZE_FALLBACK,
    AVG_LOGPROB_THRESHOLD, COMPRESSION_RATIO_THRESHOLD
)
from .speech_rate import estimate_speech_rate
from .adaptive_chunker import transcribe_overlapping_chunks
from .segment_recovery import recover_problematic_segment

logger = logging.getLogger(__name__)

class AudioTranscriber:
    """Orchestrates adaptive audio transcription using modular processing strategies."""

    def __init__(self, model_size: str = WHISPER_MODEL, device: str = DEVICE, compute_type: str = COMPUTE_TYPE):
        logger.info(f"Initializing Whisper model: {model_size} on {device} (compute: {compute_type})")
        # Restrict CPU threads to 4 to prevent OpenMP deadlocks on Windows CPU
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type, cpu_threads=4)
        logger.info("Model loaded successfully.")

    def transcribe(self, audio_path: str, language: Optional[str] = None, vad_filter: bool = False, initial_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribes audio with word timestamps, dynamically adapting decoding strategy to voice characteristics.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # 1. Automatic Speech-Rate Detection
        rate_mode = estimate_speech_rate(audio_path)
        logger.info(f"Speech Rate Classified: {rate_mode}. Routing execution strategy...")

        # Global decoding parameters
        transcribe_kwargs = {
            "beam_size": BEAM_SIZE_NORMAL,
            "best_of": BEAM_SIZE_NORMAL,
            "patience": 1.0,
            "word_timestamps": True,
            "condition_on_previous_text": False,
            "temperature": [0.0, 0.2, 0.4, 0.6, 0.8],
            "compression_ratio_threshold": COMPRESSION_RATIO_THRESHOLD,
            "hallucination_silence_threshold": 1.0,
            "vad_filter": vad_filter,
            "vad_parameters": {
                "threshold": 0.80,
                "min_silence_duration_ms": 150,
                "min_speech_duration_ms": 250,
            },
        }

        # If language is explicitly specified by user, use it
        if language:
            transcribe_kwargs["language"] = language
            logger.info(f"Explicitly forcing language: {language}")

        if initial_prompt:
            transcribe_kwargs["initial_prompt"] = initial_prompt

        # 2. Run Strategy Routing
        if rate_mode in ("FAST", "RAP"):
            # Lightweight language detection if not forced
            if not language:
                logger.info("Running lightweight initial language detection pass...")
                _, info = self.model.transcribe(audio_path, beam_size=1, word_timestamps=False)
                detected_lang = info.language
                lang_prob = info.language_probability
                logger.info(f"Auto-detected language: {detected_lang} (probability: {lang_prob:.2f})")
                transcribe_kwargs["language"] = detected_lang
            else:
                detected_lang = language
                lang_prob = 1.0
                
            # Overlapping chunk strategy
            processed_segments = transcribe_overlapping_chunks(
                self.model, 
                audio_path, 
                transcribe_kwargs
            )
        else:
            # Normal singing path (Run model only ONCE)
            segments, info = self.model.transcribe(audio_path, **transcribe_kwargs)
            detected_lang = info.language
            lang_prob = info.language_probability
            
            processed_segments = []
            for segment in segments:
                segment_data = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "avg_logprob": segment.avg_logprob,
                    "compression_ratio": segment.compression_ratio,
                    "words": []
                }
                if segment.words:
                    for word in segment.words:
                        segment_data["words"].append({
                            "start": word.start,
                            "end": word.end,
                            "word": word.word,
                            "probability": word.probability,
                            "avg_logprob": segment.avg_logprob,
                            "compression_ratio": segment.compression_ratio
                        })
                processed_segments.append(segment_data)

        # 3. Local Segment Fallback & Recovery
        for idx, seg in enumerate(processed_segments):
            avg_logprob = seg.get("avg_logprob", 0.0)
            comp_ratio = seg.get("compression_ratio", 0.0)
            
            is_unconfident = (avg_logprob < AVG_LOGPROB_THRESHOLD)
            is_repetitive = (comp_ratio > COMPRESSION_RATIO_THRESHOLD)
            is_empty = (len(seg.get("words", [])) == 0)
            
            # Reprocess problematic segments only
            if is_unconfident or is_repetitive or is_empty:
                logger.info(f"Segment validation failed at {seg['start']:.2f}s. Activating fallback recovery...")
                processed_segments[idx] = recover_problematic_segment(
                    self.model,
                    audio_path,
                    seg,
                    idx,
                    transcribe_kwargs,
                    force_language=bool(language)
                )

        return {
            "language": detected_lang,
            "language_probability": lang_prob,
            "segments": processed_segments
        }
