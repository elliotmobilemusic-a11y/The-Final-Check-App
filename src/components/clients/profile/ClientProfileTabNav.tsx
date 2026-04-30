import { NavLink } from 'react-router-dom';

interface ClientProfileTabNavProps {
  clientId: string;
  activeTab: string;
}

export function ClientProfileTabNav({
  clientId,
  activeTab
}: ClientProfileTabNavProps) {
  const tabs = [
    { id: 'information', label: 'Information' },
    { id: 'services', label: 'Work & services' },
    { id: 'portal', label: 'Client portal' },
    { id: 'pricing', label: 'Pricing' }
  ];

  return (
    <nav className="client-profile-tab-nav" aria-label="Client profile sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={`/clients/${clientId}/${tab.id}`}
          className={({ isActive }) => `client-profile-tab ${isActive ? 'active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}