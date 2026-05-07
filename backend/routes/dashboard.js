const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Total tasks in user's projects
    const totalTasksResult = await db.query(`
      SELECT COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = $1
    `, [userId]);

    // Tasks by status
    const statusCountsResult = await db.query(`
      SELECT status, COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = $1 
      GROUP BY status
    `, [userId]);

    // Tasks assigned to user
    const userTasksResult = await db.query(`
      SELECT COUNT(*) as count FROM tasks WHERE assigned_to = $1
    `, [userId]);

    // Overdue tasks
    const overdueTasksResult = await db.query(`
      SELECT COUNT(*) as count FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = $1 AND due_date < CAST(CURRENT_DATE AS TEXT) AND status != 'Done'
    `, [userId]);

    res.json({
      total: parseInt(totalTasksResult.rows[0].count),
      byStatus: statusCountsResult.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      assignedToMe: parseInt(userTasksResult.rows[0].count),
      overdue: parseInt(overdueTasksResult.rows[0].count)
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
