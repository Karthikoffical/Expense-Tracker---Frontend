// Authentication utility functions
const AUTH_API = 'https://expense-tracker-backend-fzm1.onrender.com/api/auth';

// Check if user is logged in
function isUserLoggedIn() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return !!token;
}

// Get stored token
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Get stored user data
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Logout user
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Add token to all fetch requests
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token && !url.includes('/auth/register') && !url.includes('/auth/login')) {
        // Not logged in and endpoint requires auth
        window.location.href = 'login.html';
        throw new Error('Not authenticated');
    }

    const headers = {
        ...options.headers,
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // If token expired or invalid
    if (response.status === 403 || response.status === 401) {
        logoutUser();
        throw new Error('Authentication failed');
    }

    return response;
}

// Update navbar based on login state
function updateNavbar() {
    if (isUserLoggedIn()) {
        const user = getUser();
        const username = user ? user.username : 'User';
        
        // Hide register/login links
        const authLinks = document.querySelectorAll('.nav-auth-public');
        authLinks.forEach(link => link?.classList.add('d-none'));

        // Show authenticated links
        const authUserLinks = document.querySelectorAll('.nav-auth-private');
        authUserLinks.forEach(link => link?.classList.remove('d-none'));

        // Update username display
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = username;
        }
    } else {
        // Show register/login links
        const authLinks = document.querySelectorAll('.nav-auth-public');
        authLinks.forEach(link => link?.classList.remove('d-none'));

        // Hide authenticated links
        const authUserLinks = document.querySelectorAll('.nav-auth-private');
        authUserLinks.forEach(link => link?.classList.add('d-none'));
    }
}

// Protect routes (redirect to login if not authenticated)
function protectRoute() {
    if (!isUserLoggedIn()) {
        window.location.href = 'login.html';
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavbar();
});
