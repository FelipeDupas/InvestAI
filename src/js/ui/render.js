// src/js/ui/render.js
import {
  RISCO_LABELS, HORIZONTE_LABELS, HORIZONTE_SHORT,
  getPortfolio, setPortfolio, savePortfolio,
  getUserProfile, saveProfile as saveStateProfile,
  getSelectedMarket, setSelectedMarket,
  getPendingDeleteId, setPendingDeleteId
} from '../state/portfolio.js';

import { fetchAnalysis, fetchSinglePrice, fetchUSDtoBRL } from '../services/api.js';

// ── INIT STATE VARIABLES ──
const now = new Date();
const dateStr = now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const dateShort = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
const icons = ['📊','🌐','⚡','🔍','💰','📈','🏦','📉'];

function init() {
  document.getElementById('todayDate').textContent = dateStr.charAt(0).toUpperCase()+dateStr.slice(1)+'\nEdição Diária';

  updateBadge();
  renderPortfolio();
  initProfileTab();

  // Attach event listeners for tabs
  document.getElementById('btnTabAnalise').addEventListener('click', (e) => switchTab('analise', e.currentTarget));
  document.getElementById('btnTabCarteira').addEventListener('click', (e) => switchTab('carteira', e.currentTarget));
  document.getElementById('btnTabPerfil').addEventListener('click', (e) => switchTab('perfil', e.currentTarget));

  // Market buttons
  document.getElementById('btnBR').addEventListener('click', () => runAnalysis('BR'));
  document.getElementById('btnUS').addEventListener('click', () => runAnalysis('US'));

  // Add position
  document.getElementById('mktBR').addEventListener('click', () => selectMarket('BR'));
  document.getElementById('mktUS').addEventListener('click', () => selectMarket('US'));

  const inTicker = document.getElementById('inTicker');
  inTicker.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    autoDetectMarket(e.target.value);
  });

  document.getElementById('btnAddPosition').addEventListener('click', addPosition);

  // Update prices
  document.getElementById('btnUpdatePrices').addEventListener('click', updatePrices);

  // Export / Import
  document.getElementById('btnExport').addEventListener('click', exportPortfolio);
  const importInput = document.getElementById('importInput');
  document.getElementById('btnImport').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', importPortfolio);

  // Profile
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', (e) => selectOption(e.currentTarget));
  });
  document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);

  // Modal
  document.getElementById('btnModalCancel').addEventListener('click', closeModal);
  document.getElementById('btnModalConfirm').addEventListener('click', confirmDelete);

  // Global event delegation
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-del');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (id) removePosition(id);
      return;
    }
    if (e.target.id === 'confirmModal') closeModal();
  });
}

// ── UTILS ──
export function updateBadge() {
  const badge = document.getElementById('carteiraBadge');
  if (badge) badge.textContent = getPortfolio().length;
}

