# BMAD Workflow Automation

A Bun TypeScript application that automates BMAD project workflows using Claude Code. This tool provides a complete story development pipeline from draft creation through commit and deployment, with crash recovery and Discord notifications.

## Features

- **Automated Story Pipeline**: Complete workflow from draft to deployment
- **Crash Recovery**: Robust state persistence and recovery mechanisms
- **Discord Integration**: Real-time notifications for story completion
- **Git Integration**: Automated commit tracking and change detection
- **Claude Code Integration**: Seamless AI-assisted development workflow

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Claude Code CLI with proper alias configuration
- Git repository for the target project
- Discord webhook URL (optional, for notifications)

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Create a `.env` file with your Discord webhook URL:
   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
   ```

4. Ensure Claude Code is properly aliased in your zsh configuration:
   ```bash
   alias claude="/path/to/claude"
   ```

## Usage

### Basic Usage

Run in the current directory:
```bash
bun run index.ts
```

### Specify Project Directory

Run with a specific BMAD project directory:
```bash
bun run index.ts /path/to/bmad/project
```

### Interactive Mode

If no directory is provided, the application will prompt you:
```bash
bun run index.ts
# Enter project directory (or press Enter for current directory):
```

## Workflow Process

The application follows a structured development pipeline:

1. **Draft Phase**: 
   - Checks for existing drafts in `docs/stories/`
   - Creates new drafts via `/BMad:agents:sm *draft` if needed

2. **Approval Phase**: 
   - Updates story status from "Draft" to "Approved" using markdown AST manipulation

3. **Development Phase**: 
   - Executes `/BMad:agents:dev *develop-story {story_name}` to develop the complete story
   - Utilizes available MCP servers including context7 for up-to-date library documentation

4. **Quality Assurance**: 
   - Runs `/BMad:agents:qa *review` for comprehensive quality checks

5. **Commit Phase**: 
   - Executes `/commit` command and tracks all git changes

6. **Analytics & Notifications**: 
   - Tracks command execution timing and success rates
   - Sends Discord notifications for completed stories

## Architecture

### Core Components

- **`index.ts`**: CLI entry point with argument parsing and directory validation
- **`src/bmad.ts`**: Main workflow orchestration with state management and analytics
- **`src/claude.ts`**: Claude Code process management with async messaging support
- **`src/git.ts`**: Git operations using simple-git library
- **`src/webhook.ts`**: Discord webhook integration for notifications
- **`src/markdown.ts`**: Markdown AST parsing and manipulation utilities

### Key Dependencies

- **`node-pty`**: Terminal process spawning for interactive Claude Code sessions
- **`remark`**: Markdown parsing and manipulation with full TypeScript support
- **`simple-git`**: Git operations library with comprehensive TypeScript definitions
- **`dotenv`**: Environment variable management
- **`lodash`**: Utility functions for data manipulation

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Discord webhook URL for story completion notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

### Claude CLI Integration

The application automatically discovers the Claude CLI path using:
```bash
zsh -ic "alias claude"
```

This requires Claude to be properly aliased in your zsh configuration.

### Supported Claude CLI Flags

The application supports the following Claude CLI flags:
- `--dangerously-skip-permissions`
- `--output-format`
- `--verbose`
- `--max-turns`
- `--model`

## Development

### Project Structure

```
├── index.ts                 # CLI entry point
├── src/
│   ├── bmad.ts             # Main workflow orchestration
│   ├── claude.ts           # Claude Code integration
│   ├── git.ts              # Git operations
│   ├── markdown.ts         # Markdown processing
│   └── webhook.ts          # Discord notifications
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── CLAUDE.md              # Claude Code instructions
└── README.md              # This file
```

### Available Scripts

```bash
# Start the application
bun run start

# Run directly with TypeScript
bun run index.ts

# Note: No test framework is currently configured
bun run test  # Will output an error message
```

### Development Workflow

1. The application uses print mode (`-p`) for reliable Claude command execution
2. Falls back to interactive mode using `node-pty` for complex interactions
3. All commands are tracked with analytics including duration and exit codes
4. State is persisted for crash recovery

## Contributing

1. Ensure you have Bun installed and properly configured
2. Follow the existing TypeScript patterns and code style
3. Test your changes with a real BMAD project
4. Update documentation as needed

## License

ISC License - see package.json for details

## Author

Sam Hoque
