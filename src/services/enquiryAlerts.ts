import type { ClientRecord } from '../types';
import { listClients } from './clients';

const ALERTS_LIMIT = 24;

type StoredEnquiryAlertState = {
  knownClientIds: string[];
  alerts: EnquiryAlert[];
};

export type EnquiryAlert = {
  id: string;
  clientId: string;
  companyName: string;
  contactName: string;
  location: string;
  createdAt: string;
  readAt: string | null;
};

function storageKey(userId: string) {
  return `the-final-check-enquiry-alerts:${userId}`;
}

function preferenceKey(userId: string) {
  return `the-final-check-enquiry-alert-preference:${userId}`;
}

function isEnquiryClient(client: ClientRecord) {
  const leadSource = String(client.data?.leadSource ?? '').trim().toLowerCase();
  return leadSource === 'client enquiry form';
}

function parseState(raw: string | null): StoredEnquiryAlertState {
  if (!raw) {
    return {
      knownClientIds: [],
      alerts: []
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredEnquiryAlertState>;
    return {
      knownClientIds: Array.isArray(parsed.knownClientIds) ? parsed.knownClientIds : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : []
    };
  } catch {
    return {
      knownClientIds: [],
      alerts: []
    };
  }
}

function readState(userId: string) {
  if (typeof window === 'undefined') {
    return {
      knownClientIds: [],
      alerts: []
    } satisfies StoredEnquiryAlertState;
  }

  return parseState(window.localStorage.getItem(storageKey(userId)));
}

function writeState(userId: string, state: StoredEnquiryAlertState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

function sortAlerts(alerts: EnquiryAlert[]) {
  return [...alerts].sort((left, right) => {
    const rightTime = new Date(right.createdAt).getTime();
    const leftTime = new Date(left.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function createAlert(client: ClientRecord): EnquiryAlert {
  return {
    id: `enquiry:${client.id}`,
    clientId: client.id,
    companyName: client.company_name || 'New enquiry',
    contactName: client.contact_name || '',
    location: client.location || '',
    createdAt: client.created_at || new Date().toISOString(),
    readAt: null
  };
}

export function getEnquiryAlertPreference(userId: string) {
  if (typeof window === 'undefined') return true;

  const stored = window.localStorage.getItem(preferenceKey(userId));
  return stored === null ? true : stored === 'true';
}

export function setEnquiryAlertPreference(userId: string, enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(preferenceKey(userId), String(enabled));
}

export function getEnquiryAlertSnapshot(userId: string) {
  const state = readState(userId);
  const alerts = sortAlerts(state.alerts).slice(0, ALERTS_LIMIT);
  const unreadCount = alerts.filter((alert) => !alert.readAt).length;

  return {
    alerts,
    unreadCount,
    enabled: getEnquiryAlertPreference(userId)
  };
}

export function markEnquiryAlertRead(userId: string, alertId: string) {
  const state = readState(userId);
  const nextState = {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId && !alert.readAt
        ? { ...alert, readAt: new Date().toISOString() }
        : alert
    )
  };

  writeState(userId, nextState);
  return getEnquiryAlertSnapshot(userId);
}

export function markAllEnquiryAlertsRead(userId: string) {
  const state = readState(userId);
  const timestamp = new Date().toISOString();
  const nextState = {
    ...state,
    alerts: state.alerts.map((alert) => ({
      ...alert,
      readAt: alert.readAt || timestamp
    }))
  };

  writeState(userId, nextState);
  return getEnquiryAlertSnapshot(userId);
}

export async function scanForNewEnquiryAlerts(userId: string) {
  const currentState = readState(userId);
  const clients = await listClients();
  const enquiryClients = clients.filter(isEnquiryClient);

  if (!currentState.knownClientIds.length && !currentState.alerts.length) {
    writeState(userId, {
      knownClientIds: enquiryClients.map((client) => client.id),
      alerts: []
    });

    return {
      newAlerts: [] as EnquiryAlert[],
      ...getEnquiryAlertSnapshot(userId)
    };
  }

  const knownIds = new Set(currentState.knownClientIds);
  const newAlerts = enquiryClients
    .filter((client) => !knownIds.has(client.id))
    .map(createAlert);

  const nextState = {
    knownClientIds: enquiryClients.map((client) => client.id),
    alerts: sortAlerts([...newAlerts, ...currentState.alerts]).slice(0, ALERTS_LIMIT)
  };

  writeState(userId, nextState);

  return {
    newAlerts,
    ...getEnquiryAlertSnapshot(userId)
  };
}
