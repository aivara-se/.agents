---
name: development
description: Always follow these guidelines when making changes to the codebase
---

Build the smallest thing the task asks for.

- YAGNI before DRY.
- Never over-engineer or add unnecessary complexity.
- Never add unnecessary features or dependencies.
- Never add unnecessary tests or verification steps.

## Technology stack

- TypeScript is the primary language used in the codebase, do not use JavaScript for new code.
- Bun is the preferred runtime for production code and scripts.
- Do not use Node.js, Python, Shell scripts, or any other runtimes not mentioned above.

## The coding style

- Only use `bun fmt` to format your code with default settings, do not customize.
- Follow any additional existing code style and conventions you find in the codebase.

You must follow these additional coding style guidelines:

- Never add any empty lines inside functions and blocks or consecutive multiple empty lines anywhere.
- Do not export functions, types, etc., unless it is absolutely necessary to do so.

You must follow these guidelines when writing code comments:

- Never comment historical facts, intermediate states, or obvious code behavior.
- Never add inline comments, always provide context through meaningful code and commit messages.
- Always add a block comment above exported types, functions, classes, methods, and important constants.

```ts
/**
 * Adds two numbers together.
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

## Version Control

You must follow these guidelines when creating branches:

- Only use lowercase letters, numbers and hyphens.
- Prefix with the jira ticket id in lowercase letters, e.g., `abc-123`
- Follow with a 2-4 word descriptive name, e.g., `abc-123-fix-bug`.

You must follow these guidelines when creating commits:

- Only use lowercase letters except for acronyms, names, and proper nouns
- Use Conventional Commits format: `<type>: <description>`, e.g., `chore: update Bun version to v1.0.0`
- Never commit to the `main` branch, always create a new branch for your changes.
- Always commit under your own name, never impersonate others.

You must follow these guidelines when creating pull requests:

- Title: concise and descriptive, e.g., `ABC-123: fix bug in login flow`
- Description: provide context and details about the changes made in 2-3 sentences.
