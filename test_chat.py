import urllib.request
import json
import traceback

def test_chat():
    print("\n--- Testing POST /api/v1/copilot/chat ---")
    url = "http://127.0.0.1:8081/api/v1/copilot/chat"
    req = urllib.request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    payload = json.dumps({"message": "Hello"}).encode("utf-8")
    
    try:
        with urllib.request.urlopen(req, data=payload) as response:
            print("POST Chat Status:", response.status)
            data = json.loads(response.read().decode())
            print("Chat Response:", json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print("HTTP Error Status:", e.code)
        print("HTTP Error Body:", e.read().decode("utf-8"))
    except Exception as e:
        print("POST Chat Error:", e)
        traceback.print_exc()

if __name__ == "__main__":
    test_chat()
