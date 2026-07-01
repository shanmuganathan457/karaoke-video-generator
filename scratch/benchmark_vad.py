import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import wave
import numpy as np
from faster_whisper.vad import get_speech_timestamps, VadOptions

def main():
    vocals_audio = "scratch/vocals.wav"
    output_log_path = "scratch/benchmark_results.txt"
    
    # 1. Load Audio
    with wave.open(vocals_audio, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)
        if sampwidth == 2:
            audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            audio = np.frombuffer(data, dtype=np.float32)
        if n_channels > 1:
            audio = audio.reshape(-1, n_channels).mean(axis=1)

    tests = [
        {"thresh": 0.75, "silence": 150},
        {"thresh": 0.80, "silence": 150},
        {"thresh": 0.85, "silence": 150}
    ]
    results = {}

    for t in tests:
        thresh = t["thresh"]
        silence = t["silence"]
        # Run Silero VAD
        vad_options = VadOptions(
            threshold=thresh,
            min_speech_duration_ms=250,
            min_silence_duration_ms=silence
        )
        speech_timestamps = get_speech_timestamps(audio, vad_options)
        
        vad_segments = []
        longest_duration = 0.0
        for ts in speech_timestamps:
            start = ts['start'] / 16000.0
            end = ts['end'] / 16000.0
            dur = end - start
            vad_segments.append((start, end))
            if dur > longest_duration:
                longest_duration = dur
                
        key = f"t{thresh}_s{silence}"
        results[key] = {
            "vad_count": len(vad_segments),
            "longest_vad": longest_duration,
            "vad_segments": vad_segments,
            "thresh": thresh,
            "silence": silence
        }

    # Write Report
    with open(output_log_path, "w", encoding="utf-8") as f:
        f.write("="*60 + "\n")
        f.write("VAD AGGRESSIVE BENCHMARK REPORT\n")
        f.write("="*60 + "\n")
        
        for key in results:
            res = results[key]
            f.write(f"\nCONFIGURATION: threshold = {res['thresh']}, silence = {res['silence']}ms\n")
            f.write(f"--------------------------------------------------\n")
            f.write(f"- VAD speech segments detected: {res['vad_count']}\n")
            f.write(f"- Longest VAD segment duration: {res['longest_vad']:.3f}s\n\n")
            
            f.write("VAD Timestamps:\n")
            for idx, (start, end) in enumerate(res['vad_segments']):
                f.write(f"  [{idx}]: {start:.2f}s - {end:.2f}s\n")
            f.write("\n" + "="*60 + "\n")
            
    print("SUCCESS: VAD aggressive benchmark completed instantly.")

if __name__ == "__main__":
    main()
