# Retro Todo (Frontend)

A single-column, retro-themed Todo app built with React. Tasks are stored locally in your browser via localStorage.

## Features

- Add tasks via input + Add button or Enter key
- Inline edit tasks (Enter to save, Esc to cancel, blur to save)
- Toggle complete, delete tasks
- Filters: All / Active / Completed
- Clear Completed to remove done tasks
- Tasks persist across page reloads (localStorage)
- Accessible: labeled controls, aria attributes, and focus moves to the edit field when editing
- Retro light theme using accents #3b82f6 and #06b6d4

## Run Locally

- Install dependencies:
  - `npm install`
- Start the dev server:
  - `npm start`
- Open http://localhost:3000 in your browser.

## Notes

- No backend required; all state is stored in the browser.
- Keyboard tips:
  - Enter in the add field adds a task.
  - Double-click a task label or use the Edit button to edit.
  - While editing: Enter = save, Esc = cancel, Blur = save.

