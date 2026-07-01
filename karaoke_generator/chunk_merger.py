import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def lcs_align(words_a: List[Dict[str, Any]], words_b: List[Dict[str, Any]]) -> List[tuple]:
    """Computes the Longest Common Subsequence index pairs to align two word lists."""
    m, n = len(words_a), len(words_b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            # Strip punctuation and convert to lowercase for comparison
            word_a_clean = "".join(char for char in words_a[i-1]["word"] if char.isalnum()).lower()
            word_b_clean = "".join(char for char in words_b[j-1]["word"] if char.isalnum()).lower()
            
            if word_a_clean == word_b_clean and word_a_clean != "":
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
                
    # Backtrack to extract indices
    i, j = m, n
    aligned_indices = []
    while i > 0 and j > 0:
        word_a_clean = "".join(char for char in words_a[i-1]["word"] if char.isalnum()).lower()
        word_b_clean = "".join(char for char in words_b[j-1]["word"] if char.isalnum()).lower()
        
        if word_a_clean == word_b_clean and word_a_clean != "":
            aligned_indices.append((i-1, j-1))
            i -= 1
            j -= 1
        elif dp[i-1][j] >= dp[i][j-1]:
            i -= 1
        else:
            j -= 1
            
    aligned_indices.reverse()
    return aligned_indices

def merge_overlapping_segments(chunks_words: List[List[Dict[str, Any]]], chunks_bounds: List[tuple], overlap: float = 5.0) -> List[Dict[str, Any]]:
    """Stitches overlapping chunks using LCS alignment and confidence resolution."""
    if not chunks_words:
        return []
        
    stitched_words = list(chunks_words[0])
    
    for c_idx in range(1, len(chunks_words)):
        prev_chunk_start, prev_chunk_end = chunks_bounds[c_idx - 1]
        curr_chunk_start, curr_chunk_end = chunks_bounds[c_idx]
        
        overlap_start = curr_chunk_start
        overlap_end = prev_chunk_end
        
        # 1. Filter words in the overlap zone
        overlap_words_prev = [w for w in stitched_words if overlap_start <= w["start"] < overlap_end]
        overlap_words_curr = [w for w in chunks_words[c_idx] if overlap_start <= w["start"] < overlap_end]
        
        # Keep non-overlapping words from the current chunk
        non_overlap_words_curr = [w for w in chunks_words[c_idx] if w["start"] >= overlap_end]
        
        # 2. LCS Alignment
        alignments = lcs_align(overlap_words_prev, overlap_words_curr)
        aligned_prev_indices = {a[0] for a in alignments}
        aligned_curr_indices = {a[1] for a in alignments}
        
        merged_overlap = []
        
        # Map aligned pairs to dictionary
        aligned_pairs = {a[1]: a[0] for a in alignments}
        
        # Loop through current overlap words and resolve duplicates
        for curr_i, w_curr in enumerate(overlap_words_curr):
            if curr_i in aligned_pairs:
                prev_i = aligned_pairs[curr_i]
                w_prev = overlap_words_prev[prev_i]
                
                # Confidence-based conflict resolution
                prob_prev = w_prev.get("probability", 0.0)
                prob_curr = w_curr.get("probability", 0.0)
                
                # If current chunk has higher probability, take it
                if prob_curr > prob_prev:
                    merged_overlap.append(w_curr)
                else:
                    merged_overlap.append(w_prev)
            else:
                # Unaligned current word: preserve if high probability (likely missed by prev window)
                if w_curr.get("probability", 0.0) > 0.8:
                    merged_overlap.append(w_curr)
                    
        # Add unaligned previous words
        for prev_i, w_prev in enumerate(overlap_words_prev):
            if prev_i not in aligned_prev_indices:
                if w_prev.get("probability", 0.0) > 0.8:
                    merged_overlap.append(w_prev)
                    
        # 3. Stitch them together
        # Remove all old overlap words from main list
        stitched_words = [w for w in stitched_words if w["start"] < overlap_start]
        # Append merged overlap and next non-overlapping section
        stitched_words.extend(merged_overlap)
        stitched_words.extend(non_overlap_words_curr)
        
    # Re-sort to guarantee order
    stitched_words.sort(key=lambda x: x["start"])
    
    # 4. Regroup words into subtitle segments
    processed_segments = []
    current_words = []
    
    def create_segment(words):
        seg_text = "".join([x["word"] for x in words]).strip()
        # Compute average metrics from individual word sources
        avg_lp = sum(w.get("avg_logprob", 0.0) for w in words) / len(words) if words else 0.0
        avg_cr = sum(w.get("compression_ratio", 0.0) for w in words) / len(words) if words else 0.0
        return {
            "start": words[0]["start"],
            "end": words[-1]["end"],
            "text": seg_text,
            "avg_logprob": avg_lp,
            "compression_ratio": avg_cr,
            "words": words
        }
    
    for w in stitched_words:
        current_words.append(w)
        # Split segment if word count >= 8 or if silence gap > 1.5 seconds
        if len(current_words) >= 8 or (len(current_words) > 1 and (w["start"] - current_words[-2]["end"]) > 1.5):
            processed_segments.append(create_segment(current_words))
            current_words = []
            
    if current_words:
        processed_segments.append(create_segment(current_words))
        
    return processed_segments
