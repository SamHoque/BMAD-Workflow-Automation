import path from 'path';
import { checkGitPushStatus, type GitPushStatus, type GitStatusInfo } from './git.js';
import { BMAD_COMMANDS } from './constants.js';

interface CommandAnalytics {
    command: string;
    duration: number;
    timestamp: string;
    exitCode: number;
    commitMessage?: string;
}

interface GitChanges {
    before?: GitStatusInfo;
    after?: GitStatusInfo;
}

interface StoryAnalytics {
    storyName: string;
    commands: CommandAnalytics[];
    projectDir: string;
    gitChanges: GitChanges;
}

interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields: EmbedField[];
    footer: {
        text: string;
    };
    timestamp: string;
}

interface WebhookPayload {
    username: string;
    embeds: DiscordEmbed[];
}

async function sendStoryWebhook(storyAnalytics: StoryAnalytics): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('⚠️ No Discord webhook URL configured');
        return;
    }

    const storyDuration = storyAnalytics.commands.reduce((total, cmd) => total + cmd.duration, 0);
    const totalMinutes = (storyDuration / 1000 / 60).toFixed(2);
    
    let pushStatus: GitPushStatus;
    try {
        pushStatus = await checkGitPushStatus(storyAnalytics.projectDir);
    } catch (error) {
        console.warn('Could not check git push status:', (error as Error).message);
        pushStatus = { ahead: 0, behind: 0, synced: false };
    }
    
    // Get commit message from the commands
    const commitCommand = storyAnalytics.commands.find(cmd => cmd.command === BMAD_COMMANDS.COMMIT);
    const commitMessage = commitCommand?.commitMessage || 'No commit message found';
    
    const commandFields: EmbedField[] = storyAnalytics.commands.map((cmd) => ({
        name: `🔧 ${cmd.command}`,
        value: `⏱️ ${(cmd.duration / 1000).toFixed(2)}s\n🕐 ${new Date(cmd.timestamp).toLocaleTimeString()}`,
        inline: true
    }));
    
    const embed: DiscordEmbed = {
        title: '📖 Story Completed!',
        description: `**${storyAnalytics.storyName}** has been successfully completed!\n\n🚀 **Project:** ${path.basename(storyAnalytics.projectDir)}`,
        color: 0x00ff00,
        fields: [
            {
                name: '⏰ Story Duration',
                value: `${totalMinutes} minutes`,
                inline: true
            },
            {
                name: '🔧 Commands Executed',
                value: `${storyAnalytics.commands.length} commands`,
                inline: true
            },
            {
                name: '📊 Git Changes',
                value: storyAnalytics.gitChanges.before && storyAnalytics.gitChanges.after ? 
                    `📁 Files: ${storyAnalytics.gitChanges.before.files.length} → ${storyAnalytics.gitChanges.after.files.length}\n📈 Added: ${storyAnalytics.gitChanges.after.files.length - storyAnalytics.gitChanges.before.files.length}` :
                    'No git changes tracked',
                inline: true
            },
            {
                name: '🔄 Push Status',
                value: pushStatus.synced ? '✅ All changes pushed' : `⏳ ${pushStatus.ahead} commits ahead`,
                inline: true
            },
            {
                name: '💬 Commit Message',
                value: commitMessage.length > 100 ? commitMessage.substring(0, 100) + '...' : commitMessage,
                inline: false
            },
            ...commandFields
        ],
        footer: {
            text: `BMAD Workflow Engine • Completed at ${new Date().toLocaleString()}`
        },
        timestamp: new Date().toISOString()
    };
    
    const payload: WebhookPayload = {
        username: 'BMAD Workflow Bot',
        embeds: [embed]
    };
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('✅ Story analytics sent to Discord successfully!');
        } else {
            console.error('❌ Failed to send Discord webhook:', response.statusText);
        }
    } catch (error) {
        console.error('❌ Error sending Discord webhook:', (error as Error).message);
    }
}

export { sendStoryWebhook, type StoryAnalytics, type CommandAnalytics, type GitChanges };