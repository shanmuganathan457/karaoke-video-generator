import sys
import difflib

# Reconfigure stdout to use UTF-8 to support printing Tamil script in Windows console
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def calculate_similarity(ground_truth, model_output, label):
    # Standardize: lowercase and strip punctuation
    def clean_text(text):
        punctuation = [",", ".", "?", "!", "-", ";"]
        text = text.lower()
        for char in punctuation:
            text = text.replace(char, "")
        return " ".join(text.split())

    gt_clean = clean_text(ground_truth)
    mo_clean = clean_text(model_output)

    gt_words = gt_clean.split()
    mo_words = mo_clean.split()
    
    matcher = difflib.SequenceMatcher(None, gt_words, mo_words)
    ratio = matcher.ratio()

    # Calculate Word Error Rate (WER)
    opcodes = matcher.get_opcodes()
    substitutions = 0
    insertions = 0
    deletions = 0
    
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'replace':
            substitutions += max(i2 - i1, j2 - j1)
        elif tag == 'insert':
            insertions += (j2 - j1)
        elif tag == 'delete':
            deletions += (i2 - i1)
            
    total_edits = substitutions + insertions + deletions
    wer = total_edits / len(gt_words) if gt_words else 0
    
    print("=" * 60)
    print(f"ACCURACY REPORT - {label}")
    print("=" * 60)
    try:
        print(f"Ground Truth: {gt_clean}")
        print(f"Model Output: {mo_clean}")
    except Exception:
        print("[Text omitted due to console encoding limits]")
    print("-" * 60)
    print(f"Sequence Matcher Similarity Ratio: {ratio * 100:.2f}%")
    print(f"Word Error Rate (WER): {wer * 100:.2f}%")
    print(f"Word Accuracy (1 - WER): {(1 - wer) * 100:.2f}%")
    print("=" * 60)
    print()

# 1. Native Tamil Script Accuracy for "Pirai Thedum Iravilae"
# Official Ground Truth (Tamil)
gt_tamil = (
    "பிறை தேடும் இரவிலே உயிரே எதைத் தேடி அலைகிறாய் "
    "கதை சொல்ல அழைக்கிறேன் உயிரே அன்பே நீ வா "
    "இருளில் கண்ணீரும் எதற்கு மழையில் கண்ணீராக வா "
    "அழகே இந்த சோகம் எதற்கு நான் உன் தாயுமல்லவா "
    "முகத்திரை மட்டும் நானும் முகவரியடி "
    "உயிருள்ள வரை நானும் உன் நிழலடி"
)

# Actual output of Whisper (Tamil) converted back from the transliterated words
model_tamil = (
    "திரைத்திடும் இரவிலே உயிரே எதைத் தேடி அலைகிறாய் "
    "கதை சொல்ல அழைக்கிறேன் உயிரே அங்கே நீ வா "
    "இருளில் கண்ணீரும் எதற்கு மழையில் கண்ணோடு வா "
    "அழகே இந்த சோகம் எதற்கு நான் உன் தாயும் அல்லவா "
    "முகத்தினை மட்டும் நானும் இதயமடி "
    "உயிருள்ள வரை நானும் நடுமழையடி"
)

# 2. Transliterated (Tanglish) Script Accuracy
# Official Ground Truth (Transliterated)
gt_translit = (
    "pirai thedum iravilae uyirae edhaith thaedi alaigiraai "
    "kadhai solla azhaikkiraen uyirae anbae nee vaa "
    "irulil kanneerum edharku mazhaiyil kanneeraaga vaa "
    "azhage indha sogam edharku naan un thaayumallavaa "
    "mugaththirai mattum naanum mugavariyadi "
    "uyirulla varai naanum un nizhaladi"
)

# Actual output of our Romanized subtitles
model_translit = (
    "thiraiththidum iravilae uyirae edhaith thaedi alaigiraai "
    "kadhai solla azhaikkiraen uyirae andhae nee vaa "
    "irunil kanneerum edharku mazhiyil kannooda vaa "
    "azhage indha sogam edharku naan un thaayum unnavaa "
    "mugaththina mattum naanum idhaiyamadi "
    "uyirulla varai naanum nadimazhadi"
)

calculate_similarity(gt_tamil, model_tamil, "NATIVE TAMIL SCRIPT (Whisper AI Core - Pirai Thedum Iravilae)")
calculate_similarity(gt_translit, model_translit, "ROMANIZED/TRANSLITERATED TEXT (Phonetic spelling)")