export function fmt(n, prefix='R$ ') {
  if (n == null || isNaN(n)) return '—';
  return prefix + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function tagFor(cat) {
  const c = (cat || '').toLowerCase();
  if(c.includes('fii') || c.includes('fundo') || c.includes('etf')) return '<span class="market-tag tag-fii">FII/ETF</span>';
  if(c.includes('b3') || c.includes('brasil') || c.includes('bovespa')) return '<span class="market-tag tag-b3">B3</span>';
  if(c.includes('nyse') || c.includes('nasdaq') || c.includes('eua') || c.includes('americ')) return '<span class="market-tag tag-nyse">NYSE</span>';
  return '<span class="market-tag tag-b3">B3</span>';
}

// ── PROFILE ──
export function selectOption(card) {
  const group = card.dataset.group;
  document.querySelectorAll(`.option-card[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
}

export function saveProfile() {
  const riscoCard = document.querySelector('.option-card.selected[data-group="risco"]');
  const horizCard = document.querySelector('.option-card.selected[data-group="horizonte"]');
  if (!riscoCard || !horizCard) return;

  saveStateProfile({
    risco: riscoCard.dataset.value,
    horizonte: horizCard.dataset.value
  });

  updateProfileDisplay();
  const msg = document.getElementById('savedMsg');
  if (msg) {
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);
  }
}

export function updateProfileDisplay() {
  const profile = getUserProfile();
  const mastheadMeta = document.querySelector('.masthead-meta');
  if (mastheadMeta) {
    mastheadMeta.innerHTML = `Perfil: ${RISCO_LABELS[profile.risco]}<br>Horizonte: ${HORIZONTE_SHORT[profile.horizonte]}`;
  }

  const pb = document.querySelector('.profile-badge');
  if(pb) {
    pb.innerHTML = `Risco: <strong>${RISCO_LABELS[profile.risco]}</strong> &nbsp;·&nbsp; Horizonte: <strong>${HORIZONTE_SHORT[profile.horizonte]}</strong>`;
  }

  const br = document.getElementById('badgeRisco'); if(br) br.textContent = RISCO_LABELS[profile.risco];
  const bh = document.getElementById('badgeHorizonte'); if(bh) bh.textContent = HORIZONTE_SHORT[profile.horizonte];

  const chipR = document.getElementById('chipRisco');
  const chipH = document.getElementById('chipHorizonte');
  if (chipR) chipR.textContent = RISCO_LABELS[profile.risco];
  if (chipH) chipH.textContent = HORIZONTE_SHORT[profile.horizonte];
}

export function initProfileTab() {
  const profile = getUserProfile();
  const riscoCard = document.querySelector(`.option-card[data-group="risco"][data-value="${profile.risco}"]`);
  const horizCard = document.querySelector(`.option-card[data-group="horizonte"][data-value="${profile.horizonte}"]`);

  document.querySelectorAll('.option-card[data-group="risco"]').forEach(c=>c.classList.remove('selected'));
  document.querySelectorAll('.option-card[data-group="horizonte"]').forEach(c=>c.classList.remove('selected'));

  if(riscoCard) riscoCard.classList.add('selected');
  if(horizCard) horizCard.classList.add('selected');
  updateProfileDisplay();
}

// ── TABS ──
export function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if (btn) btn.classList.add('active');
  if(name === 'carteira') renderPortfolio();
  if(name === 'perfil') initProfileTab();
}

// ── ANALYSIS ──
export async function runAnalysis(mercado) {
  const btnBR = document.getElementById('btnBR');
  const btnUS = document.getElementById('btnUS');
  const results = document.getElementById('results');
  const profile = getUserProfile();
  const portfolio = getPortfolio();

  btnBR.disabled = true; btnUS.disabled = true;
  btnBR.classList.remove('active-btn'); btnUS.classList.remove('active-btn');
  document.getElementById('btn'+mercado).classList.add('active-btn');

  const isBR = mercado === 'BR';
  const mktLabel = isBR ? '🇧🇷 Mercado Brasileiro' : '🇺🇸 Mercado Americano';

  const stepsArr = isBR
    ? ['→ Buscando notícias do mercado brasileiro...','→ Analisando Ibovespa, setores e FIIs...','→ Verificando Selic, câmbio e macro BR...','→ Gerando recomendações personalizadas...']
    : ['→ Buscando notícias do mercado americano...','→ Analisando S&P500, Nasdaq e setores...','→ Verificando Fed, inflação e earnings...','→ Gerando recomendações personalizadas...'];

  results.innerHTML = `<div class="loading-wrap"><div class="loading-spinner"></div>
    <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--ink);margin-bottom:12px;">${mktLabel}</div>
    <div class="loading-log">${stepsArr.map((s,i)=>`<div class="log-line" id="ll${i}">${s}</div>`).join('')}</div></div>`;

  for(let i=0; i<stepsArr.length; i++) {
    await new Promise(r=>setTimeout(r,500));
    document.getElementById('ll'+i)?.classList.add('show');
  }
  await new Promise(r=>setTimeout(r,300));

  const portCtx = portfolio.length > 0
    ? `\n\nCarteira do usuário: ${portfolio.map(p=>`${p.ticker} (compra: ${p.moedaCompra==='USD'?'$':'R$'}${p.precoCompra})`).join(', ')}. Mencione se algum for impactado.`
    : '';

  const riscoDesc = {
    conservador: 'Conservador — prioriza segurança e preservação de capital, prefere ativos de baixa volatilidade',
    moderado: 'Moderado — busca equilíbrio entre risco e retorno, aceita volatilidade razoável',
    arrojado: 'Arrojado — foca em crescimento, aceita alta volatilidade e ativos de maior risco',
    especulativo: 'Especulativo — busca máximo retorno, aceita risco extremo e alta alavancagem'
  };

  const mktContext = isBR
    ? `Foque EXCLUSIVAMENTE no mercado brasileiro: ações da B3 (com tickers como PETR4, VALE3, ITUB4), FIIs, ETFs brasileiros. Use contexto brasileiro: Selic, IPCA, câmbio USD/BRL, Ibovespa, decisões do Copom, política fiscal brasileira.`
    : `Foque EXCLUSIVAMENTE no mercado americano: ações NYSE e Nasdaq (AAPL, NVDA, MSFT, AMZN, etc), ETFs americanos (SPY, QQQ, etc). Use contexto americano: Fed, inflação CPI, earnings season, S&P500, Nasdaq, yields de treasuries, economia dos EUA.`;

  const numTrends = 5;
  const exTickers = isBR ? 'PETR4, VALE3, ITUB4, WEGE3, MXRF11, BPAC11' : 'NVDA, AAPL, MSFT, AMZN, META, GOOGL, TSLA, JPM, SPY, QQQ';

  const prompt = `Você é um analista financeiro sênior especializado em ${isBR ? 'mercado de capitais brasileiro' : 'mercado de capitais americano'}.

Data de hoje: ${dateShort}
Perfil do investidor: ${riscoDesc[profile.risco]}
Horizonte: ${HORIZONTE_LABELS[profile.horizonte]}
${mktContext}${portCtx}

Sua tarefa é fazer uma análise REAL e ATUAL do mercado de hoje. Pense nos principais eventos, notícias e movimentos que estão acontecendo AGORA neste mercado. Não use respostas genéricas — seja específico com dados, contexto e justificativas concretas.

Responda APENAS com JSON válido:
{"tendencias":[{"ticker":"XXXX","nome":"Nome completo do ativo ou setor","categoria":"categoria","direcao":"bullish|bearish|neutral","score":0-100,"analise":"2-3 frases específicas sobre POR QUE este ativo está interessante HOJE, com contexto real e dados concretos","motivos":[{"titulo":"Fator 1","descricao":"explicação concreta"},{"titulo":"Fator 2","descricao":"explicação concreta"},{"titulo":"Fator 3","descricao":"explicação concreta"},{"titulo":"Fator 4","descricao":"explicação concreta"}]}],"resumo_macro":"3-4 frases sobre o panorama macro ATUAL deste mercado hoje e o que o investidor ${riscoDesc[profile.risco].split('—')[0].trim()} deve priorizar"}

Gere ${numTrends} tendências diversas com tickers reais (exemplos: ${exTickers}). Hoje: ${dateShort}.`;

  try {
    const parsed = await fetchAnalysis(prompt);
    renderAnalise(parsed, mercado);

    // Asynchronously fetch card prices
    fetchCardPrices(parsed.tendencias || [], mercado);

    document.getElementById('lastUpdate').textContent = `${mktLabel} · ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
    if (getPortfolio().length > 0) updatePrices();
  } catch(err) {
    results.innerHTML = `<div style="padding:40px;text-align:center;font-family:var(--font-mono);font-size:0.75rem;color:var(--bear)">Erro ao obter análise.<br><br>${err.message}</div>`;
  }
  btnBR.disabled = false; btnUS.disabled = false;
}

