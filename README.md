# Tokenomist

Tokenomist picks the Claude model for each [Spec Kit](https://github.com/github/spec-kit) spec, so your Claude Code usage limit lasts longer. Simple specs go to Haiku, complex ones to Opus. The model stays the same from plan to implement.

## How it works

1. **Writing the spec** (`/speckit-specify`, `/speckit-clarify`): uses a fixed model, Sonnet by default.
2. **Spec ready**: Tokenomist scores the spec on your machine. It counts requirements, user stories, entities, integrations, open questions and edge cases. No model call is made. It then suggests a level and a model, for example *Complex → Opus*.
3. **You approve or pick another model.** The model is then **locked** for `plan → tasks → implement`. The status bar shows `🔒 spec · level · model`.
4. **All tasks done**: Tokenomist asks whether to finish the spec. When you confirm, it puts back the model you had before it started. It also shows a summary with the estimated savings compared with using Opus for everything.

> **Note:** Claude Code reads the model only when a conversation starts. A lock applies to **new** conversations, so Tokenomist offers to start one. If you run `/speckit-plan` without a lock, or `/speckit-tasks` in an old conversation, Tokenomist asks first.

## Modes

| Mode | Simple | Medium | Complex |
|---|---|---|---|
| Saver | Haiku | Haiku | Sonnet |
| Balanced (default) | Haiku | Sonnet | Opus |
| Quality | Sonnet | Opus | Opus |

When a score is close to the threshold above it, the stronger model is chosen. Settings:

- `tokenomist.mode`: the table above.
- `tokenomist.thresholds.medium` / `.complex` / `tokenomist.borderlineMargin`: when a score counts as medium or complex (defaults 35 / 65 / 5).
- `tokenomist.writingModel.followMode`: write specs with the mode's model (Saver → Haiku, Quality → Opus) instead of always Sonnet.

### Custom mode

Pick **Custom** in *Tokenomist: Open Setup* or set `tokenomist.mode` to `custom`. You can then give each level its own Claude model, plus a model for spec writing. You can do this in the setup flow, or with the `tokenomist.custom.simple`, `.medium`, `.complex` and `.writing` settings. Any cell you leave empty uses the Balanced value.

| Allowed value | Example | Savings weight (Opus = 1) |
|---|---|---|
| Aliases | `haiku`, `sonnet`, `opus` | 0.2 / 0.6 / 1.0 |
| 1M-context variants | `sonnet[1m]`, `opus[1m]` | same as the family |
| Opus for planning, Sonnet otherwise | `opusplan` | 0.8 |
| Full Claude ids | `claude-opus-5-5`, `claude-sonnet-5-5[1m]` | from the family in the id |
| Fable | `fable`, `fable[1m]`, `best` | unknown: no savings estimate |

- Values are trimmed and lower-cased.
- Anything that is not a Claude model, such as `gpt-5`, `default` or `opus[2m]`, is rejected, and the last valid value stays in use.
- **Fable** and `best` are billed from usage credits outside your subscription limit. Claude Code asks for a one-time consent in an interactive `/model` session, and Tokenomist warns you once when you pick one.
- While a spec is locked, switching with `/model` to the same value (for example `opus[1m]`) is not questioned. Switching to a different value or variant asks first.

## Commands

| Command | What it does |
|---|---|
| Tokenomist: Analyze Active Spec | Score the active spec now and review the suggestion |
| Tokenomist: Review Model Recommendation | Approve or change the suggested model and lock it |
| Tokenomist: Finish Spec | Put back your previous model and show the summary |
| Tokenomist: Show Usage Summaries | Model and estimated savings for every finished spec |
| Tokenomist: Open Setup | Choose a mode |
| Tokenomist: Remove Tokenomist from Claude Code Settings | Put back your model and remove Tokenomist's entries |

## What Tokenomist changes in Claude Code

Tokenomist only writes to the workspace's `.claude/settings.local.json`. Claude Code keeps that file out of git, and Tokenomist adds it to `.git/info/exclude` if it creates the file. It writes:

- the `model` key, only while a spec is being written or is locked. Its earlier value is put back exactly.
- `http` hooks for `UserPromptExpansion`, `PreModelSwitch` and `PostModelSwitch`. They point to a listener inside VS Code that accepts connections only from this machine (`127.0.0.1`) and checks a token. If VS Code is closed, Claude Code ignores the hooks and works normally.

Your own settings and hooks are left untouched. The only time Tokenomist edits `~/.claude/settings.json` is to put back its `model` key, after a `/model` switch that you accepted as the new lock wrote to it. Uninstalling the extension removes Tokenomist's entries. So does the *Remove Tokenomist from Claude Code Settings* command.

Tokenomist stays passive and writes nothing if:
- Claude Code is not installed,
- the workspace has no `.specify/feature.json`,
- the model is set by `ANTHROPIC_MODEL` or managed settings,
- or `settings.local.json` is not valid JSON.

## Privacy

Spec analysis runs entirely on your machine. Tokenomist sends nothing over the network and collects no telemetry.

## Requirements

VS Code 1.94 or later, with the Claude Code extension installed and signed in.

---

### Türkçe özet

Tokenomist, Spec Kit spec'lerinin karmaşıklığını yerelde ölçer ve uygun Claude modelini önerir. Onayladığın model plan → tasks → implement boyunca kilitli kalır. Spec bitince önceki modelin geri yüklenir ve tahmini tasarruf gösterilir. Kilit **yeni konuşmalarda** geçerli olur. Arayüz, VS Code dil ayarına göre Türkçe veya İngilizce görünür.
