/**
 * Popup script for Localhost Dev Tools extension
 * Handles UI interactions for all features: cache, CORS, CSP, and delay
 */

// DOM Elements
const elements = {
  message: document.getElementById('message'),
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Cache
  cachePortInput: document.getElementById('cachePortInput'),
  cacheAddBtn: document.getElementById('cacheAddBtn'),
  cachePortsList: document.getElementById('cachePortsList'),

  // CORS
  corsToggle: document.getElementById('corsToggle'),
  corsPortInput: document.getElementById('corsPortInput'),
  corsAddBtn: document.getElementById('corsAddBtn'),
  corsPortsList: document.getElementById('corsPortsList'),

  // CSP
  cspToggle: document.getElementById('cspToggle'),
  cspPortInput: document.getElementById('cspPortInput'),
  cspAddBtn: document.getElementById('cspAddBtn'),
  cspPortsList: document.getElementById('cspPortsList'),

  // Delay
  delayToggle: document.getElementById('delayToggle'),
  delayMsInput: document.getElementById('delayMsInput'),
  delayPortInput: document.getElementById('delayPortInput'),
  delayAddBtn: document.getElementById('delayAddBtn'),
  delayPortsList: document.getElementById('delayPortsList')
};

let messageTimeout = null;

/**
 * Display a temporary message to the user
 * @param {string} text - Message text
 * @param {string} type - Message type ('success' or 'error')
 */
function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;

  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  messageTimeout = setTimeout(() => {
    elements.message.className = 'message';
  }, 2000);
}

/**
 * Validate port number input
 * @param {string} value - Input value
 * @returns {number|null} Valid port number or null
 */
function validatePort(value) {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return null;
  }
  return port;
}

/**
 * Render a list of ports
 * @param {HTMLElement} container - Container element
 * @param {Array<number>} ports - Array of port numbers
 * @param {string} removeAction - Action name for removing ports
 */
function renderPorts(container, ports, removeAction) {
  if (ports.length === 0) {
    container.innerHTML = '<div class="empty-state">No ports configured</div>';
    return;
  }

  container.innerHTML = ports.map(port => `
    <div class="port-item">
      <span class="port-number">:${port}</span>
      <button class="btn-remove" data-action="${removeAction}" data-port="${port}">Remove</button>
    </div>
  `).join('');
}

// Tab switching
elements.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    elements.tabs.forEach(t => t.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// ==================== CACHE ====================

async function loadCachePorts() {
  const ports = await browser.runtime.sendMessage({ action: 'getPorts' });
  renderPorts(elements.cachePortsList, ports, 'removePort');
}

async function handleAddCachePort() {
  const port = validatePort(elements.cachePortInput.value);
  if (port === null) {
    showMessage('Invalid port (1-65535)', 'error');
    return;
  }

  const added = await browser.runtime.sendMessage({ action: 'addPort', port });
  if (added) {
    showMessage(`Port ${port} added`, 'success');
    elements.cachePortInput.value = '';
    await loadCachePorts();
  } else {
    showMessage(`Port ${port} already exists`, 'error');
  }
}

elements.cacheAddBtn.addEventListener('click', handleAddCachePort);
elements.cachePortInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleAddCachePort();
});

elements.cachePortsList.addEventListener('click', async e => {
  if (e.target.dataset.action === 'removePort') {
    const port = parseInt(e.target.dataset.port, 10);
    await browser.runtime.sendMessage({ action: 'removePort', port });
    showMessage(`Port ${port} removed`, 'success');
    await loadCachePorts();
  }
});

// ==================== CORS ====================

async function loadCorsSettings() {
  const settings = await browser.runtime.sendMessage({ action: 'getCorsSettings' });
  elements.corsToggle.checked = settings.enabled;
  renderPorts(elements.corsPortsList, settings.ports, 'removeCorsPort');
}

async function handleAddCorsPort() {
  const port = validatePort(elements.corsPortInput.value);
  if (port === null) {
    showMessage('Invalid port (1-65535)', 'error');
    return;
  }

  const added = await browser.runtime.sendMessage({ action: 'addCorsPort', port });
  if (added) {
    showMessage(`CORS port ${port} added`, 'success');
    elements.corsPortInput.value = '';
    await loadCorsSettings();
  } else {
    showMessage(`Port ${port} already exists`, 'error');
  }
}

