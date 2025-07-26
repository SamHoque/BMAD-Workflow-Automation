import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import type { RootContent } from 'mdast';

interface StoryInfo {
    name: string;
    path: string;
    content: string;
    mtime: Date;
}

interface Task {
    id: string;
    name: string;
    completed: boolean;
    subtasks: Task[];
}

const processor = remark();

function findStoryByStatus(projectDir: string, status: string): StoryInfo | null {
    const docsDir = path.join(projectDir, 'docs', 'stories');
    if (!fs.existsSync(docsDir)) return null;

    const stories = fs.readdirSync(docsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const filePath = path.join(docsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const tree = processor.parse(content);
            
            const hasStatus = tree.children.some((node: RootContent, index: number) => {
                if (node.type === 'heading' && 
                    node.depth === 2 && 
                    node.children[0]?.type === 'text' &&
                    node.children[0].value === 'Status') {
                    
                    const nextNode = tree.children[index + 1];
                    return nextNode?.type === 'paragraph' && 
                           nextNode.children[0]?.type === 'text' &&
                           nextNode.children[0].value === status;
                }
                return false;
            });
            
            return hasStatus ? { 
                name: file, 
                path: filePath, 
                content, 
                mtime: fs.statSync(filePath).mtime 
            } : null;
        })
        .filter((story): story is StoryInfo => story !== null)
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return stories[0] || null;
}

function updateStoryStatus(filePath: string, content: string, newStatus: string): boolean {
    const tree = processor.parse(content);
    
    const statusIndex = tree.children.findIndex((node: RootContent) => 
        node.type === 'heading' && 
        node.depth === 2 && 
        node.children[0]?.type === 'text' &&
        node.children[0].value === 'Status'
    );
    
    if (statusIndex === -1) return false;
    
    const statusNode = tree.children[statusIndex + 1];
    if (statusNode?.type === 'paragraph' && statusNode.children[0]?.type === 'text') {
        statusNode.children[0].value = newStatus;
        fs.writeFileSync(filePath, processor.stringify(tree), 'utf8');
        return true;
    }
    return false;
}

function parseTasksFromStory(content: string): Task[] {
    const tree = processor.parse(content);
    const tasks: Task[] = [];
    
    // Find "Tasks / Subtasks" section
    const tasksHeadingIndex = tree.children.findIndex((node: RootContent) =>
        node.type === 'heading' &&
        node.depth === 2 &&
        node.children[0]?.type === 'text' &&
        node.children[0].value === 'Tasks / Subtasks'
    );
    
    if (tasksHeadingIndex === -1) return tasks;
    
    // Parse tasks starting after the heading
    for (let i = tasksHeadingIndex + 1; i < tree.children.length; i++) {
        const node = tree.children[i];
        
        // Stop at next heading
        if (node.type === 'heading') break;
        
        if (node.type === 'list') {
            tasks.push(...parseTaskList(node, ''));
        }
    }
    
    return tasks;
}

function parseTaskList(listNode: any, parentId: string): Task[] {
    const tasks: Task[] = [];
    
    listNode.children?.forEach((listItem: any, index: number) => {
        if (listItem.type === 'listItem') {
            const taskId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
            const task = parseTaskItem(listItem, taskId);
            if (task) tasks.push(task);
        }
    });
    
    return tasks;
}

function parseTaskItem(listItem: any, taskId: string): Task | null {
    const paragraph = listItem.children?.[0];
    if (!paragraph || paragraph.type !== 'paragraph') return null;
    
    const firstChild = paragraph.children?.[0];
    if (!firstChild || firstChild.type !== 'text') return null;
    
    const text = firstChild.value;
    
    // Check if it's a task (starts with [ ] or [x])
    const taskMatch = text.match(/^\s*\[([ x])\]\s*(.+)/);
    if (!taskMatch) return null;
    
    const completed = taskMatch[1] === 'x';
    const name = taskMatch[2].trim();
    
    // Parse subtasks from nested lists
    const subtasks: Task[] = [];
    for (let i = 1; i < listItem.children.length; i++) {
        const child = listItem.children[i];
        if (child.type === 'list') {
            subtasks.push(...parseTaskList(child, taskId));
        }
    }
    
    return {
        id: taskId,
        name,
        completed,
        subtasks
    };
}

function getUncompletedTasks(tasks: Task[]): Task[] {
    const uncompleted: Task[] = [];
    
    for (const task of tasks) {
        if (!task.completed) {
            // If main task is incomplete, include it with its uncompleted subtasks
            const uncompletedSubtasks = getUncompletedTasks(task.subtasks);
            uncompleted.push({
                ...task,
                subtasks: uncompletedSubtasks
            });
        } else if (task.subtasks.length > 0) {
            // If main task is complete but has incomplete subtasks, include only the subtasks
            const uncompletedSubtasks = getUncompletedTasks(task.subtasks);
            if (uncompletedSubtasks.length > 0) {
                uncompleted.push({
                    ...task,
                    subtasks: uncompletedSubtasks
                });
            }
        }
    }
    
    return uncompleted;
}

function getStoryWithTasks(projectDir: string, status: string): { story: StoryInfo; tasks: Task[] } | null {
    const story = findStoryByStatus(projectDir, status);
    if (!story) return null;
    
    const tasks = parseTasksFromStory(story.content);
    return { story, tasks };
}

function getNextTask(tasks: Task[]): Task | null {
    for (const task of tasks) {
        if (!task.completed) {
            // Check if this task has incomplete subtasks
            const nextSubtask = getNextTask(task.subtasks);
            return nextSubtask || task;
        }
    }
    return null;
}

export { 
    findStoryByStatus, 
    updateStoryStatus, 
    parseTasksFromStory,
    getUncompletedTasks,
    getStoryWithTasks,
    getNextTask,
    type StoryInfo, 
    type Task 
};