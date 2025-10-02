## Summary

Document OS-specific default paths for Claude/Codex logs on Windows/Linux/macOS and extend Docker/Compose examples to make configuration straightforward across platforms.

## Code Highlights

- README(EN/ZH):
  - Add Windows PowerShell/Cmd and Linux/macOS env setup examples.
  - Add WSL2 notes and volume mount examples.
  - Extend Docker run and Compose sections with OS-specific guidance.

## Self-Tests

- On macOS/Linux: `docker run` with `$HOME` volumes loads sessions.
- On Windows PowerShell: `-v C:\Users\<you>\...` volumes load sessions.
- On WSL2: `-v /mnt/c/Users/<you>/...` volumes load sessions.

## Touched Files

- README.md
- README.zh.md
