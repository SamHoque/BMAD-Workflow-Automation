/**
 * BMAD Workflow Commands
 * 
 * Centralized command definitions for the BMAD automation workflow.
 * These commands are used throughout the application to interact with Claude agents.
 */

export const BMAD_COMMANDS = {
    // Story Management
    CREATE_DRAFT: '/BMad:agents:sm *draft',
    
    // Development Commands  
    DEVELOP_TASK: (taskId: string, storyName: string) => 
        `/BMad:agents:dev *develop task ${taskId} from story ${storyName}. Start developing immediately without asking questions. You have access to MCP servers including: context7 (use to retrieve up-to-date library documentation)`,
    
    // Quality Assurance
    QA_REVIEW: (storyName: string) => `/BMad:agents:qa *review ${storyName}`,
    
    // Git Operations
    COMMIT: '/commit'
} as const;

/**
 * Command tracking identifiers used for analytics
 */
export const COMMAND_TYPES = {
    DRAFT: 'draft',
    DEV: 'dev', 
    QA: 'qa',
    COMMIT: 'commit'
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];