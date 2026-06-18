import sys
import os
import argparse
import logging
from .transcriber import AudioTranscriber
from .subtitle_generator import SubtitleGenerator
from .video_processor import VideoProcessor
from .config import DEFAULT_OUTPUT_VIDEO, DEFAULT_SUBTITLE_FILE

logger = logging.getLogger("KaraokeGenerator")

def main():
    parser = argparse.ArgumentParser(
        description="Karaoke Video Generator - Convert any video into karaoke-style with synchronized subtitles",
        epilog="Example: python -m karaoke_generator.main input.mp4 output_karaoke.mp4 --language ta"
    )
    parser.add_argument("input", help="Path to input video file")
    parser.add_argument("output", nargs="?", default=DEFAULT_OUTPUT_VIDEO, help="Path to output video file (default: output.mp4)")
    parser.add_argument("--ass", default=DEFAULT_SUBTITLE_FILE, help="Path to save generated ASS subtitle file (default: karaoke.ass)")
    parser.add_argument("--language", "-l", default=None, help="Language code (e.g., 'ta' for Tamil, 'en' for English, 'hi' for Hindi). Auto-detected if not specified.")
    parser.add_argument("--no-romanize", dest="romanize", action="store_false", help="Disable transliteration/romanization of non-Latin characters (default: Romanization is enabled)")
    parser.add_argument("--vad", action="store_true", default=False, help="Enable Voice Activity Detection filter (default: False to maximize song recall)")
    parser.set_defaults(romanize=True)
    
    args = parser.parse_args()

    if not os.path.exists(args.input):
        logger.error(f"Input file not found: {args.input}")
        sys.exit(1)

    # Temporary audio file path
    temp_audio = "temp_audio.wav"
    
    try:
        processor = VideoProcessor()
        transcriber = AudioTranscriber()
        sub_gen = SubtitleGenerator()

        # Step 1: Extract Audio
        logger.info("=" * 50)
        logger.info("STEP 1/4: Extracting audio from video...")
        processor.extract_audio(args.input, temp_audio)

        # Step 2: Transcribe with word-level timestamps
        logger.info("=" * 50)
        logger.info("STEP 2/4: Transcribing audio (this may take a while)...")
        result = transcriber.transcribe(temp_audio, language=args.language, vad_filter=args.vad)
        
        # Log transcription summary
        total_words = sum(len(seg["words"]) for seg in result["segments"])
        logger.info(f"Transcription complete: {len(result['segments'])} segments, {total_words} words detected")
        logger.info(f"Language: {result['language']}")

        # Step 3: Generate Karaoke Subtitles
        logger.info("=" * 50)
        logger.info("STEP 3/4: Generating karaoke-style ASS subtitles...")
        sub_gen.generate(result["segments"], args.ass, romanize=args.romanize, language=result["language"])

        # Step 4: Burn Subtitles into Video
        logger.info("=" * 50)
        logger.info("STEP 4/4: Burning subtitles into video...")
        processor.burn_subtitles(args.input, args.ass, args.output)

        logger.info("=" * 50)
        logger.info("--- Processing Complete ---")
        logger.info(f"Karaoke Video: {os.path.abspath(args.output)}")
        logger.info(f"Subtitle File: {os.path.abspath(args.ass)}")

    except Exception as e:
        logger.exception("A fatal error occurred during processing")
        sys.exit(1)
    finally:
        # Cleanup temporary audio file
        if os.path.exists(temp_audio):
            os.remove(temp_audio)

if __name__ == "__main__":
    main()
