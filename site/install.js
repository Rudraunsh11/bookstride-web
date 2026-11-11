const offlineBooksCache = 'bookstride-offline-books-v1';
const pendingDownloads = new Set();
let installPrompt;

function bookReaderUrl(id) {
  return new URL(`books/${id}.json`, document.baseURI);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', refreshOfflineAction);
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  const button = document.querySelector('#install-app');
  if (button) button.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  const button = document.querySelector('#install-app');
  if (button) button.hidden = true;
});

function refreshOfflineAction() {
  const button = document.querySelector('[data-offline-book]');
  if (!button || !navigator.serviceWorker?.controller || !('caches' in window)) return;
  const id = button.dataset.offlineBook;
  caches.match(bookReaderUrl(id), {cacheName: offlineBooksCache}).then(response => {
    const pending = pendingDownloads.has(id);
    button.hidden = false;
    button.disabled = pending;
    button.textContent = pending ? 'Updating…' : response ? 'Remove offline copy' : 'Save for offline reading';
  }).catch(() => {});
}

document.addEventListener('click', async event => {
  if (event.target.closest('#install-app') && installPrompt) {
    const prompt = installPrompt;
    installPrompt = undefined;
    event.target.closest('#install-app').hidden = true;
    try { await prompt.prompt(); } catch { /* Browser menu instructions remain available. */ }
    return;
  }

  const button = event.target.closest('[data-offline-book]');
  const id = button?.dataset.offlineBook;
  if (!hostedEditions.has(id) || pendingDownloads.has(id)) return;
  const url = bookReaderUrl(id);
  pendingDownloads.add(id);
  button.disabled = true;
  button.textContent = 'Updating…';
  try {
    const cache = await caches.open(offlineBooksCache);
    if (await cache.delete(url)) {
      reportOfflineResult(id, 'Offline copy removed.');
    } else {
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw new Error();
      const edition = await response.clone().json();
      if (edition.id !== id || !Array.isArray(edition.sections) || !edition.sections.length) throw new Error();
      await cache.put(url, response);
      reportOfflineResult(id, 'Ready to read offline.');
    }
  } catch {
    reportOfflineResult(id, 'Couldn’t save an offline copy. Check your connection and available storage.');
  } finally {
    pendingDownloads.delete(id);
    refreshOfflineAction();
  }
});

function reportOfflineResult(id, message) {
  const note = document.querySelector('#offline-result');
  if (note && document.querySelector('[data-offline-book]')?.dataset.offlineBook === id) {
    note.textContent = message;
  }
}
