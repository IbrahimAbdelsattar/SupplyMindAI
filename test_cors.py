import threading
import time
import urllib.request
import json
import uvicorn
from backend.main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8085, log_level="error")

t = threading.Thread(target=run_server, daemon=True)
t.start()

time.sleep(3)  # wait for server to start

print("--- Testing OPTIONS /api/v1/data/products ---")
req = urllib.request.Request("http://127.0.0.1:8085/api/v1/data/products", method="OPTIONS")
req.add_header("Origin", "http://localhost:8081")
req.add_header("Access-Control-Request-Method", "GET")
try:
    with urllib.request.urlopen(req) as response:
        print("OPTIONS Status:", response.status)
        print("OPTIONS Headers:", dict(response.headers))
except Exception as e:
    print("OPTIONS Error:", e)

print("\n--- Testing GET /api/v1/data/products ---")
req = urllib.request.Request("http://127.0.0.1:8085/api/v1/data/products")
try:
    with urllib.request.urlopen(req) as response:
        print("GET Products Status:", response.status)
        data = json.loads(response.read().decode())
        print(f"Products Count: {len(data)}")
        print("Sample Product:", data[0] if data else None)
except Exception as e:
    print("GET Products Error:", e)

print("\n--- Testing POST /api/v1/forecast/predict ---")
req = urllib.request.Request("http://127.0.0.1:8085/api/v1/forecast/predict", method="POST")
req.add_header("Content-Type", "application/json")
payload = json.dumps({"product_id": "P001", "horizon_days": 30}).encode("utf-8")
try:
    with urllib.request.urlopen(req, data=payload) as response:
        print("POST Forecast Status:", response.status)
        data = json.loads(response.read().decode())
        print("Forecast Keys:", list(data.keys()))
        print("Forecast Points Count:", len(data.get("series", [])))
        if data.get("series"):
            print("Sample Forecast Point:", data["series"][0])
except Exception as e:
    print("POST Forecast Error:", e)

