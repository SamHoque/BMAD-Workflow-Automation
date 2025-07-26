# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bun TypeScript application that automates BMAD project workflows using Claude Code. It provides a complete story development pipeline from draft creation through commit and deployment, with crash recovery and Discord notifications.

## Development Commands

**Runtime & Package Manager**: This project uses `Bun` with TypeScript

```bash
# Install dependencies
bun install

# Run the application in current directory
bun run index.ts

# Run the application with specific project directory
bun run index.ts /path/to/bmad/project
```

**Note**: No test framework is currently configured. The package.json test script outputs an error message.

## Architecture

### Core Components

- **index.ts**: Thin CLI entry point that handles arguments and starts the workflow
- **src/bmad.ts**: Main BMAD workflow class with story management, state persistence, and analytics
- **src/claude.ts**: Claude Code process management with async messaging
- **src/git.ts**: Git operations using simple-git library
- **src/webhook.ts**: Discord webhook integration for story completion notifications

### Key Dependencies

- `node-pty`: Terminal process spawning for Claude Code (interactive mode)
- `remark`: Markdown parsing and manipulation with TypeScript support
- `simple-git`: Git operations library with TypeScript definitions
- `dotenv`: Environment variable management
- `typescript`: Full TypeScript support with strict type checking
- `@types/*`: Type definitions for all dependencies

### Workflow Process

1. **Draft Phase**: Checks for existing drafts in `docs/stories/`, creates one if needed via `/BMad:agents:sm *draft`
2. **Status Update**: Uses markdown AST to change status from "Draft" to "Approved"
3. **Development Phase**: Runs `/BMad:agents:dev *develop-story {story_name} please develop entire story` to develop the story
4. **QA Phase**: Runs `/BMad:agents:qa *review` for quality assurance
5. **Commit Phase**: Executes `/commit` and tracks git changes
6. **Analytics**: Tracks timing, commands, and sends Discord notifications

## Configuration

The application requires a `.env` file with the Discord webhook URL:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

The application dynamically discovers the Claude CLI path using:
```bash
zsh -ic "alias claude"
```

This assumes Claude is aliased in the user's zsh configuration.

### Claude CLI Integration

The application uses Claude Code's print mode (`-p`) for reliable command execution:
- **Print Mode**: Uses `claude -p "command"` which auto-exits when complete
- **Interactive Mode**: Fallback using `node-pty` for complex interactions
- **Supported Flags**: `--dangerously-skip-permissions`, `--output-format`, `--verbose`, `--max-turns`, `--model`