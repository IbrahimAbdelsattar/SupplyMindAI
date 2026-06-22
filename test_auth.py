try:
    from backend.routers.auth import router
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