export function renderAnalise(data, mercado) {
  const trends = data.tendencias || [];
  const profile = getUserProfile();

  const cardsHtml = trends.map((t, i) => {
    const dir = t.direcao || 'neutral';
    const arrow = dir === 'bullish' ? '↑' : dir === 'bearish' ? '↓' : '→';
    const label = dir === 'bullish' ? 'Alta' : dir === 'bearish' ? 'Baixa' : 'Neutro';
    const fillCls = dir === 'bullish' ? 'fill-bull' : dir === 'bearish' ? 'fill-bear' : 'fill-neutral';
    const motivos = (t.motivos || []).map((m, mi) => `<div class="reason"><div class="reason-icon">${icons[mi % icons.length]}</div><div class="reason-body"><div class="reason-title">${m.titulo}</div><div class="reason-desc">${m.descricao}</div></div></div>`).join('');
    const ticker = t.ticker || '';
    const tickerBadge = ticker ? `<span style="font-family:var(--font-mono);font-size:0.7rem;font-weight:600;color:var(--ink-muted);background:var(--bg);border:1px solid var(--rule);padding:2px 8px;border-radius:4px;margin-left:8px;">${ticker}</span>` : '';

    return `<div class="trend-card ${dir}" data-ticker="${ticker}">
      <div class="card-row1">
        <div class="card-left">
          <div class="card-num">Nº ${String(i+1).padStart(2,'0')} / 0${(data.tendencias||[]).length}</div>
          <div class="card-name">${t.nome}${tickerBadge}</div>
          <div>${tagFor(t.categoria)}</div>
        </div>
        <div class="card-right">
          <div class="direction-pill pill-${dir}">${arrow} ${label}</div>
          <div class="conviction-wrap">
            <div class="conviction-bar"><div class="conviction-fill ${fillCls}" style="width:${t.score}%"></div></div>
            <span>${t.score}%</span>
          </div>
          ${ticker ? `<div class="price-tag"><div class="price-tag-value loading">...</div></div>` : ''}
        </div>
      </div>
      <div class="card-analysis">${t.analise}</div>
      <div class="card-reasons">${motivos}</div>
    </div>`;
  }).join('');

  document.getElementById('results').innerHTML = `
    <div class="edition-header">
      <div class="edition-label">Edição de ${dateShort}</div>
      <div class="edition-date">${(data.tendencias||[]).length} tendências · ${RISCO_LABELS[profile.risco]}<br>${mercado==='US' ? 'NYSE · Nasdaq · ETFs USA' : 'B3 · FIIs · ETFs BR'}</div>
    </div>
    <div class="section-title">// Tendências do Dia</div>
    <div class="trends-list">${cardsHtml}</div>
    <div class="macro-box">
      <div class="macro-label">// Panorama Macroeconômico</div>
      <div class="macro-text">${data.resumo_macro}</div>
    </div>
    <hr class="footer-rule">
    <div class="footer-note"><strong>⚠ Aviso:</strong> Análise gerada por IA com fins informativos. Não é recomendação de investimento. Consulte um CFP/CEA antes de investir.<br>InvestAI · Powered by Claude · ${dateShort}</div>`;
}

