## Summary

- Clarified production deployment docs so Docker usage highlights mandatory volume mounts and in-app directory checks.
- Documented host-based workflows covering pnpm start, Node standalone execution, and the ability to configure paths via the Provider Setup dialog without env vars.
- Logged the expanded guidance in `tasks.md` under Milestone 6 for traceability.

Referenced files: README.md, README.zh.md, tasks.md

## Code Highlights

```markdown
Containers can only see paths mounted into the filesystem above. Use the in-app Provider Setup dialog...
```

```markdown
Alternatively, leverage the standalone output (...) node .next/standalone/server.js
```

```markdown
容器只能读取挂载进来的目录... /app/data/\*\*
```

```markdown
- Progress (2025-10-13): Expanded production deployment docs with Docker volume guidance, pnpm start details, and direct Node standalone steps.
```

## Self-Tests

- Not run (documentation-only change). Husky pre-commit will re-run lint/test/format on commit.

## Risks / Follow-ups

- Validate any external automation referencing the old heading names or env expectations still behaves as intended.
