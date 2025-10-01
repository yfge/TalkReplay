## Summary

- Adjusted the README interface preview to display screenshots in a vertical flow instead of a markdown table, matching the desired layout.
- Mirrored the same presentation change in the Chinese README to keep bilingual docs consistent.

## Code Highlights

```markdown
# README.md

![TalkReplay session explorer](./docs/assets/session-explorer.png)

![TalkReplay conversation detail](./docs/assets/conversation-detail.png)
```

```markdown
# README.zh.md

![TalkReplay 会话总览](./docs/assets/session-explorer.png)

![TalkReplay 对话详情](./docs/assets/conversation-detail.png)
```

## Self-Tests

- `pnpm exec prettier --write README.md README.zh.md`

## Risks / Follow-ups

- None; verify that static site generators or doc previews render the stacked screenshots as expected.

## References

- README.md
- README.zh.md
