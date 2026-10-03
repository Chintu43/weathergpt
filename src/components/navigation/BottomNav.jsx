import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, AlertTriangle, Compass, Sprout, User } from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    hoverLabel: 'GO TO HOME',
    path: '/home',
    icon: Home,
    ariaLabel: 'Navigate to WeatherGPT Home'
  },
  {
    id: 'map',
    label: 'Map',
    hoverLabel: 'GO TO MAP',
    path: '/map',
    icon: Map,
    ariaLabel: 'Navigate to Weather Map'
  },
  {
    id: 'alerts',
    label: 'Alerts',
    hoverLabel: 'GO TO ALERTS',
    path: '/alerts',
    icon: AlertTriangle,
    ariaLabel: 'Navigate to Weather Alerts'
  },
  {
    id: 'travel',
    label: 'Travel Planner',
    hoverLabel: 'GO TO TRAVEL',
    path: '/travel',
    icon: Compass,
    ariaLabel: 'Navigate to Travel Planner'
  },
  {
    id: 'farmergpt',
    label: 'FarmerGPT',
    hoverLabel: 'GO TO FARMERGPT',
    path: '/farmergpt',
    icon: Sprout,
    ariaLabel: 'Navigate to FarmerGPT'
  },
  {
    id: 'profile',
    label: 'Profile',
    hoverLabel: 'GO TO PROFILE',
    path: '/profile',
    icon: User,
    ariaLabel: 'Navigate to User Profile and Settings'
  }
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav-container" role="navigation" aria-label="Main Navigation">
      <div className="bottom-nav-bar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === '/home' && location.pathname === '/app') ||
            (item.path === '/travel' && location.pathname === '/travel-planner') ||
            (item.path === '/farmergpt' && location.pathname === '/farmer');

          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-item ${isActive ? 'is-active' : ''}`}
              data-nav-id={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bottom-nav-icon-wrapper">
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} className="bottom-nav-icon" />
              </div>
              <span className="bottom-nav-label" data-hover={item.hoverLabel}>
                <span className="bottom-nav-label-default">{item.label}</span>
              </span>
              {isActive && <div className="bottom-nav-active-glow" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
