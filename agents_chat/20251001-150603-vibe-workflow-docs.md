## Summary

- Expanded the English README to position TalkReplay as a vibe coding reference project, outlining how `agents_chat/`, `tasks.md`, and Husky hooks enforce the workflow.
- Mirrored the messaging in the Chinese README, adding a dedicated “Vibe Coding 工作流” section and updating bullet points accordingly.
- Clarified the transcript ingestion section in both languages to focus on provider adapters and incremental import behaviour.

## Code Highlights

```markdown
# README.md

+- **Workflow:** Opinionated vibe-coding blueprint featuring timestamped `agents_chat/` logs, `tasks.md` milestones, and Husky-enforced quality gates
+## Vibe Coding Workflow
+TalkReplay doubles as a living reference implementation for vibe coding teams:
```

```markdown
# README.zh.md

+- **协作方式：** 按 vibe coding 最佳实践组织，配套 `agents_chat/` 日志、`tasks.md` 任务板以及 Husky 强制检查
+## Vibe Coding 工作流
+TalkReplay 本身就是一个 vibe coding 标杆项目：
```

## Self-Tests

- `pnpm exec prettier --write README.md README.zh.md`

## Risks / Follow-ups

- Keep both READMEs synchronised when future workflow docs evolve to avoid divergence between languages.

## References

- README.md
- README.zh.md
- agents.md
- tasks.md