async function fetchCardPrices(tendencias, mercado) {
  const items = tendencias.filter(t => t.ticker);
  if (items.length === 0) return;

  const cambio = await fetchUSDtoBRL();

  await Promise.all(items.map(async (t) => {
    const card = document.querySelector(`[data-ticker="${t.ticker}"]`);
    const priceTagEl = card?.querySelector('.price-tag');
    if (!priceTagEl) return;

    const isUS = mercado === 'US';
    const symbol = isUS ? t.ticker : t.ticker + '.SA';

    try {
      const { price, prevClose } = await fetchSinglePrice(symbol);
      const varPct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const varSign = varPct >= 0 ? '+' : '';
      const varColor = varPct >= 0 ? 'var(--bull)' : 'var(--bear)';

      let priceHtml = '';
      if (isUS) {
        const priceBRL = price * cambio;
        priceHtml = `
          <div class="price-tag-value">R$ ${priceBRL.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="price-tag-sub">$${price.toFixed(2)} · R$${cambio.toFixed(2)}/USD</div>
          <div style="font-family:var(--font-mono);font-size:0.62rem;font-weight:600;color:${varColor};">${varSign}${varPct.toFixed(2)}% hoje</div>
          <div class="price-tag-label">${t.ticker} · tempo real</div>`;
      } else {
        priceHtml = `
          <div class="price-tag-value">R$ ${price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-family:var(--font-mono);font-size:0.62rem;font-weight:600;color:${varColor};">${varSign}${varPct.toFixed(2)}% hoje</div>
          <div class="price-tag-label">${t.ticker} · tempo real</div>`;
      }

      priceTagEl.innerHTML = priceHtml;
      priceTagEl.style.borderColor = varPct >= 0 ? 'var(--bull-border)' : 'var(--bear-border)';
      priceTagEl.style.background = varPct >= 0 ? 'var(--bull-bg)' : 'var(--bear-bg)';

    } catch(err) {
      priceTagEl.innerHTML = `<div class="price-tag-label" style="color:var(--ink-faint)">indisponível</div>`;
      priceTagEl.style.borderColor = '';
      priceTagEl.style.background = '';
    }
  }));
}

