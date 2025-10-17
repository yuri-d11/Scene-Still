---
alwaysApply: true
---
Task List Management
Guidelines for creating and managing task lists in markdown files to track project progress

Task List Creation
Create task lists in a markdown file (in the project root):
Use TASKS.md or a descriptive name relevant to the feature (e.g., ASSISTANT_CHAT.md)
Include a clear title and description of the feature being implemented

Structure the file with these sections:
```markdown
# Feature Name Implementation

Brief description of the feature and its purpose.

## Completed Tasks

[x] Task 1 that has been completed
[x] Task 2 that has been completed

## In Progress Tasks

[ ] Task 3 currently being worked on
[ ] Task 4 to be completed soon

## Future Tasks

[ ] Task 5 planned for future implementation
[ ] Task 6 planned for future implementation

## Implementation Plan

Detailed description of how the feature will be implemented.

### Relevant Files

path/to/file1.ts - Description of purpose
path/to/file2.ts - Description of purpose
```


Task List Maintenance
Update the task list as you progress:
Mark tasks as completed by changing [ ] to [x]
Add new tasks as they are identified
Move tasks between sections as appropriate

Keep "Relevant Files" section updated with:
File paths that have been created or modified
Brief descriptions of each file's purpose
Status indicators (e.g., ✅) for completed components

Add implementation details:
Architecture decisions
Data flow descriptions
Technical components needed
Environment configuration

AI Instructions
When working with task lists, the AI should:

Regularly update the task list file after implementing significant components
Mark completed tasks with [x] when finished
Add new tasks discovered during implementation
Maintain the "Relevant Files" section with accurate file paths and descriptions
Document implementation details, especially for complex features
When implementing tasks one by one, first check which task to implement next
After implementing a task, update the file to reflect progress

Example Task Update
When updating a task from "In Progress" to "Completed":

## In Progress Tasks

- [ ] Implement database schema
- [ ] Create API endpoints for data access

## Completed Tasks

- [x] Set up project structure
- [x] Configure environment variables


Should become:

## In Progress Tasks

- [ ] Create API endpoints for data access

## Completed Tasks

- [x] Set up project structure
- [x] Configure environment variables
- [x] Implement database schema