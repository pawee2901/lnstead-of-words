import os

path = 'd:/prowom/aac_app/static/images'
files = os.listdir(path)

# Search for any file containing 'ขวา' (right) or 'ซ้าย' (left)
search_terms = ['ขวา', 'ซ้าย', 'ซีก', 'อ่อน', 'ชา']

found = []
for f in files:
    for term in search_terms:
        if term in f:
            found.append(f)
            break

with open('d:/prowom/aac_app/scratch/search_results_2.txt', 'w', encoding='utf-8') as f:
    for item in found:
        f.write(item + '\n')
