import os
from typing import List, Dict, Any, Optional
from faster_whisper import WhisperModel
import logging
from .config import WHISPER_MODEL, DEVICE, COMPUTE_TYPE

logger = logging.getLogger(__name__)

class AudioTranscriber:
    """Handles audio transcription using Faster-Whisper with word-level timestamps."""

    def __init__(self, model_size: str = WHISPER_MODEL, device: str = DEVICE, compute_type: str = COMPUTE_TYPE):
        logger.info(f"Initializing Whisper model: {model_size} on {device} (compute: {compute_type})")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        logger.info("Model loaded successfully.")

    def transcribe(self, audio_path: str, language: Optional[str] = None, vad_filter: bool = False, initial_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribes the audio and returns segments with word-level timestamps.
        
        Args:
            audio_path: Path to the audio file.
            language: Optional language code (e.g., 'ta', 'en', 'hi'). 
                      If None, language is auto-detected.
            vad_filter: Whether to apply Voice Activity Detection.
            initial_prompt: Optional prompt text to guide Whisper's spelling and vocabulary.
            
        Returns:
            A dictionary containing segments, words, and detected language info.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info(f"Starting transcription for: {audio_path}")
        if language:
            logger.info(f"Using specified language: {language}")
        else:
            logger.info("Language will be auto-detected")

        # Configure transcription parameters for best accuracy
        transcribe_kwargs = {
            "beam_size": 10,
            "best_of": 5,
            "patience": 2.0,                     # Search deeper/longer for higher decoding quality
            "word_timestamps": True,
            "hallucination_silence_threshold": 2.0,  # Prevent Whisper from hallucinating text during instrumental sections
            "vad_filter": vad_filter,          # Voice Activity Detection to skip silence
            "vad_parameters": {
                "min_silence_duration_ms": 500,
            },
        }
        
        # If language is explicitly specified, use it for better accuracy
        if language:
            transcribe_kwargs["language"] = language

        if initial_prompt:
            transcribe_kwargs["initial_prompt"] = initial_prompt

        segments, info = self.model.transcribe(audio_path, **transcribe_kwargs)

        logger.info(f"Detected language: {info.language} with probability {info.language_probability:.2f}")

        processed_segments = []
        for segment in segments:
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
                "words": []
            }
            
            if segment.words:
                for word in segment.words:
                    segment_data["words"].append({
                        "start": word.start,
                        "end": word.end,
                        "word": word.word
                    })
            
            processed_segments.append(segment_data)
            logger.debug(f"Segment [{segment.start:.2f}s - {segment.end:.2f}s]: {segment.text}")

        return {
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": processed_segments
        }
