/**
 * SchooLama – Sidebar + Auth Guard
 * Call buildSidebar() at the top of every page script.
 */

const NAV_CONFIG = {
  admin: [
    { section: 'Overview' },
    { label: 'Dashboard',    href: 'admin-dashboard.html',   icon: '⊞' },
    { section: 'Management' },
    { label: 'Students',     href: 'students.html',          icon: '🎓' },
    { label: 'Teachers',     href: 'teachers.html',          icon: '👨‍🏫' },
    { label: 'Parents',      href: 'parents.html',           icon: '👨‍👩‍👧' },
    { label: 'Classes',      href: 'classes.html',           icon: '🏫' },
    { label: 'Subjects',     href: 'subjects.html',          icon: '📚' },
    { section: 'Academic' },
    { label: 'Lessons',      href: 'lessons.html',           icon: '📖' },
    { label: 'Exams',        href: 'exams.html',             icon: '📝' },
    { label: 'Assignments',  href: 'assignments.html',       icon: '📋' },
    { label: 'Results',      href: 'results.html',           icon: '📊' },
    { label: 'Attendance',   href: 'attendance.html',        icon: '✅' },
    { section: 'Communication' },
    { label: 'Events',       href: 'events.html',            icon: '📅' },
    { label: 'Announcements',href: 'announcements.html',     icon: '📢' },
  ],
  teacher: [
    { section: 'Overview' },
    { label: 'Dashboard',    href: 'teacher-dashboard.html', icon: '⊞' },
    { section: 'Academic' },
    { label: 'Lessons',      href: 'lessons.html',           icon: '📖' },
    { label: 'Exams',        href: 'exams.html',             icon: '📝' },
    { label: 'Assignments',  href: 'assignments.html',       icon: '📋' },
    { label: 'Attendance',   href: 'attendance.html',        icon: '✅' },
    { section: 'Other' },
    { label: 'Events',       href: 'events.html',            icon: '📅' },
    { label: 'Announcements',href: 'announcements.html',     icon: '📢' },
  ],
  student: [
    { section: 'Overview' },
    { label: 'Dashboard',    href: 'student-dashboard.html', icon: '⊞' },
    { section: 'Academic' },
    { label: 'Lessons',      href: 'lessons.html',           icon: '📖' },
    { label: 'Assignments',  href: 'assignments.html',       icon: '📋' },
    { label: 'Results',      href: 'results.html',           icon: '📊' },
    { label: 'Attendance',   href: 'attendance.html',        icon: '✅' },
    { section: 'Other' },
    { label: 'Events',       href: 'events.html',            icon: '📅' },
    { label: 'Announcements',href: 'announcements.html',     icon: '📢' },
  ],
  parent: [
    { section: 'Overview' },
    { label: 'Dashboard',    href: 'parent-dashboard.html',  icon: '⊞' },
    { section: 'My Child' },
    { label: 'Results',      href: 'results.html',           icon: '📊' },
    { label: 'Attendance',   href: 'attendance.html',        icon: '✅' },
    { label: 'Assignments',  href: 'assignments.html',       icon: '📋' },
    { section: 'Other' },
    { label: 'Events',       href: 'events.html',            icon: '📅' },
    { label: 'Announcements',href: 'announcements.html',     icon: '📢' },
  ],
};

/**
 * Auth guard: redirects to login if not authenticated.
 * Pass allowed roles (e.g. ['admin']) or omit for any role.
 */
function requireAuth(allowedRoles = null) {
  const user = API.getUser();
  if (!user) {
    window.location.replace('../index.html');
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.replace(`${user.role}-dashboard.html`);
    return null;
  }
  return user;
}

/**
 * Build and inject the sidebar + mobile overlay + topbar toggle.
 * Must be called after DOM is ready.
 */
function buildSidebar(pageTitle = '') {
  const user = requireAuth();
  if (!user) return;

  const nav    = NAV_CONFIG[user.role] ?? [];
  const curPage = location.pathname.split('/').pop();

  const sidebarHtml = `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
      <!-- Logo -->
      <div class="sidebar-logo">
        <img src="../assets/lama/logo.png" alt="SchooLama logo"
             onerror="this.style.display='none'">
        <div>
          <div class="sidebar-logo-name">SchooLama</div>
          <div class="sidebar-logo-tag">${user.role}</div>
        </div>
      </div>

      <!-- User info -->
      <div class="sidebar-user">
        <div class="sidebar-avatar" aria-hidden="true">
          ${getInitials(user.name || user.username || user.role)}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name || user.username || '—'}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        ${nav.map(item => {
          if (item.section) {
            return `<div class="sidebar-section-label">${item.section}</div>`;
          }
          const isActive = item.href === curPage;
          return `
            <a href="${item.href}"
               class="sidebar-link ${isActive ? 'active' : ''}"
               ${isActive ? 'aria-current="page"' : ''}>
              <span class="nav-icon" aria-hidden="true">${item.icon}</span>
              ${item.label}
            </a>`;
        }).join('')}
      </nav>

      <!-- Logout -->
      <div class="sidebar-footer">
        <button class="sidebar-logout" id="logout-btn" aria-label="Log out">
          <span aria-hidden="true">⏻</span>
          Log out
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>`;

  // Inject before page content
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) {
    appLayout.insertAdjacentHTML('afterbegin', sidebarHtml);
  } else {
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
  }

  // Set topbar title
  const titleEl = document.getElementById('page-title');
  if (titleEl && pageTitle) titleEl.textContent = pageTitle;

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    API.logout();
    window.location.replace('../index.html');
  });

  // Mobile toggle
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    overlay?.setAttribute('aria-hidden', 'false');
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    overlay?.setAttribute('aria-hidden', 'true');
  }

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);

  // Close on nav click (mobile)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  return user;
}
