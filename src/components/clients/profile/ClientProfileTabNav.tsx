import { Link } from 'react-router-dom';

export type ClientProfileTabKey =
  | 'information'
  | 'services'
  | 'portal'
  | 'pricing';

type ClientProfileTabNavProps = {
  clientId: string;
  activeTab: ClientProfileTabKey;
};

const tabs: Array<{ key: ClientProfileTabKey; label: string }> = [
  { key: 'information', label: 'Client information' },
  { key: 'services', label: 'Audits & services' },
  { key: 'portal', label: 'Client portal' },
  { key: 'pricing', label: 'Invoices & pricing' }
];

export function ClientProfileTabNav({ clientId, activeTab }: ClientProfileTabNavProps) {
  return (
    <nav className="client-tab-nav" aria-label="Client profile tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          className={`client-tab-link ${activeTab === tab.key ? 'active' : ''}`}
          to={`/clients/${clientId}/${tab.key}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
