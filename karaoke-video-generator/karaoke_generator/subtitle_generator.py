import pysubs2
from typing import List, Dict, Any, Optional
import logging
from anyascii import anyascii
try:
    from tamil_translite import translite as tamil_transliterate
except ImportError:
    tamil_transliterate = None

from .config import (
    FONT_NAME, FONT_SIZE, PRIMARY_COLOR, 
    SECONDARY_COLOR, OUTLINE_COLOR, BACK_COLOR
)

logger = logging.getLogger(__name__)

class SubtitleGenerator:
    """Generates ASS karaoke subtitles from transcription data."""

    def __init__(self):
        self.subs = pysubs2.SSAFile()
        self._setup_style()

    def _setup_style(self):
        """Sets up the Default ASS style for karaoke display."""
        style = pysubs2.SSAStyle()
        style.fontname = FONT_NAME
        style.fontsize = FONT_SIZE
        style.primarycolor = pysubs2.Color(*self._hex_to_rgb(PRIMARY_COLOR))
        style.secondarycolor = pysubs2.Color(*self._hex_to_rgb(SECONDARY_COLOR))
        style.outlinecolor = pysubs2.Color(*self._hex_to_rgb(OUTLINE_COLOR))
        style.backcolor = pysubs2.Color(*self._hex_to_rgb(BACK_COLOR))
        style.alignment = 2  # Bottom-Center
        style.outline = 2    # Clear outline for readability
        style.shadow = 1     # Subtle shadow for depth
        style.bold = -1      # Use default font weight
        style.marginl = 20   # Left margin
        style.marginr = 20   # Right margin
        style.marginv = 30   # Bottom margin
        
        self.subs.styles["Default"] = style

    def _hex_to_rgb(self, hex_color: str):
        """Helper to convert &H ABGR format to RGB tuple."""
        # ASS format is &HAABBGGRR
        clean_hex = hex_color.replace("&H", "")
        if len(clean_hex) == 8:
            # Full AABBGGRR format
            r = int(clean_hex[6:8], 16)
            g = int(clean_hex[4:6], 16)
            b = int(clean_hex[2:4], 16)
            return r, g, b
        elif len(clean_hex) == 6:
            # BBGGRR format (no alpha)
            r = int(clean_hex[4:6], 16)
            g = int(clean_hex[2:4], 16)
            b = int(clean_hex[0:2], 16)
            return r, g, b
        return 255, 255, 255

    def generate(self, segments: List[Dict[str, Any]], output_path: str, romanize: bool = False, language: Optional[str] = None):
        """
        Processes segments into ASS karaoke events with \\k timing tags.
        
        The \\k tag in ASS format creates a karaoke effect where the text
        color changes from primarycolor to secondarycolor word-by-word,
        synchronized with the audio timing.
        
        Args:
            segments: List of segments with word timestamps from transcriber.
            output_path: Where to save the .ass file.
            romanize: If True, non-Latin/Indic characters are romanized to English characters.
            language: Optional source language code.
        """
        logger.info(f"Generating ASS karaoke subtitles: {output_path} (romanize={romanize}, language={language})")
        
        for segment in segments:
            # Skip segments with no words
            if not segment.get("words"):
                continue
                
            event = pysubs2.SSAEvent(
                start=int(segment["start"] * 1000),  # Convert seconds to ms
                end=int(segment["end"] * 1000)        # Convert seconds to ms
            )
            
            # Construct karaoke string using \k tags (centisecond durations)
            karaoke_text = ""
            
            for word_data in segment["words"]:
                word = word_data["word"]
                if romanize:
                    # Preserve leading and trailing whitespace because translite strips them
                    leading_spaces = len(word) - len(word.lstrip())
                    trailing_spaces = len(word) - len(word.rstrip())
                    stripped_word = word.strip()
                    
                    if tamil_transliterate and any('\u0b80' <= char <= '\u0bff' for char in stripped_word):
                        word = (" " * leading_spaces) + tamil_transliterate(stripped_word) + (" " * trailing_spaces)
                    else:
                        word = anyascii(word)
                start_ms = word_data["start"] * 1000
                end_ms = word_data["end"] * 1000
                
                # Duration in centiseconds for \k tag
                duration_cs = max(1, int((end_ms - start_ms) / 10))
                
                karaoke_text += f"{{\\k{duration_cs}}}{word}"
                
            event.text = karaoke_text
            self.subs.append(event)

        self.subs.save(output_path)
        logger.info(f"Subtitle file saved: {output_path} ({len(self.subs)} events)")
