# WorknetVideoDocumentation

## Additional Instructions

You now have access to Skills. Skills are specialized instruction sets stored as markdown files that extend your capabilities. When a task matches a skill's purpose, load and follow that skill's instructions.

### Skill Structure

Each skill contains:
- **SKILL.md**: Core instructions with YAML frontmatter
- **scripts/**: Optional executable code for deterministic tasks
- **references/**: Optional detailed documentation
- **assets/**: Optional templates, images, or files

### How to Use Skills

1. **Match task to skill**: Check the skill list below for relevant descriptions
2. **Load the skill**: Read the SKILL.md file when needed
3. **Follow instructions**: Apply the skill's guidelines exactly
4. **Use resources**: Reference bundled scripts/docs/assets as directed
5. **Combine skills**: Use multiple skills together when appropriate

### When to Load a Skill

- Task matches a skill's description
- User mentions a skill by name
- Task requires specialized knowledge (file formats, workflows, domain expertise)

### Key Principles

- **Load only when needed** - Don't load skills for simple tasks
- **Apply naturally** - Don't announce "loading skill X" unless relevant
- **Use bundled resources** - Scripts and references are there to help
- **Be precise** - Skills often include exact patterns and code to follow

### Available Skills

Below is the list of skills you can access. Load a skill by reading its SKILL.md file when the task matches:

- [ag-dir](../../kevinslin-skills/active/ag-dir/SKILL.md): Create or audit Agent Project Directory docs and status structure.
- [ag-judge](../../kevinslin-skills/active/ag-judge/SKILL.md): Judge agent work as approve, reject, or escalate.
- [ag-learn](../../kevinslin-skills/active/ag-learn/SKILL.md): Improve skills from observed agent friction in sessions, PRs, or audits.
- [ag-ledger](../../kevinslin-skills/active/ag-ledger/SKILL.md): Record, sync, and query local agent activity ledger entries.
- [ag-task](../../kevinslin-skills/active/ag-task/SKILL.md): Read a Markdown task file, parse frontmatter, split work by level-2 headings outside code fences, and execute each section with subagents while keeping level-3 headings as ordered follow-on instructions for the same subagent.
- [agent-browser](../../kevinslin-skills/active/agent-browser/SKILL.md): Automate browser navigation, interaction, screenshots, and extraction.
- [audit](../../kevinslin-skills/active/audit/SKILL.md): Audit a repo for code quality issues using focused heuristics.
- [babysit-pr](../../kevinslin-skills/active/babysit-pr/SKILL.md): Watch a pull request and CI until green or needing fixes.
- [claw-integ](../../kevinslin-skills/active/claw-integ/SKILL.md): Run live OpenClaw integration proof against a named claw gateway profile with showboat-v2.
- [claw-repro](../../kevinslin-skills/active/claw-repro/SKILL.md): Reproduce and fix OpenClaw issues with Showboat proof, managed implementation, and repo-local integration gateways.
- [claw-score](../../kevinslin-skills/active/claw-score/SKILL.md): Audit an OpenClaw maturity-scorecard surface into an evidence-backed component score report. Use when given a surface from an OpenClaw maturity-scorecard.md and asked to score coverage, quality, readiness, or generate a detailed surface report plus per-component subreports.
- [create-task](../../kevinslin-skills/active/create-task/SKILL.md): Create tracked tasks or issues with session context.
- [debug-test-failure](../../kevinslin-skills/active/debug-test-failure/SKILL.md): Determine whether test failures come from the current branch.
- [docs-audit-v2](../../kevinslin-skills/active/docs-audit-v2/SKILL.md): Audit documentation rewrites with JSON-first, block-scoped, line-level coverage mappings. Use for moved-section checklists, preservation proofs, migration maps, or line-by-line coverage reviews of Markdown/MDX docs.
- [docs-refactor-v2](../../kevinslin-skills/active/docs-refactor-v2/SKILL.md): Refactor an existing OpenClaw docs page with source-audited preservation, restructuring, and verification.
- [docs-write-v2](../../kevinslin-skills/active/docs-write-v2/SKILL.md): Write or review high-quality OpenClaw developer documentation.
- [docstyle](../../kevinslin-skills/active/docstyle/SKILL.md): Write or review Stripe-style developer documentation.
- [docx](../../kevinslin-skills/active/docx/SKILL.md): Create, edit, review, or extract Word docx documents.
- [docy](../../kevinslin-skills/active/docy/SKILL.md): Load reusable reference docs for coding-related agent work. Always load in context at beginning of session.
- [fast-mode](../../kevinslin-skills/active/fast-mode/SKILL.md): Run in fast-mode with only explicitly allowed skills.
- [fin](../../kevinslin-skills/active/fin/SKILL.md): Finalize completed PR or local checkout work.
- [find-links](../../kevinslin-skills/active/find-links/SKILL.md): Fill TODO, placeholder, or missing Markdown links.
- [gen-notifier](../../kevinslin-skills/active/gen-notifier/SKILL.md): Send exactly one final-state desktop notification before the final report.
- [grok](../../kevinslin-skills/active/grok/SKILL.md): Trace how something works with an investigator subagent and a skeptical reviewer subagent.
- [hn-title](../../kevinslin-skills/active/hn-title/SKILL.md): Create or improve Hacker News submission titles.
- [icon-gen](../../kevinslin-skills/active/icon-gen/SKILL.md): Generate project icons, logos, or inline brand marks.
- [integ](../../kevinslin-skills/active/integ/SKILL.md): Use only when explicitly invoked to manage ~/integ/[project] harness repos.
- [issue-sweep](../../kevinslin-skills/active/issue-sweep/SKILL.md): Sweep recent OpenClaw GitHub issues, filter for real unstarted bugs, and write a report to $mem claw/main reports.
- [land](../../kevinslin-skills/active/land/SKILL.md): Land completed work and update AGD status docs.
- [linear](../../kevinslin-skills/active/linear/SKILL.md): Manage Linear issues and projects through &#x60;linear-cli&#x60;.
- [link](../../kevinslin-skills/active/link/SKILL.md): Link the current Codex session to a durable Markdown task note.
- [mature](../../kevinslin-skills/active/mature/SKILL.md): Add or update CLI maturity ratings in repo docs.
- [mem](../../kevinslin-skills/active/mem/SKILL.md): Manage user-defined knowledge bases when &#x60;$mem&#x60; is invoked or durable knowledge is being saved.
- [op](../../kevinslin-skills/active/op/SKILL.md): Use 1Password CLI safely for agent credential workflows.
- [pdf](../../kevinslin-skills/active/pdf/SKILL.md): Create, edit, extract, or analyze PDF documents.
- [proofread](../../kevinslin-skills/active/proofread/SKILL.md): Proofread publish-ready drafts for clarity, correctness, and links.
- [sc](../../kevinslin-skills/active/sc/SKILL.md): Create or update skills and SKILL.md content.
- [schemas](../../kevinslin-skills/active/schemas/SKILL.md): List, inspect, validate, or materialize bundled file schemas.
- [secrets](../../kevinslin-skills/active/secrets/SKILL.md): Load local dotenvx credential sets for agent workflows.
- [showboat](../../kevinslin-skills/active/showboat/SKILL.md): Create executable Showboat demos that prove behavior.
- [showboat-v2](../../kevinslin-skills/active/showboat-v2/SKILL.md): Create schema-backed Showboat integration proofs with scenario summaries, raw artifacts, and replayable verification.
- [slack-notify](../../kevinslin-skills/active/slack-notify/SKILL.md): Send explicit Slack notifications through &#x60;slack-post&#x60;.
- [slack-report](../../kevinslin-skills/active/slack-report/SKILL.md): Generate incremental Slack digests for channels, topics, and categories.
- [spec-simulate](../../kevinslin-skills/active/spec-simulate/SKILL.md): Simulate implementing a spec against the real source code, then grade the spec as correct, comprehensive, and simple. Use only when explicitly invoked as $spec-simulate or when the user asks to simulate implementation from a spec.
- [spec-template](../../kevinslin-skills/active/spec-template/SKILL.md): Turn an existing concrete spec into a reusable generic spec template. Use when asked to create a generic spec, template spec, reusable implementation template, or generalized version of a spec from a specific implementation such as one plugin, channel, integration, feature, or PR.
- [specy](../../kevinslin-skills/active/specy/SKILL.md): Create structured specs and code exploration docs.
- [sudocode](../../kevinslin-skills/active/sudocode/SKILL.md): Write sudocode from real code for docs and specs.
- [sw-ctrl](../../kevinslin-skills/active/sw-ctrl/SKILL.md): Coordinate explicitly requested subagent work as a manager.
- [sw-loop](../../kevinslin-skills/active/sw-loop/SKILL.md): Run explicitly requested swarm workflows for feature delivery.
- [tool](../../kevinslin-skills/active/tool/SKILL.md): Install or document local command-line tools end to end.
- [imagekit-upload](../../kevinslin-skills/active/tool-imagekit-upload/SKILL.md): Upload existing images to ImageKit and return CDN URLs.
- [tech-doc-writer](../../kevinslin-skills/active/write-tech-docs/SKILL.md): Write or review technical documentation.
- [xlsx](../../kevinslin-skills/active/xlsx/SKILL.md): Create, edit, analyze, or visualize spreadsheet files.

