import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/**
 * Retro-themed, single-column Todo app with localStorage persistence.
 * Features: add, edit inline, toggle complete, delete, clear completed, filter (All/Active/Completed).
 * Accessibility: labeled controls, aria attributes, keyboard-friendly, focus management for editing.
 * Now includes drag-and-drop reordering (mouse + keyboard) with persistence.
 */

// Utils
const STORAGE_KEY = 'retro_todos_v1';
const FILTERS = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // ignore quota errors
  }
}

/**
 * Move an item inside an array from one index to another.
 * Returns a new array instance.
 */
function arrayMove(arr, from, to) {
  const copy = arr.slice();
  const [spliced] = copy.splice(from, 1);
  copy.splice(to, 0, spliced);
  return copy;
}

// PUBLIC_INTERFACE
export default function App() {
  /** App theme and basic retro palette colors per style guide */
  const [theme] = useState('light'); // fixed light per spec
  const [todos, setTodos] = useState(() => loadTodos());
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Drag state
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const lastFocusedIdRef = useRef(null); // preserve focus after drop

  // Apply theme attribute for potential future theming hooks
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist todos
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Derived lists
  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  const remainingCount = useMemo(() => todos.filter(t => !t.completed).length, [todos]);

  // Adding
  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos(prev => [{ id: uid(), text: trimmed, completed: false }, ...prev]);
    setText('');
    // Keep focus for rapid entry
    inputRef.current?.focus();
  }

  // PUBLIC_INTERFACE
  function handleKeyDownAdd(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  // PUBLIC_INTERFACE
  function toggleComplete(id) {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  // PUBLIC_INTERFACE
  function deleteTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  // Editing
  function beginEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    setEditingId(id);
    setEditingText(todo.text);
    // Focus will be moved on next paint
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }

  // PUBLIC_INTERFACE
  function submitEdit() {
    const trimmed = editingText.trim();
    if (!editingId) return;
    if (!trimmed) {
      // If emptied, delete the item
      setTodos(prev => prev.filter(t => t.id !== editingId));
    } else {
      setTodos(prev => prev.map(t => (t.id === editingId ? { ...t, text: trimmed } : t)));
    }
    setEditingId(null);
    setEditingText('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText('');
  }

  // PUBLIC_INTERFACE
  function clearCompleted() {
    setTodos(prev => prev.filter(t => !t.completed));
  }

  // Keyboard handler for edit field
  function onEditKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  // Drag & Drop Handlers (HTML5 DnD)
  function onDragStart(e, id) {
    setDragId(id);
    lastFocusedIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    // Needed for Firefox to initiate drag
    e.dataTransfer.setData('text/plain', id);
  }

  function onDragOver(e, id) {
    e.preventDefault(); // allow drop
    if (id !== dragOverId) setDragOverId(id);
    e.dataTransfer.dropEffect = 'move';
  }

  function onDragLeave(e, id) {
    // Remove hover when leaving element
    if (dragOverId === id) setDragOverId(null);
  }

  function onDrop(e, id) {
    e.preventDefault();
    const sourceId = dragId || e.dataTransfer.getData('text/plain');
    const targetId = id;
    if (!sourceId || !targetId || sourceId === targetId) {
      cleanupDnD();
      return;
    }
    const fromIndex = todos.findIndex(t => t.id === sourceId);
    const toIndex = todos.findIndex(t => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      cleanupDnD();
      return;
    }
    setTodos(prev => arrayMove(prev, fromIndex, toIndex));
    // After re-render, move focus back to dragged item’s handle for accessibility
    setTimeout(() => {
      const el = document.querySelector(`[data-todo-id="${sourceId}"] .drag-handle`);
      el?.focus();
    }, 0);
    cleanupDnD();
  }

  function onDragEnd() {
    cleanupDnD();
  }

  function cleanupDnD() {
    setDragId(null);
    setDragOverId(null);
  }

  // Keyboard reordering via ArrowUp/ArrowDown with Ctrl/Cmd+Shift+Arrow as an alternative
  // PUBLIC_INTERFACE
  function onItemKeyDown(e, id) {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return;
    const isArrowUp = e.key === 'ArrowUp';
    const isArrowDown = e.key === 'ArrowDown';
    const moveUp = isArrowUp;
    const moveDown = isArrowDown;
    const withMod = e.ctrlKey || e.metaKey || e.shiftKey;
    if ((moveUp || moveDown) && withMod) {
      e.preventDefault();
      if (moveUp && index > 0) {
        setTodos(prev => arrayMove(prev, index, index - 1));
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-todo-id="${id}"] .drag-handle`);
          el?.focus();
        });
      } else if (moveDown && index < todos.length - 1) {
        setTodos(prev => arrayMove(prev, index, index + 1));
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-todo-id="${id}"] .drag-handle`);
          el?.focus();
        });
      }
    }
  }

  // Accessible counts
  const completedCount = todos.length - remainingCount;

  return (
    <div className="retro-app">
      <header className="retro-header" role="banner">
        <h1 className="retro-title" aria-label="Retro Todo">
          Retro Todo
        </h1>
        <p className="retro-subtitle">Stay organized. Keep it simple.</p>
      </header>

      <main className="retro-main" role="main">
        <section className="todo-input-section" aria-labelledby="add-todo-label">
          <label id="add-todo-label" htmlFor="new-todo-input" className="visually-hidden">
            Add a new task
          </label>
          <div className="input-row">
            <input
              id="new-todo-input"
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDownAdd}
              placeholder="What needs to be done?"
              aria-label="New task"
              className="retro-input"
            />
            <button
              type="button"
              className="retro-btn primary"
              onClick={handleAdd}
              aria-label="Add task"
            >
              Add
            </button>
          </div>
        </section>

        <section className="filters-row" aria-label="Filters">
          <div className="filter-group" role="group" aria-label="Filter tasks">
            <button
              className={`retro-btn filter ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              aria-label="Show all tasks"
            >
              {FILTERS.all}
            </button>
            <button
              className={`retro-btn filter ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
              aria-pressed={filter === 'active'}
              aria-label="Show active tasks"
            >
              {FILTERS.active}
            </button>
            <button
              className={`retro-btn filter ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
              aria-pressed={filter === 'completed'}
              aria-label="Show completed tasks"
            >
              {FILTERS.completed}
            </button>
          </div>

          <button
            type="button"
            className="retro-btn danger"
            onClick={clearCompleted}
            aria-label="Clear completed tasks"
            disabled={completedCount === 0}
            title={completedCount === 0 ? 'No completed tasks' : 'Clear completed tasks'}
          >
            Clear Completed
          </button>
        </section>

        <section className="todo-list-section" aria-live="polite" aria-label="Todo list">
          {filtered.length === 0 ? (
            <p className="empty-state" role="status">
              No tasks to show.
            </p>
          ) : (
            // Provide listbox semantics for accessibility reordering hints
            <ul className="todo-list" role="listbox" aria-label="Todos (drag to reorder; Ctrl/Cmd+Shift+Arrow to reorder with keyboard)">
              {filtered.map(todo => {
                // Index within full list to compute draggable ordering
                const isBeingDragged = dragId === todo.id;
                const isDragOver = dragOverId === todo.id;
                return (
                  <li
                    key={todo.id}
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${isBeingDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                    data-todo-id={todo.id}
                    role="option"
                    aria-selected={false}
                    draggable
                    aria-grabbed={isBeingDragged}
                    onDragStart={e => onDragStart(e, todo.id)}
                    onDragOver={e => onDragOver(e, todo.id)}
                    onDragLeave={e => onDragLeave(e, todo.id)}
                    onDrop={e => onDrop(e, todo.id)}
                    onDragEnd={onDragEnd}
                    onKeyDown={e => onItemKeyDown(e, todo.id)}
                    tabIndex={0}
                    aria-label={`${todo.text}. Drag to reorder, or use Ctrl/Cmd+Shift plus arrow keys.`}
                  >
                    <div className="left">
                      <input
                        id={`toggle-${todo.id}`}
                        type="checkbox"
                        checked={!!todo.completed}
                        onChange={() => toggleComplete(todo.id)}
                        aria-label={`Mark "${todo.text}" ${todo.completed ? 'as active' : 'as completed'}`}
                        className="retro-checkbox"
                      />
                    </div>

                    <div className="center">
                      {editingId === todo.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          className="retro-input edit-input"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={submitEdit}
                          onKeyDown={onEditKeyDown}
                          aria-label={`Edit task: ${todo.text}`}
                        />
                      ) : (
                        <label
                          htmlFor={`toggle-${todo.id}`}
                          className="todo-text"
                          onDoubleClick={() => beginEdit(todo.id)}
                        >
                          {todo.text}
                        </label>
                      )}
                    </div>

                    <div className="right">
                      {/* Drag handle doubles as focus target for keyboard DnD */}
                      <button
                        className="retro-btn small drag-handle"
                        type="button"
                        aria-label={`Reorder ${todo.text}. Drag or use Ctrl/Cmd+Shift+Arrow keys`}
                        title="Drag to reorder"
                        // Allow dragging from the handle as well
                        draggable
                        onDragStart={e => onDragStart(e, todo.id)}
                        onDragOver={e => onDragOver(e, todo.id)}
                        onDrop={e => onDrop(e, todo.id)}
                        onDragEnd={onDragEnd}
                        onKeyDown={e => onItemKeyDown(e, todo.id)}
                      >
                        ⋮⋮
                      </button>

                      {editingId === todo.id ? (
                        <button
                          className="retro-btn small"
                          onMouseDown={e => e.preventDefault()}
                          onClick={submitEdit}
                          aria-label="Save edit"
                          title="Save"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="retro-btn small"
                          onClick={() => beginEdit(todo.id)}
                          aria-label={`Edit ${todo.text}`}
                          title="Edit"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        className="retro-btn small danger"
                        onClick={() => deleteTodo(todo.id)}
                        aria-label={`Delete ${todo.text}`}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="todo-footer" role="contentinfo" aria-live="polite">
          <span>{remainingCount} item{remainingCount !== 1 ? 's' : ''} left</span>
          <span className="dot-sep" aria-hidden="true">•</span>
          <span>{completedCount} completed</span>
        </footer>
      </main>
    </div>
  );
}
