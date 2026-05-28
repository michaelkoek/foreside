---
name: foreside-obsidian
description: Update the Foreside project Obsidian notes after completing a milestone. Maintains quality, structure, and readability of Project Overview.md and Prompts.md in the obsidian-vault. Use after finishing a major step (gateway built, Docker done, Terraform done, etc).
---

# Foreside Obsidian Update Skill

## File locations

- Vault: `/Users/michaelkoek/Documents/brain-deux/obsidian-vault/`
- Project folder: `02 Projects/Own/Foreside/`
- File 1: `Project Overview.md`
- File 2: `Prompts.md`

## Steps to follow

### 1. Read both files first
Always read the current state of both files before making any changes. Never write from memory — the files may have been updated manually.

### 2. Update Project Overview.md

**Progress checklist** — move items from "Still to build" to "Done" for anything completed this session. Be specific about what was built.

**Architecture / design decisions** — if a new decision was made (e.g. how streaming works, why a library was chosen), add it to the "Key Design Decisions" section. One decision = one subsection. Lead with the what, follow with the why.

**Project structure** — if new files or folders were added, update the tree.

**Known issues / notes** — add anything that was flagged in a review but not yet fixed. Remove items that were resolved.

**Writing quality rules for File 1:**
- Write for someone returning after 2 months away — assume zero short-term memory
- Use plain language. No jargon without explanation. If you use a technical term, follow it with a one-line plain-English explanation in parentheses
- Use concrete examples. Don't say "events are streamed" — show what the stream looks like
- Short paragraphs. One idea per paragraph
- If something is tricky or non-obvious, call it out explicitly: "This is the hard part — ..."
- Never write "we" without explaining who "we" is. This file is read by strangers too
- Keep the tone direct and confident — no hedging, no filler

### 3. Update Prompts.md

Add a new prompt block **only if** it would help someone pick up the project and continue. Ask: "Would this prompt save 10+ minutes of re-explaining context?"

If yes — add it with a clear section header and a fenced code block.
If no — skip it.

**Prompts to always skip:**
- Simple yes/no confirmations
- Questions about understanding something
- Side questions not related to building the project
- Anything already covered by an existing prompt block

**Prompts worth keeping:**
- Commands to run (generate, build, deploy)
- Architectural decisions that need context to re-explain
- The "pick up where we left off" context-setting prompt (update this after each session to reflect current state)

### 4. Update the "Last updated" date in Project Overview.md

Always update the date at the top of File 1 to today's date.

### 5. Quality check before finishing

Read both files back and ask:
- Can a stranger understand File 1 in 5 minutes?
- Are all completed items checked off?
- Does the progress section reflect reality?
- Are the prompts in File 2 immediately copy-pasteable?

If any answer is no — fix it before finishing.
