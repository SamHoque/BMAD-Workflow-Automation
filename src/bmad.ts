import { sendMessage, type ClaudeResult } from './claude.js';
import { sendStoryWebhook, type CommandAnalytics } from './webhook.js';
import { getGitStatus, hasUncommittedChanges } from './git.js';
import { findStoryByStatus, updateStoryStatus, getStoryWithTasks, getNextTask, type StoryInfo, type Task } from './markdown.js';

interface WorkflowAnalytics {
    commands: CommandAnalytics[];
    startTime: number;
}

class BMADWorkflow {
    private readonly projectDir: string;
    private readonly analytics: WorkflowAnalytics;

    constructor(projectDir: string) {
        this.projectDir = projectDir;
        this.analytics = { commands: [], startTime: Date.now() };
    }

    private trackCommand(command: string, result: ClaudeResult): void {
        this.analytics.commands.push({
            command,
            duration: result.duration,
            timestamp: new Date().toISOString(),
            exitCode: result.exitCode
        });
    }

    async runStory(): Promise<boolean> {
        console.log('Checking for stories to process...');
        
        // Check for Draft -> create or approve
        let story: StoryInfo | null = findStoryByStatus(this.projectDir, 'Draft');
        if (story) {
            console.log(`Found draft: ${story.name}`);
            updateStoryStatus(story.path, story.content, 'Approved');
            console.log('Status updated to Approved');
            story = { ...story, content: story.content.replace('Draft', 'Approved') };
        }

        // Check for Approved -> develop next task
        const approvedStory = getStoryWithTasks(this.projectDir, 'Approved');
        if (approvedStory) {
            const nextTask = getNextTask(approvedStory.tasks);
            if (nextTask) {
                console.log(`Developing task ${nextTask.id}: ${nextTask.name}`);
                const result = await sendMessage(`/BMad:agents:dev *develop task ${nextTask.id} from story ${approvedStory.story.name}. Start developing immediately without asking questions. You have access to MCP servers including: context7 (use to retrieve up-to-date library documentation)`, {
                    workingDir: this.projectDir 
                });
                this.trackCommand('dev', result);
                return true;
            } else {
                // All tasks completed, move to Ready for Review
                console.log(`All tasks completed for ${approvedStory.story.name}, moving to Ready for Review`);
                updateStoryStatus(approvedStory.story.path, approvedStory.story.content, 'Ready for Review');
                return true;
            }
        }

        // Check for Ready for Review -> QA
        story = findStoryByStatus(this.projectDir, 'Ready for Review');
        if (story) {
            console.log(`QA reviewing: ${story.name}`);
            const result = await sendMessage(`/BMad:agents:qa *review ${story.name}`, { 
                workingDir: this.projectDir 
            });
            this.trackCommand('qa', result);
            updateStoryStatus(story.path, story.content, 'Done');
            
            // Commit
            const commitResult = await sendMessage('/commit', { workingDir: this.projectDir });
            this.trackCommand('commit', commitResult);
            
            // Send webhook
            await sendStoryWebhook({
                storyName: story.name,
                commands: this.analytics.commands,
                projectDir: this.projectDir,
                gitChanges: { after: await getGitStatus(this.projectDir) }
            });
            
            console.log(`Story ${story.name} completed!`);
            return true;
        }

        // No Draft -> commit any changes and create one
        if (!findStoryByStatus(this.projectDir, 'Draft')) {
            // Commit any uncommitted changes before creating a new draft
            if (await hasUncommittedChanges(this.projectDir)) {
                console.log('Committing changes before creating new draft...');
                const commitResult = await sendMessage('/commit', { workingDir: this.projectDir });
                this.trackCommand('commit', commitResult);
            }
            
            console.log('Creating new draft...');
            const result = await sendMessage('/BMad:agents:sm *draft', { workingDir: this.projectDir });
            this.trackCommand('draft', result);
            return true;
        }

        // No pending stories -> check for uncommitted changes and commit if any
        if (await hasUncommittedChanges(this.projectDir)) {
            console.log('No pending stories found. Checking for uncommitted changes to commit...');
            const result = await sendMessage('/commit', { workingDir: this.projectDir });
            this.trackCommand('commit', result);
            console.log('Uncommitted changes committed.');
            return true;
        }

        return false;
    }

    async runContinuousWorkflow(): Promise<void> {
        console.log('Starting continuous workflow...');
        let totalCompleted = 0;
        let noWorkCount = 0;

        while (noWorkCount < 3) {
            try {
                const workDone = await this.runStory();
                if (workDone) {
                    totalCompleted++;
                    noWorkCount = 0;
                    console.log(`\nTotal completed: ${totalCompleted}`);
                } else {
                    noWorkCount++;
                    console.log(`No work found (${noWorkCount}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            } catch (error) {
                console.error('Error:', (error as Error).message);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        console.log(`\n🎉 Completed ${totalCompleted} stories!`);
    }
}

export { BMADWorkflow, type WorkflowAnalytics };