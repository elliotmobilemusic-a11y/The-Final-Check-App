export type BusinessLookupSite = {
  name: string;
  address: string;
  website: string;
  status: string;
  notes: string;
};

export type BusinessLookupScope = 'group' | 'site' | 'all';

export type BusinessLookupResult = {
  id: string;
  name: string;
  officialName: string;
  description: string;
  resultType: 'group' | 'site';
  accountScope: 'Single site' | 'Multi-site group' | 'Group / head office';
  website: string;
  industry: string;
  location: string;
  country: string;
  logoUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  email: string;
  phone: string;
  addressLine: string;
  registeredAddress: string;
  companyNumber: string;
  vatNumber: string;
  siteCountEstimate: number;
  sites: BusinessLookupSite[];
  wikidataId: string;
  confidenceScore: number;
  confidenceLabel: string;
  signals: string[];
};

export type BusinessLookupProfile = BusinessLookupResult & {
  summary: string;
  coverUrl: string;
};

type SearchResponse = {
  matches?: BusinessLookupResult[];
  provider?: string;
  error?: string;
};

type ProfileResponse = {
  match?: BusinessLookupResult & { summary?: string };
  error?: string;
};

function normalizeWebsite(value?: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function domainLogoUrl(value?: string) {
  if (!value) return '';

  try {
    const hostname = new URL(normalizeWebsite(value)).hostname.replace(/^www\./, '').toLowerCase();
    return hostname
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=256`
      : '';
  } catch {
    return '';
  }
}

function buildBusinessSummary(result: BusinessLookupResult, summaryText?: string) {
  const parts = [
    summaryText || result.description,
    result.companyNumber ? `Company number: ${result.companyNumber}` : '',
    result.registeredAddress ? `Registered office: ${result.registeredAddress}` : '',
    result.industry ? `Industry: ${result.industry}` : '',
    result.location ? `Location: ${result.location}` : ''
  ].filter(Boolean);

  return parts.join('. ') || `${result.name} matched from public business data.`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' && payload && 'error' in payload ? String(payload.error) : '';
    throw new Error(errorMessage || `Business lookup failed (${response.status}).`);
  }

  return payload as T;
}

export async function searchBusinessProfiles(
  query: string,
  _scope: BusinessLookupScope = 'all'
): Promise<BusinessLookupResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const response = await fetchJson<SearchResponse>(`/api/business-search?q=${encodeURIComponent(trimmed)}`);
  return Array.isArray(response.matches) ? response.matches : [];
}

export async function getBusinessProfile(result: BusinessLookupResult): Promise<BusinessLookupProfile> {
  if (!result.companyNumber) {
    return {
      ...result,
      logoUrl: result.logoUrl || domainLogoUrl(result.website),
      coverUrl: result.logoUrl || domainLogoUrl(result.website),
      summary: buildBusinessSummary(result)
    };
  }

  try {
    const response = await fetchJson<ProfileResponse>(
      `/api/business-search?company_number=${encodeURIComponent(result.companyNumber)}`
    );
    const match = response.match;

    if (!match) throw new Error('Company profile not found.');

    const logoUrl = match.logoUrl || result.logoUrl || domainLogoUrl(match.website || result.website);

    return {
      ...result,
      ...match,
      logoUrl,
      coverUrl: logoUrl,
      summary: buildBusinessSummary(match, match.summary)
    };
  } catch {
    return {
      ...result,
      logoUrl: result.logoUrl || domainLogoUrl(result.website),
      coverUrl: result.logoUrl || domainLogoUrl(result.website),
      summary: buildBusinessSummary(result)
    };
  }
}
