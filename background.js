/**
 * Background script for Localhost Dev Tools extension
 * Manages request interception for cache, CORS, CSP, and delay features
 */

// Storage keys
const STORAGE_KEYS = {
  PORTS: 'disabledCachePorts',
  CORS_ENABLED: 'corsBypassEnabled',
  CORS_PORTS: 'corsBypassPorts',
  CSP_ENABLED: 'cspDisableEnabled',
  CSP_PORTS: 'cspDisablePorts',
  DELAY_ENABLED: 'delayEnabled',
  DELAY_MS: 'delayMs',
  DELAY_PORTS: 'delayPorts'
};

// Current settings cache
let settings = {
  cachePorts: [],
  corsEnabled: false,
  corsPorts: [],
  cspEnabled: false,
  cspPorts: [],
  delayEnabled: false,
  delayMs: 0,
  delayPorts: []
};

/**
 * Check if a URL matches any of the configured ports
 * @param {string} url - The request URL
 * @param {Array<number>} ports - Array of port numbers to match
 * @returns {boolean}
 */
function matchesPort(url, ports) {
  if (!ports || ports.length === 0) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return false;
    }

    const port = parseInt(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80);
    return ports.includes(port);
  } catch (e) {
    return false;
  }
}

/**
 * Handle request before sending (for delay feature)
 * @param {Object} details - Request details
 * @returns {Promise|Object}
 */
function onBeforeRequest(details) {
  if (!settings.delayEnabled || settings.delayMs <= 0) {
    return {};
  }

  if (!matchesPort(details.url, settings.delayPorts)) {
    return {};
  }

  // Return a promise that resolves after the delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({});
    }, settings.delayMs);
  });
}

/**
 * Modify response headers for cache, CORS, and CSP
 * @param {Object} details - Request details
 * @returns {Object} Modified headers
 */
