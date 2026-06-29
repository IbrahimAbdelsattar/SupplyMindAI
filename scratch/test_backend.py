import sys
import traceback

try:
    print("Importing backend.main...")
    import backend.main
    print("SUCCESS: backend.main imported without errors.")
except Exception as e:
    print("ERROR importing backend.main:")
    traceback.print_exc()
