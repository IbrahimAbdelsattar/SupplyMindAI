import urllib.request
import json

url = "http://127.0.0.1:8081/api/v1/copilot/chat"
headers = {"Content-Type": "application/json"}
data = json.dumps({"message": "Hello"}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode("utf-8"))
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print("RESPONSE:", e.read().decode('utf-8'))
