# Browser File Access Options

## Recommended Approach: File System Access API

- **Availability:** Chromium-based browsers (Chrome, Edge) and some derivatives.
- **Usage:** `window.showDirectoryPicker()` allows selecting a directory; returns handles to iterate files. Requires HTTPS or localhost.
- **Security:** User grants permission per directory; access persists for the session unless stored via `navigator.storage.getDirectory()`.
- **Limitations:** Not supported in Safari or Firefox; must provide fallbacks.

## Fallback Strategy: Manual File Upload

- Use `<input type="file" webkitdirectory />` to allow directory selection in Chromium/Safari (behind flags); gracefully accept multiple files in other browsers.
- Pros: Works without new permissions model; Cons: Upload dialog each time, no incremental updates.

## Alternate Option: Drag and Drop

- Offer drag-and-drop area; read File objects via `DataTransferItemList`. Useful for quick imports but lacks directory recursion.

## Desktop/Electron Considerations

- For desktop wrappers, Node/Electron `fs` access can read directories directly, bypassing browser limitations.

## Next Steps

- Implement capability detection: prefer File System Access API; fall back to `input[type=file]` with directory support; finally accept zipped logs.
- Document browser compatibility matrix in README and surface inline guidance in the startup wizard.
