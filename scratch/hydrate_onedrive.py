import os
import time

directories = [
    r"c:\Users\C-LAB\OneDrive\Music\SupplyMindAI\Modeling",
    r"c:\Users\C-LAB\OneDrive\Music\SupplyMindAI\data"
]

def hydrate_files():
    for d in directories:
        if not os.path.exists(d):
            print(f"Directory not found: {d}")
            continue
            
        print(f"Hydrating files in {d}...")
        for root, dirs, files in os.walk(d):
            for file in files:
                filepath = os.path.join(root, file)
                try:
                    start_time = time.time()
                    print(f"Reading {filepath}...", end=" ", flush=True)
                    with open(filepath, 'rb') as f:
                        data = f.read()
                    elapsed = time.time() - start_time
                    print(f"Done. Size: {len(data)} bytes. Time: {elapsed:.2f}s")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

if __name__ == '__main__':
    hydrate_files()
