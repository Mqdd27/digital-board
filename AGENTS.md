<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Persistent memory

Long-term memory for this project lives in an Obsidian vault on disk. Plain Markdown only — no Obsidian plugins, no MCP server, no database, no extra service.

- Memory root: `/Users/macbook/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/AI Mem`
- This project's memory: `/Users/macbook/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/AI Mem/Projects/digital board.md`

### Reading

Read the project memory first when the task touches previous implementation, architecture, a known bug, deployment, configuration, an earlier decision, or any prior work. Do not load the whole memory root when one file — or one section of one file — answers the question.

Source code and the actual state of the machine are the source of truth. Where memory disagrees with the code or the running system, trust the current reality and correct the memory.

### Writing

Revise the memory after finishing work or making a change. Do not blindly append.

- Update the existing `## Current State` in place when conditions change; it must always describe the latest state, never a running log of every state it passed through.
- Move an old state into `## History` only when it stays useful later. Otherwise delete it.
- Keep each fact in exactly one place. No duplicates, no conversation transcripts, no throwaway debugging detail, and no information that is trivially readable from the source unless it matters as architectural context.

### Never store

Passwords, API keys, access tokens, cookies, private keys, credentials, or any other secret.
