import wave
import numpy as np
import logging

logger = logging.getLogger(__name__)

def estimate_speech_rate(audio_path: str) -> str:
    """Analyzes vocal track RMS envelope peak density to classify speech rate."""
    try:
        with wave.open(audio_path, 'rb') as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            data = wf.readframes(n_frames)
            
            if sampwidth == 2:
                y = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
            else:
                y = np.frombuffer(data, dtype=np.float32)
            
            if n_channels > 1:
                y = y.reshape(-1, y.shape[-1]).mean(axis=1)

        win_size = int(framerate * 0.1)
        hop_size = int(framerate * 0.05)
        
        rms = []
        for i in range(0, len(y) - win_size, hop_size):
            rms.append(np.sqrt(np.mean(y[i:i+win_size]**2) + 1e-8))
        rms = np.array(rms)
        
        if len(rms) == 0:
            return "NORMAL"
            
        rms = (rms - np.min(rms)) / (np.max(rms) - np.min(rms) + 1e-8)
        
        peaks = 0
        for i in range(1, len(rms) - 1):
            if rms[i] > 0.15 and rms[i] > rms[i-1] and rms[i] > rms[i+1]:
                peaks += 1
        
        duration = len(y) / framerate
        syllable_rate = peaks / duration if duration > 0 else 0
        logger.info(f"Speech Rate Classification: {syllable_rate:.2f} syllables/sec (Peaks: {peaks}, Duration: {duration:.1f}s)")
        
        if syllable_rate >= 3.6:
            return "RAP"
        elif syllable_rate >= 2.6:
            return "FAST"
        return "NORMAL"
        
    except Exception as e:
        logger.warning(f"Speech rate estimation failed: {e}. Defaulting to NORMAL.")
        return "NORMAL"
