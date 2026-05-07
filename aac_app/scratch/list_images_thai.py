import os
import sys

# Set encoding to utf-8 for Thai characters
path = 'd:/prowom/aac_app/static/images'
files = os.listdir(path)

print(f"Total files: {len(files)}")
for f in files:
    try:
        print(f)
    except:
        print(f.encode('utf-8', errors='replace').decode('utf-8'))
