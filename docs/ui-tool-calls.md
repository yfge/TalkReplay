# Tool Call Cards

Initial UI groups a tool invocation (tool-call) with its result (tool-result) by `toolCallId`.

- Header: tool name/id; status (`success` or `exit N`) and duration when available.
- Body: arguments (pretty JSON or text) and result (stdout or content).
- Collapse/expand: toggle to reduce vertical space for long outputs.

Future work:

- Tabs for stdout/stderr/diff.
- Keyboard navigation, a11y labels.
- Virtualised lists when messages exceed 500.
