import os

path = 'd:/prowom/aac_app/static/images'
files = os.listdir(path)

# Search for any file containing 'ซ้าย' (left) or 'ซีก' (side) or 'อ่อน' (weak)
search_terms = ['ซ้าย', 'ซีก', 'อ่อน', 'left', 'right', 'weak', 'side']

found = []
for f in files:
    for term in search_terms:
        if term in f:
            found.append(f)
            break

with open('d:/prowom/aac_app/scratch/search_results.txt', 'w', encoding='utf-8') as f:
    for item in found:
        f.write(item + '\n')
