const COMPANIES_HOUSE_API = 'https://api.company-information.service.gov.uk';
const COMPANIES_HOUSE_PUBLIC_COMPANY_URL =
  'https://find-and-update.company-information.service.gov.uk/company';
const NOMINATIM_SEARCH_API = 'https://nominatim.openstreetmap.org/search';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GENERIC_QUERY_TOKENS = new Set([
  'uk',
  'the',
  'and',
  'co',
  'company',
  'companies',
  'group',
  'holdings',
  'holding',
  'services',
  'service',
  'limited',
  'ltd',
  'plc',
  'llp'
]);
const HOSPITALITY_HINTS = new Set([
  'restaurant',
  'restaurants',
  'pub',
  'pubs',
  'bar',
  'bars',
  'hotel',
  'hotels',
  'cafe',
  'cafes',
  'coffee',
  'kitchen',
  'kitchens',
  'grill',
  'club',
  'inn',
  'tavern',
  'dining',
  'food'
]);

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(ltd|limited|plc|llp|holdings|group|uk)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeName(value) {
  return normalizeName(value).split(' ').filter(Boolean);
}

function significantTokens(value) {
  return tokenizeName(value).filter((token) => token.length > 1 && !GENERIC_QUERY_TOKENS.has(token));
}

function queryVariants(query) {
  const trimmed = String(query ?? '').trim();
  const tokens = significantTokens(trimmed);

  return [...new Set([
    trimmed,
    tokens.join(' '),
    tokens.slice(0, 2).join(' '),
    tokens[0] ?? ''
  ].filter((value) => value && value.length >= 2))];
}

function queryLooksLikeCompanyNumber(value) {
  return /^[a-z0-9]{6,8}$/i.test(String(value ?? '').trim());
}

function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

function companyProfileUrl(companyNumber) {
  return `${COMPANIES_HOUSE_PUBLIC_COMPANY_URL}/${encodeURIComponent(companyNumber)}`;
}

function formatRegisteredAddress(address) {
  if (!address) return '';

  return [
    address.care_of,
    address.premises,
    address.address_line_1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country
  ]
    .filter(Boolean)
    .join(', ');
}

function summarizeLocation(address) {
  if (!address) return '';

  return [address.locality, address.region, address.postal_code].filter(Boolean).join(', ');
}

function locationFromPlace(place) {
  return [
    place?.address?.city,
    place?.address?.town,
    place?.address?.village,
    place?.address?.county,
    place?.address?.state,
    place?.address?.postcode
  ]
    .filter(Boolean)
    .join(', ');
}

function addressLineFromPlace(place) {
  return [
    place?.address?.house_number,
    place?.address?.road,
    place?.address?.suburb,
    place?.address?.city,
    place?.address?.town,
    place?.address?.postcode
  ]
    .filter(Boolean)
    .join(', ');
}

