const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';

function normalizeWebsite(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function fallbackSourceUrl(match, sources) {
  if (match.sourceUrl) return String(match.sourceUrl);
  return sources[0]?.url ?? '';
}

function fallbackSourceLabel(match, sources) {
  if (match.sourceLabel) return String(match.sourceLabel);
  return sources[0]?.title ? `OpenAI web search • ${sources[0].title}` : 'OpenAI web search';
}

function normalizeMatches(matches, sources) {
  return (Array.isArray(matches) ? matches : [])
    .map((match, index) => {
      const name = String(match?.name ?? '').trim();
      if (!name) return null;

      const website = normalizeWebsite(match.website);
      const confidenceScore = Number(match.confidenceScore ?? 0);

      return {
        id: String(match.id ?? `ai:${normalizeName(name) || index}`),
        name,
        description: String(match.description ?? '').trim(),
        resultType: match.resultType === 'site' ? 'site' : 'group',
        website,
        industry: String(match.industry ?? '').trim(),
        location: String(match.location ?? '').trim(),
        logoUrl: String(match.logoUrl ?? '').trim() || domainLogoUrl(website),
        sourceUrl: fallbackSourceUrl(match, sources),
        sourceLabel: fallbackSourceLabel(match, sources),
        phone: String(match.phone ?? '').trim(),
        addressLine: String(match.addressLine ?? '').trim(),
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
      if (a.resultType !== b.resultType) {
        return a.resultType === 'group' ? -1 : 1;
      }

      return b.confidenceScore - a.confidenceScore;
    })
    .slice(0, 6);
}

function collectSources(responseJson) {
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  const searchCalls = output.filter((item) => item.type === 'web_search_call');

  return searchCalls.flatMap((item) => item?.action?.sources ?? []).map((source) => ({
    url: String(source?.url ?? '').trim(),
    title: String(source?.title ?? '').trim()
  }));
}

async function callOpenAiBusinessSearch(query, apiKey) {
  const prompt = [
    'You are a hospitality business enrichment engine.',
    'Find likely matches for the user query.',
    'Prioritize parent companies, hospitality groups, restaurant groups, pub companies, hotel groups, and established hospitality brands over individual site locations.',
    'Only include a site or venue result if the query explicitly looks like a location/site search or if no credible group/brand exists.',
    'Return only JSON with shape {"matches":[...]} and no markdown.',
    'Each match must include:',
    'name, description, resultType ("group" or "site"), website, industry, location, phone, addressLine, sourceUrl, sourceLabel, confidenceScore, confidenceLabel, signals.',
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

  return normalizeMatches(parsed.matches, sources);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const query = String(request.query.q ?? '').trim();
  if (query.length < 2) {
    response.status(400).json({ error: 'Search query is too short.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'OpenAI business search is not configured.' });
    return;
  }

  try {
    const matches = await callOpenAiBusinessSearch(query, apiKey);
    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    response.status(200).json({ matches });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Business search failed.'
    });
  }
}
