---
description: 
globs: implementation-plan.md
alwaysApply: false
---
---
ruleType: Manual                 # Attach manually (@implementation-plan.md) when discussing specific steps or phases.
filePatterns: [ "implementation-plan.md" ] # Associate rule with the plan file for clarity.
description: Guides the AI on how to interpret and utilize the step-by-step implementation plan when attached. Focuses on context, dependencies, files, actions, and completion reminders.
---
# Guidance for Using `implementation-plan.md`

When `implementation-plan.md` is attached to the chat or referenced:

1.  **Focus on Relevant Steps:** Prioritize the specific Phase(s) and Step(s) mentioned in the user's query or the immediate context of the conversation.
2.  **Understand Dependencies:** Pay close attention to the `Step Dependencies` listed for the relevant step(s). Assume prerequisites are met unless the query suggests otherwise, but be aware of what components or data are expected to exist from prior steps (e.g., `internalUserId`, Prisma client, specific UI components).
3.  **Identify Files and Scope:** When asked to generate code or modifications for a step, primarily target the files listed under the `Files:` section for that step. Understand the scope of changes described in the `Task`.
4.  **Cross-Reference Requirements:** Connect the `Task` description to details potentially found in `wavhaven-tech-spec.md` (if also attached or known) and other relevant project rules (@mention other rules if helpful). For example, link task requirements to specific Prisma models, server action names, required roles (Clerk/Guest rules), UI component conventions, etc.
5.  **Distinguish Code vs. User Actions:** Recognize tasks specified under `User Action:`. These often involve running terminal commands, configuring `.env` files, or interacting with external dashboards (Supabase, Clerk, Stripe). Clearly state when a manual action is needed instead of providing direct code generation for that part.
6.  **Sequential Context:** Understand that the plan represents a development sequence. Code generated for a later step should generally assume the successful completion of its dependencies.
7.  **Provide Contextual Code:** When generating code snippets, ensure they fit within the context of the specified files and implement the logic described in the relevant `Task`, considering inputs/outputs expected from dependent steps.
8.  **Remind User to Update Checklist:** After successfully providing assistance (code, explanation, guidance) that fulfills the core requirement of a specific numbered step from the plan, **mark that step as complete** (e.g., change `[ ]` to `[x]`) in their `implementation-plan.md` file.