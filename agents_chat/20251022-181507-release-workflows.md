## Summary

- 对比 `ai-shifu` 仓库的做法，重写 `prepare-release` 工作流：自动校验版本、跑 lint/test、生成 `docs/releases/<tag>.md` 并创建版本 PR + Draft Release。
- 扩展 `build-on-release` 工作流：支持 GHCR 推送、按需推送 Docker Hub、输出构建总结，并新增汇总 Job。
- 补充 `docs/release-process.md`，梳理首次发布步骤；更新 `tasks.md` 标记发布流水线准备完毕。

涉及文件：`.github/workflows/prepare-release.yml`, `.github/workflows/build-on-release.yml`, `docs/release-process.md`, `tasks.md`.

## Code Highlights

```yaml
# .github/workflows/prepare-release.yml
- uses: pnpm/action-setup@v3
- run: |
    pnpm lint
    pnpm test
- id: changelog
  run: |
    RELEASE_FILE="docs/releases/$TAG.md"
    git log --pretty='- %s (%h)' ...
```

```yaml
# .github/workflows/build-on-release.yml
- name: Prepare image targets
  run: |
    OWNER=$(echo "${GITHUB_REPOSITORY_OWNER}" | tr '[:upper:]' '[:lower:]')
    GHCR_IMAGE="ghcr.io/${OWNER}/talkreplay"
    if [ -n "${DOCKERHUB_USER}" ] ...
- name: Build summary
  run: echo "### 🐳 Docker Build Complete" >> $GITHUB_STEP_SUMMARY
```

```md
# docs/release-process.md

1. Run **Prepare Release Draft** with version `vX.Y.Z`.
2. Review PR + draft release.
3. Publish release to trigger Docker build workflow.
```

## Self-Tests

- （未执行）以工作流 YAML / 文档变更为主，无新增可运行代码。

## Risks & Follow-up

- Draft Release 目前指向 PR head commit；发布前需确保 PR 已合并。
- GHCR 推送依赖 `packages: write` 权限，首次运行前确认组织策略允许。
