# Agent Teams — Master Reference Guide

> A working reference for building and running effective Claude Code agent teams.
> Source: https://code.claude.com/docs/en/agent-teams (behavior as of v2.1.178+, with version-gated notes called out inline).
> This project already has agent teams enabled via `.claude/settings.local.json`.

---

## 1. What agent teams are

Agent teams coordinate **multiple Claude Code instances working together**:

- One session is the **team lead** — coordinates work, assigns tasks, synthesizes results.
- **Teammates** work independently, each in its **own context window**, and can **communicate directly with each other**.
- You can talk to any teammate **directly**, without going through the lead.

> ⚠️ **Experimental & disabled by default.** Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Without it: no team is set up at session start, no team directories are written, and Claude will not spawn or propose teammates.

---

## 2. Teams vs. Subagents — which to use

Both parallelize work. The deciding question: **do the workers need to talk to each other?**

|                   | Subagents                                        | Agent teams                                         |
| :---------------- | :----------------------------------------------- | :-------------------------------------------------- |
| **Context**       | Own context window; results return to the caller | Own context window; fully independent               |
| **Communication** | Report back to the main agent only               | Teammates message each other directly               |
| **Coordination**  | Main agent manages all work                      | Shared task list with self-coordination             |
| **Best for**      | Focused tasks where only the result matters      | Complex work requiring discussion and collaboration |
| **Token cost**    | Lower (results summarized back)                  | Higher (each teammate is a separate Claude)         |

- **Use subagents** for quick, focused workers that just report a result.
- **Use agent teams** when teammates need to share findings, challenge each other, and coordinate on their own.

**Strongest team use cases:**
- **Research & review** — investigate different aspects simultaneously, then share/challenge findings.
- **New modules or features** — each teammate owns a separate piece, no stepping on each other.
- **Debugging competing hypotheses** — test different theories in parallel, converge faster.
- **Cross-layer coordination** — frontend / backend / tests, each owned by a different teammate.

**Avoid teams for:** sequential tasks, same-file edits, or work with many dependencies. A single session or subagents wins there. Teams add coordination overhead and use **significantly more tokens**.

---

## 3. Enabling

Set the env var to `1`, either in the shell or in `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> ✅ In this repo this is already set in `.claude/settings.local.json`. Restart / reload the session to pick it up.

---

## 4. Starting a team

After enabling, **describe the task and the teammates in natural language**. Claude spawns them and coordinates.

Good starter prompt (three independent roles, no waiting on each other):

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

The lead then populates a **shared task list**, spawns a teammate per perspective, has them explore, and synthesizes at the end.

> ⚠️ **Claude may spawn subagents instead of a team.** Subagents appear in the *same* agent panel, so the panel alone doesn't confirm a team formed. If you got subagents, ask again and **explicitly request an agent team**.

**How teams form (you stay in control either way):**
- **You request teammates** — give a task that benefits from parallel work and ask for teammates.
- **Claude proposes teammates** — if it thinks the task benefits, it suggests spawning; you confirm first.

Claude never spawns teammates without your approval. A team forms when the **first teammate is spawned**; the main session becomes the lead.

> **History note:** Before v2.1.178 you had to create/name a team first (`TeamCreate`/`TeamDelete` tools). Those tools no longer exist. The `team_name` input on the Agent tool is accepted but **ignored**; `team_name` in hook payloads is the session-derived name and is **deprecated**.

---

## 5. The agent panel (lead's terminal)

Teammates are listed below the prompt input:

- **Up/Down arrows** — select a teammate
- **Enter** — open the selected teammate's transcript and message it directly
- **Escape** — interrupt the selected teammate's current turn
- **`x`** (on a selected teammate) — stop it
- **Ctrl+T** — toggle the task list

**Idle-row behavior (version-sensitive):**
- **v2.1.199+:** an idle row stays visible while *any* teammate/subagent is still working. Once **everything** is idle, idle rows hide after 30s and reappear on the teammate's next turn. The teammate stays running and addressable while hidden.
- **v2.1.181–2.1.198:** an idle row hid 30s after *its own* turn ended, even if others were still working.
- **Before v2.1.181:** idle rows are not hidden.
- **>3 idle at once:** surplus rows collapse into one `N idle agents` row (e.g. `2 idle agents`). Enter expands, Esc collapses. Working / failed / currently-viewed teammates always keep their own row.

---

## 6. Display modes

Two modes, set via [`teammateMode`](#8-configuration-reference):

- **`in-process`** (default) — all teammates run inside your main terminal; navigate via the agent panel. Works in **any terminal**, no setup.
- **Split panes** — each teammate gets its own pane; see everyone at once, click into a pane to interact. **Requires tmux or iTerm2.**

Mode values:
- `"in-process"` — default.
- `"auto"` — split panes when already inside tmux, or iTerm2 with `it2` CLI installed; otherwise falls back to in-process.
- `"tmux"` — enable split-pane mode, auto-detecting tmux vs. iTerm2.
- `"iterm2"` — (v2.1.186+) iTerm2 native split panes explicitly; requires the `it2` CLI (errors with install command if missing).

> Before v2.1.179 the default was `"auto"`. Upgraded sessions that used to open split panes now stay single-terminal unless you set the mode explicitly.

Set globally in `~/.claude/settings.json`:
```json
{ "teammateMode": "auto" }
```
Set per session (experimental flag, not in `--help`):
```bash
claude --teammate-mode auto
```

**Split-pane setup:**
- **tmux** — install via system package manager. Works best on macOS; `tmux -CC` in iTerm2 is the suggested entrypoint.
- **iTerm2** — install the `it2` CLI (`https://github.com/mkusaka/it2`), then enable **iTerm2 → Settings → General → Magic → Enable Python API**.
- **Not supported for split panes:** VS Code integrated terminal, Windows Terminal, Ghostty. (in-process works everywhere.)