// ── PORTFOLIO ──
export function selectMarket(mkt) {
  setSelectedMarket(mkt);
  document.getElementById('mktBR').className = 'mkt-btn' + (mkt === 'BR' ? ' active-br' : '');
  document.getElementById('mktUS').className = 'mkt-btn' + (mkt === 'US' ? ' active-us' : '');

  if (mkt === 'BR') {
    document.getElementById('precoLabel').textContent = 'Preço de compra (R$)';
    document.getElementById('inPreco').placeholder = '38.50';
    document.getElementById('currencyHint').textContent = 'Preço em R$ (reais)';
    document.getElementById('formHint').textContent = '💡 Ações B3: PETR4, VALE3, ITUB4, MXRF11... · Preço em reais';
  } else {
    document.getElementById('precoLabel').textContent = 'Preço de compra (USD $)';
    document.getElementById('inPreco').placeholder = '120.50';
    document.getElementById('currencyHint').textContent = 'Preço em USD (dólares) — convertido automaticamente para R$';
    document.getElementById('formHint').textContent = '💡 Ações NYSE/Nasdaq: AAPL, NVDA, MSFT, XOM, TSLA... · Informe em dólares (USD)';
  }
}

export function autoDetectMarket(ticker) {
  if (!ticker || ticker.length < 3) return;
  const brPattern = /^[A-Z]{4}\d{1,2}$/.test(ticker);
  const usPattern = /^[A-Z]{1,5}$/.test(ticker) && !brPattern;
  const currentMarket = getSelectedMarket();

  if (brPattern && currentMarket !== 'BR') selectMarket('BR');
  else if (usPattern && ticker.length <= 5 && currentMarket !== 'US') selectMarket('US');
}

export function addPosition() {
  const ticker = document.getElementById('inTicker').value.trim().toUpperCase();
  const nome = document.getElementById('inNome').value.trim();
  const preco = parseFloat(document.getElementById('inPreco').value);
  const qtd = parseFloat(document.getElementById('inQtd').value);
  const portfolio = getPortfolio();

  if(!ticker) return alert('Informe o ticker.');
  if(isNaN(preco)||preco<=0) return alert('Preço inválido.');
  if(isNaN(qtd)||qtd<=0) return alert('Quantidade inválida.');

  if(portfolio.find(p => p.ticker === ticker && p.precoCompra === preco)) {
    if(!confirm(`${ticker} já está na carteira com esse preço. Adicionar mesmo assim?`)) return;
  }

  const mercado = getSelectedMarket();

  const newPosition = {
    id: Date.now(),
    ticker,
    nome: nome || ticker,
    mercado,
    precoCompra: preco,
    moedaCompra: mercado === 'US' ? 'USD' : 'BRL',
    qtd,
    precoAtual: null,
    precoAtualUSD: null,
    cambioAtual: null,
    comentarioIA: null,
    dataCompra: new Date().toLocaleDateString('pt-BR'),
    dataUpdate: null
  };

  setPortfolio([...portfolio, newPosition]);
  savePortfolio();
  renderPortfolio();

  ['inTicker', 'inNome', 'inPreco', 'inQtd'].forEach(id => document.getElementById(id).value = '');
}

