import os

path = 'd:/prowom/aac_app/static/images'
files = os.listdir(path)

with open('d:/prowom/aac_app/scratch/image_list.txt', 'w', encoding='utf-8') as f:
    for file in files:
        f.write(file + '\n')
