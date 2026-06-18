import sys
import os
import argparse
import logging
import difflib
from anyascii import anyascii
try:
    from tamil_translite import translite as tamil_transliterate
except ImportError:
    tamil_transliterate = None

from .transcriber import AudioTranscriber
from .subtitle_generator import SubtitleGenerator
from .video_processor import VideoProcessor
from .config import DEFAULT_OUTPUT_VIDEO, DEFAULT_SUBTITLE_FILE

logger = logging.getLogger("KaraokeGenerator")

# Enable console printing of unicode characters in Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def calculate_similarity_report(ground_truth_path, result, romanize):
    if not ground_truth_path:
        return

    if not os.path.exists(ground_truth_path):
        logger.warning(f"Ground truth lyrics file not found: {ground_truth_path}")
        return

    try:
        with open(ground_truth_path, 'r', encoding='utf-8') as f:
            gt_text = f.read().strip()
    except Exception as e:
        logger.error(f"Error reading ground truth lyrics: {e}")
        return

    # Clean text helper
    def clean_text(text):
        punctuation = [",", ".", "?", "!", "-", ";"]
        text = text.lower()
        for char in punctuation:
            text = text.replace(char, "")
        return " ".join(text.split())

    # Reconstruct Native Model Text
    model_native = " ".join(seg["text"] for seg in result["segments"])

    # Reconstruct Romanized Model Text
    romanized_words = []
    for segment in result["segments"]:
        for word_data in segment.get("words", []):
            word = word_data["word"]
            leading_spaces = len(word) - len(word.lstrip())
            trailing_spaces = len(word) - len(word.rstrip())
            stripped_word = word.strip()
            if romanize:
                if tamil_transliterate and any('\u0b80' <= char <= '\u0bff' for char in stripped_word):
                    word = (" " * leading_spaces) + tamil_transliterate(stripped_word) + (" " * trailing_spaces)
                else:
                    word = anyascii(word)
            romanized_words.append(word)
    model_romanized = "".join(romanized_words)

    # Cleaned versions
    gt_clean = clean_text(gt_text)
    native_clean = clean_text(model_native)
    romanized_clean = clean_text(model_romanized)

    # If GT contains non-ASCII characters, we compare against native script.
    # Otherwise, we compare against Romanized script.
    is_gt_native = any(ord(c) > 127 for c in gt_clean)
    
    if is_gt_native:
        model_compare = native_clean
        label = "NATIVE SCRIPT ACCURACY"
    else:
        model_compare = romanized_clean
        label = "ROMANIZED SCRIPT ACCURACY"

    gt_words = gt_clean.split()
    mo_words = model_compare.split()

    matcher = difflib.SequenceMatcher(None, gt_words, mo_words)
    ratio = matcher.ratio()

    # Calculate WER
    opcodes = matcher.get_opcodes()
    substitutions = 0
    insertions = 0
    deletions = 0
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'replace':
            substitutions += max(i2 - i1, j2 - j1)
        elif tag == 'insert':
            insertions += (j2 - j1)
        elif tag == 'delete':
            deletions += (i2 - i1)
            
    total_edits = substitutions + insertions + deletions
    wer = total_edits / len(gt_words) if gt_words else 0
    word_accuracy = max(0.0, 1.0 - wer)

    print("\n" + "=" * 60)
    print(f"            LYRICS ACCURACY METRICS REPORT ({label})")
    print("=" * 60)
    try:
        print(f"Ground Truth: {gt_clean}")
        print(f"Model Output: {model_compare}")
    except Exception:
        print("[Text omitted due to console encoding limits]")
    print("-" * 60)
    print(f"Sequence Similarity Ratio : {ratio * 100:.2f}%")
    print(f"Word Error Rate (WER)     : {wer * 100:.2f}%")
    print(f"Overall Word Accuracy     : {word_accuracy * 100:.2f}%")
    print("=" * 60 + "\n")

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
    parser.add_argument("--lyrics", default=None, help="Optional path to ground truth lyrics txt file to calculate metrics")
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

        # Print similarity/accuracy metrics report if ground truth lyrics are provided
        if args.lyrics:
            calculate_similarity_report(args.lyrics, result, args.romanize)

    except Exception as e:
        logger.exception("A fatal error occurred during processing")
        sys.exit(1)
    finally:
        # Cleanup temporary audio file
        if os.path.exists(temp_audio):
            os.remove(temp_audio)

if __name__ == "__main__":
    main()