---

## 7. Controlling the team

Tell the lead what you want in natural language. It handles coordination, assignment, and delegation.

### Specify teammates and models
Claude picks the count, or you specify:
```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate.
```
- Teammates **don't inherit** the lead's `/model` by default. Set **Default teammate model** in `/config` (pick **Default (leader's model)** to follow the lead).
- A teammate's **model and fast mode are fixed at spawn** — `/model` and `/fast` only change the lead. (v2.1.199+: typing them while viewing a teammate shows a notice that it applies to the lead.)
- **Effort level:** teammates inherit the lead's effort level. `/effort` still applies to a viewed teammate's later turns. (Split-pane inheritance works from v2.1.186.)

### Require plan approval
For risky work, make teammates plan first (read-only plan mode until the lead approves):
```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```
Flow: teammate finishes planning → sends plan-approval request to lead → lead approves, or rejects with feedback → if rejected, teammate revises in plan mode and resubmits → once approved, teammate implements.

The lead decides **autonomously**. Steer it with criteria in your prompt, e.g. *"only approve plans that include test coverage"* or *"reject plans that modify the database schema."*

### Talk to teammates directly
Each teammate is a full, independent session.
- **In-process:** select in panel → Enter → type to message. Plain text and **skills** go to that teammate, but **built-in commands still run in the lead's session**.
- **Split-pane:** click into the pane and interact directly.

### Assign and claim tasks
Shared task list coordinates the team. Task states: **pending → in progress → completed**. Tasks can **depend on** other tasks; a pending task with unresolved dependencies can't be claimed until they complete.
- **Lead assigns:** tell the lead which task goes to which teammate.
- **Self-claim:** after finishing, a teammate picks up the next unassigned, unblocked task on its own.
- Claiming uses **file locking** to prevent race conditions.
- Dependency unblocking is automatic — completing a task unblocks its dependents with no action from you.

### Shut down teammates
Refer to the teammate by name:
```text
Ask the researcher teammate to shut down
```
The lead sends a shutdown request; the teammate can approve (exit gracefully) or reject with an explanation. Shared directories are cleaned up automatically when the session ends — no separate cleanup step.

### Quality gates with hooks
- **`TeammateIdle`** — runs when a teammate is about to go idle. **Exit code 2** → send feedback and keep it working.
- **`TaskCreated`** — runs when a task is being created. **Exit code 2** → prevent creation and send feedback.
- **`TaskCompleted`** — runs when a task is being marked complete. **Exit code 2** → prevent completion and send feedback.

---

## 8. Configuration reference

| Setting / flag | Where | Purpose |
| :--- | :--- | :--- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | env / `settings.json` `env` | Enable agent teams (required). |
| `teammateMode` | `~/.claude/settings.json` | `in-process` (default) / `auto` / `tmux` / `iterm2`. |
| `--teammate-mode <mode>` | CLI flag | Per-session display mode (experimental, hidden from `--help`). |
| **Default teammate model** | `/config` | Model for teammates when the prompt doesn't specify one. |
| `cleanupPeriodDays` | `settings.json` | Retention for the persisted task list (same setting as session transcripts). |

---

## 9. Architecture & internals

| Component | Role |
| :--- | :--- |
| **Team lead** | Main session; spawns teammates and coordinates work. |
| **Teammates** | Separate Claude Code instances, each working assigned tasks. |
| **Task list** | Shared work items teammates claim and complete. |
| **Mailbox** | Messaging system between agents. |

**Naming:** teams/tasks are stored under a session-derived name: `session-` + first 8 chars of the session ID.

**On-disk layout:**
- **Team config:** `~/.claude/teams/{team-name}/config.json`
- **Mailboxes:** `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`
- **Task list:** `~/.claude/tasks/{team-name}/`

**Lifecycle & persistence:**
- Both team config and task list are generated automatically at session startup and updated as teammates join/idle/leave.
- The **team config directory is removed** when the session ends.
- The **task list directory persists** locally (never uploaded), so resumed sessions keep their tasks. Retention = `cleanupPeriodDays`.
- **Don't hand-edit or pre-author** `config.json` — it holds runtime state (session IDs, tmux pane IDs) and your changes are overwritten on the next state update.
- There is **no project-level team config**. A `.claude/teams/teams.json` in your project is treated as an ordinary file, not configuration.

**Mailbox validation:** every entry is validated on read; malformed entries are reported as errors and removed, valid messages still delivered. (Before v2.1.207, one malformed entry caused a repeated per-second error and blocked that mailbox until you deleted the file manually.)

**Members array:** `config.json` has a `members` array (name + agent ID). The lead's entry always has agent type `team-lead`. A teammate carries whatever agent type the lead named at spawn (built-in or subagent definition), or omits the field if none. Teammates can read this file to discover other members.

---

## 10. Reusable roles — subagent definitions as teammates

You can spawn a teammate using a **subagent type** from any scope (project, user, plugin, CLI-defined). Define a role once (e.g. `security-reviewer`, `test-runner`) and reuse it as both a delegated subagent and a team teammate:

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

- The teammate honors the definition's **`tools` allowlist** and **`model`**.
- The definition's body is **appended** to the teammate's system prompt (additional instructions, not a replacement).
- Team coordination tools (`SendMessage`, task management tools) are **always available**, even if `tools` restricts other tools.

> ⚠️ The **`skills` and `mcpServers` frontmatter fields are NOT applied** when a definition runs as a teammate. Teammates load skills and MCP servers from **project + user settings**, like a regular session.

---

## 11. Permissions

- Teammates **start with the lead's permission settings**. If the lead runs `--dangerously-skip-permissions`, so do all teammates.
- You can change **individual teammate modes after spawning**, but **not per-teammate modes at spawn time**.
- **Cross-agent trust boundary:** a `SendMessage` from another agent is labeled as coming from another Claude session, not from you. A teammate **cannot approve a permission prompt or give consent on your behalf**, and a denied teammate **cannot relay the action to another teammate to bypass the check**. In auto mode, a relayed "approval" claim is treated as untrusted input.
- **Teammate permission prompts appear in the lead session** — approve them there yourself.
- **Exception:** plan approval — the lead grants teammate plan approvals **without** a separate prompt to you.
- **Reduce friction:** pre-approve common operations in your permission settings before spawning teammates.

---

## 12. Context & communication

- Each teammate has its **own context window**. On spawn it loads the same project context as a regular session: **CLAUDE.md, MCP servers, skills**, plus the **spawn prompt** from the lead. **The lead's conversation history does NOT carry over.**
- **Automatic message delivery** — messages are delivered to recipients automatically; the lead doesn't poll.
- **Idle notifications** — a teammate that finishes/stops notifies the lead automatically. (v2.1.198+: a teammate whose turn ends on an API error notifies the lead it *failed* and includes the error text, instead of appearing to finish normally.)
- **Shared task list** — all agents see task status and can claim available work.
- **Teammate messaging** — message one teammate by name; **to reach everyone, send one message per recipient**.
- **Names:** the lead assigns each teammate a name at spawn; any teammate can message any other by name. For predictable names you can reference later, **tell the lead what to call each teammate** in your spawn instruction.

---

## 13. Token usage

- Teams use **significantly more tokens** than a single session; usage **scales with the number of active teammates** (each has its own context window).
- Worth it for research, review, and new-feature work. For routine tasks, a single session is more cost-effective.

---

## 14. Best practices

- **Give teammates enough context.** They load project context but not the lead's history. Put task-specific detail in the spawn prompt:
  ```text
  Spawn a security reviewer teammate with the prompt: "Review the authentication module
  at src/auth/ for security vulnerabilities. Focus on token handling, session
  management, and input validation. The app uses JWT tokens stored in
  httpOnly cookies. Report any issues with severity ratings."
  ```
- **Team size: start with 3–5 teammates.** Token cost scales linearly; coordination overhead and conflict risk grow; returns diminish. Three focused teammates often beat five scattered ones. Scale up only when work genuinely benefits from simultaneity.
- **Task sizing:**
  - *Too small* → coordination overhead exceeds benefit.
  - *Too large* → teammates run too long without check-ins, risking wasted effort.
  - *Just right* → self-contained unit with a clear deliverable (a function, a test file, a review).
  - Aim for **5–6 tasks per teammate**. (15 independent tasks → ~3 teammates is a good start.) If the lead isn't creating enough tasks, ask it to split the work smaller.
- **Wait for teammates to finish.** If the lead starts doing the work itself:
  ```text
  Wait for your teammates to complete their tasks before proceeding
  ```
- **Start with research & review** (no code writing): review a PR, research a library, investigate a bug. Shows the value of parallel exploration without parallel-implementation coordination challenges.
- **Avoid file conflicts.** Two teammates editing the same file overwrite each other. Give each teammate a **different set of files**.
- **Monitor and steer.** Check progress, redirect approaches that aren't working, synthesize as findings arrive. Don't let a team run unattended too long.

---

## 15. Use-case example prompts

**Parallel code review** (distinct lenses so they don't overlap):
```text
Spawn three teammates to review PR #142:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

**Competing hypotheses / scientific debate** (adversarial by design — beats anchoring):
```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

---

## 16. Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| **Teammates not appearing** | In-process: check the agent panel (Up/Down → Enter). A disappeared row is *hidden, not stopped* — message it by name to bring it back. Confirm the task was complex enough to warrant a team. For split panes: `which tmux`; for iTerm2 verify `it2` + Python API enabled. |
| **Got subagents, not a team** | Ask again and explicitly request an agent team. |
| **Too many permission prompts** | Pre-approve common operations in permission settings before spawning. |
| **Teammates stopping on errors** | Select the teammate → Enter (or click pane) to read output; give instructions directly or spawn a replacement. (v2.1.198+: a message from the lead/another teammate wakes an in-process teammate waiting to retry a failed API request, so it retries immediately.) |
| **Lead shuts down before work is done** | Tell it to keep going; tell it to wait for teammates before proceeding if it's doing the work itself. |
| **Orphaned tmux session** | `tmux ls` then `tmux kill-session -t <session-name>`. |
| **Stuck / lagging task status** | Teammates sometimes don't mark tasks complete, blocking dependents. Verify the work is done, then update status manually or tell the lead to nudge the teammate. |

---

## 17. Limitations (experimental)

- **No session resumption with in-process teammates** — `/resume` and `/rewind` don't restore them. After resuming, the lead may message teammates that no longer exist; tell it to spawn new ones.
- **Task status can lag** — teammates sometimes fail to mark tasks completed, blocking dependents.
- **Shutdown can be slow** — teammates finish their current request/tool call before shutting down.
- **One team per session** — exactly one team, scoped to the session. No additional named teams, no sharing across sessions.
- **No nested teams** — teammates can't spawn their own teammates; only the lead manages the team.
- **No background subagents from in-process teammates** — their subagents run in the foreground; `run_in_background` / `background: true` returns an error (a teammate's background work can't outlive the lead's process).
- **Lead is fixed** — the main session leads for its lifetime; no promoting a teammate or transferring leadership.
- **Permissions set at spawn** — all teammates start with the lead's mode; change individual modes only after spawning.
- **Split panes require tmux or iTerm2** — not supported in VS Code integrated terminal, Windows Terminal, or Ghostty. In-process works anywhere.

> 💡 **CLAUDE.md works normally** — teammates read `CLAUDE.md` from their working directory. Use it to give project-specific guidance to all teammates.

---

## 18. Quick decision checklist

Before spawning a team, confirm:

- [ ] The task genuinely benefits from **parallel exploration** (research/review/new-feature/cross-layer/competing-hypotheses).
- [ ] Workers need to **talk to each other** — otherwise use subagents.
- [ ] Work can be split so teammates **don't edit the same files**.
- [ ] Each teammate's spawn prompt carries the **context it needs** (history doesn't transfer).
- [ ] Team size is **3–5**, with roughly **5–6 tasks each**.
- [ ] For risky work, **plan approval** is required, with approval **criteria** in the prompt.
- [ ] The **token cost** is justified vs. a single session.

---

## 19. Related

- **Subagents** — lightweight delegation for research/verification within your session (no inter-agent coordination).
- **Git worktrees** — run multiple sessions yourself, manually, without automated team coordination.
- **Hooks** — `TeammateIdle`, `TaskCreated`, `TaskCompleted` for quality gates.

_Guide compiled from the official Claude Code agent-teams documentation. Version-specific behavior noted inline; verify against the live docs for the newest changes: https://code.claude.com/docs/en/agent-teams_
