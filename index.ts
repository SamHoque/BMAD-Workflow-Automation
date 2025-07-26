import 'dotenv/config';
import fs from 'fs';
import { createInterface } from 'readline';
import { BMADWorkflow } from './src/bmad.ts';

// Function to prompt for project directory
async function promptForProjectDir(): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter project directory (or press Enter for current directory): ', (answer) => {
            rl.close();
            resolve(answer.trim() || process.cwd());
        });
    });
}

// Create and run BMAD workflow
async function main(): Promise<void> {
    // Parse command line arguments or prompt for directory
    const projectDir: string = process.argv[2] || await promptForProjectDir();

    // Validate project directory
    if (!fs.existsSync(projectDir)) {
        console.error(`Error: Directory '${projectDir}' does not exist`);
        process.exit(1);
    }

    console.log(`Using project directory: ${projectDir}`);

    const workflow = new BMADWorkflow(projectDir);
    
    try {
        await workflow.runContinuousWorkflow();
    } catch (error) {
        console.error('Workflow failed:', (error as Error).message);
        process.exit(1);
    }
}

main();