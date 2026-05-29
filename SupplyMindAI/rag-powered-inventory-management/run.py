"""One-command local runner for the backend and Lovable frontend."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_ROOT / "lovable-page"


def _npm_executable() -> str:
    if os.name == "nt":
        return "npm.cmd"
    return "npm"


def _require_command(command: str) -> None:
    if shutil.which(command) is None:
        raise RuntimeError(f"Required command not found on PATH: {command}")


def _start_process(command: list[str], workdir: Path) -> subprocess.Popen[bytes]:
    return subprocess.Popen(command, cwd=workdir)


def main() -> None:
    _require_command(_npm_executable())

    backend = _start_process([sys.executable, "app.py"], PROJECT_ROOT)
    frontend = _start_process([_npm_executable(), "run", "dev"], FRONTEND_DIR)

    print("Backend:  http://127.0.0.1:8000")
    print("Frontend: http://127.0.0.1:8080")
    print("Press Ctrl+C to stop both processes.")

    try:
        while True:
            backend_code = backend.poll()
            frontend_code = frontend.poll()

            if backend_code is not None:
                raise RuntimeError(f"Backend exited early with code {backend_code}.")
            if frontend_code is not None:
                raise RuntimeError(f"Frontend exited early with code {frontend_code}.")

            time.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        for process in (frontend, backend):
            if process.poll() is None:
                process.terminate()

        time.sleep(1.0)

        for process in (frontend, backend):
            if process.poll() is None:
                process.kill()


if __name__ == "__main__":
    main()
