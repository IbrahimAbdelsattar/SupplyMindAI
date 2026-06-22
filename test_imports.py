import sys
import traceback
try:
    from backend.routers.auth import router
    print("SUCCESS_ROUTER")
except Exception as e:
    print("ROUTER_ERROR")
    traceback.print_exc()

try:
    import jose
    print("SUCCESS_JOSE")
except Exception as e:
    print("JOSE_ERROR")
    traceback.print_exc()
