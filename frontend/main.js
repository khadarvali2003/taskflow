// State Management
const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    projects: [],
    currentProject: null,
    tasks: []
};

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

// API Helper
async function api(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = { message: text || 'Internal Server Error' };
    }
    
    if (!response.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

// Router
function navigate(view, params = {}) {
    window.location.hash = view + (params.id ? `/${params.id}` : '');
    render();
}

// --- Views ---

function LoginView() {
    return `
        <div class="animate-fade-in" style="max-width: 400px; margin: 4rem auto;">
            <div class="glass card">
                <h1 style="margin-bottom: 2rem; text-align: center;">Welcome Back</h1>
                <form id="login-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="email" required placeholder="name@company.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Sign In</button>
                </form>
                <p style="margin-top: 1.5rem; text-align: center; color: var(--text-muted);">
                    Don't have an account? <a href="#signup" style="color: var(--primary); text-decoration: none;">Sign Up</a>
                </p>
            </div>
        </div>
    `;
}

function SignupView() {
    return `
        <div class="animate-fade-in" style="max-width: 400px; margin: 4rem auto;">
            <div class="glass card">
                <h1 style="margin-bottom: 2rem; text-align: center;">Create Account</h1>
                <form id="signup-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="name" required placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="email" required placeholder="name@company.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Get Started</button>
                </form>
                <p style="margin-top: 1.5rem; text-align: center; color: var(--text-muted);">
                    Already have an account? <a href="#login" style="color: var(--primary); text-decoration: none;">Log In</a>
                </p>
            </div>
        </div>
    `;
}

async function DashboardView() {
    try {
        const stats = await api('/dashboard');
        const projects = await api('/projects');
        state.projects = projects;

        // Parse status counts from API
        const todoCount = stats.byStatus?.find(s => s.status === 'To Do')?.count || 0;
        const inProgressCount = stats.byStatus?.find(s => s.status === 'In Progress')?.count || 0;
        const doneCount = stats.byStatus?.find(s => s.status === 'Done')?.count || 0;
        const totalForBar = todoCount + inProgressCount + doneCount;
        const todoPct = totalForBar ? Math.round((todoCount / totalForBar) * 100) : 0;
        const inProgressPct = totalForBar ? Math.round((inProgressCount / totalForBar) * 100) : 0;
        const donePct = totalForBar ? 100 - todoPct - inProgressPct : 0;

        return `
            <div class="animate-fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h1>My Dashboard</h1>
                    <button class="btn btn-primary" id="new-project-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        New Project
                    </button>
                </div>

                <div class="dashboard-grid" style="margin-bottom: 2rem;">
                    <div class="glass card stat-card">
                        <span style="color: var(--text-muted);">Total Tasks</span>
                        <div class="stat-value">${stats.total}</div>
                    </div>
                    <div class="glass card stat-card">
                        <span style="color: var(--text-muted);">Assigned to Me</span>
                        <div class="stat-value text-gradient">${stats.assignedToMe}</div>
                    </div>
                    <div class="glass card stat-card">
                        <span style="color: var(--danger);">Overdue</span>
                        <div class="stat-value" style="color: var(--danger);">${stats.overdue}</div>
                    </div>
                </div>

                <!-- Tasks by Status -->
                <div class="glass card" style="margin-bottom: 3rem; padding: 1.5rem;">
                    <h3 style="margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        Tasks by Status
                    </h3>
                    ${totalForBar > 0 ? `
                        <div class="status-progress-bar">
                            ${todoPct > 0 ? `<div class="status-segment segment-todo" style="width: ${todoPct}%" title="To Do: ${todoCount}"></div>` : ''}
                            ${inProgressPct > 0 ? `<div class="status-segment segment-progress" style="width: ${inProgressPct}%" title="In Progress: ${inProgressCount}"></div>` : ''}
                            ${donePct > 0 ? `<div class="status-segment segment-done" style="width: ${donePct}%" title="Done: ${doneCount}"></div>` : ''}
                        </div>
                    ` : `
                        <div class="status-progress-bar">
                            <div class="status-segment" style="width: 100%; background: rgba(255,255,255,0.05);"></div>
                        </div>
                    `}
                    <div class="status-breakdown">
                        <div class="status-item">
                            <div class="status-dot" style="background: var(--text-muted);"></div>
                            <span class="status-label">To Do</span>
                            <span class="status-count">${todoCount}</span>
                        </div>
                        <div class="status-item">
                            <div class="status-dot" style="background: var(--warning);"></div>
                            <span class="status-label">In Progress</span>
                            <span class="status-count">${inProgressCount}</span>
                        </div>
                        <div class="status-item">
                            <div class="status-dot" style="background: var(--success);"></div>
                            <span class="status-label">Done</span>
                            <span class="status-count">${doneCount}</span>
                        </div>
                    </div>
                </div>

                <h2 style="margin-bottom: 1.5rem;">My Projects</h2>
                <div class="dashboard-grid">
                    ${projects.map(p => `
                        <div class="glass card project-card" onclick="window.location.hash = 'project/${p.id}'" style="cursor: pointer;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <h3>${p.name}</h3>
                                <span class="role-badge ${p.role.toLowerCase()}">${p.role}</span>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${p.description || 'No description'}</p>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Created ${new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        return `<div class="glass card" style="color: var(--danger);">${err.message}</div>`;
    }
}

async function ProjectView(id) {
    try {
        const tasks = await api(`/tasks/project/${id}`);
        
        // Ensure projects are loaded (handles direct navigation to project URL)
        if (state.projects.length === 0) {
            const projects = await api('/projects');
            state.projects = projects;
        }
        
        const project = state.projects.find(p => p.id === id);
        state.currentProject = project;
        
        const todo = tasks.filter(t => t.status === 'To Do');
        const inProgress = tasks.filter(t => t.status === 'In Progress');
        const done = tasks.filter(t => t.status === 'Done');

        const isAdmin = project?.role === 'Admin';

        return `
            <div class="animate-fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <a href="#dashboard" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">← Back to Dashboard</a>
                        <h1>${project ? project.name : 'Project'}</h1>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button class="btn btn-ghost" id="manage-members-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                <path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                            Members
                        </button>
                        ${isAdmin ? `
                            <button class="btn btn-primary" id="add-task-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                                Add Task
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="dashboard-grid" style="align-items: start; grid-template-columns: repeat(3, 1fr);">
                    <!-- TO DO -->
                    <div class="glass" style="padding: 1rem; border-radius: var(--radius); background: rgba(255,255,255,0.02);">
                        <h3 style="margin-bottom: 1rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                            TO DO <span>${todo.length}</span>
                        </h3>
                        <div class="task-list" style="display: flex; flex-direction: column; gap: 1rem;">
                            ${todo.map(t => TaskCard(t)).join('')}
                        </div>
                    </div>

                    <!-- IN PROGRESS -->
                    <div class="glass" style="padding: 1rem; border-radius: var(--radius); background: rgba(255,255,255,0.02);">
                        <h3 style="margin-bottom: 1rem; color: var(--warning); display: flex; justify-content: space-between;">
                            IN PROGRESS <span>${inProgress.length}</span>
                        </h3>
                        <div class="task-list" style="display: flex; flex-direction: column; gap: 1rem;">
                            ${inProgress.map(t => TaskCard(t)).join('')}
                        </div>
                    </div>

                    <!-- DONE -->
                    <div class="glass" style="padding: 1rem; border-radius: var(--radius); background: rgba(255,255,255,0.02);">
                        <h3 style="margin-bottom: 1rem; color: var(--success); display: flex; justify-content: space-between;">
                            DONE <span>${done.length}</span>
                        </h3>
                        <div class="task-list" style="display: flex; flex-direction: column; gap: 1rem;">
                            ${done.map(t => TaskCard(t)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        return `<div class="glass card" style="color: var(--danger);">${err.message}</div>`;
    }
}

function TaskCard(task) {
    const priorityColors = { 'High': 'var(--danger)', 'Medium': 'var(--warning)', 'Low': 'var(--success)' };
    const priorityIcons = { 'High': '🔴', 'Medium': '🟡', 'Low': '🟢' };
    const hasAssignee = task.assignee_name && task.assignee_name.trim();
    const avatarColor = hasAssignee ? getAvatarColor(task.assignee_name) : 'transparent';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

    return `
        <div class="glass card task-card-item" data-task-id="${task.id}" style="padding: 1rem; font-size: 0.9rem; cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span class="priority-badge priority-${task.priority?.toLowerCase()}">${priorityIcons[task.priority] || ''} ${task.priority}</span>
                ${task.due_date ? `<span style="font-size: 0.75rem; color: ${isOverdue ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: ${isOverdue ? '600' : '400'};">${isOverdue ? '⚠ ' : ''}${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
            </div>
            <h4 style="margin-bottom: 0.5rem;">${task.title}</h4>
            ${task.description ? `<p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${task.description}</p>` : '<div style="margin-bottom: 0.75rem;"></div>'}
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="task-assignee">
                    ${hasAssignee ? `
                        <div class="task-avatar" style="background: ${avatarColor}; color: white;">${task.assignee_name[0].toUpperCase()}</div>
                        <span class="task-assignee-name">${task.assignee_name}</span>
                    ` : `
                        <div class="task-avatar task-avatar-empty">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <span class="task-assignee-name" style="font-style: italic;">Unassigned</span>
                    `}
                </div>
                <select onclick="event.stopPropagation()" onchange="updateTaskStatus('${task.id}', this.value)" class="task-status-select">
                    <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
                    <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
                </select>
            </div>
        </div>
    `;
}

// --- Members Modal ---

const avatarColors = [
    '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b'
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function renderMembersModal(members, projectId, isAdmin) {
    const existing = document.getElementById('members-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'members-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Project Members</h2>
                <button class="modal-close" id="close-members-modal">×</button>
            </div>

            ${isAdmin ? `
                <form id="add-member-form" class="add-member-form" style="margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="margin-bottom: 4px;">Invite by Email</label>
                        <input type="email" id="member-email" required placeholder="colleague@company.com" style="margin: 0;">
                    </div>
                    <div>
                        <label style="margin-bottom: 4px;">Role</label>
                        <select id="member-role" style="margin: 0;">
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm" style="margin-bottom: 0; align-self: flex-end; padding: 0.7rem 1rem;">Add</button>
                </form>
                <hr class="divider">
            ` : ''}

            <div style="margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem;">${members.length} member${members.length !== 1 ? 's' : ''}</div>

            <div id="members-list">
                ${members.map(m => {
                    const color = getAvatarColor(m.name);
                    const isOwner = m.id === state.currentProject?.owner_id;
                    const isSelf = m.id === state.user?.id;
                    return `
                        <div class="member-row">
                            <div class="member-info">
                                <div class="member-avatar" style="background: ${color}; color: white;">
                                    ${m.name[0].toUpperCase()}
                                </div>
                                <div class="member-details">
                                    <span class="member-name">${m.name}${isSelf ? ' (You)' : ''}</span>
                                    <span class="member-email">${m.email}</span>
                                </div>
                            </div>
                            <div class="member-actions">
                                <span class="role-badge ${m.role.toLowerCase()}">${m.role}</span>
                                ${isAdmin && !isOwner && !isSelf ? `
                                    <button class="btn-danger btn-sm remove-member-btn" data-user-id="${m.id}" data-user-name="${m.name}">Remove</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Close button
    document.getElementById('close-members-modal').addEventListener('click', closeModal);

    // Close on Escape key
    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    // Add member form
    const addForm = document.getElementById('add-member-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('member-email').value.trim();
            const role = document.getElementById('member-role').value;

            if (!email) return;

            try {
                await api(`/projects/${projectId}/members`, 'POST', { email, role });
                // Refresh modal
                const updatedMembers = await api(`/projects/${projectId}/members`);
                closeModal();
                renderMembersModal(updatedMembers, projectId, isAdmin);
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Remove member buttons
    modal.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const userName = btn.dataset.userName;
            if (!confirm(`Remove ${userName} from this project?`)) return;

            try {
                await api(`/projects/${projectId}/members/${userId}`, 'DELETE');
                // Refresh modal
                const updatedMembers = await api(`/projects/${projectId}/members`);
                closeModal();
                renderMembersModal(updatedMembers, projectId, isAdmin);
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.animation = 'none';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.15s ease';
        setTimeout(() => modal.remove(), 150);
    });
}

// --- Edit Task Modal ---

async function renderEditTaskModal(taskId) {
    const projectId = window.location.hash.split('/')[1];
    const project = state.projects.find(p => p.id === projectId);
    const isAdmin = project?.role === 'Admin';

    // Fetch current task data & members
    let tasks, members = [];
    try {
        tasks = await api(`/tasks/project/${projectId}`);
        members = await api(`/projects/${projectId}/members`);
    } catch (err) {
        alert(err.message);
        return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) { alert('Task not found'); return; }

    const existing = document.getElementById('edit-task-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-task-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 560px;">
            <div class="modal-header">
                <h2>Task Details</h2>
                <button class="modal-close" id="close-edit-task-modal">×</button>
            </div>
            <form id="edit-task-form">
                <div class="form-group">
                    <label for="edit-task-title">Title <span style="color: var(--danger);">*</span></label>
                    <input type="text" id="edit-task-title" required value="${task.title.replace(/"/g, '&quot;')}" ${!isAdmin ? 'readonly style="opacity: 0.7; cursor: not-allowed;"' : ''}>
                </div>
                <div class="form-group">
                    <label for="edit-task-description">Description</label>
                    <textarea id="edit-task-description" rows="3" style="resize: vertical;" ${!isAdmin ? 'readonly style="resize: none; opacity: 0.7; cursor: not-allowed;"' : ''}>${task.description || ''}</textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="edit-task-priority">Priority</label>
                        <select id="edit-task-priority" ${!isAdmin ? 'disabled' : ''}>
                            <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
                            <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
                            <option value="High" ${task.priority === 'High' ? 'selected' : ''}>🔴 High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-task-due-date">Due Date</label>
                        <input type="date" id="edit-task-due-date" value="${task.due_date || ''}" ${!isAdmin ? 'readonly style="opacity: 0.7; cursor: not-allowed;"' : ''}>
                    </div>
                </div>
                <div class="form-group">
                    <label for="edit-task-assignee">Assign To</label>
                    <select id="edit-task-assignee" ${!isAdmin ? 'disabled' : ''}>
                        <option value="">Unassigned</option>
                        ${members.map(m => `<option value="${m.id}" ${task.assigned_to === m.id ? 'selected' : ''}>${m.name} (${m.email})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="edit-task-status">
                        <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
                        <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
                <div style="display: flex; gap: 0.75rem; justify-content: space-between; margin-top: 1.5rem;">
                    ${isAdmin ? `<button type="button" class="btn btn-sm" id="delete-task-btn" style="background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); cursor: pointer; padding: 0.6rem 1rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Delete
                    </button>` : '<div></div>'}
                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" class="btn btn-ghost" id="cancel-edit-task-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="save-task-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                            Save Changes
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.getElementById('close-edit-task-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-edit-task-btn').addEventListener('click', closeModal);
    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    // Save handler
    document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-task-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';

        const body = { status: document.getElementById('edit-task-status').value };
        if (isAdmin) {
            body.title = document.getElementById('edit-task-title').value.trim();
            body.description = document.getElementById('edit-task-description').value.trim();
            body.priority = document.getElementById('edit-task-priority').value;
            body.due_date = document.getElementById('edit-task-due-date').value || null;
            body.assigned_to = document.getElementById('edit-task-assignee').value || null;
        }

        try {
            await api(`/tasks/${taskId}`, 'PATCH', body);
            closeModal();
            render();
        } catch (err) {
            alert(err.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Save Changes`;
        }
    });

    // Delete handler
    const deleteBtn = document.getElementById('delete-task-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = 'Deleting...';
            try {
                await api(`/tasks/${taskId}`, 'DELETE');
                closeModal();
                render();
            } catch (err) {
                alert(err.message);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Delete`;
            }
        });
    }
}

// --- Add Task Modal ---

async function renderAddTaskModal(projectId) {
    const existing = document.getElementById('add-task-modal');
    if (existing) existing.remove();

    // Fetch project members for the assignee dropdown
    let members = [];
    try {
        members = await api(`/projects/${projectId}/members`);
    } catch (err) {
        console.error('Failed to load members:', err);
    }

    const modal = document.createElement('div');
    modal.id = 'add-task-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 560px;">
            <div class="modal-header">
                <h2>Create New Task</h2>
                <button class="modal-close" id="close-task-modal">×</button>
            </div>
            <form id="add-task-form">
                <div class="form-group">
                    <label for="task-title">Title <span style="color: var(--danger);">*</span></label>
                    <input type="text" id="task-title" required placeholder="e.g. Design homepage wireframe" autofocus>
                </div>
                <div class="form-group">
                    <label for="task-description">Description</label>
                    <textarea id="task-description" rows="3" placeholder="Add details about this task..." style="resize: vertical;"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="task-priority">Priority</label>
                        <select id="task-priority">
                            <option value="Low">🟢 Low</option>
                            <option value="Medium" selected>🟡 Medium</option>
                            <option value="High">🔴 High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="task-due-date">Due Date</label>
                        <input type="date" id="task-due-date">
                    </div>
                </div>
                <div class="form-group">
                    <label for="task-assignee">Assign To</label>
                    <select id="task-assignee">
                        <option value="">Unassigned</option>
                        ${members.map(m => `<option value="${m.id}">${m.name} (${m.email})</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-ghost" id="cancel-task-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-task-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Create Task
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.getElementById('close-task-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-task-btn').addEventListener('click', closeModal);

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    // Submit handler
    document.getElementById('add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const due_date = document.getElementById('task-due-date').value || null;
        const assigned_to = document.getElementById('task-assignee').value || null;

        if (!title) return;

        const submitBtn = document.getElementById('submit-task-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating...';

        try {
            await api(`/tasks/project/${projectId}`, 'POST', {
                title, description, priority, due_date, assigned_to
            });
            closeModal();
            render();
        } catch (err) {
            alert(err.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                Create Task
            `;
        }
    });
}

// --- New Project Modal ---

function renderNewProjectModal() {
    const existing = document.getElementById('new-project-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'new-project-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px;">
            <div class="modal-header">
                <h2>New Project</h2>
                <button class="modal-close" id="close-project-modal">×</button>
            </div>
            <form id="new-project-form">
                <div class="form-group">
                    <label for="project-name">Project Name <span style="color: var(--danger);">*</span></label>
                    <input type="text" id="project-name" required placeholder="e.g. Mobile App Redesign" autofocus>
                </div>
                <div class="form-group">
                    <label for="project-description">Description</label>
                    <textarea id="project-description" rows="3" placeholder="Describe the project..." style="resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-ghost" id="cancel-project-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="submit-project-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Create Project
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.getElementById('close-project-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-project-btn').addEventListener('click', closeModal);

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    document.getElementById('new-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('project-name').value.trim();
        const description = document.getElementById('project-description').value.trim();

        if (!name) return;

        const submitBtn = document.getElementById('submit-project-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating...';

        try {
            await api('/projects', 'POST', { name, description });
            closeModal();
            render();
        } catch (err) {
            alert(err.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                Create Project
            `;
        }
    });
}

// --- Controller ---

async function render() {
    const app = document.getElementById('app');
    const nav = document.getElementById('nav-user');
    const hash = window.location.hash || '#dashboard';

    // Nav bar logic
    if (state.user) {
        nav.innerHTML = `
            <span style="color: var(--text-muted);">Hi, <strong>${state.user.name}</strong></span>
            <button class="btn btn-ghost" onclick="logout()" style="padding: 0.5rem 1rem;">Logout</button>
        `;
    } else {
        nav.innerHTML = `
            <a href="#login" class="btn btn-ghost" style="text-decoration: none;">Login</a>
            <a href="#signup" class="btn btn-primary" style="text-decoration: none;">Get Started</a>
        `;
    }

    // Routing
    if (hash === '#login') {
        app.innerHTML = LoginView();
    } else if (hash === '#signup') {
        app.innerHTML = SignupView();
    } else if (!state.token) {
        window.location.hash = 'login';
    } else if (hash === '#dashboard') {
        app.innerHTML = await DashboardView();
    } else if (hash.startsWith('#project/')) {
        const id = hash.split('/')[1];
        app.innerHTML = await ProjectView(id);
    }
}

// --- Events ---

document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.target.id;

    if (id === 'login-form') {
        try {
            const data = await api('/auth/login', 'POST', {
                email: e.target.email.value,
                password: e.target.password.value
            });
            login(data);
        } catch (err) { alert(err.message); }
    }

    if (id === 'signup-form') {
        try {
            const data = await api('/auth/signup', 'POST', {
                name: e.target.name.value,
                email: e.target.email.value,
                password: e.target.password.value
            });
            login(data);
        } catch (err) { alert(err.message); }
    }
});

// Fixed: use closest('button#id') to properly handle clicks on SVG children inside buttons
document.addEventListener('click', async (e) => {
    // New Project button
    if (e.target.closest('#new-project-btn')) {
        renderNewProjectModal();
        return;
    }

    // Add Task button
    if (e.target.closest('#add-task-btn')) {
        const projectId = window.location.hash.split('/')[1];
        renderAddTaskModal(projectId);
        return;
    }

    // Manage Members button
    if (e.target.closest('#manage-members-btn')) {
        const projectId = window.location.hash.split('/')[1];
        const project = state.projects.find(p => p.id === projectId);
        const isAdmin = project?.role === 'Admin';

        try {
            const members = await api(`/projects/${projectId}/members`);
            renderMembersModal(members, projectId, isAdmin);
        } catch (err) { alert(err.message); }
        return;
    }

    // Task card click → open edit modal
    const taskCard = e.target.closest('.task-card-item');
    if (taskCard && !e.target.closest('select')) {
        const taskId = taskCard.dataset.taskId;
        if (taskId) renderEditTaskModal(taskId);
        return;
    }
});

window.updateTaskStatus = async (taskId, status) => {
    try {
        await api(`/tasks/${taskId}`, 'PATCH', { status });
        render();
    } catch (err) { alert(err.message); }
};

function login(data) {
    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    navigate('dashboard');
}

window.logout = () => {
    state.user = null;
    state.token = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('login');
};

window.addEventListener('hashchange', render);
render();
