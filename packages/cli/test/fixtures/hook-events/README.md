# Pinned Claude Code hook events

Recorded on 2026-10-14 from Claude Code 2.1.299 by a PreToolUse hook that logged its standard input (L7 and L8, TECH-SPEC section 12). The first is the main session's Write; the other two are a subagent's Writes from its own worktree, which carry `agent_id` and `agent_type` and whose `cwd` is that worktree. Only the machine-specific values are replaced: `{{cwd}}`, `{{file_path}}` and `{{home}}`, which the hook tests fill in, and the session ID. Every field name and every other value is as Claude Code sent it.
