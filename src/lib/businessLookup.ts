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

export type BusinessLookupResult = {
  id: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  location: string;
  logoUrl: string;
  sourceUrl: string;
};

export type BusinessLookupProfile = BusinessLookupResult & {
  summary: string;
  coverUrl: string;
};

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_ENTITY_DATA = 'https://www.wikidata.org/wiki/Special:EntityData';
const WIKIDATA_PAGE = 'https://www.wikidata.org/wiki';

function normalizeWebsite(value?: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function commonsFileUrl(filename?: string, width = 360) {
  if (!filename) return '';
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
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

function entityLabel(entity: WikidataEntity | undefined) {
  return entity?.labels?.en?.value ?? '';
}

function entityDescription(entity: WikidataEntity | undefined) {
  return entity?.descriptions?.en?.value ?? '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
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
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url);
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

function buildBusinessSummary(name: string, description: string, industry: string, location: string) {
  const parts = [description, industry ? `Industry: ${industry}` : '', location ? `Location: ${location}` : '']
    .filter(Boolean)
    .join('. ');

  return parts || `${name} matched from the public business lookup.`;
}

function toResult(
  entity: WikidataEntity | undefined,
  labelsById: Record<string, string>
): BusinessLookupResult | null {
  if (!entity) return null;

  const name = entityLabel(entity);
  if (!name) return null;

  const website = normalizeWebsite(firstStringClaim(entity, 'P856'));
  const logoUrl = commonsFileUrl(firstStringClaim(entity, 'P154'));
  const industry = labelsById[firstEntityIdClaim(entity, 'P452')] ?? '';
  const location = labelsById[firstEntityIdClaim(entity, 'P159')] ?? '';

  return {
    id: entity.id,
    name,
    description: entityDescription(entity),
    website,
    industry,
    location,
    logoUrl,
    sourceUrl: `${WIKIDATA_PAGE}/${entity.id}`
  };
}

export async function searchBusinessProfiles(query: string): Promise<BusinessLookupResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const searchUrl = `${WIKIDATA_API}?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=6&search=${encodeURIComponent(trimmed)}`;
  const searchResponse = await fetchJson<WikidataResponse>(searchUrl);
  const ids = (searchResponse.search ?? []).map((item) => item.id).filter(Boolean);
  const entities = await fetchEntities(ids);

  const relatedIds = Object.values(entities).flatMap((entity) => {
    const industryId = firstEntityIdClaim(entity, 'P452');
    const locationId = firstEntityIdClaim(entity, 'P159');
    return [industryId, locationId].filter(Boolean);
  });

  const labelsById = await fetchEntityLabels([...new Set(relatedIds)]);

  return ids
    .map((id) => toResult(entities[id], labelsById))
    .filter((item): item is BusinessLookupResult => Boolean(item));
}

export async function getBusinessProfile(id: string): Promise<BusinessLookupProfile> {
  const entities = await fetchEntities([id]);
  const entity = entities[id];

  if (!entity) {
    throw new Error('Business profile could not be loaded.');
  }

  const relatedIds = [firstEntityIdClaim(entity, 'P452'), firstEntityIdClaim(entity, 'P159')].filter(Boolean);
  const labelsById = await fetchEntityLabels(relatedIds);
  const result = toResult(entity, labelsById);

  if (!result) {
    throw new Error('Business profile is missing core details.');
  }

  const wikiTitle = entity.sitelinks?.enwiki?.title ?? '';
  const wikiSummary = wikiTitle ? await fetchWikipediaSummary(wikiTitle) : null;
  const coverUrl = wikiSummary?.thumbnailUrl || result.logoUrl;

  return {
    ...result,
    logoUrl: result.logoUrl || wikiSummary?.thumbnailUrl || '',
    coverUrl,
    summary: buildBusinessSummary(
      result.name,
      wikiSummary?.summary || result.description,
      result.industry,
      result.location
    )
  };
}
