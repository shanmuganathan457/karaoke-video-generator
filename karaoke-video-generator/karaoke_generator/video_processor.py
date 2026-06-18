import ffmpeg
import os
import logging
import subprocess

logger = logging.getLogger(__name__)

class VideoProcessor:
    """Handles FFmpeg operations for audio extraction and subtitle burning."""

    def extract_audio(self, video_path: str, audio_output_path: str):
        """Extracts audio from video file."""
        logger.info(f"Extracting audio from {video_path} to {audio_output_path}")
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_output_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error during extraction: {e.stderr.decode()}")
            raise

    def burn_subtitles(self, video_path: str, subtitle_path: str, output_path: str):
        """Burns ASS subtitles into the video."""
        logger.info(f"Burning subtitles from {subtitle_path} into {video_path}")
        
        # Note: ASS burning usually requires the 'subtitles' filter
        # The syntax for FFmpeg CLI is: -vf "subtitles=filename.ass"
        # Since path handling in FFmpeg filters can be tricky (escaping : on Windows/Linux),
        # we'll use a direct subprocess call for more control over filter string escaping if needed.
        
        abs_subtitle_path = subtitle_path
        if os.name == 'nt':
            if os.path.isabs(abs_subtitle_path):
                try:
                    abs_subtitle_path = os.path.relpath(abs_subtitle_path)
                except ValueError:
                    pass
            abs_subtitle_path = abs_subtitle_path.replace("\\", "/")
            if ":" in abs_subtitle_path:
                abs_subtitle_path = abs_subtitle_path.replace(":", "\\:")
        
        try:
            input_video = ffmpeg.input(video_path)
            video_stream = input_video.filter('subtitles', abs_subtitle_path)
            audio_stream = input_video.audio
            (
                ffmpeg
                .output(video_stream, audio_stream, output_path, vcodec='libx264', acodec='copy')
                .overwrite_output()
                .run(quiet=True)
            )
            logger.info(f"Output video created: {output_path}")
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error during burn: {e.stderr.decode()}")
            raise