export function removePosition(id) {
  const portfolio = getPortfolio();
  const pos = portfolio.find(p => Number(p.id) === Number(id));
  if (!pos) return;

  setPendingDeleteId(id);
  document.getElementById('modalMsg').textContent = `Remover "${pos.ticker}" da carteira?`;
  document.getElementById('confirmModal').classList.add('open');
}

export function closeModal() {
  setPendingDeleteId(null);
  document.getElementById('confirmModal').classList.remove('open');
}

export function confirmDelete() {
  const id = getPendingDeleteId();
  if (id == null) return;

  const portfolio = getPortfolio();
  setPortfolio(portfolio.filter(p => Number(p.id) !== Number(id)));
  setPendingDeleteId(null);

  document.getElementById('confirmModal').classList.remove('open');
  savePortfolio();
  renderPortfolio();
}

export function renderPortfolio() {
  updateBadge();
  const portfolio = getPortfolio();
  const tbody = document.getElementById('portfolioBody');

  if(portfolio.length === 0){
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Nenhuma posição ainda.<br>Adicione seu primeiro investimento acima ↑</div></td></tr>`;
    updateSummary();
    return;
  }

  tbody.innerHTML = portfolio.map(p => {
    const isUSD = p.moedaCompra === 'USD' || p.mercado === 'US';
    const cambio = p.cambioAtual || 5.85;
    const investidoBRL = isUSD ? p.precoCompra * p.qtd * cambio : p.precoCompra * p.qtd;
    const investido = investidoBRL;
    const atual = p.precoAtual != null ? p.precoAtual * p.qtd : null;
    const resultado = atual != null ? atual - investidoBRL : null;
    const pct = resultado != null ? (resultado / investidoBRL) * 100 : null;

    let pctHtml = `<span style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.75rem;">—</span>`;
    if(pct != null) {
      const cls = pct > 0 ? 'pct-pos' : pct < 0 ? 'pct-neg' : 'pct-zero';
      const sign = pct > 0 ? '+' : '';
      pctHtml = `<span class="pct-badge ${cls}">${sign}${pct.toFixed(2)}%</span>`;
    }

    const precoAtualHtml = p.precoAtual != null
      ? `<span class="td-mono">${fmt(p.precoAtual,'')}</span>${isUSD && p.precoAtualUSD ? `<div style="font-size:0.6rem;color:var(--nyse);margin-top:2px;">$${p.precoAtualUSD.toFixed(2)} USD</div>` : ''}${p.dataUpdate?`<div style="font-size:0.6rem;color:var(--ink-faint);margin-top:2px;">${p.dataUpdate}</div>`:''}`
      : `<span style="color:var(--ink-faint);font-size:0.75rem;font-family:var(--font-mono);">—</span>`;

    const resultadoHtml = resultado != null
      ? `<div>${pctHtml}</div><div class="td-mono" style="margin-top:4px;color:${resultado>=0?'var(--bull)':'var(--bear)'};">${resultado>=0?'+':''}${fmt(resultado)}</div>`
      : pctHtml;

    const commentHtml = p.comentarioIA ? `<div class="ai-comment">🤖 ${p.comentarioIA}</div>` : '';

    return `<tr>
      <td><div style="display:flex;align-items:center;gap:6px;"><div class="td-ticker">${p.ticker}</div><span style="font-size:0.75rem;">${isUSD ? '🇺🇸' : '🇧🇷'}</span></div>${p.nome!==p.ticker?`<div class="td-name">${p.nome}</div>`:''}<div style="font-size:0.6rem;color:var(--ink-faint);">${p.dataCompra}</div>${commentHtml}</td>
      <td class="td-mono">
        ${isUSD
          ? `<span style="color:var(--nyse)">$${p.precoCompra.toFixed(2)}</span><div style="font-size:0.6rem;color:var(--ink-faint);margin-top:2px;">≈ ${fmt(p.precoCompra*cambio,'')}</div>`
          : fmt(p.precoCompra,'')}
      </td>
      <td class="td-mono">${p.qtd.toLocaleString('pt-BR')}</td>
      <td class="td-mono">${fmt(investido)}</td>
      <td>${precoAtualHtml}</td>
      <td class="td-mono">${atual!=null?fmt(atual):'—'}</td>
      <td class="td-right">${resultadoHtml}</td>
      <td><button class="btn-del" data-id="${p.id}" title="Remover">✕</button></td>
    </tr>`;
  }).join('');

  updateSummary();
}

