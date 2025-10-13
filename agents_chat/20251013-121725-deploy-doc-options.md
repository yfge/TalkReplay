## Summary

- Clarified production deployment guidance to cover Docker volume mounts and host-based runs after `pnpm build` per latest discussion.
- Updated both English and Chinese READMEs so the two deployment paths stay in sync.
- Logged the docs refresh in `tasks.md` under Milestone 6.

Referenced files: README.md, README.zh.md, tasks.md

## Code Highlights

```markdown
## Production Deployment

### Option 1: Docker + Volume Mounts

...

### Option 2: Local Build + Host Paths
```

```markdown
## 生产部署

### 方案一：Docker + 目录挂载

...

### 方案二：本机构建 + 本地路径
```

```markdown
- Progress (2025-10-13): Expanded production deployment docs with Docker volume guidance and host-based steps.
```

## Self-Tests

- Not run (docs-only change). No automated tests required.

## Risks / Follow-ups

- Confirm downstream scripts or docs referencing the old "Docker Workflow" heading are updated if they exist.