function normalizeWebsite(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function websiteHostname(value) {
  if (!value) return '';

  try {
    return new URL(normalizeWebsite(value)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function faviconUrl(website) {
  const hostname = websiteHostname(website);
  return hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=256`
    : '';
}

function hospitalityWeight(value) {
  const tokens = tokenizeName(value);
  return tokens.reduce((score, token) => score + (HOSPITALITY_HINTS.has(token) ? 8 : 0), 0);
}

function describeCompany(profile, fallbackStatus) {
  const parts = [
    profile?.company_status || fallbackStatus ? titleCase(profile?.company_status || fallbackStatus) : '',
    profile?.type ? titleCase(profile.type) : '',
    profile?.date_of_creation ? `Incorporated ${profile.date_of_creation}` : ''
  ].filter(Boolean);

  return parts.join(' • ') || 'Registered UK company';
}

function statusWeight(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (!normalized) return 0;
  if (normalized === 'active') return 26;
  if (normalized === 'voluntary-arrangement') return 8;
  if (normalized === 'administration') return -10;
  if (normalized === 'liquidation') return -20;
  if (normalized === 'receivership') return -18;
  if (normalized === 'dissolved') return -32;
  return -4;
}

function scoreMatch(query, companyName, companyNumber) {
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(companyName);
  const queryTokens = tokenizeName(query);
  const nameTokens = tokenizeName(companyName);
  const strongQueryTokens = significantTokens(query);
  const sharedTokens = queryTokens.filter((token) => nameTokens.includes(token)).length;
  const strongSharedTokens = strongQueryTokens.filter((token) => nameTokens.includes(token)).length;
  const primaryToken = strongQueryTokens[0] ?? queryTokens[0] ?? '';
  const normalizedStrongQuery = strongQueryTokens.join(' ');
  const normalizedStrongName = nameTokens.filter((token) => !GENERIC_QUERY_TOKENS.has(token)).join(' ');

  let score = 0;

  if (normalizedStrongQuery && normalizedStrongName === normalizedStrongQuery) score += 84;
  else if (normalizedName === normalizedQuery) score += 70;
  else if (
    (normalizedStrongQuery && normalizedStrongName.startsWith(normalizedStrongQuery)) ||
    normalizedName.startsWith(normalizedQuery)
  ) {
    score += 58;
  } else if (
    (normalizedStrongQuery && normalizedStrongName.includes(normalizedStrongQuery)) ||
    normalizedName.includes(normalizedQuery)
  ) {
    score += 42;
  }
  else score += Math.min(sharedTokens * 14, 34);

  if (primaryToken) {
    if (nameTokens.includes(primaryToken)) score += 22;
    else score -= 36;
  }

  if (strongQueryTokens.length) {
    score += Math.min(strongSharedTokens * 16, 40);
    if (strongSharedTokens === strongQueryTokens.length) score += 16;
    else score -= (strongQueryTokens.length - strongSharedTokens) * 14;
  }

  if (companyNumber && String(query).toUpperCase().includes(String(companyNumber).toUpperCase())) score += 18;

  score += hospitalityWeight(companyName);

  return Math.max(1, Math.min(100, score));
}

function confidenceLabel(score) {
  if (score >= 84) return 'High confidence';
  if (score >= 66) return 'Strong match';
  if (score >= 48) return 'Possible match';
  return 'Needs review';
}

function stripCodeFence(text) {
  return String(text ?? '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseJsonPayload(text) {
  const clean = stripCodeFence(text);

  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('Could not parse Gemini business search payload.');
  }
}

async function fetchCompaniesHouseJson(path, apiKey) {
  const response = await fetch(`${COMPANIES_HOUSE_API}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: authHeader(apiKey)
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Companies House request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

function normalizeGeminiMatch(rawMatch, query) {
  const name = String(rawMatch?.name ?? '').trim();
  if (!name) return null;

  const resultType = rawMatch?.resultType === 'site' ? 'site' : 'group';
  const website = normalizeWebsite(rawMatch?.website);
  const companyNumber = String(rawMatch?.companyNumber ?? '').trim();
  const location = String(rawMatch?.location ?? '').trim();
  const sourceLabel = String(rawMatch?.sourceLabel ?? 'Gemini Google Search').trim();
  const baseScore =
    resultType === 'site'
      ? scoreVenueMatch(
          query,
          name,
          website,
          String(rawMatch?.industry ?? ''),
          String(rawMatch?.resultType ?? '')
        )
      : scoreMatch(query, name, companyNumber);
  const confidenceScore = Math.max(
    1,
    Math.min(100, Math.max(baseScore, Number(rawMatch?.confidenceScore ?? 0)))
  );

  return {
    id: String(rawMatch?.id ?? `gm:${companyNumber || normalizeName(name)}`),
    name,
    officialName: String(rawMatch?.officialName ?? name).trim() || name,
    description: String(rawMatch?.description ?? '').trim() || 'Matched from web search',
    resultType,
    accountScope:
      rawMatch?.accountScope === 'Single site'
        ? 'Single site'
        : rawMatch?.accountScope === 'Multi-site group'
          ? 'Multi-site group'
          : resultType === 'site'
            ? 'Single site'
            : 'Group / head office',
    website,
    industry: String(rawMatch?.industry ?? '').trim(),
    location,
    country: String(rawMatch?.country ?? 'United Kingdom').trim() || 'United Kingdom',
    logoUrl: faviconUrl(website),
    sourceUrl: String(rawMatch?.sourceUrl ?? '').trim(),
    sourceLabel,
    email: String(rawMatch?.email ?? '').trim(),
    phone: String(rawMatch?.phone ?? '').trim(),
    addressLine: String(rawMatch?.addressLine ?? '').trim(),
    registeredAddress: String(rawMatch?.registeredAddress ?? '').trim(),
    companyNumber,
    vatNumber: String(rawMatch?.vatNumber ?? '').trim(),
    siteCountEstimate: Math.max(0, Number(rawMatch?.siteCountEstimate ?? 0) || 0),
    sites: [],
    wikidataId: '',
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    signals: Array.isArray(rawMatch?.signals)
      ? rawMatch.signals.map((item) => String(item).trim()).filter(Boolean)
      : []
  };
}

function matchKey(match) {
  return match.companyNumber || `${match.resultType}:${normalizeName(match.name)}`;
}

function mergeMatchSets(primaryMatches, secondaryMatches) {
  const merged = new Map();

  [...primaryMatches, ...secondaryMatches].forEach((match) => {
    const key = matchKey(match);
    const existing = merged.get(key);

    if (!existing || match.confidenceScore > existing.confidenceScore) {
      merged.set(key, existing ? { ...existing, ...match } : match);
      return;
    }

    merged.set(key, {
      ...existing,
      website: existing.website || match.website,
      email: existing.email || match.email,
      phone: existing.phone || match.phone,
      sourceUrl: existing.sourceUrl || match.sourceUrl,
      sourceLabel:
        existing.sourceLabel === match.sourceLabel
          ? existing.sourceLabel
          : `${existing.sourceLabel} + ${match.sourceLabel}`,
      signals: [...new Set([...(existing.signals ?? []), ...(match.signals ?? [])])]
    });
  });

  return [...merged.values()];
}

function buildMatch(query, searchItem, profile) {
  const companyNumber = String(profile?.company_number ?? searchItem?.company_number ?? '').trim();
  const companyName = String(profile?.company_name ?? searchItem?.title ?? '').trim();
  const registeredAddress =
    formatRegisteredAddress(profile?.registered_office_address) ||
    String(searchItem?.address_snippet ?? '').trim();
  const location =
    summarizeLocation(profile?.registered_office_address) ||
    String(searchItem?.address_snippet ?? '').trim();
  const companyStatus = profile?.company_status ?? searchItem?.company_status;
  const confidenceScore = Math.max(
    1,
    Math.min(
      100,
      scoreMatch(query, companyName, companyNumber) + statusWeight(companyStatus)
    )
  );
  const sicCodes = Array.isArray(profile?.sic_codes) ? profile.sic_codes.filter(Boolean) : [];
  const industry = sicCodes.length ? `SIC ${sicCodes.slice(0, 2).join(', ')}` : 'Registered company';
  const description = describeCompany(profile, searchItem?.company_status);

  return {
    id: `ch:${companyNumber || normalizeName(companyName)}`,
    name: companyName,
    officialName: companyName,
    description,
    resultType: 'group',
    accountScope: 'Group / head office',
    website: '',
    industry,
    location,
    country: 'United Kingdom',
    logoUrl: '',
    sourceUrl: companyNumber ? companyProfileUrl(companyNumber) : '',
    sourceLabel: 'Companies House',
    email: '',
    phone: '',
    addressLine: registeredAddress,
    registeredAddress,
    companyNumber,
    vatNumber: '',
    siteCountEstimate: 0,
    sites: [],
    wikidataId: '',
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    signals: [
      companyNumber ? `Company number ${companyNumber}` : '',
      companyStatus ? titleCase(companyStatus) : '',
      profile?.date_of_creation ? `Incorporated ${profile.date_of_creation}` : '',
      registeredAddress ? 'Registered office address captured' : ''
    ].filter(Boolean)
  };
}

function buildProfileSummary(match, profile) {
  const parts = [
    match.description,
    match.companyNumber ? `Company number: ${match.companyNumber}` : '',
    match.registeredAddress ? `Registered office: ${match.registeredAddress}` : '',
    Array.isArray(profile?.sic_codes) && profile.sic_codes.length
      ? `SIC codes: ${profile.sic_codes.join(', ')}`
      : '',
    profile?.confirmation_statement?.next_due
      ? `Confirmation statement due: ${profile.confirmation_statement.next_due}`
      : '',
    profile?.accounts?.next_due ? `Accounts due: ${profile.accounts.next_due}` : ''
  ].filter(Boolean);

  return parts.join('. ');
}

function scoreVenueMatch(query, placeName, website = '', category = '', type = '') {
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(placeName);
  const strongQueryTokens = significantTokens(query);
  const nameTokens = tokenizeName(placeName);
  const strongSharedTokens = strongQueryTokens.filter((token) => nameTokens.includes(token)).length;
  const primaryToken = strongQueryTokens[0] ?? '';

  let score = 0;

  if (normalizedName === normalizedQuery) score += 90;
  else if (normalizedName.startsWith(normalizedQuery)) score += 72;
  else if (normalizedName.includes(normalizedQuery)) score += 52;

  if (primaryToken) {
    if (nameTokens.includes(primaryToken)) score += 28;
    else score -= 34;
  }

  if (strongQueryTokens.length) {
    score += Math.min(strongSharedTokens * 18, 40);
    if (strongSharedTokens === strongQueryTokens.length) score += 20;
  }

  if (website) score += 8;
  if (HOSPITALITY_HINTS.has(String(type).toLowerCase())) score += 10;
  if (HOSPITALITY_HINTS.has(String(category).toLowerCase())) score += 6;
  score += hospitalityWeight(placeName);

  return Math.max(1, Math.min(100, score));
}

function buildVenueMatch(query, place) {
  const website = normalizeWebsite(
    place?.extratags?.website || place?.extratags?.['contact:website'] || ''
  );
  const phone = place?.extratags?.phone || place?.extratags?.['contact:phone'] || '';
  const name =
    place?.namedetails?.name ||
    place?.namedetails?.brand ||
    place?.name ||
    '';
  const addressLine = addressLineFromPlace(place) || String(place?.display_name ?? '').trim();
  const location = locationFromPlace(place) || addressLine;
  const type = String(place?.type ?? '').replace(/_/g, ' ');
  const category = String(place?.category ?? '').replace(/_/g, ' ');
  const confidenceScore = scoreVenueMatch(query, name, website, category, type);

  return {
    id: `osm:${place.place_id}`,
    name,
    officialName: name,
    description: [titleCase(type), place?.extratags?.cuisine].filter(Boolean).join(' • ') || 'Recognised venue',
    resultType: 'site',
    accountScope: 'Single site',
    website,
    industry: place?.extratags?.cuisine || titleCase(type || category) || 'Hospitality venue',
    location,
    country: 'United Kingdom',
    logoUrl: faviconUrl(website),
    sourceUrl: place?.osm_type && place?.osm_id
      ? `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`
      : '',
    sourceLabel: 'OpenStreetMap',
    email: place?.extratags?.email || place?.extratags?.['contact:email'] || '',
    phone,
    addressLine,
    registeredAddress: '',
    companyNumber: '',
    vatNumber: '',
    siteCountEstimate: 1,
    sites: [],
    wikidataId: '',
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    signals: [
      titleCase(type || category),
      website ? 'Website captured' : '',
      phone ? 'Phone captured' : '',
      addressLine ? 'Venue address captured' : ''
    ].filter(Boolean)
  };
}

async function searchNominatimPlaces(query) {
  const url = `${NOMINATIM_SEARCH_API}?format=jsonv2&limit=8&countrycodes=gb&addressdetails=1&namedetails=1&extratags=1&q=${encodeURIComponent(query)}`;
  const places = await fetchJson(url, {
    'User-Agent': 'TheFinalCheck/1.0 (hospitality client finder)',
    Referer: 'https://portal.thefinalcheck.uk'
  });

  return Array.isArray(places) ? places : [];
}

async function searchCompanies(query, apiKey) {
  if (queryLooksLikeCompanyNumber(query)) {
    try {
      const directMatch = await fetchCompanyProfile(query.toUpperCase(), apiKey);
      return [directMatch];
    } catch {
      // Fall back to normal search if the query looked like a company number but was not valid.
    }
  }

  const searches = await Promise.all(
    queryVariants(query).map(async (variant) => {
      const response = await fetchCompaniesHouseJson(
        `/search/companies?q=${encodeURIComponent(variant)}&items_per_page=20`,
        apiKey
      );
      return Array.isArray(response.items) ? response.items : [];
    })
  );
  const dedupedItems = new Map();

  searches.flat().forEach((item) => {
    const companyNumber = String(item?.company_number ?? '').trim();
    const key = companyNumber || normalizeName(item?.title);
    if (key && !dedupedItems.has(key)) {
      dedupedItems.set(key, item);
    }
  });

  const items = [...dedupedItems.values()];
  const companyNumbers = items
    .map((item) => String(item.company_number ?? '').trim())
    .filter(Boolean);

  const profiles = await Promise.all(
    companyNumbers.map(async (companyNumber) => {
      try {
        const profile = await fetchCompaniesHouseJson(`/company/${encodeURIComponent(companyNumber)}`, apiKey);
        return [companyNumber, profile];
      } catch {
        return [companyNumber, null];
      }
    })
  );

  const profilesByCompanyNumber = new Map(profiles);

  return items
    .map((item) =>
      buildMatch(query, item, profilesByCompanyNumber.get(String(item.company_number ?? '').trim()))
    )
    .filter((item) => item.name)
    .sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 8);
}

async function searchTradingBusinesses(query) {
  const places = await searchNominatimPlaces(query);

  return places
    .map((place) => buildVenueMatch(query, place))
    .filter((match) => match.name)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 6);
}

async function searchGeminiBusinesses(query, apiKey) {
  const prompt = [
    'Find the most likely UK hospitality business matches for this search.',
    'The user may be searching for a trading brand, venue, hospitality group, or legal company.',
    'Prefer hospitality-related businesses only.',
    'Return only JSON with shape {"matches":[...]} and no markdown.',
    'Each match must include:',
    'name, officialName, description, resultType ("group" or "site"), accountScope, website, industry, location, country, email, phone, addressLine, registeredAddress, companyNumber, vatNumber, siteCountEstimate, sourceUrl, sourceLabel, confidenceScore, signals.',
    'If the search appears to be a trading brand, return the trading brand or venue first.',
    'If the legal company is clearly known, include it too.',
    `Query: ${query}`
  ].join('\n');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini business search failed (${response.status}): ${errorText}`);
  }

  const responseJson = await response.json();
  const text =
    responseJson?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('\n')
      .trim() || '';
  const parsed = parseJsonPayload(text);

  return (Array.isArray(parsed?.matches) ? parsed.matches : [])
    .map((match) => normalizeGeminiMatch(match, query))
    .filter(Boolean)
    .slice(0, 6);
}

async function fetchCompanyProfile(companyNumber, apiKey) {
  const profile = await fetchCompaniesHouseJson(`/company/${encodeURIComponent(companyNumber)}`, apiKey);
  const match = buildMatch(companyNumber, null, profile);

  return {
    ...match,
    summary: buildProfileSummary(match, profile)
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'Companies House API is not configured.' });
    return;
  }

  const companyNumber = String(request.query.company_number ?? '').trim();
  const query = String(request.query.q ?? '').trim();

  try {
    if (companyNumber) {
      const match = await fetchCompanyProfile(companyNumber, apiKey);
      response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      response.status(200).json({ match });
      return;
    }

    if (query.length < 2) {
      response.status(400).json({ error: 'Search query is too short.' });
      return;
    }

    const [companyMatches, venueMatches] = await Promise.all([
      searchCompanies(query, apiKey),
      searchTradingBusinesses(query).catch(() => [])
    ]);
    const initialMatches = [...venueMatches, ...companyMatches]
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 8);
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const needsGeminiSupport =
      Boolean(geminiApiKey) &&
      (initialMatches.length < 3 || (initialMatches[0]?.confidenceScore ?? 0) < 74);
    const geminiMatches = needsGeminiSupport
      ? await searchGeminiBusinesses(query, geminiApiKey).catch(() => [])
      : [];
    const matches = mergeMatchSets(initialMatches, geminiMatches)
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 8);
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    response.status(200).json({
      matches,
      provider: geminiMatches.length ? 'hybrid-with-gemini' : 'hybrid'
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Business search failed.'
    });
  }
}
