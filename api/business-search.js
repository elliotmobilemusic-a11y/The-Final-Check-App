const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function normalizeWebsite(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function normalizeAccountScope(value, resultType = 'group') {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('multi')) return 'Multi-site group';
  if (normalized.includes('head')) return 'Group / head office';
  if (normalized.includes('single')) return 'Single site';
  return resultType === 'site' ? 'Single site' : 'Group / head office';
}

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function websiteHostname(value) {
  if (!value) return '';

  try {
    return new URL(normalizeWebsite(value)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainLogoUrl(value) {
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

function confidenceLabel(score) {
  if (score >= 84) return 'High confidence';
  if (score >= 66) return 'Strong match';
  if (score >= 48) return 'Possible match';
  return 'Needs review';
}

function queryLooksLikeDomain(query) {
  return /\b[a-z0-9.-]+\.[a-z]{2,}\b/i.test(query);
}

function queryLooksLikeSite(query) {
  return /\d/.test(query) || /,/.test(query) || /\b(site|venue|branch|road|street|lane|avenue|way|close|postcode|high street|hotel)\b/i.test(query);
}

function queryLooksLikeGroup(query) {
  return /\b(group|holdings|head office|hq|estate|estates|restaurants|pubs|hotels|leisure|company|plc|ltd|limited)\b/i.test(query);
}

function queryDomain(query) {
  const domainMatch = String(query).toLowerCase().match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/);
  return domainMatch?.[1] ?? '';
}

function normalizeScope(value) {
  return value === 'group' || value === 'site' ? value : 'all';
}

function rerankMatch(match, query, scope = 'all') {
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(match.name);
  const normalizedOfficial = normalizeName(match.officialName);
  const domainQuery = queryDomain(query);
  const domainMatch = websiteHostname(match.website);
  const siteQuery = scope === 'site' || (scope === 'all' && queryLooksLikeSite(query));
  const groupQuery = scope === 'group' || (scope === 'all' && (queryLooksLikeGroup(query) || !siteQuery));

  let score = Number(match.confidenceScore ?? 0);

  if (normalizedName === normalizedQuery || normalizedOfficial === normalizedQuery) {
    score += 22;
  } else if (normalizedName.includes(normalizedQuery) || normalizedOfficial.includes(normalizedQuery)) {
    score += 12;
  }

  if (domainQuery && domainMatch === domainQuery) {
    score += 26;
  }

  if (match.companyNumber) score += 6;
  if (match.registeredAddress) score += 4;
  if (match.website) score += 6;
  if (Array.isArray(match.sites) && match.sites.length > 0) score += 4;

  if (groupQuery && match.resultType === 'group') score += 12;
  if (groupQuery && match.resultType === 'site') score -= 10;
  if (siteQuery && match.resultType === 'site') score += 10;
  if (siteQuery && match.resultType === 'group') score -= 2;

  if (String(match.accountScope).toLowerCase().includes('multi')) score += 8;
  if (String(match.country).toLowerCase().includes('united kingdom')) score += 6;
  if (match.sourceUrl && /companieshouse|gov\.uk|corporate|group|restaurants|pubs|hotels/i.test(match.sourceUrl)) {
    score += 5;
  }
  if (
    match.sourceUrl &&
    /tripadvisor|yelp|designmynight|opentable|facebook|instagram|wikipedia/i.test(match.sourceUrl)
  ) {
    score -= 6;
  }

  return score;
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
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

    throw new Error('Could not parse OpenAI business search payload.');
  }
}

function normalizeLookupSites(value) {
  return (Array.isArray(value) ? value : [])
    .map((site) => {
      const name = String(site?.name ?? '').trim();
      if (!name) return null;

      return {
        name,
        address: String(site?.address ?? '').trim(),
        website: normalizeWebsite(site?.website),
        status: String(site?.status ?? 'Active').trim() || 'Active',
        notes: String(site?.notes ?? '').trim()
      };
    })
    .filter(Boolean);
}

function isUkBusiness(match) {
  const country = String(match?.country ?? '').toLowerCase();
  const location = String(match?.location ?? '').toLowerCase();
  const address = String(match?.addressLine ?? '').toLowerCase();
  const registeredAddress = String(match?.registeredAddress ?? '').toLowerCase();
  const text = [country, location, address, registeredAddress].join(' ');

  if (!text.trim()) return true;

  return (
    text.includes('united kingdom') ||
    text.includes('great britain') ||
    text.includes('england') ||
    text.includes('scotland') ||
    text.includes('wales') ||
    text.includes('northern ireland') ||
    text.includes(' uk')
  );
}

function fallbackSourceUrl(match, sources) {
  if (match.sourceUrl) return String(match.sourceUrl);
  return sources[0]?.url ?? '';
}

function fallbackSourceLabel(match, sources, defaultLabel) {
  if (match.sourceLabel) return String(match.sourceLabel);
  return sources[0]?.title ? `${defaultLabel} • ${sources[0].title}` : defaultLabel;
}

function normalizeMatches(matches, sources, defaultLabel) {
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => isUkBusiness(match))
    .map((match, index) => {
      const name = String(match?.name ?? '').trim();
      if (!name) return null;

      const website = normalizeWebsite(match.website);
      const confidenceScore = Number(match.confidenceScore ?? 0);

      return {
        id: String(match.id ?? `ai:${normalizeName(name) || index}`),
        name,
        officialName: String(match.officialName ?? name).trim() || name,
        description: String(match.description ?? '').trim(),
        resultType: match.resultType === 'site' ? 'site' : 'group',
        accountScope: normalizeAccountScope(match.accountScope, match.resultType),
        website,
        industry: String(match.industry ?? '').trim(),
        location: String(match.location ?? '').trim(),
        country: String(match.country ?? 'United Kingdom').trim() || 'United Kingdom',
        logoUrl: String(match.logoUrl ?? '').trim() || domainLogoUrl(website),
        sourceUrl: fallbackSourceUrl(match, sources),
        sourceLabel: fallbackSourceLabel(match, sources, defaultLabel),
        phone: String(match.phone ?? '').trim(),
        addressLine: String(match.addressLine ?? '').trim(),
        registeredAddress: String(match.registeredAddress ?? '').trim(),
        companyNumber: String(match.companyNumber ?? '').trim(),
        vatNumber: String(match.vatNumber ?? '').trim(),
        siteCountEstimate: Number(match.siteCountEstimate ?? 0) || 0,
        sites: normalizeLookupSites(match.sites),
        wikidataId: String(match.wikidataId ?? '').trim(),
        confidenceScore,
        confidenceLabel:
          String(match.confidenceLabel ?? '').trim() || confidenceLabel(confidenceScore),
        signals: Array.isArray(match.signals)
          ? match.signals.map((item) => String(item).trim()).filter(Boolean)
          : []
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      return 0;
    })
    .slice(0, 12);
}

function collectSources(responseJson) {
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  const searchCalls = output.filter((item) => item.type === 'web_search_call');

  return searchCalls.flatMap((item) => item?.action?.sources ?? []).map((source) => ({
    url: String(source?.url ?? '').trim(),
    title: String(source?.title ?? '').trim()
  }));
}

function textFromGeminiResponse(responseJson) {
  const candidates = Array.isArray(responseJson.candidates) ? responseJson.candidates : [];
  const firstCandidate = candidates[0] ?? {};
  const parts = Array.isArray(firstCandidate?.content?.parts) ? firstCandidate.content.parts : [];

  return parts
    .map((part) => String(part?.text ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

function collectGeminiSources(responseJson) {
  const candidates = Array.isArray(responseJson.candidates) ? responseJson.candidates : [];
  const firstCandidate = candidates[0] ?? {};
  const groundingChunks = Array.isArray(firstCandidate?.groundingMetadata?.groundingChunks)
    ? firstCandidate.groundingMetadata.groundingChunks
    : [];

  const webChunks = groundingChunks
    .map((chunk) => chunk?.web ?? null)
    .filter(Boolean)
    .map((item) => ({
      url: String(item?.uri ?? '').trim(),
      title: String(item?.title ?? '').trim()
    }))
    .filter((item) => item.url || item.title);

  return [...new Map(webChunks.map((item) => [item.url || item.title, item])).values()];
}

async function callOpenAiBusinessSearch(query, apiKey, scope) {
  const prompt = [
    'You are a UK hospitality business enrichment engine.',
    'Find likely matches for the user query in the United Kingdom only.',
    'Prioritize parent companies, hospitality groups, restaurant groups, pub companies, hotel groups, and established hospitality brands over individual site locations.',
    'Only include a site or venue result if the query explicitly looks like a location/site search or if no credible group/brand exists.',
    scope === 'group'
      ? 'The user is explicitly asking for a parent company, group, brand owner, or head office result. Return group/head-office matches only.'
      : scope === 'site'
        ? 'The user is explicitly asking for individual site or venue matches. Return site-level matches only.'
        : 'Return the best UK hospitality matches, but keep parent groups ahead of individual sites unless the query is clearly site-specific.',
    'Prefer official UK websites, Companies House style registered details, and corporate or brand pages over directories.',
    'Do not return local areas, stations, streets, neighbourhoods, or generic map entities.',
    'If the query appears to be a domain or website, prioritise the entity that owns that website.',
    'Return only JSON with shape {"matches":[...]} and no markdown.',
    'Each match must include:',
    'name, officialName, description, resultType ("group" or "site"), accountScope, website, industry, location, country, phone, addressLine, registeredAddress, companyNumber, vatNumber, siteCountEstimate, sites, sourceUrl, sourceLabel, confidenceScore, confidenceLabel, signals.',
    'For multi-site groups, include up to 6 representative UK sites in sites[]. Each site must include name, address, website, status, notes.',
    'Keep confidenceScore between 0 and 100.',
    'Use short sourceLabel values.',
    `Query: ${query}`
  ].join('\n');

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_BUSINESS_SEARCH_MODEL || 'gpt-5',
      reasoning: { effort: 'low' },
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
      tool_choice: 'auto',
      input: prompt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI business search failed (${response.status}): ${errorText}`);
  }

  const responseJson = await response.json();
  const rawText =
    responseJson.output_text ||
    responseJson.output?.find?.((item) => item.type === 'message')?.content?.[0]?.text ||
    '';

  const parsed = parseJsonPayload(String(rawText));
  const sources = collectSources(responseJson);

  return normalizeMatches(parsed.matches, sources, 'OpenAI web search');
}

async function callGeminiBusinessSearch(query, apiKey, scope) {
  const prompt = [
    'Find the best hospitality business matches for the user query in the United Kingdom only.',
    'Prioritize parent companies, hospitality groups, pub companies, restaurant groups, hotel groups, and known hospitality brands over individual venue locations.',
    'Only include a site or venue when the query clearly targets a specific UK place or when no credible UK group/brand exists.',
    scope === 'group'
      ? 'Return group, brand-owner, or head-office matches only.'
      : scope === 'site'
        ? 'Return site or venue matches only.'
        : 'Keep group or brand matches ahead of site matches unless the query is clearly site-specific.',
    'Focus on official UK websites, company pages, brand pages, reputable trade coverage, and business listings.',
    'Never return local areas, streets, stations, wards, or neighbourhoods as matches.',
    'If the query looks like a domain or website, prefer the owning business or brand first.',
    `Query: ${query}`
  ].join('\n');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      tools: [
        {
          google_search: {}
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: [
              'You are a hospitality business enrichment engine for a consultancy CRM.',
              'Return only JSON with shape {"matches":[...]} and no markdown.',
              'Search in the United Kingdom only unless the user explicitly asks otherwise.',
              'Each match must include: name, officialName, description, resultType ("group" or "site"), accountScope, website, industry, location, country, phone, addressLine, registeredAddress, companyNumber, vatNumber, siteCountEstimate, sites, sourceUrl, sourceLabel, confidenceScore, confidenceLabel, signals.',
              'For multi-site groups, include up to 6 representative UK sites in sites[]. Each site must include name, address, website, status, notes.',
              'Use confidenceScore between 0 and 100.',
              'Use short sourceLabel values.',
              'When a brand/group and an individual site both exist, prefer the brand/group first.',
              'Include registered/company details when they can be supported confidently.',
              'When the user query is a domain, return the owner of the domain first.'
            ].join('\n')
          }
        ]
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini business search failed (${response.status}): ${errorText}`);
  }

  const responseJson = await response.json();
  const parsed = parseJsonPayload(textFromGeminiResponse(responseJson));
  const sources = collectGeminiSources(responseJson);

  return normalizeMatches(parsed.matches, sources, 'Gemini web search');
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const query = String(request.query.q ?? '').trim();
  const scope = normalizeScope(String(request.query.scope ?? 'all').trim().toLowerCase());
  if (query.length < 2) {
    response.status(400).json({ error: 'Search query is too short.' });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!geminiApiKey && !apiKey) {
    response
      .status(503)
      .json({ error: 'AI business search is not configured.' });
    return;
  }

  try {
    let matches = [];
    let provider = '';

    if (geminiApiKey) {
      try {
        matches = await callGeminiBusinessSearch(query, geminiApiKey, scope);
        provider = 'gemini';
      } catch (error) {
        if (!apiKey) throw error;
      }
    }

    if (!matches.length && apiKey) {
      matches = await callOpenAiBusinessSearch(query, apiKey, scope);
      provider = 'openai';
    }

    const rerankedMatches = [...matches]
      .map((match) => ({
        ...match,
        confidenceScore: Math.max(1, Math.min(100, rerankMatch(match, query, scope)))
      }))
      .map((match) => ({
        ...match,
        confidenceLabel: confidenceLabel(match.confidenceScore)
      }))
      .filter((match) => {
        if (scope === 'group') return match.resultType === 'group';
        if (scope === 'site') return match.resultType === 'site';
        return true;
      })
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 8);

    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    response.status(200).json({
      matches: rerankedMatches,
      provider
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Business search failed.'
    });
  }
}
