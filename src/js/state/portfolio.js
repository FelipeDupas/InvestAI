// src/js/state/portfolio.js

// Constants
export const RISCO_LABELS = { conservador:'Conservador', moderado:'Moderado', arrojado:'Arrojado', especulativo:'Especulativo' };
export const HORIZONTE_LABELS = { curtissimo:'Curtíssimo prazo (até 1 mês)', curto:'Curto prazo (1-3 meses)', medio:'Médio prazo (6-12 meses)', longo:'Longo prazo (2-5 anos)', muitolongo:'Muito longo prazo (5+ anos)' };
export const HORIZONTE_SHORT = { curtissimo:'Curtíssimo prazo', curto:'Curto prazo', medio:'Médio prazo', longo:'Longo prazo', muitolongo:'Muito longo prazo' };

// State Variables
let portfolio = [];
let userProfile = { risco: 'moderado', horizonte: 'medio' };
let selectedMarket = 'BR';
let pendingDeleteId = null;

// Initial Load
export function initPortfolioState() {
  try {
    portfolio = JSON.parse(localStorage.getItem('investai_portfolio') || '[]');
  } catch(e) {
    portfolio = [];
  }
}

export function initProfileState() {
  try {
    const saved = JSON.parse(localStorage.getItem('investai_profile') || 'null');
    if (saved) userProfile = saved;
  } catch(e) {}
}

// Portfolio getters/setters
export function getPortfolio() {
  return portfolio;
}

export function setPortfolio(newPortfolio) {
  portfolio = newPortfolio;
}

export function savePortfolio() {
  localStorage.setItem('investai_portfolio', JSON.stringify(portfolio));
}

// User Profile getters/setters
export function getUserProfile() {
  return userProfile;
}

export function saveProfile(newProfile) {
  userProfile = { ...userProfile, ...newProfile };
  localStorage.setItem('investai_profile', JSON.stringify(userProfile));
}

// Selected Market getters/setters
export function getSelectedMarket() {
  return selectedMarket;
}

export function setSelectedMarket(market) {
  selectedMarket = market;
}

// Pending Delete ID for modal
export function getPendingDeleteId() {
  return pendingDeleteId;
}

export function setPendingDeleteId(id) {
  pendingDeleteId = id;
}

// Initialization calls for when the module loads
initPortfolioState();
initProfileState();
