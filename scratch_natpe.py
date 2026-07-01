import difflib

real_lyrics = [
    "ava coloru enna coloru enna",
    "ujjala white'u",
    "naan avalukukaga poduvenda",
    "majava fight'u",
    "ava ooru enna ooru enna",
    "pakkatu state'u",
    "appo erkanave aalu irukkum",
    "machan nee late'u",
    "avala naanum love'u pannen",
    "inch by inch'u",
    "avanga appankaran",
    "kudukka poran mookul punch'u",
    "avala naanum kooti powen",
    "marina beach'u",
    "anga neenga serndhu poga",
    "thada potachu"
]

transcribed_lyrics = [
    "kalariyenna kalariyenna muchchaala vaiththi",
    "kaamal kaaga pottu vandhaam maachchaavam paiththi",
    "avan ooriyenna ooriyenna paakkaththittadhi",
    "appa yerkanavae aalirukkom madhaanilaeththi",
    "avalai naan nallavu panna inju painji",
    "pongap paerkkaaran kuzhugap ponga mookkula pachchi",
    "avalaidhaan poottip poga merinaar vees",
    "angae neenga saerkkup poga thadambo"
]

# Flatten both
gt_str = " ".join(real_lyrics).lower()
test_str = " ".join(transcribed_lyrics).lower()

# Character-level overlap
gt_chars = gt_str.replace(" ", "").replace("'", "")
test_chars = test_str.replace(" ", "").replace("'", "")

char_matcher = difflib.SequenceMatcher(None, gt_chars, test_chars)
similarity = char_matcher.ratio()

substitutions = 0
insertions = 0
deletions = 0

for tag, i1, i2, j1, j2 in char_matcher.get_opcodes():
    if tag == 'replace':
        substitutions += max(i2 - i1, j2 - j1)
    elif tag == 'insert':
        insertions += (j2 - j1)
    elif tag == 'delete':
        deletions += (i2 - i1)
        
total_char_edits = substitutions + insertions + deletions
cer = total_char_edits / len(gt_chars)
char_accuracy = max(0.0, 1.0 - cer)

print(f"CER:           {cer:.4f} ({cer*100:.2f}%)")
print(f"Char Accuracy: {char_accuracy:.4f} ({char_accuracy*100:.2f}%)")
print(f"Similarity:    {similarity:.4f} ({similarity*100:.2f}%)")
