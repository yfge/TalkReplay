# README Marketing Improvements

## Summary

Updated README files (English and Chinese) with clearer value proposition and better discoverability. Also added GitHub topics to improve search visibility.

## Changes

### GitHub Topics Added

```
ai-pair-programming, ai-transcript, claude, claude-code, codex,
cursor, developer-tools, gemini, transcript-viewer, vibe-coding
```

### README Updates

- Added prominent tagline: "The only tool that replays Claude, Codex, Cursor, AND Gemini sessions in one unified UI"
- Added npm and GitHub stars badges
- Added one-liner `npx talk-replay` command at top
- Simplified and reorganized key info bullets
- Synced Chinese README with same improvements

### Repo Description

Updated to: "The only tool that replays Claude, Codex, Cursor, AND Gemini AI coding sessions in one unified UI. Vibe coding companion for reviewing, searching, and sharing your AI pair programming transcripts."

## Rationale

Competitive analysis showed:

- simonw/claude-code-transcripts: 932 stars (launched 2 months later)
- daaain/claude-code-log: 683 stars
- TalkReplay: 18 stars (despite more features)

TalkReplay's multi-provider support and live UI were not clearly communicated. These changes aim to improve discoverability and clarify differentiation.

## Files Changed

- `README.md` - English version with new tagline and badges
- `README.zh.md` - Chinese version synced

## Code Highlights

```markdown
<!-- New README header -->

# TalkReplay

> **The only tool that replays Claude, Codex, Cursor, AND Gemini sessions in one unified UI.**

[![npm](https://img.shields.io/npm/v/talk-replay)](https://www.npmjs.com/package/talk-replay)
[![GitHub stars](https://img.shields.io/github/stars/yfge/TalkReplay)](https://github.com/yfge/TalkReplay/stargazers)

\`\`\`bash
npx talk-replay
\`\`\`
```

## Self-Tests

```bash
gh api repos/yfge/TalkReplay --jq '.topics'
# ["ai-pair-programming","ai-transcript","claude","claude-code","codex","cursor","developer-tools","gemini","transcript-viewer","vibe-coding"]
```
