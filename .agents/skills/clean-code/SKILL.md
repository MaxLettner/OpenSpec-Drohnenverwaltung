---
name: clean-code
description: A cleanliness requirement for writing, changing and reviewing code in any language - simplicity, consistency with the existing codebase, foresight, tool choice, function structure, layout, comments, naming and tests. Use before writing or modifying code, when reviewing a diff or pull request, when choosing a library or tool, when deciding whether to extract a function or share an abstraction, when tempted to add an option or abstraction "just in case", when a change does not fit the project's existing conventions, and in a final self-check before handing work over. Apply it even when the user does not say "clean code" - any non-trivial code task benefits.
---

# Clean code

Audience: any agent that writes, changes or reviews code. This is an
obligation on the author, not a metric: no tool measures it, and nothing here
is satisfied by producing less.

The rules are numbered so that proposals and reviews can cite them (for
example "violates CL-10"). Numbers are stable; rules change only with the user.
How a rule is met in a particular language is the project's own convention and
the language's idiom, not something this skill prescribes.

## Simplicity

- **CL-01** Simple means few interleaved concepts. It does not mean little
  output, and it does not mean avoiding capable tools or features. Produce the
  version a reader understands fastest and can change safely. Dense shortcuts
  and familiar-but-tangled work both fail this.
- **CL-02** Use a feature, library, standard part or pattern where it states
  intent more directly than hand-made work. Avoid cleverness that needs a note
  to decode.

## Consistency

- **CL-03** Solve a problem the way the project already solves it. Before
  starting, read the project's documented conventions (contributing guide,
  agent/instruction files, style config) and the nearest existing code that
  does the same job. Predictability is the goal: every unexplained difference
  makes the reader ask whether it is deliberate.
- **CL-04** If no convention exists, or the existing one does not fit, do not
  diverge silently. Prefer an existing approach or an extension of one.
  Otherwise choose one deliberately, follow it consistently from then on, and
  tell the user so it can be recorded.
- **CL-05** Reuse an existing piece only when its edge cases match yours. For
  a near-match, make a separate one and let its name state the difference.

## Structure

- **CL-06** Functions are deep and honest.
  - **Deep:** the name and signature are simpler than the body, so a caller
    never needs to open it.
  - **Honest:** the signature tells the whole story: inputs, result and how it
    fails. There are no hidden reads of the clock, environment, files or
    globals, and no mutation of arguments the caller does not expect.
- **CL-07** Extract a block into a function, even if it is used once, when its
  interface is narrower than its body (few inputs, at most one result) and its
  name adds information. Do not extract pass-throughs or pieces of one
  algorithm that only make sense together.
- **CL-08** Keep effects at the edges. Effects are I/O, time, randomness,
  logging, environment and processes. Logic below the edges takes values and
  returns values. Never call an effect from a leaf of an otherwise pure call
  tree; pass the value in instead. One impure leaf makes every caller impure
  and untestable in isolation.
- **CL-09** One level of abstraction per function: do not mix high-level steps
  with index arithmetic, parsing or protocol details in one body.
- **CL-10** An abstraction shared by several call sites needs a name that fits
  every site. Merge duplication only when it is one concept written twice, not
  code that merely looks alike today. Duplication is cheaper than the wrong
  abstraction.
- **CL-11** Build nothing speculative: no options, flags, parameters, extension
  points, wrappers or classes that current callers do not need. Add no checks
  for states that cannot occur, and do not swallow errors. Validate at trust
  boundaries (user input, files, network, device data) and let internal
  errors surface.

## Layout and comments

- **CL-12** Group code into paragraphs: a blank line separates the steps of one
  idea, and lines that belong together stay together. Order a module the way
  the project's other modules are ordered.
- **CL-13** Comments say why: constraints, units, sources (spec or datasheet
  section, requirement or decision ID), non-obvious invariants and deliberate
  shortcuts. They do not narrate what the code does or what was changed. A
  docstring states what a function promises, not its signature again.
- **CL-14** Names carry meaning and units (`delay_ms`, `rail_v`) and follow the
  project's naming.

## Foresight

- **CL-15** Do now what is right under any future: decomposition, naming,
  seams and the recorded reason why. It costs least while the context is fresh,
  and rebuilding that context later costs far more.
- **CL-16** Do not build for one guessed future, such as a second backend, a
  generic layer or a plugin system, until it is needed.
- **CL-17** One-way doors get deliberate forethought. These are wire formats,
  persisted data, file formats and shared interfaces. Leave cheap seams there,
  such as version fields and reserved fields, and record them where the
  interface is documented.
- **CL-18** A deliberate shortcut names its ceiling and the trigger for
  upgrading it, for example `# Linear scan; index it past ~10k parts.` Where it
  is cheap, add a check or warning that fires when the ceiling is crossed.

## Tools

- **CL-19** Before adding work, go down the tool ladder and stop at the first
  rung that fits:
  1. Is it needed at all?
  2. Does the project already have it?
  3. Does the language's standard library, or standard practice for the
     stack, provide it?
  4. Does a tool or library the project already uses provide it?
  5. Does a new library or tool provide it?
  6. Only then make it.

  Choose the best tool for the job, within reason. A tool that saves a little
  costs more in setup, size and understanding than it returns. One that
  replaces a hard, error-prone piece usually pays.
- **CL-20** Every language, library and external tool in use is recorded where
  the project records dependencies and setup (manifest, README, setup docs),
  with its job and its reason when that is not obvious. Libraries are the
  author's choice within CL-19. A new programming language needs the user's
  decision.
- **CL-21** When a stronger tool replaces an existing one, say so and stop
  adding uses of the old one. Migrate its dependents as part of the
  replacement or track the migration explicitly. Two tools may do one job only
  while such a migration is tracked.

## Change

- **CL-22** Reflect while working. When new work shows that structure, a
  convention or a tool choice no longer fits, tell the user (in the handoff or
  as a follow-up item). Do not ignore it, and do not restructure beyond the
  task.
- **CL-23** Before removing something that looks unused or over-flexible, find
  out why it exists: history, decisions, interfaces, calibration values.

## Tests

- **CL-24** Tests check properties and contracts through public interfaces,
  not a transcript of the implementation. A refactor that keeps behaviour must
  not break them; a change in behaviour must. Prefer property checks for pure
  functions, and factor repeated setup into fixtures.

## Procedure

1. **Before starting:** read the project's documented conventions and open the
   nearest existing code that does the same job.
2. **While working,** apply the rules. Where a rule and an established project
   convention conflict, follow the convention and raise the conflict instead of
   silently picking a side.
3. **When no convention exists or it does not fit,** follow CL-04.
4. **Before handing over,** reread the change against the rules. This is a
   self-check, not verification: say in the handoff what was not checked.

## Reviewing

When reviewing code, check it against these rules and the project's
conventions. Cite the rule ID for every finding, for example "CL-11:
`retryCount` parameter has no caller that sets it". Report findings as
suggestions for the user to decide, not as silent rewrites.
