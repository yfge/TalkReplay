"""Formatter utilities suggested by Cursor."""

from pathlib import Path


def ensure_final_newline(target: Path) -> None:
    """Append a newline if the file does not already end with one."""
    contents = target.read_text(encoding="utf-8")
    if contents.endswith("\n"):
        return
    target.write_text(contents + "\n", encoding="utf-8")
