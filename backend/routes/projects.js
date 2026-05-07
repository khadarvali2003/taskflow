const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

// Create Project
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  const owner_id = req.user.id;

  try {
    const id = crypto.randomUUID();

    await db.query('INSERT INTO projects (id, name, description, owner_id) VALUES ($1, $2, $3, $4)', [id, name, description || '', owner_id]);

    // Add creator as Admin
    await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [id, owner_id, 'Admin']);

    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get User Projects
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, pm.role 
      FROM projects p 
      JOIN project_members pm ON p.id = pm.project_id 
      WHERE pm.user_id = $1
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get Projects Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get project members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, pm.role 
      FROM project_members pm 
      JOIN users u ON pm.user_id = u.id 
      WHERE pm.project_id = $1
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get Members Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Add Member (Admin only)
router.post('/:id/members', auth, async (req, res) => {
  const { email, role } = req.body;
  const projectId = req.params.id;

  try {
    // Check if requester is Admin
    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
    const membership = membershipResult.rows[0];

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Find user by email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found with that email' });
    }

    // Check if already a member
    const existingResult = await db.query('SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, user.id]);
    const existing = existingResult.rows[0];
    
    if (existing) {
      await db.query('UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3', [role || 'Member', projectId, user.id]);
    } else {
      await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [projectId, user.id, role || 'Member']);
    }

    res.json({ message: 'Member added successfully' });
  } catch (err) {
    console.error('Add Member Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Remove Member (Admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  const { id: projectId, userId } = req.params;

  try {
    const membershipResult = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
    const membership = membershipResult.rows[0];

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    await db.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove Member Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