export function updateSummary() {
  const portfolio = getPortfolio();
  let totalInv = 0, totalAtual = 0, hasAtual = false;

  portfolio.forEach(p => {
    const isUSD = p.mercado === 'US' || p.moedaCompra === 'USD';
    const cambio = p.cambioAtual || 5.85;
    totalInv += isUSD ? p.precoCompra * p.qtd * cambio : p.precoCompra * p.qtd;
    if(p.precoAtual != null){ totalAtual += p.precoAtual * p.qtd; hasAtual = true; }
  });

  document.getElementById('sumInvestido').textContent = portfolio.length ? fmt(totalInv) : 'R$ —';

  if(hasAtual) {
    const res = totalAtual - totalInv;
    const pct = (res / totalInv) * 100;
    const sign = res >= 0 ? '+' : '';
    const cls = res >= 0 ? 'positive' : 'negative';

    document.getElementById('sumAtual').textContent = fmt(totalAtual);
    document.getElementById('sumAtual').className = 'summary-card-value';

    const rEl = document.getElementById('sumResultado');
    rEl.textContent = sign + fmt(res);
    rEl.className = 'summary-card-value ' + cls;

    const pEl = document.getElementById('sumPct');
    pEl.textContent = sign + pct.toFixed(2) + '%';
    pEl.className = 'summary-card-value ' + cls;
  } else {
    ['sumAtual', 'sumResultado', 'sumPct'].forEach(id => {
      document.getElementById(id).className = 'summary-card-value';
    });
    document.getElementById('sumAtual').textContent = 'R$ —';
    document.getElementById('sumResultado').textContent = '—';
    document.getElementById('sumPct').textContent = '—%';
  }
}

export async function updatePrices() {
  const portfolio = getPortfolio();
  if(portfolio.length === 0) return;

  const btn = document.getElementById('btnUpdatePrices');
  btn.disabled = true;
  btn.textContent = '⟳ Atualizando...';
  document.getElementById('pricesStatus').textContent = 'Buscando preços reais...';

  const timeNow = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  try {
    const cambio = await fetchUSDtoBRL();

    const results = await Promise.allSettled(portfolio.map(async pos => {
      const isUS = pos.mercado === 'US' || pos.moedaCompra === 'USD';
      const symbol = isUS ? pos.ticker : pos.ticker + '.SA';
      const { price, prevClose } = await fetchSinglePrice(symbol);
      return { pos, price, prevClose, isUS, cambio };
    }));

    results.forEach(r => {
      if (r.status !== 'fulfilled') return;
      const { pos, price, isUS, cambio } = r.value;
      const priceBRL = isUS ? price * cambio : price;

      pos.precoAtual = priceBRL;
      pos.precoAtualUSD = isUS ? price : null;
      pos.cambioAtual = isUS ? cambio : null;
      pos.moedaOriginal = isUS ? 'USD' : 'BRL';
      pos.dataUpdate = timeNow;
    });

    savePortfolio();
    renderPortfolio();
    document.getElementById('pricesStatus').textContent = `⚡ Tempo real · Atualizado às ${timeNow}`;
  } catch(e) {
    document.getElementById('pricesStatus').textContent = 'Erro: ' + e.message;
  }
  btn.disabled = false;
  btn.textContent = '⟳ Atualizar Preços';
}

export function exportPortfolio() {
  const blob = new Blob([JSON.stringify(getPortfolio(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carteira-investai-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

export function importPortfolio(event) {
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if(!Array.isArray(data)) throw new Error('Formato inválido');
      setPortfolio(data);
      savePortfolio();
      renderPortfolio();
      alert(`${data.length} posições importadas!`);
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ── BOOTSTRAP ──
init();
