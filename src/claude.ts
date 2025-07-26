import { execSync } from 'child_process';
import { spawn as spawnPty } from 'bun-pty';
import {IExitEvent} from "bun-pty/dist/interfaces";

interface ClaudeOptions {
    workingDir?: string;
    verbose?: boolean;
    maxTurns?: number | null;
    model?: string | null;
}

interface ClaudeResult {
    output: string;
    exitCode: number;
    duration: number;
    command: string;
}

const claudePath: string = execSync('zsh -ic "alias claude"', { encoding: 'utf8' }).split('=')[1].replace(/'/g, '').trim();

async function sendMessage(message: string, options: ClaudeOptions = {}): Promise<ClaudeResult> {
    const { workingDir = process.cwd(), verbose = false, maxTurns = null, model = null } = options;
    const startTime = Date.now();
    
    const args: string[] = ['--dangerously-skip-permissions'];
    if (verbose) args.push('--verbose');
    if (maxTurns) args.push('--max-turns', maxTurns.toString());
    if (model) args.push('--model', model);
    args.push(`"${message}"`);
    
    console.log(`\n> claude ${args.join(' ')}`);
    
    return new Promise((resolve, _) => {
        let output = '';
        let lastDataTime = Date.now();
        let hasReceivedData = false;
        
        const claudeProcess = spawnPty(claudePath, args, {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: workingDir,
        });

        // Timeout handler: 5 seconds of no data after minimum 30 seconds runtime
        const checkTimeout = () => {
            const now = Date.now();
            const runtimeMs = now - startTime;
            const timeSinceLastData = now - lastDataTime;
            
            // Only timeout if we've been running for at least 30 seconds
            // and haven't received data in the last 5 seconds
            if (runtimeMs >= 30000 && timeSinceLastData >= 5000 && hasReceivedData) {
                console.log('\n[Timeout: No data received for 5 seconds after 30s minimum runtime]');
                claudeProcess.kill();
                resolve({
                    output,
                    exitCode: -1, // Indicate timeout
                    duration: runtimeMs,
                    command: message
                });
                return;
            }
            
            // Continue checking every second
            setTimeout(checkTimeout, 1000);
        };
        
        // Start timeout checking after 30 seconds
        setTimeout(checkTimeout, 30000);

        claudeProcess.onData((data: string) => {
            hasReceivedData = true;
            lastDataTime = Date.now();
            output += data;
            process.stdout.write(data);
        });

        claudeProcess.onExit((e: IExitEvent) => {
            resolve({
                output,
                exitCode: e.exitCode || 0,
                duration: Date.now() - startTime,
                command: message
            });
        });
    });
}

export { sendMessage, type ClaudeOptions, type ClaudeResult };