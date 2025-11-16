// Authentication Guard - Protects pages from unauthorized access
// Place this script at the TOP of every protected page

(function() {
  'use strict';

  console.log('🔐 Auth Guard Loading...');

  // Page configuration - maps pages to allowed roles
  const PAGE_ROLES = {
    // Non-student pages
    'index.html':           ['Scheduler', 'Faculty', 'LoadCommittee'],
    'rules.html':           ['Scheduler', 'Faculty', 'LoadCommittee'],
    'version-history.html': ['Scheduler', 'Faculty', 'LoadCommittee'],
    'students.html':        ['Scheduler', 'Faculty', 'LoadCommittee'],

    // Student-only pages
    'StudentHP.html':       ['Student'],
    'students.html':        ['Student'],          // duplicate key removed below

    // Role-specific pages
    'FacultyHP.html':           ['Faculty'],
    'LoadCommitteeHP.html':     ['LoadCommittee'],
    'faculty-electives.html':   ['Faculty'],
    'load-committee-dashboard.html': ['LoadCommittee']
  };

  // Public pages that don't require authentication
  const PUBLIC_PAGES = [
    'LoginReg.html',
    'login.html',
    'register.html'
  ];

  /**
   * Immediately redirect to login without showing page content
   */
  function redirectToLogin() {
    console.log('🔄 Redirecting to login...');
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('justRedirected', 'true');
    window.location.replace('LoginReg.html');
  }

  /**
   * Check if user is authenticated and has proper role
   */
  function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('📄 Current page:', currentPage);

    if (PUBLIC_PAGES.includes(currentPage)) {
      console.log('✅ Public page - access allowed');
      document.body.classList.add('auth-verified');
      return;
    }

    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    console.log('🔍 Auth check - User:', userStr ? 'Found' : 'Not found', 'Token:', token ? 'Found' : 'Not found');

    if (!userStr || !token) {
      console.warn('❌ No authentication found. Redirecting to login...');
      redirectToLogin();
      return;
    }

    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
    if (redirectCount > 2) {
      console.error('🔄 Redirect loop detected! Clearing session and stopping.');
      sessionStorage.clear();
      localStorage.clear();
      sessionStorage.setItem('justRedirected', 'true');
      window.location.replace('LoginReg.html');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      console.log('👤 User role:', user.role);

      const allowedRoles = PAGE_ROLES[currentPage];

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`🚫 Access denied. User role: ${user.role}, Required: ${allowedRoles.join(', ')}`);

        const rolePages = {
          'Scheduler':     'index.html',
          'Student':       'StudentHP.html',
          'Faculty':       'FacultyHP.html',
          'LoadCommittee': 'LoadCommitteeHP.html'
        };

        const correctPage = rolePages[user.role] || 'LoginReg.html';
        sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());

        if (correctPage === 'LoginReg.html') {
          sessionStorage.clear();
          localStorage.clear();
          sessionStorage.setItem('justRedirected', 'true');
        }
        window.location.replace(correctPage);
        return;
      }

      sessionStorage.removeItem('redirectCount');
      console.log(`✅ Access granted for ${user.role} to ${currentPage}`);
      document.body.classList.add('auth-verified');

    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      redirectToLogin();
    }
  }

  /**
   * Logout function - can be called from anywhere
   */
  window.logout = function() {
    console.log('🚪 Logging out...');
    sessionStorage.clear();
    localStorage.clear();
    window.location.replace('LoginReg.html');
  };

  /**
   * Get current user info
   */
  window.getCurrentUser = function() {
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  /**
   * Check if user has specific role
   */
  window.hasRole = function(role) {
    const user = window.getCurrentUser();
    return user && user.role === role;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();