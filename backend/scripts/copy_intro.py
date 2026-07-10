import shutil
import os

src = r"d:\SupplyMindAI\You_are_an_award_winning_cinem.mp4"
dst = r"d:\SupplyMindAI\frontend\public\intro.mp4"

print(f"Checking source: {os.path.exists(src)}")
try:
    shutil.copy2(src, dst)
    print("Successfully copied file!")
except Exception as e:
    print(f"Error copying file: {e}")
