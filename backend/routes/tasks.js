const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

// Create Task (Admin only)
router.post('/project/:projectId', auth, async (req, res) => {
  const { title, description, due_date, priority, assigned_to } = req.body;
  const { projectId } = req.params;

  try {
    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
    const membership = membershipResult.rows[0];

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Project Admins only can create tasks.' });
    }

    const id = crypto.randomUUID();

    await db.query(`
      INSERT INTO tasks (id, project_id, title, description, due_date, priority, assigned_to) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, projectId, title, description || '', due_date || null, priority || 'Medium', assigned_to || null]);

    const result = await db.query(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get Tasks for Project
router.get('/project/:projectId', auth, async (req, res) => {
  const { projectId } = req.params;

  try {
    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
    if (membershipResult.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this project' });
    }

    const result = await db.query(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.project_id = $1
    `, [projectId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get Tasks Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Update Task
router.patch('/:id', auth, async (req, res) => {
  const { status, assigned_to, title, description, due_date, priority } = req.body;
  const taskId = req.params.id;

  try {
    const taskResult = await db.query('SELECT project_id, assigned_to FROM tasks WHERE id = $1', [taskId]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [task.project_id, req.user.id]);
    const membership = membershipResult.rows[0];

    if (!membership) return res.status(403).json({ message: 'Access denied' });

    const role = membership.role;

    // Members can only update status of tasks assigned to them
    if (role === 'Member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'You can only update tasks assigned to you' });
    }

    // Build dynamic update
    let updates = [];
    let values = [];
    let counter = 1;

    if (status) { updates.push(`status = $${counter++}`); values.push(status); }
    if (role === 'Admin') {
      if (assigned_to !== undefined) { updates.push(`assigned_to = $${counter++}`); values.push(assigned_to || null); }
      if (title) { updates.push(`title = $${counter++}`); values.push(title); }
      if (description !== undefined) { updates.push(`description = $${counter++}`); values.push(description); }
      if (due_date !== undefined) { updates.push(`due_date = $${counter++}`); values.push(due_date || null); }
      if (priority) { updates.push(`priority = $${counter++}`); values.push(priority); }
    }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(taskId);
    await db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${counter}`, values);

    const result = await db.query(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = $1
    `, [taskId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Delete Task (Admin only)
router.delete('/:id', auth, async (req, res) => {
  const taskId = req.params.id;

  try {
    const taskResult = await db.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [task.project_id, req.user.id]);
    const membership = membershipResult.rows[0];

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete Task Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
