import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SiteNav: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <NavLink className="brand" to="/">
        <span className="brand-badge">BLT</span>
        <span>SLAM Challenge</span>
      </NavLink>

      <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          onClick={() => setMobileOpen(false)}
        >
          Overview
        </NavLink>
        <a
          href="#dataset"
          className="nav-link"
          onClick={() => setMobileOpen(false)}
        >
          Dataset & Rules
        </a>
        <a
          href="#submit"
          className="nav-link"
          onClick={() => setMobileOpen(false)}
        >
          Submit
        </a>
        <a
          href="#leaderboards"
          className="nav-link"
          onClick={() => setMobileOpen(false)}
        >
          Leaderboards
        </a>
        <NavLink
          to="/admin"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          onClick={() => setMobileOpen(false)}
        >
          Admin
        </NavLink>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle mobile navigation menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default SiteNav;
