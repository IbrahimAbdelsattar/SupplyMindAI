"""Thin root entrypoint for the inventory backend."""

from src.rag.api.app import app, run


if __name__ == "__main__":
    run()
