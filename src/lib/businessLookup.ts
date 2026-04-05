type WikidataSearchResult = {
  id: string;
  label?: string;
  description?: string;
};

type WikidataResponse = {
  search?: WikidataSearchResult[];
};

type WikidataEntity = {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Array<{ mainsnak?: { snaktype?: string; datavalue?: { value: unknown } } }>>;
  sitelinks?: Record<string, { title: string }>;
};

type WikidataEntitiesResponse = {
  entities?: Record<string, WikidataEntity>;
};

type OpenStreetMapPlace = {
  place_id: number;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
};

export type BusinessLookupResult = {
  id: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  location: string;
  logoUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  phone: string;
  addressLine: string;
  wikidataId: string;
  confidenceScore: number;
  confidenceLabel: string;
  signals: string[];
};

export type BusinessLookupProfile = BusinessLookupResult & {
  summary: string;
  coverUrl: string;
};

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_PAGE = 'https://www.wikidata.org/wiki';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

function normalizeWebsite(value?: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function websiteHostname(value?: string) {
  if (!value) return '';

  try {
    return new URL(normalizeWebsite(value)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainLogoUrl(value?: string) {
  const hostname = websiteHostname(value);
  if (!hostname) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=256`;
}

function commonsFileUrl(filename?: string, width = 360) {
  if (!filename) return '';
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

function normalizeName(value?: string) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(ltd|limited|plc|group|holdings|restaurant|restaurants|kitchen|bar|pub|hotel)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(value: string) {
  return normalizeName(value).split(' ').filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hospitalityLabel(place: OpenStreetMapPlace) {
  const cuisine = place.extratags?.cuisine?.replace(/;/g, ', ');
  if (cuisine) return cuisine;

  if (place.type === 'restaurant') return 'Restaurant';
  if (place.type === 'pub') return 'Pub';
  if (place.type === 'cafe') return 'Cafe';
  if (place.type === 'fast_food') return 'Fast food';
  if (place.type === 'bar') return 'Bar';
  if (place.type === 'hotel') return 'Hotel';
  if (place.type) return place.type.replace(/_/g, ' ');
  if (place.category) return place.category.replace(/_/g, ' ');

  return '';
}

function locationFromAddress(address?: Record<string, string>) {
  if (!address) return '';

  return uniqueStrings([
    address.city,
    address.town,
    address.village,
    address.county,
    address.state,
    address.country
  ]).join(', ');
}

function addressLine(place: OpenStreetMapPlace) {
  const address = place.address ?? {};
  return uniqueStrings([
    address.house_number,
    address.road,
    address.suburb,
    address.city,
    address.town,
    address.postcode
  ]).join(', ');
}

function entityLabel(entity: WikidataEntity | undefined) {
  return entity?.labels?.en?.value ?? '';
}

function entityDescription(entity: WikidataEntity | undefined) {
  return entity?.descriptions?.en?.value ?? '';
}

function claimValues(entity: WikidataEntity | undefined, property: string) {
  return (entity?.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak)
    .filter((snak) => snak?.snaktype === 'value' && snak.datavalue?.value !== undefined)
    .map((snak) => snak?.datavalue?.value);
}

function firstStringClaim(entity: WikidataEntity | undefined, property: string) {
  const value = claimValues(entity, property)[0];
  return typeof value === 'string' ? value : '';
}

function firstEntityIdClaim(entity: WikidataEntity | undefined, property: string) {
  const value = claimValues(entity, property)[0];
  if (typeof value === 'object' && value && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Business lookup failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

async function fetchEntities(ids: string[]) {
  if (!ids.length) return {};

  const url = `${WIKIDATA_API}?action=wbgetentities&format=json&languages=en&origin=*&props=labels|descriptions|claims|sitelinks&ids=${encodeURIComponent(ids.join('|'))}`;
  const response = await fetchJson<WikidataEntitiesResponse>(url);
  return response.entities ?? {};
}

async function fetchEntityLabels(ids: string[]) {
  if (!ids.length) return {} as Record<string, string>;

  const url = `${WIKIDATA_API}?action=wbgetentities&format=json&languages=en&origin=*&props=labels&ids=${encodeURIComponent(ids.join('|'))}`;
  const response = await fetchJson<WikidataEntitiesResponse>(url);

  return Object.fromEntries(
    Object.entries(response.entities ?? {}).map(([id, entity]) => [id, entityLabel(entity)])
  );
}

async function fetchWikipediaSummary(title: string) {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) return null;

  const json = (await response.json()) as {
    extract?: string;
    thumbnail?: { source?: string };
  };

  return {
    summary: json.extract ?? '',
    thumbnailUrl: json.thumbnail?.source ?? ''
  };
}

function scoreBusinessMatch(
  query: string,
  candidate: {
    name: string;
    website: string;
    industry: string;
    location: string;
    logoUrl: string;
    hasVenueSource: boolean;
    hasKnowledgeSource: boolean;
  }
) {
  const normalizedQuery = normalizeName(query);
  const normalizedCandidate = normalizeName(candidate.name);
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate.name);
  const sharedTokenCount = tokens.filter((token) => candidateTokens.includes(token)).length;

  let score = 0;

  if (normalizedCandidate === normalizedQuery) score += 52;
  else if (normalizedCandidate.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedCandidate)) score += 38;
  else score += Math.min(sharedTokenCount * 11, 32);

  if (candidate.website) score += 10;
  if (candidate.logoUrl) score += 8;
  if (candidate.industry) score += 6;
  if (candidate.location) score += 6;
  if (candidate.hasVenueSource) score += 14;
  if (candidate.hasKnowledgeSource) score += 10;

  return Math.min(score, 100);
}

function confidenceLabel(score: number) {
  if (score >= 84) return 'High confidence';
  if (score >= 66) return 'Strong match';
  if (score >= 48) return 'Possible match';
  return 'Needs review';
}

function buildSignals(
  score: number,
  details: {
    website: string;
    location: string;
    industry: string;
    hasVenueSource: boolean;
    hasKnowledgeSource: boolean;
  }
) {
  return uniqueStrings([
    score >= 84 ? 'Exact or near-exact name match' : '',
    details.hasVenueSource ? 'Live venue record found' : '',
    details.hasKnowledgeSource ? 'Brand or company record linked' : '',
    details.website ? 'Website captured' : '',
    details.location ? 'Location identified' : '',
    details.industry ? 'Industry or cuisine recognised' : ''
  ]);
}

function baseWikidataResult(
  entity: WikidataEntity | undefined,
  labelsById: Record<string, string>,
  query: string
) {
  if (!entity) return null;

  const name = entityLabel(entity);
  if (!name) return null;

  const website = normalizeWebsite(firstStringClaim(entity, 'P856'));
  const logoUrl = commonsFileUrl(firstStringClaim(entity, 'P154')) || domainLogoUrl(website);
  const industry = labelsById[firstEntityIdClaim(entity, 'P452')] ?? '';
  const location = labelsById[firstEntityIdClaim(entity, 'P159')] ?? '';
  const score = scoreBusinessMatch(query, {
    name,
    website,
    industry,
    location,
    logoUrl,
    hasVenueSource: false,
    hasKnowledgeSource: true
  });

  return {
    id: `wd:${entity.id}`,
    name,
    description: entityDescription(entity),
    website,
    industry,
    location,
    logoUrl,
    sourceUrl: `${WIKIDATA_PAGE}/${entity.id}`,
    sourceLabel: 'Wikidata',
    phone: '',
    addressLine: '',
    wikidataId: entity.id,
    confidenceScore: score,
    confidenceLabel: confidenceLabel(score),
    signals: buildSignals(score, {
      website,
      location,
      industry,
      hasVenueSource: false,
      hasKnowledgeSource: true
    })
  } satisfies BusinessLookupResult;
}

function openStreetMapUrl(place: OpenStreetMapPlace) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.lat ?? '')}&mlon=${encodeURIComponent(place.lon ?? '')}#map=18/${encodeURIComponent(place.lat ?? '')}/${encodeURIComponent(place.lon ?? '')}`;
}

function baseOpenStreetMapResult(
  place: OpenStreetMapPlace,
  query: string,
  wikidataResult?: BusinessLookupResult | null
) {
  const website = normalizeWebsite(
    place.extratags?.website || place.extratags?.['contact:website'] || wikidataResult?.website
  );
  const industry = wikidataResult?.industry || hospitalityLabel(place);
  const location = wikidataResult?.location || locationFromAddress(place.address);
  const phone = place.extratags?.phone || place.extratags?.['contact:phone'] || '';
  const name =
    wikidataResult?.name ||
    place.namedetails?.brand ||
    place.namedetails?.name ||
    place.name ||
    place.address?.amenity ||
    'Recognised business';
  const logoUrl = wikidataResult?.logoUrl || domainLogoUrl(website);
  const description =
    wikidataResult?.description ||
    [place.type ? place.type.replace(/_/g, ' ') : '', location].filter(Boolean).join(' • ');
  const score = scoreBusinessMatch(query, {
    name,
    website,
    industry,
    location,
    logoUrl,
    hasVenueSource: true,
    hasKnowledgeSource: Boolean(wikidataResult)
  });

  return {
    id: `osm:${place.place_id}`,
    name,
    description,
    website,
    industry,
    location,
    logoUrl,
    sourceUrl: openStreetMapUrl(place),
    sourceLabel: wikidataResult ? 'OpenStreetMap + Wikidata' : 'OpenStreetMap',
    phone,
    addressLine: addressLine(place),
    wikidataId: wikidataResult?.wikidataId || place.extratags?.['brand:wikidata'] || place.extratags?.wikidata || '',
    confidenceScore: score,
    confidenceLabel: confidenceLabel(score),
    signals: buildSignals(score, {
      website,
      location,
      industry,
      hasVenueSource: true,
      hasKnowledgeSource: Boolean(wikidataResult)
    })
  } satisfies BusinessLookupResult;
}

function mergeBusinessResults(current: BusinessLookupResult, incoming: BusinessLookupResult) {
  const preferred = incoming.confidenceScore >= current.confidenceScore ? incoming : current;
  const secondary = preferred === incoming ? current : incoming;

  return {
    ...preferred,
    description: preferred.description || secondary.description,
    website: preferred.website || secondary.website,
    industry: preferred.industry || secondary.industry,
    location: preferred.location || secondary.location,
    logoUrl: preferred.logoUrl || secondary.logoUrl,
    sourceUrl: preferred.sourceUrl || secondary.sourceUrl,
    sourceLabel:
      current.sourceLabel === incoming.sourceLabel
        ? preferred.sourceLabel
        : `${current.sourceLabel} + ${incoming.sourceLabel}`.replace(
            'OpenStreetMap + Wikidata + Wikidata',
            'OpenStreetMap + Wikidata'
          ),
    phone: preferred.phone || secondary.phone,
    addressLine: preferred.addressLine || secondary.addressLine,
    wikidataId: preferred.wikidataId || secondary.wikidataId,
    confidenceScore: Math.max(current.confidenceScore, incoming.confidenceScore),
    confidenceLabel: confidenceLabel(Math.max(current.confidenceScore, incoming.confidenceScore)),
    signals: uniqueStrings([...current.signals, ...incoming.signals])
  };
}

function resultKey(result: BusinessLookupResult) {
  const websiteKey = websiteHostname(result.website);
  return result.wikidataId || `${normalizeName(result.name)}|${websiteKey}`;
}

function buildBusinessSummary(result: BusinessLookupResult, summaryText?: string) {
  const parts = [
    summaryText || result.description,
    result.industry ? `Industry: ${result.industry}` : '',
    result.location ? `Location: ${result.location}` : '',
    result.addressLine ? `Address: ${result.addressLine}` : '',
    result.phone ? `Phone: ${result.phone}` : '',
    result.website ? `Website: ${result.website}` : ''
  ].filter(Boolean);

  return parts.join('. ') || `${result.name} matched from public business data.`;
}

async function searchWikidata(query: string) {
  const searchUrl = `${WIKIDATA_API}?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=8&search=${encodeURIComponent(query)}`;
  const response = await fetchJson<WikidataResponse>(searchUrl);
  return response.search ?? [];
}

async function searchOpenStreetMap(query: string) {
  const url = `${NOMINATIM_API}?format=jsonv2&limit=8&addressdetails=1&namedetails=1&extratags=1&dedupe=1&q=${encodeURIComponent(query)}`;
  return fetchJson<OpenStreetMapPlace[]>(url);
}

export async function searchBusinessProfiles(query: string): Promise<BusinessLookupResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [wikidataSearch, places] = await Promise.all([searchWikidata(trimmed), searchOpenStreetMap(trimmed)]);

  const directIds = wikidataSearch.map((item) => item.id).filter(Boolean);
  const placeWikidataIds = places
    .flatMap((place) => [place.extratags?.['brand:wikidata'], place.extratags?.wikidata])
    .filter((value): value is string => Boolean(value));

  const entities = await fetchEntities(uniqueStrings([...directIds, ...placeWikidataIds]));
  const relatedIds = Object.values(entities).flatMap((entity) => {
    const industryId = firstEntityIdClaim(entity, 'P452');
    const locationId = firstEntityIdClaim(entity, 'P159');
    return [industryId, locationId].filter(Boolean);
  });
  const labelsById = await fetchEntityLabels(uniqueStrings(relatedIds));

  const results = new Map<string, BusinessLookupResult>();

  directIds
    .map((id) => baseWikidataResult(entities[id], labelsById, trimmed))
    .filter((item): item is BusinessLookupResult => Boolean(item))
    .forEach((result) => {
      results.set(resultKey(result), result);
    });

  places
    .map((place) => {
      const linkedId = place.extratags?.['brand:wikidata'] || place.extratags?.wikidata || '';
      const linked = linkedId ? baseWikidataResult(entities[linkedId], labelsById, trimmed) : null;
      return baseOpenStreetMapResult(place, trimmed, linked);
    })
    .filter((item): item is BusinessLookupResult => Boolean(item))
    .forEach((result) => {
      const key = resultKey(result);
      const existing = results.get(key);
      results.set(key, existing ? mergeBusinessResults(existing, result) : result);
    });

  return [...results.values()]
    .sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
      return b.signals.length - a.signals.length;
    })
    .slice(0, 8);
}

export async function getBusinessProfile(result: BusinessLookupResult): Promise<BusinessLookupProfile> {
  if (!result.wikidataId) {
    return {
      ...result,
      logoUrl: result.logoUrl || domainLogoUrl(result.website),
      coverUrl: result.logoUrl || domainLogoUrl(result.website),
      summary: buildBusinessSummary(result)
    };
  }

  const entities = await fetchEntities([result.wikidataId]);
  const entity = entities[result.wikidataId];
  const relatedIds = [firstEntityIdClaim(entity, 'P452'), firstEntityIdClaim(entity, 'P159')].filter(Boolean);
  const labelsById = await fetchEntityLabels(relatedIds);
  const enriched = baseWikidataResult(entity, labelsById, result.name);
  const wikiTitle = entity?.sitelinks?.enwiki?.title ?? '';
  const wikiSummary = wikiTitle ? await fetchWikipediaSummary(wikiTitle) : null;

  const merged = enriched ? mergeBusinessResults(result, enriched) : result;
  const logoUrl = merged.logoUrl || domainLogoUrl(merged.website);
  const coverUrl = wikiSummary?.thumbnailUrl || logoUrl;

  return {
    ...merged,
    logoUrl,
    coverUrl,
    summary: buildBusinessSummary(merged, wikiSummary?.summary)
  };
}
