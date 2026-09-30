import gradio as gr
import os
import sys
import shutil

# Add the parent directory to the path so we can import karaoke_generator
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from karaoke_generator.transcriber import AudioTranscriber
from karaoke_generator.subtitle_generator import SubtitleGenerator
from karaoke_generator.video_processor import VideoProcessor
from karaoke_generator.vocal_separator import VocalSeparator

def generate_karaoke(video_file, language="en", romanize=True):
    if not video_file:
        return None
    
    # Setup paths
    input_path = video_file
    temp_audio = "temp_audio.wav"
    output_ass = "karaoke.ass"
    output_video = "karaoke_output.mp4"
    
    try:
        processor = VideoProcessor()
        transcriber = AudioTranscriber()
        sub_gen = SubtitleGenerator()

        print("STEP 1: Extracting audio from video...")
        processor.extract_audio(input_path, temp_audio)

        print("Isolating vocal track for transcription...")
        vocals_audio, instrumental_audio = VocalSeparator.separate(temp_audio)

        print("STEP 2: Transcribing isolated vocals (this may take a while)...")
        result = transcriber.transcribe(vocals_audio, language=language if language else None, vad_filter=False)

        print("STEP 3: Generating karaoke-style ASS subtitles...")
        sub_gen.generate(result["segments"], output_ass, romanize=romanize, language=result["language"])

        print("STEP 4: Burning subtitles into video...")
        processor.burn_subtitles(input_path, output_ass, output_video)

        print("--- Processing Complete ---")
        return output_video
    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        for f in [temp_audio, vocals_audio, instrumental_audio]:
            if f and os.path.exists(f):
                os.remove(f)

# Create Gradio Interface
iface = gr.Interface(
    fn=generate_karaoke,
    inputs=[
        gr.Video(label="Upload Video File"),
        gr.Textbox(label="Language Code (Optional, e.g. en, ta)", value=""),
        gr.Checkbox(label="Romanize Lyrics", value=True)
    ],
    outputs=gr.Video(label="Karaoke Output Video"),
    title="KaraokeAI Engine API",
    description="Backend API for KaraokeAI Mobile. This space handles the heavy AI processing (Faster-Whisper + Demucs).",
    allow_flagging="never"
)

if __name__ == "__main__":
    iface.launch()
