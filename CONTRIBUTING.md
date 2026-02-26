# Contributing to RAG Chatbot Builder

Thanks for your interest in contributing! This project turns career documents into AI-powered chatbots, and we welcome help making it better.

## Ways to Contribute

**Report bugs** — If something doesn't work as described in the docs, open an issue. Include what you expected vs. what happened, and your setup details (Node version, OS, Cloudflare plan).

**Improve documentation** — Spotted a typo, unclear instruction, or missing step in the quickstart? PRs for docs are always welcome.

**Add examples** — Built a knowledge base for a use case we haven't covered? Share a sanitized example in `examples/`.

**Fix bugs or add features** — Check the issues list for anything tagged `good first issue` or `help wanted`.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a branch for your change: `git checkout -b fix/description-of-change`
4. Make your changes
5. Run the validator to check any knowledge base changes:
   ```bash
   node scripts/validate.js path/to/your/knowledge.jsonl
   ```
6. Run the test suite:
   ```bash
   cd templates/backend
   npm install
   npm test
   ```
7. Commit with a clear message describing what and why
8. Push to your fork and open a Pull Request

## Code Style

- Use clear, descriptive variable names (no single-letter variables)
- Add comments for non-obvious logic
- Keep functions focused — one function, one job
- Follow existing patterns in the codebase

## Knowledge Base Contributions

If you're contributing example knowledge bases or schema changes:

- Follow the schema in `docs/SCHEMA.md`
- Run `scripts/validate.js` against your JSONL — it should pass with zero errors
- Use realistic but fictional data in examples (don't include real people's information)
- Include all 5 entry types if creating a complete example

## Pull Request Guidelines

- Keep PRs focused on a single change
- Describe what you changed and why in the PR description
- If your change affects the quickstart workflow, test the full flow
- Update documentation if your change affects how users interact with the toolkit

## Questions?

Open an issue with the `question` label. We'd rather answer a question than have you struggle in silence.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
