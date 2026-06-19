import logging
from anyascii import anyascii

# Monkey-patch ast.Str for Python 3.14 compatibility (used by aksharamukha)
import ast
if not hasattr(ast, 'Str'):
    ast.Str = ast.Constant

logger = logging.getLogger(__name__)

# Try to import aksharamukha
try:
    from aksharamukha import transliterate
except ImportError:
    transliterate = None
    logger.warning("Aksharamukha is not installed. Multilingual transliteration will use basic anyascii fallback.")

# Try to import tamil-translite
try:
    from tamil_translite import translite as tamil_transliterate
except ImportError:
    tamil_transliterate = None
    logger.warning("tamil-translite is not installed. Tamil transliteration will fall back to Aksharamukha or anyascii.")


class Transliterator:
    """Handles romanization/transliteration of Indic scripts to readable English/Latin phonetics."""

    @staticmethod
    def detect_script(text: str) -> str:
        """
        Detects the Indic script of a text based on Unicode character blocks.
        
        Args:
            text: Text to analyze.
            
        Returns:
            The name of the detected script (e.g. 'Tamil', 'Devanagari', 'Telugu', 
            'Kannada', 'Malayalam', or 'English').
        """
        if not text:
            return "English"
            
        for char in text:
            code = ord(char)
            if 0x0900 <= code <= 0x097F:
                return "Devanagari"
            elif 0x0B80 <= code <= 0x0BFF:
                return "Tamil"
            elif 0x0C00 <= code <= 0x0C7F:
                return "Telugu"
            elif 0x0C80 <= code <= 0x0CFF:
                return "Kannada"
            elif 0x0D00 <= code <= 0x0D7F:
                return "Malayalam"
        return "English"

    @staticmethod
    def _apply_phonetic_rules(text: str, script: str) -> str:
        """
        Applies phonetic improvements to ISO/IAST transliteration to match common romanized spellings.
        e.g., converting long vowels to double characters (ā -> aa, ī -> ee, ū -> oo).
        """
        # Long vowel phonetic expansions for common Romanization expectations
        replacements = {
            'ā': 'aa',
            'ī': 'ee',
            'ū': 'oo',
        }
        
        # Script-specific adjustments
        if script == "Devanagari":
            # For Hindi, e.g. "नाम" -> ISO "nāma" (with schwa removal: nām) -> "naam"
            pass
        elif script == "Telugu":
            # For Telugu, e.g. "పాట" -> ISO "pāṭa" -> "paata"
            pass
            
        for target, replacement in replacements.items():
            text = text.replace(target, replacement)
            
        return text

    @classmethod
    def transliterate_word(cls, word: str, language: str = None) -> str:
        """
        Transliterates a single word from native script to Romanized script.
        
        Args:
            word: Word to transliterate.
            language: Optional language code hint ('ta', 'hi', 'te', 'ml', 'kn').
            
        Returns:
            The transliterated word, preserving surrounding whitespace.
        """
        if not word:
            return ""

        # If it's already ASCII, return it as-is
        if all(ord(c) < 128 for c in word):
            return word

        # Preserve leading/trailing spaces
        leading_spaces = len(word) - len(word.lstrip())
        trailing_spaces = len(word) - len(word.rstrip())
        stripped = word.strip()

        # Detect script
        script = cls.detect_script(stripped)
        
        translit_stripped = stripped
        
        if script == "Tamil":
            if tamil_transliterate:
                translit_stripped = tamil_transliterate(stripped)
            elif transliterate:
                try:
                    res = transliterate.process("Tamil", "ISO", stripped)
                    res = cls._apply_phonetic_rules(res, script)
                    translit_stripped = anyascii(res)
                except Exception:
                    translit_stripped = anyascii(stripped)
            else:
                translit_stripped = anyascii(stripped)
                
        elif script == "Devanagari":
            if transliterate:
                try:
                    # Devanagari to ISO with Hindi schwa removal (prevents e.g. "nama" for "नाम")
                    res = transliterate.process("Devanagari", "ISO", stripped, post_options=["RemoveSchwaHindi"])
                    res = cls._apply_phonetic_rules(res, script)
                    translit_stripped = anyascii(res)
                except Exception as e:
                    logger.warning(f"Devanagari transliteration failed: {e}")
                    translit_stripped = anyascii(stripped)
            else:
                translit_stripped = anyascii(stripped)
                
        elif script in ["Telugu", "Malayalam", "Kannada"]:
            if transliterate:
                try:
                    res = transliterate.process(script, "ISO", stripped)
                    res = cls._apply_phonetic_rules(res, script)
                    translit_stripped = anyascii(res)
                except Exception as e:
                    logger.warning(f"{script} transliteration failed: {e}")
                    translit_stripped = anyascii(stripped)
            else:
                translit_stripped = anyascii(stripped)
        else:
            translit_stripped = anyascii(stripped)

        # Standardize to lowercase and remove any stray diacritics/accents that escaped
        translit_stripped = translit_stripped.lower()

        return (" " * leading_spaces) + translit_stripped + (" " * trailing_spaces)

    @classmethod
    def transliterate_text(cls, text: str, language: str = None) -> str:
        """
        Transliterates a full text string.
        
        Args:
            text: Native script text.
            language: Optional language code hint.
            
        Returns:
            Romanized text.
        """
        words = text.split()
        return " ".join(cls.transliterate_word(w, language) for w in words)