elements.corsToggle.addEventListener('change', async () => {
  await browser.runtime.sendMessage({ action: 'setCorsEnabled', enabled: elements.corsToggle.checked });
  showMessage(`CORS bypass ${elements.corsToggle.checked ? 'enabled' : 'disabled'}`, 'success');
});

elements.corsAddBtn.addEventListener('click', handleAddCorsPort);
elements.corsPortInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleAddCorsPort();
});

elements.corsPortsList.addEventListener('click', async e => {
  if (e.target.dataset.action === 'removeCorsPort') {
    const port = parseInt(e.target.dataset.port, 10);
    await browser.runtime.sendMessage({ action: 'removeCorsPort', port });
    showMessage(`CORS port ${port} removed`, 'success');
    await loadCorsSettings();
  }
});

// ==================== CSP ====================

async function loadCspSettings() {
  const settings = await browser.runtime.sendMessage({ action: 'getCspSettings' });
  elements.cspToggle.checked = settings.enabled;
  renderPorts(elements.cspPortsList, settings.ports, 'removeCspPort');
}

async function handleAddCspPort() {
  const port = validatePort(elements.cspPortInput.value);
  if (port === null) {
    showMessage('Invalid port (1-65535)', 'error');
    return;
  }

  const added = await browser.runtime.sendMessage({ action: 'addCspPort', port });
  if (added) {
    showMessage(`CSP port ${port} added`, 'success');
    elements.cspPortInput.value = '';
    await loadCspSettings();
  } else {
    showMessage(`Port ${port} already exists`, 'error');
  }
}

elements.cspToggle.addEventListener('change', async () => {
  await browser.runtime.sendMessage({ action: 'setCspEnabled', enabled: elements.cspToggle.checked });
  showMessage(`CSP disable ${elements.cspToggle.checked ? 'enabled' : 'disabled'}`, 'success');
});

elements.cspAddBtn.addEventListener('click', handleAddCspPort);
elements.cspPortInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleAddCspPort();
});

elements.cspPortsList.addEventListener('click', async e => {
  if (e.target.dataset.action === 'removeCspPort') {
    const port = parseInt(e.target.dataset.port, 10);
    await browser.runtime.sendMessage({ action: 'removeCspPort', port });
    showMessage(`CSP port ${port} removed`, 'success');
    await loadCspSettings();
  }
});

// ==================== DELAY ====================

async function loadDelaySettings() {
  const settings = await browser.runtime.sendMessage({ action: 'getDelaySettings' });
  elements.delayToggle.checked = settings.enabled;
  elements.delayMsInput.value = settings.delayMs || '';
  renderPorts(elements.delayPortsList, settings.ports, 'removeDelayPort');
}

async function handleAddDelayPort() {
  const port = validatePort(elements.delayPortInput.value);
  if (port === null) {
    showMessage('Invalid port (1-65535)', 'error');
    return;
  }

  const added = await browser.runtime.sendMessage({ action: 'addDelayPort', port });
  if (added) {
    showMessage(`Delay port ${port} added`, 'success');
    elements.delayPortInput.value = '';
    await loadDelaySettings();
  } else {
    showMessage(`Port ${port} already exists`, 'error');
  }
}

elements.delayToggle.addEventListener('change', async () => {
  await browser.runtime.sendMessage({ action: 'setDelayEnabled', enabled: elements.delayToggle.checked });
  showMessage(`Network delay ${elements.delayToggle.checked ? 'enabled' : 'disabled'}`, 'success');
});

let delayMsTimeout = null;
elements.delayMsInput.addEventListener('input', () => {
  if (delayMsTimeout) clearTimeout(delayMsTimeout);

  delayMsTimeout = setTimeout(async () => {
    const delayMs = parseInt(elements.delayMsInput.value, 10) || 0;
    await browser.runtime.sendMessage({ action: 'setDelayMs', delayMs });
  }, 500);
});

elements.delayAddBtn.addEventListener('click', handleAddDelayPort);
elements.delayPortInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') handleAddDelayPort();
});

elements.delayPortsList.addEventListener('click', async e => {
  if (e.target.dataset.action === 'removeDelayPort') {
    const port = parseInt(e.target.dataset.port, 10);
    await browser.runtime.sendMessage({ action: 'removeDelayPort', port });
    showMessage(`Delay port ${port} removed`, 'success');
    await loadDelaySettings();
  }
});

// ==================== INIT ====================

async function init() {
  await Promise.all([
    loadCachePorts(),
    loadCorsSettings(),
    loadCspSettings(),
    loadDelaySettings()
  ]);
}

init();
