const STORAGE_KEY = 'weathergpt_auth_session';
const USERS_STORAGE_KEY = 'weathergpt_registered_users';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_USERS = [
  {
    id: 'usr_demo1',
    name: 'Prudhvi',
    email: 'demo@weathergpt.ai',
    password: 'password123',
    phoneNumber: '+919876543210',
    role: 'Senior Meteorologist',
    location: 'New Delhi, India',
    createdAt: new Date().toISOString()
  }
];

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to persist users to localStorage', err);
  }
}

export const authService = {
  async syncWithBackend(userPayload) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Unable to save user information. Please try again.');
      }
      return data;
    } catch (err) {
      console.error('[AuthService] Backend sync error:', err.message);
      throw new Error(err.message || 'Unable to save user information. Please try again.');
    }
  },

  async login(email, password, phone) {
    // No artificial artificial sleep delay
    const normalizedEmail = email.trim().toLowerCase();
    const users = getStoredUsers();
    const localUser = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
    );

    if (!localUser) {
      // Fallback: try backend-verified login (Supabase + passwordStore)
      let backendUser = null;
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          backendUser = data.user;
        }
      } catch {
        // backend unreachable — fall through to local error
      }

      if (!backendUser) {
        throw new Error('Invalid email or password.');
      }

      // Backend verified — add to localStorage so future logins work locally
      const syntheticUser = {
        id: `usr_${Date.now()}`,
        name: backendUser.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password,                               // store plaintext for localStorage compatibility
        phoneNumber: backendUser.phone_number || phone || '',
        role: backendUser.role || 'user',
        location: 'India',
        createdAt: new Date().toISOString()
      };
      users.push(syntheticUser);
      saveStoredUsers(users);

      const targetPhone = phone ? phone.trim() : (syntheticUser.phoneNumber || '');

      if (targetPhone) {
        // Non-blocking background sync
        this.syncWithBackend({
          name: syntheticUser.name,
          email: normalizedEmail,
          phone_number: targetPhone,
          country: 'India',
          role: backendUser.role || 'user'
        }).catch(() => {});
      }

      const session = {
        token: `wgt_${Math.random().toString(36).slice(2)}_${Date.now()}`,
        user: {
          id: syntheticUser.id,
          name: syntheticUser.name,
          email: syntheticUser.email,
          phone_number: targetPhone,
          role: backendUser.role || 'user',
          location: 'India'
        },
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    }

    // --- Normal localStorage login path ---
    const user = localUser;
    const targetPhone = phone ? phone.trim() : (user.phoneNumber || user.phone || '');

    // Sync user information with backend in background without blocking login
    this.syncWithBackend({
      name: user.name,
      email: normalizedEmail,
      phone_number: targetPhone,
      city: user.city || null,
      district: user.district || null,
      state: user.state || null,
      country: user.country || 'India',
      role: user.role || 'user'
    }).catch(() => {});

    if (phone) {
      user.phoneNumber = targetPhone;
      saveStoredUsers(users);
    }

    const session = {
      token: `wgt_${Math.random().toString(36).slice(2)}_${Date.now()}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phoneNumber || targetPhone,
        role: user.role || 'Weather Researcher',
        location: user.location || 'India'
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  },

  async adminLogin(email, password, phone) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Please fill in all required fields.');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          phone_number: phone ? phone.trim() : undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 403 || data.error === 'ADMIN_ACCESS_REQUIRED') {
          throw new Error('You do not have administrator access.');
        }
        if (res.status === 401 || data.error === 'INVALID_CREDENTIALS') {
          throw new Error('Invalid login credentials.');
        }
        throw new Error(data.message || 'Unable to verify administrator access. Please try again.');
      }

      const adminUser = data.user;

      const session = {
        token: `wgt_admin_${Math.random().toString(36).slice(2)}_${Date.now()}`,
        user: {
          id: adminUser.id,
          name: adminUser.name || 'Administrator',
          email: adminUser.email,
          phone_number: adminUser.phone_number || phone || '',
          role: 'admin',
          location: 'Admin Portal'
        },
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    } catch (err) {
      console.error('[AuthService] Admin login error:', err.message);
      throw err;
    }
  },

  async register(name, email, password, phone) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const normalizedEmail = email.trim().toLowerCase();
    const users = getStoredUsers();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const targetPhone = phone ? phone.trim() : '';

    // Sync user information with backend / Supabase
    await this.syncWithBackend({
      name: name.trim(),
      email: normalizedEmail,
      phone_number: targetPhone,
      country: 'India',
      role: 'user'
    });

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      phoneNumber: targetPhone,
      role: 'Weather Analyst',
      location: 'India',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveStoredUsers(users);

    const session = {
      token: `wgt_${Math.random().toString(36).slice(2)}_${Date.now()}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phoneNumber,
        role: newUser.role,
        location: newUser.location
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  },

  getCurrentSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  logout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear session', err);
    }
  }
};
