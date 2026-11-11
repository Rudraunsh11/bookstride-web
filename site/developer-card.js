const developerToggle = document.querySelector('#developer-toggle');
const developerPanel = document.querySelector('#developer-details');
const developerContainer = document.querySelector('.developer');
let developerPinned = false;
let developerCloseTimer;

function showDeveloper(open) {
  clearTimeout(developerCloseTimer);
  developerToggle.setAttribute('aria-expanded', String(open));
  developerPanel.hidden = !open;
}
function closeDeveloper() {
  developerPinned = false;
  showDeveloper(false);
}
function scheduleDeveloperClose() {
  if (!developerPinned) developerCloseTimer = setTimeout(() => showDeveloper(false), 180);
}
developerToggle.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') showDeveloper(true);
});
developerToggle.addEventListener('pointerleave', scheduleDeveloperClose);
developerPanel.addEventListener('pointerenter', () => clearTimeout(developerCloseTimer));
developerPanel.addEventListener('pointerleave', scheduleDeveloperClose);
developerToggle.addEventListener('click', () => {
  developerPinned = !developerPinned;
  showDeveloper(developerPinned);
});
developerContainer.addEventListener('focusout', event => {
  if (!developerContainer.contains(event.relatedTarget)) closeDeveloper();
});
document.addEventListener('click', event => {
  if (!developerContainer.contains(event.target)) closeDeveloper();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !developerPanel.hidden) {
    const focusWasInside = developerPanel.contains(document.activeElement);
    closeDeveloper();
    if (focusWasInside) developerToggle.focus();
  }
});
window.addEventListener('hashchange', closeDeveloper);
