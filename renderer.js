const urlbar = document.getElementById('urlbar');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const goBtn = document.getElementById('go');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const backdrop = document.getElementById('settings-backdrop');

function navigate() {
  const url = urlbar.value.trim();
  if (url) window.browserAPI.navigate(url);
}

function openSettings() {
  settingsPanel.classList.remove('hidden');
  if (backdrop) backdrop.classList.remove('hidden');
  window.browserAPI.settingsOpened();
  loadSettings();
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
  window.browserAPI.settingsClosed();
}

urlbar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate();
});
goBtn.addEventListener('click', navigate);
backBtn.addEventListener('click', () => window.browserAPI.goBack());
forwardBtn.addEventListener('click', () => window.browserAPI.goForward());
reloadBtn.addEventListener('click', () => window.browserAPI.reload());

settingsBtn.addEventListener('click', () => {
  if (settingsPanel.classList.contains('hidden')) {
    openSettings();
  } else {
    closeSettings();
  }
});

closeSettingsBtn.addEventListener('click', closeSettings);
if (backdrop) {
  backdrop.addEventListener('click', closeSettings);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) {
    closeSettings();
  }
});

saveSettingsBtn.addEventListener('click', async () => {
  const settings = {
    homepage: document.getElementById('homepage').value,
    theme: document.getElementById('theme').value,
    startMaximized: document.getElementById('startMaximized').checked,
    clearOnExit: document.getElementById('clearOnExit').checked,
    customCSS: document.getElementById('customCSS').value
  };
  await window.browserAPI.saveSettings(settings);
  applyLocalTheme(settings.theme);
  closeSettings();
});

function applyLocalTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-light');
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.add('theme-dark');
  }
}

async function loadSettings() {
  try {
    const s = await window.browserAPI.getSettings();
    document.getElementById('homepage').value = s.homepage || '';
    document.getElementById('theme').value = s.theme || 'dark';
    document.getElementById('startMaximized').checked = !!s.startMaximized;
    document.getElementById('clearOnExit').checked = !!s.clearOnExit;
    document.getElementById('customCSS').value = s.customCSS || '';
    applyLocalTheme(s.theme || 'dark');
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

window.browserAPI.onUrlChanged((url) => {
  urlbar.value = url;
});

window.browserAPI.onLoading((isLoading) => {
  reloadBtn.textContent = isLoading ? '✕' : '↻';
});

window.browserAPI.onOpenSettings(() => {
  openSettings();
});

// Initial
window.browserAPI.getUrl().then(url => {
  if (url) urlbar.value = url;
});
window.browserAPI.getSettings().then(s => {
  applyLocalTheme((s && s.theme) || 'dark');
}).catch(() => {
  applyLocalTheme('dark');
});
