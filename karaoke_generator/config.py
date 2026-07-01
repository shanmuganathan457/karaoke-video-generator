import logging

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("KaraokeGenerator")

# Transcription Settings
# large-v3 provides the highest accuracy across 99 languages
WHISPER_MODEL = "large-v3"  # Options: tiny, base, small, medium, large-v3
DEVICE = "cpu"              # Use "cuda" if GPU is available
COMPUTE_TYPE = "int8"       # Use "int8" to reduce memory usage by 75% on CPU and speed up execution

# Vocal Separation Settings
DEMUCS_MODEL = "htdemucs_ft" # Fine-tuned model: preserves vocals better, less over-separation
DEMUCS_DEVICE = "cpu"       # Use "cuda" if GPU is available

# Subtitle Styling (ASS Format)
# Karaoke style: white text turns yellow as words are sung
FONT_NAME = "Arial"
FONT_SIZE = 14
PRIMARY_COLOR = "&H00FFFFFF"   # White (ABGR) - unhighlighted text
SECONDARY_COLOR = "&H0000FFFF" # Yellow (ABGR) - karaoke highlight color
OUTLINE_COLOR = "&H00000000"   # Black outline
BACK_COLOR = "&H80000000"      # Semi-transparent black background

# Output Defaults
DEFAULT_OUTPUT_VIDEO = "outputs/output.mp4"
DEFAULT_SUBTITLE_FILE = "outputs/karaoke.ass"

# Adaptive ASR Settings
CHUNK_LENGTH_SECONDS = 20.0
CHUNK_OVERLAP_SECONDS = 5.0
BEAM_SIZE_NORMAL = 5
BEAM_SIZE_FALLBACK = 8
AVG_LOGPROB_THRESHOLD = -0.8
COMPRESSION_RATIO_THRESHOLD = 2.4

