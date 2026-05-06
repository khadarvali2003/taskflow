const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize database (tables auto-created)
require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Project routes
const projectRoutes = require('./routes/projects');
app.use('/api/projects', projectRoutes);

// Task routes
const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

// Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Serve frontend static files in production
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.json({ message: 'TaskFlow API is running...' });
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
