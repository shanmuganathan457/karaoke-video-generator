import sys
import os
import shutil
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faster_whisper import WhisperModel
from faster_whisper.vad import get_speech_timestamps, VadOptions
import logging
from karaoke_generator.video_processor import VideoProcessor
from karaoke_generator.vocal_separator import VocalSeparator
from karaoke_generator.transcriber import AudioTranscriber

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugPipeline")

def main():
    video_path = "inputs/Pakkam_Vanthu.mp4"
    temp_audio = "scratch/temp_audio.wav"
    vocals_audio = "scratch/vocals.wav"
    instrumental_audio = "scratch/instrumental.wav"
    
    os.makedirs("scratch", exist_ok=True)
    
    # 1. Extract Audio
    logger.info("Step 1: Extracting audio...")
    if not os.path.exists(temp_audio):
        processor = VideoProcessor()
        processor.extract_audio(video_path, temp_audio)
    
    # 2. Demucs Separation
    logger.info("Step 2: Separating vocals...")
    if not os.path.exists(vocals_audio):
        # We manually separate
        from demucs import separate
        old_argv = sys.argv
        try:
            sys.argv = ["demucs", "--two-stems=vocals", "-n", "htdemucs_ft", "-o", "scratch/temp_demucs_out", temp_audio, "-d", "cpu"]
            separate.main()
        finally:
            sys.argv = old_argv
            
        # Copy to output
        model_out_dir = os.path.join("scratch/temp_demucs_out", "htdemucs_ft", "temp_audio")
        shutil.copy2(os.path.join(model_out_dir, "vocals.wav"), vocals_audio)
        shutil.copy2(os.path.join(model_out_dir, "no_vocals.wav"), instrumental_audio)
        shutil.rmtree("scratch/temp_demucs_out")
        
        # Preprocess
        VocalSeparator.preprocess_vocals(vocals_audio)

    # 3. Debug VAD and Whisper
    logger.info("Step 3: Running Faster-Whisper and inspecting VAD...")
    model = WhisperModel("large-v3", device="cpu", compute_type="float32", cpu_threads=4)
    
    # We want to inspect the VAD segments.
    # We get them by calling get_speech_timestamps
    from faster_whisper.vad import get_speech_timestamps
    # Read audio using standard wave module to avoid external dependencies
    import wave
    import numpy as np
    with wave.open(vocals_audio, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)
        # Convert to float32 normalized ndarray
        if sampwidth == 2:
            audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            audio = np.frombuffer(data, dtype=np.float32)
        # If stereo, take the mean to convert to mono
        if n_channels > 1:
            audio = audio.reshape(-1, n_channels).mean(axis=1)
    
    # Run VAD
    vad_options = VadOptions(
        threshold=0.5,
        min_speech_duration_ms=250,
        min_silence_duration_ms=500
    )
    speech_timestamps = get_speech_timestamps(audio, vad_options)
    
    print("\n" + "="*50)
    print("1. SILERO VAD OUTPUT (All segments):")
    print("="*50)
    for i, ts in enumerate(speech_timestamps):
        start = ts['start'] / 16000.0
        end = ts['end'] / 16000.0
        print(f"Segment {i}: {start:.3f}s - {end:.3f}s")
        
    print("\n" + "="*50)
    print("2. RAW FASTER-WHISPER OUTPUT (With VAD enabled):")
    print("="*50)
    
    # Transcribe parameters
    transcribe_kwargs = {
        "beam_size": 5,
        "best_of": 5,
        "patience": 1.0,
        "word_timestamps": True,
        "condition_on_previous_text": False,
        "temperature": [0.0, 0.2, 0.4, 0.6, 0.8],
        "compression_ratio_threshold": 2.4,
        "hallucination_silence_threshold": 1.0,
        "vad_filter": True,
        "vad_parameters": {
            "min_silence_duration_ms": 500,
        },
        "language": "ta"
    }
    # Setup sys.stdout encoding for Windows consoles
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    segments, info = model.transcribe(vocals_audio, **transcribe_kwargs)
    
    # We will write the output to a text file to completely bypass Windows terminal encoding bugs
    output_log_path = "scratch/debug_output.txt"
    with open(output_log_path, "w", encoding="utf-8") as f:
        f.write("="*50 + "\n")
        f.write("1. SILERO VAD OUTPUT (All segments):\n")
        f.write("="*50 + "\n")
        for idx, ts in enumerate(speech_timestamps):
            start = ts['start'] / 16000.0
            end = ts['end'] / 16000.0
            f.write(f"Segment {idx}: {start:.3f}s - {end:.3f}s\n")
            
        f.write("\n" + "="*50 + "\n")
        f.write("2. RAW FASTER-WHISPER OUTPUT:\n")
        f.write("="*50 + "\n")
        
        for i, segment in enumerate(segments):
            f.write(f"\n[Segment {i}]: {segment.start:.3f}s - {segment.end:.3f}s -> Text: '{segment.text}'\n")
            f.write(f"  Segment Metrics:\n")
            f.write(f"    - avg_logprob: {segment.avg_logprob:.4f}\n")
            f.write(f"    - no_speech_prob: {segment.no_speech_prob:.4f}\n")
            f.write(f"    - compression_ratio: {segment.compression_ratio:.4f}\n")
            
            f.write("  Word timestamps:\n")
            if segment.words:
                for w in segment.words:
                    f.write(f"    - '{w.word}': {w.start:.3f}s - {w.end:.3f}s (prob: {w.probability:.2f})\n")
            else:
                f.write("    No word timestamps found!\n")
                
    logger.info(f"Done! All debug outputs written successfully to: {output_log_path}")

if __name__ == "__main__":
    main()
