const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  try {
    const userId = req.user.id;

    // Total tasks in user's projects
    const totalTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = ?
    `).get(userId);

    // Tasks by status
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = ? 
      GROUP BY status
    `).all(userId);

    // Tasks assigned to user
    const userTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?
    `).get(userId);

    // Overdue tasks
    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = ? AND due_date < date('now') AND status != 'Done'
    `).get(userId);

    res.json({
      total: totalTasks.count,
      byStatus: statusCounts,
      assignedToMe: userTasks.count,
      overdue: overdueTasks.count
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