function onHeadersReceived(details) {
  let headers = details.responseHeaders;
  const url = details.url;

  // Apply cache disable headers
  if (matchesPort(url, settings.cachePorts)) {
    // Remove existing cache headers
    headers = headers.filter(h => {
      const name = h.name.toLowerCase();
      return name !== 'cache-control' &&
             name !== 'pragma' &&
             name !== 'expires' &&
             name !== 'etag' &&
             name !== 'last-modified';
    });

    // Add no-cache headers
    headers.push({ name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' });
    headers.push({ name: 'Pragma', value: 'no-cache' });
    headers.push({ name: 'Expires', value: '0' });
  }

  // Apply CORS bypass headers
  if (settings.corsEnabled && matchesPort(url, settings.corsPorts)) {
    // Remove existing CORS headers
    headers = headers.filter(h => {
      const name = h.name.toLowerCase();
      return !name.startsWith('access-control-');
    });

    // Add permissive CORS headers
    headers.push({ name: 'Access-Control-Allow-Origin', value: '*' });
    headers.push({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD' });
    headers.push({ name: 'Access-Control-Allow-Headers', value: '*' });
    headers.push({ name: 'Access-Control-Allow-Credentials', value: 'true' });
    headers.push({ name: 'Access-Control-Expose-Headers', value: '*' });
    headers.push({ name: 'Access-Control-Max-Age', value: '86400' });
  }

  // Remove CSP headers
  if (settings.cspEnabled && matchesPort(url, settings.cspPorts)) {
    headers = headers.filter(h => {
      const name = h.name.toLowerCase();
      return name !== 'content-security-policy' &&
             name !== 'content-security-policy-report-only' &&
             name !== 'x-content-security-policy' &&
             name !== 'x-webkit-csp';
    });
  }

  return { responseHeaders: headers };
}

/**
 * Handle CORS preflight requests
 * @param {Object} details - Request details
 * @returns {Object}
 */
function onBeforeSendHeaders(details) {
  if (!settings.corsEnabled) return {};
  if (!matchesPort(details.url, settings.corsPorts)) return {};

  let headers = details.requestHeaders;

  // Ensure Origin header is present for CORS
  const hasOrigin = headers.some(h => h.name.toLowerCase() === 'origin');
  if (!hasOrigin) {
    headers.push({ name: 'Origin', value: 'http://localhost' });
  }

  return { requestHeaders: headers };
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  const result = await browser.storage.local.get(Object.values(STORAGE_KEYS));

  settings.cachePorts = result[STORAGE_KEYS.PORTS] || [];
  settings.corsEnabled = result[STORAGE_KEYS.CORS_ENABLED] || false;
  settings.corsPorts = result[STORAGE_KEYS.CORS_PORTS] || [];
  settings.cspEnabled = result[STORAGE_KEYS.CSP_ENABLED] || false;
  settings.cspPorts = result[STORAGE_KEYS.CSP_PORTS] || [];
  settings.delayEnabled = result[STORAGE_KEYS.DELAY_ENABLED] || false;
  settings.delayMs = result[STORAGE_KEYS.DELAY_MS] || 0;
  settings.delayPorts = result[STORAGE_KEYS.DELAY_PORTS] || [];

  console.log('[Dev Tools] Settings loaded:', settings);
}

/**
 * Save a specific setting to storage
 * @param {string} key - Storage key
 * @param {any} value - Value to save
 */
async function saveSetting(key, value) {
  await browser.storage.local.set({ [key]: value });
  await loadSettings();
}

/**
 * Setup request listeners
 */
function setupListeners() {
  const filter = { urls: ['http://localhost/*', 'http://127.0.0.1/*'] };

  // Delay listener
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    filter,
    ['blocking']
  );

  // CORS request headers listener
  browser.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders,
    filter,
    ['blocking', 'requestHeaders']
  );

  // Response headers listener (cache, CORS, CSP)
  browser.webRequest.onHeadersReceived.addListener(
    onHeadersReceived,
    filter,
    ['blocking', 'responseHeaders']
  );
}

// Message handlers for popup communication
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    // Cache ports
    case 'getPorts':
      return browser.storage.local.get(STORAGE_KEYS.PORTS)
        .then(result => result[STORAGE_KEYS.PORTS] || []);

    case 'addPort':
      if (!settings.cachePorts.includes(message.port)) {
        settings.cachePorts.push(message.port);
        settings.cachePorts.sort((a, b) => a - b);
        return saveSetting(STORAGE_KEYS.PORTS, settings.cachePorts).then(() => true);
      }
      return Promise.resolve(false);

    case 'removePort':
      const cacheIdx = settings.cachePorts.indexOf(message.port);
      if (cacheIdx !== -1) {
        settings.cachePorts.splice(cacheIdx, 1);
        return saveSetting(STORAGE_KEYS.PORTS, settings.cachePorts).then(() => true);
      }
      return Promise.resolve(false);

    // CORS settings
    case 'getCorsSettings':
      return browser.storage.local.get([STORAGE_KEYS.CORS_ENABLED, STORAGE_KEYS.CORS_PORTS])
        .then(result => ({
          enabled: result[STORAGE_KEYS.CORS_ENABLED] || false,
          ports: result[STORAGE_KEYS.CORS_PORTS] || []
        }));

    case 'setCorsEnabled':
      return saveSetting(STORAGE_KEYS.CORS_ENABLED, message.enabled).then(() => true);

    case 'addCorsPort':
      if (!settings.corsPorts.includes(message.port)) {
        settings.corsPorts.push(message.port);
        settings.corsPorts.sort((a, b) => a - b);
        return saveSetting(STORAGE_KEYS.CORS_PORTS, settings.corsPorts).then(() => true);
      }
      return Promise.resolve(false);

    case 'removeCorsPort':
      const corsIdx = settings.corsPorts.indexOf(message.port);
      if (corsIdx !== -1) {
        settings.corsPorts.splice(corsIdx, 1);
        return saveSetting(STORAGE_KEYS.CORS_PORTS, settings.corsPorts).then(() => true);
      }
      return Promise.resolve(false);

    // CSP settings
    case 'getCspSettings':
      return browser.storage.local.get([STORAGE_KEYS.CSP_ENABLED, STORAGE_KEYS.CSP_PORTS])
        .then(result => ({
          enabled: result[STORAGE_KEYS.CSP_ENABLED] || false,
          ports: result[STORAGE_KEYS.CSP_PORTS] || []
        }));

    case 'setCspEnabled':
      return saveSetting(STORAGE_KEYS.CSP_ENABLED, message.enabled).then(() => true);

    case 'addCspPort':
      if (!settings.cspPorts.includes(message.port)) {
        settings.cspPorts.push(message.port);
        settings.cspPorts.sort((a, b) => a - b);
        return saveSetting(STORAGE_KEYS.CSP_PORTS, settings.cspPorts).then(() => true);
      }
      return Promise.resolve(false);

    case 'removeCspPort':
      const cspIdx = settings.cspPorts.indexOf(message.port);
      if (cspIdx !== -1) {
        settings.cspPorts.splice(cspIdx, 1);
        return saveSetting(STORAGE_KEYS.CSP_PORTS, settings.cspPorts).then(() => true);
      }
      return Promise.resolve(false);

    // Delay settings
    case 'getDelaySettings':
      return browser.storage.local.get([STORAGE_KEYS.DELAY_ENABLED, STORAGE_KEYS.DELAY_MS, STORAGE_KEYS.DELAY_PORTS])
        .then(result => ({
          enabled: result[STORAGE_KEYS.DELAY_ENABLED] || false,
          delayMs: result[STORAGE_KEYS.DELAY_MS] || 0,
          ports: result[STORAGE_KEYS.DELAY_PORTS] || []
        }));

    case 'setDelayEnabled':
      return saveSetting(STORAGE_KEYS.DELAY_ENABLED, message.enabled).then(() => true);

    case 'setDelayMs':
      return saveSetting(STORAGE_KEYS.DELAY_MS, message.delayMs).then(() => true);

    case 'addDelayPort':
      if (!settings.delayPorts.includes(message.port)) {
        settings.delayPorts.push(message.port);
        settings.delayPorts.sort((a, b) => a - b);
        return saveSetting(STORAGE_KEYS.DELAY_PORTS, settings.delayPorts).then(() => true);
      }
      return Promise.resolve(false);

    case 'removeDelayPort':
      const delayIdx = settings.delayPorts.indexOf(message.port);
      if (delayIdx !== -1) {
        settings.delayPorts.splice(delayIdx, 1);
        return saveSetting(STORAGE_KEYS.DELAY_PORTS, settings.delayPorts).then(() => true);
      }
      return Promise.resolve(false);

    // Get all settings
    case 'getAllSettings':
      return browser.storage.local.get(Object.values(STORAGE_KEYS))
        .then(result => ({
          cachePorts: result[STORAGE_KEYS.PORTS] || [],
          corsEnabled: result[STORAGE_KEYS.CORS_ENABLED] || false,
          corsPorts: result[STORAGE_KEYS.CORS_PORTS] || [],
          cspEnabled: result[STORAGE_KEYS.CSP_ENABLED] || false,
          cspPorts: result[STORAGE_KEYS.CSP_PORTS] || [],
          delayEnabled: result[STORAGE_KEYS.DELAY_ENABLED] || false,
          delayMs: result[STORAGE_KEYS.DELAY_MS] || 0,
          delayPorts: result[STORAGE_KEYS.DELAY_PORTS] || []
        }));

    default:
      console.warn(`[Dev Tools] Unknown action: ${message.action}`);
      return Promise.resolve(null);
  }
});

// Initialize extension
loadSettings().then(() => {
  setupListeners();
  console.log('[Dev Tools] Extension initialized');
});
