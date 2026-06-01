# AGENTS.md

## Project Summary

This repository is `cambridge-pseudocode-runner`, a pure frontend browser app for running Cambridge-style pseudocode for students.

Current stack:
- React 19
- Vite
- TypeScript
- No backend
- No real filesystem access
- GitHub Pages compatible

The app is currently a Phase 19 prototype. It includes a small in-browser interpreter plus a student-facing UI with code input, standard input, output, errors, variables, and virtual file contents.

## Hard Constraints

- Keep this a pure frontend app.
- Do not add backend code, servers, databases, or real local file access.
- Do not use `eval` or the `Function` constructor.
- Virtual file handling must remain in-memory per Run execution only.
- Keep the interpreter readable and incremental. Avoid broad rewrites unless clearly necessary.
- Preserve `runPseudocode(code: string, inputText?: string)` unless a task explicitly requires an API change.
- Public result shape is currently:

```ts
{
  output: string[]
  errors: string[]
  variables: Record<string, unknown>
  files: Record<string, string[]>
}
```

## File Deletion Rule

Do not batch delete files or directories.

Do not use:
- `del /s`
- `rd /s`
- `rmdir /s`
- `Remove-Item -Recurse`
- `rm -rf`

If a file must be deleted, delete only one explicit file path at a time, for example:

```powershell
Remove-Item "D:\path\to\file.txt"
```

If bulk deletion seems necessary, stop and ask the user to handle it manually.

## Commands

Use `npm.cmd` in PowerShell when possible.

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

The production build command is:

```powershell
npm.cmd run build
```

Vite is configured for GitHub Pages in `vite.config.ts`:

```ts
base: '/cambridge-pseudocode-runner/'
```

## Project Layout

```text
src/
  App.tsx                  React UI shell and default example
  main.tsx                 React entry point
  styles.css               App styling
  engine/
    types.ts               AST, token, runtime result, and shared type definitions
    tokenizer.ts           Expression tokenizer
    parser.ts              Line parser, AST builder, comment stripping, friendly syntax tolerance
    interpreter.ts         Runtime evaluator/interpreter
    runPseudocode.ts       Public engine API
    errorHelp.ts           Adds student-friendly reason/suggestion text to errors
    examples.ts            Internal example programs and expected output/errors
```

There is no test framework at the moment. `examples.ts` is the lightweight reference set for scenarios.

## UI Notes

`src/App.tsx` owns:
- default pseudocode sample
- standard input textarea
- Run button
- output panel
- error panel
- variables panel
- virtual files panel

`src/styles.css` owns the app styling. Keep it quiet, readable, and classroom/tool oriented. Avoid adding external UI libraries.

Errors are still `string[]`, but `errorHelp.ts` enriches many errors into this multi-line format:

```text
Line X: Main error.
Possible reason: ...
Suggestion: ...
```

The Error panel parses those strings and renders each as a clean card. Plain string errors should still display normally.

## Engine Flow

The public entry point is:

```ts
runPseudocode(code: string, inputText = ''): RunResult
```

Flow:
1. `parsePseudocode` in `parser.ts`
2. `interpret` in `interpreter.ts`
3. `addFriendlyHelp` in `errorHelp.ts`
4. return `RunResult`

Parser responsibilities:
- remove comments outside strings
- ignore blank lines
- normalize spaced end keywords such as `END IF` to `ENDIF`
- build AST statements and expressions
- preserve source line numbers in errors

Interpreter responsibilities:
- execute statements
- manage variables, arrays, records, procedures, functions, and virtual files
- evaluate expressions
- enforce type checks
- enforce execution/call-depth limits
- return public variables/files for UI display

## Supported Pseudocode Features

Core values and types:
- `INTEGER`
- `REAL`
- `STRING`
- `BOOLEAN`
- `CHAR`

Declarations:
- scalar variables
- one-dimensional and two-dimensional arrays of scalar values
- one-dimensional arrays of records
- record-style user-defined types with scalar fields only

Statements:
- `DECLARE`
- assignment using `←`, `<-`, or tolerant statement-level `=`
- `INPUT`
- `OUTPUT`, including comma-separated items
- `IF` / `ELSE` / `ENDIF`; `THEN` is optional
- `FOR` / `NEXT`; `NEXT` counter is optional
- `WHILE` / `ENDWHILE`
- `REPEAT` / `UNTIL`
- `CASE OF` / `OTHERWISE` / `ENDCASE`
- `TYPE` / `ENDTYPE`
- `PROCEDURE` / `ENDPROCEDURE` / `CALL`
- `FUNCTION` / `ENDFUNCTION` / `RETURN`
- virtual file statements: `OPENFILE`, `READFILE`, `WRITEFILE`, `CLOSEFILE`

Friendly syntax currently accepted:
- full-line comments: `// comment`, `# comment`
- inline comments outside strings
- lowercase/mixed-case keywords and basic type names
- `END IF`, `END WHILE`, `END PROCEDURE`, `END FUNCTION`, `END TYPE`, `END CASE`
- assignment with `=`, only when parsed as a clear assignment statement

Built-in functions include:
- `LENGTH`
- `LEFT`
- `RIGHT`
- `MID`
- `UCASE`
- `LCASE`
- `INT`
- `ROUND`
- `RANDOMBETWEEN`
- `EOF`
- `ASC`
- `CHR`

String indexing:
- `Name[1]` is 1-based and returns a `CHAR`-style one-character string.
- Assignment to string characters is intentionally not supported.

## Important Limitations

Do not silently implement these unless explicitly requested:
- backend code
- real file access
- classes/OOP
- inheritance
- pointers
- databases
- random access files
- enumerated types
- sets
- BYREF function parameters
- BYREF array parameters
- two-dimensional arrays of records
- nested record fields
- array fields inside records
- assignment to string characters

## Error Handling Guidelines

Keep errors line-numbered when possible.

When adding a new common error, consider adding a mapping in `src/engine/errorHelp.ts` so students see:
- main error
- possible reason
- suggestion

Keep suggestions accurate and conservative. Do not guess too much.

## Implementation Guidelines

- Prefer extending the existing AST types in `types.ts`.
- Keep parsing changes in `parser.ts` and runtime changes in `interpreter.ts`.
- Keep `tokenizer.ts` limited to expression tokenization.
- Do not use ad hoc string parsing in the interpreter when a parsed AST node is appropriate.
- Keep examples in `src/engine/examples.ts` updated for new features.
- Run `npm.cmd run build` after code changes.

## Current Default UI Example

The current default sample demonstrates friendly syntax:

```pseudocode
# Friendly syntax example

declare score : integer
declare i : integer
score = 85

if score >= 80
    output "High pass"
end if

for i ← 1 to 3
    output "Attempt ", i
next

OUTPUT "URL example: http://example.com"
```

Expected output:

```text
High pass
Attempt 1
Attempt 2
Attempt 3
URL example: http://example.com
```

