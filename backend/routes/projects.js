const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

// Create Project
router.post('/', auth, (req, res) => {
  const { name, description } = req.body;
  const owner_id = req.user.id;

  try {
    const id = crypto.randomUUID();

    db.prepare('INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)').run(id, name, description || '', owner_id);

    // Add creator as Admin
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(id, owner_id, 'Admin');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get User Projects
router.get('/', auth, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, pm.role 
      FROM projects p 
      JOIN project_members pm ON p.id = pm.project_id 
      WHERE pm.user_id = ?
    `).all(req.user.id);

    res.json(projects);
  } catch (err) {
    console.error('Get Projects Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get project members
router.get('/:id/members', auth, (req, res) => {
  try {
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, pm.role 
      FROM project_members pm 
      JOIN users u ON pm.user_id = u.id 
      WHERE pm.project_id = ?
    `).all(req.params.id);

    res.json(members);
  } catch (err) {
    console.error('Get Members Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Add Member (Admin only)
router.post('/:id/members', auth, (req, res) => {
  const { email, role } = req.body;
  const projectId = req.params.id;

  try {
    // Check if requester is Admin
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Find user by email
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found with that email' });
    }

    // Check if already a member
    const existing = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
    if (existing) {
      db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role || 'Member', projectId, user.id);
    } else {
      db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, user.id, role || 'Member');
    }

    res.json({ message: 'Member added successfully' });
  } catch (err) {
    console.error('Add Member Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Remove Member (Admin only)
router.delete('/:id/members/:userId', auth, (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove Member Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
