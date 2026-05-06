const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

// Create Task (Admin only)
router.post('/project/:projectId', auth, (req, res) => {
  const { title, description, due_date, priority, assigned_to } = req.body;
  const { projectId } = req.params;

  try {
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Project Admins only can create tasks.' });
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, due_date, priority, assigned_to) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, title, description || '', due_date || null, priority || 'Medium', assigned_to || null);

    const task = db.prepare(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (err) {
    console.error('Create Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get Tasks for Project
router.get('/project/:projectId', auth, (req, res) => {
  const { projectId } = req.params;

  try {
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this project' });
    }

    const tasks = db.prepare(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.project_id = ?
    `).all(projectId);

    res.json(tasks);
  } catch (err) {
    console.error('Get Tasks Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Update Task
router.patch('/:id', auth, (req, res) => {
  const { status, assigned_to, title, description, due_date, priority } = req.body;
  const taskId = req.params.id;

  try {
    const task = db.prepare('SELECT project_id, assigned_to FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);

    if (!membership) return res.status(403).json({ message: 'Access denied' });

    const role = membership.role;

    // Members can only update status of tasks assigned to them
    if (role === 'Member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'You can only update tasks assigned to you' });
    }

    // Build dynamic update
    let updates = [];
    let values = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (role === 'Admin') {
      if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to || null); }
      if (title) { updates.push('title = ?'); values.push(title); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description); }
      if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date || null); }
      if (priority) { updates.push('priority = ?'); values.push(priority); }
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(taskId);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `).get(taskId);

    res.json(updated);
  } catch (err) {
    console.error('Update Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Delete Task (Admin only)
router.delete('/:id', auth, (req, res) => {
  const taskId = req.params.id;

  try {
    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
