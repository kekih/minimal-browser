const urlbar = document.getElementById('urlbar');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const goBtn = document.getElementById('go');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');

function navigate() {
  const url = urlbar.value.trim();
  if (url) window.browserAPI.navigate(url);
}

urlbar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate();
});
goBtn.addEventListener('click', navigate);
backBtn.addEventListener('click', () => window.browserAPI.goBack());
forwardBtn.addEventListener('click', () => window.browserAPI.goForward());
reloadBtn.addEventListener('click', () => window.browserAPI.reload());

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
  if (!settingsPanel.classList.contains('hidden')) loadSettings();
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
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
  settingsPanel.classList.add('hidden');
  alert('Settings saved. Some changes apply on restart.');
});

async function loadSettings() {
  const s = await window.browserAPI.getSettings();
  document.getElementById('homepage').value = s.homepage || '';
  document.getElementById('theme').value = s.theme || 'system';
  document.getElementById('startMaximized').checked = !!s.startMaximized;
  document.getElementById('clearOnExit').checked = !!s.clearOnExit;
  document.getElementById('customCSS').value = s.customCSS || '';
}

window.browserAPI.onUrlChanged((url) => {
  urlbar.value = url;
});

window.browserAPI.onLoading((isLoading) => {
  reloadBtn.textContent = isLoading ? '✕' : '↻';
});

window.browserAPI.onOpenSettings(() => {
  settingsPanel.classList.remove('hidden');
  loadSettings();
});

// Initial URL
window.browserAPI.getUrl().then(url => {
  if (url) urlbar.value = url;
});
