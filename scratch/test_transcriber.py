import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from karaoke_generator.transcriber import AudioTranscriber

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
        
    vocals_audio = "scratch/vocals.wav"
    transcriber = AudioTranscriber()
    
    print("\n--- Running AudioTranscriber on cached vocals ---")
    result = transcriber.transcribe(
        vocals_audio,
        language="ta",
        vad_filter=True
    )
    
    print(f"\nResult Language: {result['language']} (Prob: {result['language_probability']})")
    print(f"Total Segments Output: {len(result['segments'])}")
    
    for i, seg in enumerate(result['segments'][:5]):
        print(f"\n[Segment {i}]: {seg['start']:.2f}s - {seg['end']:.2f}s -> Text: '{seg['text']}'")
        print(f"  Words: {len(seg['words'])}")

if __name__ == "__main__":
    main()
