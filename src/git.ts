import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

interface GitStatusInfo {
    status: string;
    diff: string;
    untracked: string;
    files: string[];
}

interface GitPushStatus {
    ahead: number;
    behind: number;
    synced: boolean;
}

async function getGitStatus(projectDir: string): Promise<GitStatusInfo> {
    const git: SimpleGit = simpleGit(projectDir);
    const status: StatusResult = await git.status();
    const diff: string = await git.diff(['--stat']);
    
    return {
        status: status.files.map(f => `${f.index}${f.working_dir} ${f.path}`).join('\n'),
        diff: diff.trim(),
        untracked: status.not_added.join('\n'),
        files: status.files.map(f => `${f.index}${f.working_dir} ${f.path}`)
    };
}

async function checkGitPushStatus(projectDir: string): Promise<GitPushStatus> {
    const git: SimpleGit = simpleGit(projectDir);
    const status: StatusResult = await git.status();
    
    return {
        ahead: status.ahead,
        behind: status.behind,
        synced: status.ahead === 0 && status.behind === 0
    };
}

async function hasUncommittedChanges(projectDir: string): Promise<boolean> {
    const git: SimpleGit = simpleGit(projectDir);
    const status: StatusResult = await git.status();
    
    // Check for any staged files, modified files, deleted files, or untracked files
    return status.files.length > 0 || status.not_added.length > 0 || status.staged.length > 0;
}

export { getGitStatus, checkGitPushStatus, hasUncommittedChanges, type GitStatusInfo, type GitPushStatus };