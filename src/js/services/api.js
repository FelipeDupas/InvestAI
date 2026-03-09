// src/js/services/api.js

export async function fetchSinglePrice(yahooSymbol) {
  // Use Yahoo Finance via a CORS proxy
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
  const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const resp = await fetch(proxy);
  const data = await resp.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('no data');
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose || meta.previousClose,
    currency: meta.currency
  };
}

export async function fetchUSDtoBRL() {
  try {
    const d = await fetchSinglePrice('BRL=X');
    return d.price || 5.85;
  } catch { return 5.85; }
}

export async function fetchAnalysis(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API error: ${resp.status}`);
  }

  const data = await resp.json();

  // Extract text from all content blocks (handles tool_use + text mixed)
  const raw = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text || '').join('');

  const clean = raw.replace(/```json|```/g,'').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');

  if(s === -1 || e === -1) {
    throw new Error('Resposta inválida — tente novamente');
  }

  return JSON.parse(clean.slice(s, e + 1));
}
