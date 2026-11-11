const main = document.querySelector('main');
const status = document.querySelector('#status');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const fullBookCache = new Map();
let saved = new Set();
let theme = 'sepia';
let fontSize = 20;
let lastFeaturedId = null;
let readingProgress = {};
let renderVersion = 0;
const libraryViews = {library: {query: '', genre: 'all'}, shelf: {query: '', genre: 'all'}};

try {
  const stored = JSON.parse(localStorage.getItem('reading-pilot-shelf') || '[]');
  saved = new Set(Array.isArray(stored) ? stored.filter(id => books.some(book => book.id === id)) : []);
  const preference = localStorage.getItem('reading-pilot-theme');
  if (['dark', 'sepia'].includes(preference)) theme = preference;
  const storedSize = Number(localStorage.getItem('bookstride-font-size'));
  if (Number.isInteger(storedSize) && storedSize >= 16 && storedSize <= 28) fontSize = storedSize;
  const progress = JSON.parse(localStorage.getItem('bookstride-reading-progress') || '{}');
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) readingProgress = progress;
} catch {
  // Browser storage may be unavailable. Reading remains usable for this visit.
}
try { lastFeaturedId = sessionStorage.getItem('bookstride-featured-book'); } catch {}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function readingMinutes(sections) {
  const words = sections.map(section => section.join(' ')).join(' ').trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function applyTheme(value) {
  if (!['dark', 'sepia'].includes(value)) return;
  theme = value;
  document.body.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#251b16' : '#dbc196';
  const label = theme === 'dark' ? 'Switch to sepia mode' : 'Switch to dark mode';
  const button = document.querySelector('#theme');
  button.setAttribute('aria-label', label);
  button.title = label;
  document.querySelectorAll('[data-theme-choice]').forEach(item => {
    item.setAttribute('aria-pressed', String(item.dataset.themeChoice === value));
  });
  try { localStorage.setItem('reading-pilot-theme', theme); } catch {}
}

function cover(book) {
  return `<div class="cover ${book.id}${book.coverTone ? ` tone-${book.coverTone}` : ''}${book.title.length > 24 ? ' long-title' : ''}${book.title.split(/\s+/).some(word => word.length > 10) ? ' long-word' : ''}">
    <span class="cover-corner top-left" aria-hidden="true">❧</span>
    <span class="cover-corner bottom-right" aria-hidden="true">❧</span>
    <span class="author">${escapeText(book.author)}</span>
    <span class="decoration" aria-hidden="true">${book.symbol}</span>
    <span class="book-title">${escapeText(book.title)}</span>
    <span class="edition">BOOKSTRIDE COLLECTION · ${book.year}</span>
  </div>`;
}

function card(book) {
  return `<article class="book">
    <a class="cover-wrap" href="#book/${book.id}" aria-label="Explore ${escapeText(book.title)}">${cover(book)}<span class="shelf-edge" aria-hidden="true"></span></a>
    <p class="category">${book.category}</p>
    <h3><a href="#book/${book.id}">${escapeText(book.title)}</a></h3>
    <p class="byline">${book.author}</p>
    <div class="book-bottom"><span>${readingMinutes(book.sections)} min summary · ${hostedEditions.has(book.id) ? 'Read in app' : 'Source link'}</span>
      <button class="bookmark" data-save="${book.id}" aria-label="${saved.has(book.id) ? 'Remove' : 'Save'} ${escapeText(book.title)}" aria-pressed="${saved.has(book.id)}">${saved.has(book.id) ? 'Remove from MyShelf' : 'Add to MyShelf'}</button>
    </div>
  </article>`;
}

function chooseFeaturedBook() {
  const alternatives = books.filter(book => book.id !== lastFeaturedId);
  const candidates = alternatives.length ? alternatives : books;
  const featured = candidates[Math.floor(Math.random() * candidates.length)];
  if (!featured) return null;
  lastFeaturedId = featured.id;
  try { sessionStorage.setItem('bookstride-featured-book', featured.id); } catch {}
  return featured;
}

function library(shelf = false) {
  const selection = shelf ? books.filter(book => saved.has(book.id)) : books;
  const view = libraryViews[shelf ? 'shelf' : 'library'];
  const genres = [...new Set(books.map(book => book.category))].sort();
  const featured = shelf ? null : chooseFeaturedBook();
  const featuredCard = featured ? `<a class="feature" href="#book/${featured.id}" aria-label="Explore ${escapeText(featured.title)}">
    <span class="feature-label">A GOOD PLACE TO BEGIN</span>
    <div class="featured-niche">${cover(featured)}<span class="shelf-edge" aria-hidden="true"></span></div>
    <h2>${featured.topic}</h2><p>Open ${featured.author}’s book <span aria-hidden="true">↗</span></p>
  </a>` : '';
  main.innerHTML = `${shelf ? '' : `<section class="hero">
    <div class="hero-intro"><span class="eyebrow">A LIBRARY TO LOSE YOURSELF IN</span>
      <h1>A few pages.<br><em>A new perspective.</em></h1>
      <a class="primary" href="#collection">Explore the library</a>
    </div>${featuredCard}
  </section><h2 class="reading-invitation">Tap a book to explore all three.</h2><ol class="how" aria-label="Three ways to explore a book">
    <li><span class="step-number" aria-hidden="true">01</span><div><strong>Get the summary</strong><p>Understand the story and its ideas.</p></div></li>
    <li><span class="step-number" aria-hidden="true">02</span><div><strong>Find a lesson</strong><p>Reflect, then try something small.</p></div></li>
    <li><span class="step-number" aria-hidden="true">03</span><div><strong>Read the book</strong><p>Open the reader or visit the source edition.</p></div></li>
  </ol>`}
  <section id="collection" class="collection">
    <div class="section-top"><div>
      ${shelf ? '<span class="eyebrow">YOUR COLLECTION</span>' : ''}
      <div class="collection-heading"><h2>${shelf ? 'Your reading shelf' : 'From the reading room'}</h2><span id="result-count" class="book-count" role="status" aria-live="polite" aria-atomic="true"></span></div>
      ${shelf ? '<p>Your saved books, kept in this browser.</p>' : ''}</div>
    </div>
    <div class="filter-bar library-controls">
      <label class="search"><span class="sr-only">Search books or authors</span><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5" stroke-linecap="round"/></svg><input id="search" type="search" placeholder="Find a book or author…" value="${escapeText(view.query)}"></label>
      <label class="genre-picker" for="genre-select"><span class="sr-only">Browse by genre</span>
        <svg class="genre-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 5.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v14c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5z" stroke-linejoin="round"/><path d="M12 7v14"/></svg>
        <select id="genre-select"><option value="all">All genres</option>${genres.map(genre => `<option value="${escapeText(genre)}" ${view.genre === genre ? 'selected' : ''}>${escapeText(genre)}</option>`).join('')}</select>
        <svg class="genre-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <span class="genre-caption" aria-hidden="true">Browse by genre</span>
    </div>
    <div class="grid" id="book-grid">${selection.map(card).join('')}</div>
    <p class="empty" id="empty" ${selection.length ? 'hidden' : ''}>${shelf ? 'Your shelf is ready. Choose Add to MyShelf on a book to save it.' : 'No books match. Try another title or topic.'}</p>
  </section>
  <p class="reading-note">Original summaries and interpretations by Bookstride. Book pages include a link to the source edition.</p>`;
  function refresh() {
    const query = document.querySelector('#search').value.toLowerCase().trim();
    view.query = document.querySelector('#search').value;
    view.genre = document.querySelector('#genre-select').value;
    const shown = selection.filter(book => (view.genre === 'all' || book.category === view.genre) && `${book.title} ${book.author}`.toLowerCase().includes(query));
    document.querySelector('#book-grid').innerHTML = shown.map(card).join('');
    document.querySelector('#empty').hidden = shown.length > 0;
    document.querySelector('#result-count').innerHTML = `<span class="book-count-number">${shown.length}</span><span>${shown.length === 1 ? 'book' : 'books'}</span>`;
  }
  document.querySelector('#search').addEventListener('input', refresh);
  document.querySelector('#genre-select').addEventListener('change', refresh);
  refresh();
}

function detail(book) {
  const progress = Number.isInteger(readingProgress[book.id]);
  const hosted = hostedEditions.has(book.id);
  main.innerHTML = `<a class="back" href="#library">← Back to the library</a>
    <section class="detail"><div class="detail-book"><div class="cover-wrap">${cover(book)}<span class="shelf-edge" aria-hidden="true"></span></div><span class="edition-caption">An original Bookstride cover</span></div>
    <div class="detail-copy"><span class="eyebrow">${book.category} · ${book.year}</span><h1>${escapeText(book.title)}</h1><p class="byline">by ${book.author}</p><p class="intro">${book.description}</p>
      <div class="choices">
        <a class="choice" href="#summary/${book.id}"><div><strong>Get Summary</strong><span>${book.guideFormat === 'Overview' ? 'An overview' : 'A detailed guide'} in ${readingMinutes(book.sections)} minutes · Includes spoilers</span></div><i aria-hidden="true">↗</i></a>
        <a class="choice" href="#lessons/${book.id}"><div><strong>Important Lessons</strong><span>${book.lessons.length} reflections, examples, and practical actions</span></div><i aria-hidden="true">↗</i></a>
        <a class="choice" href="#read/${book.id}"><div><strong>${hosted ? progress ? 'Continue Full Book' : 'Read Full Book' : 'View Source Edition'}</strong><span>${hosted ? 'Read here · Section navigation · Place saved in this browser' : 'Opens the source catalogue with available reading formats'}</span></div><i aria-hidden="true">↗</i></a>
      </div>
      <div class="book-actions"><button class="secondary" data-save="${book.id}" aria-pressed="${saved.has(book.id)}">${saved.has(book.id) ? 'Remove from MyShelf' : 'Add to MyShelf'}</button>
        ${hosted ? `<button class="secondary" type="button" data-offline-book="${book.id}" hidden>Save for offline reading</button>` : ''}</div>
      <div id="offline-result" class="offline-result" role="status"></div>
      <p class="reading-note">Summaries and lessons are original interpretations. <a href="https://www.gutenberg.org/ebooks/${book.source}" target="_blank" rel="noopener noreferrer">Original edition and notices ↗</a></p>
    </div></section>`;
  refreshOfflineAction();
}

function readerTools() {
  return `<div class="reader-tools" aria-label="Reading appearance">
    <div class="reader-tool-group" role="group" aria-label="Text size"><button data-size="-1" aria-label="Decrease text size" ${fontSize <= 16 ? 'disabled' : ''}>A−</button><button data-size="1" aria-label="Increase text size" ${fontSize >= 28 ? 'disabled' : ''}>A+</button></div>
    <div class="reader-tool-group" role="group" aria-label="Colour theme"><button data-theme-choice="sepia" aria-pressed="${theme === 'sepia'}">Sepia</button><button data-theme-choice="dark" aria-pressed="${theme === 'dark'}">Dark</button></div>
  </div>`;
}

function paragraphs(text) {
  return text.split('\n\n').map(paragraph => `<p>${escapeText(paragraph)}</p>`).join('');
}

function reader(book, lessons) {
  const sections = lessons ? book.lessons : book.sections;
  const anchorPrefix = lessons ? 'lesson' : 'guide';
  main.innerHTML = `<div class="reading-topbar"><a class="reading-back" href="#book/${book.id}">← Back to book</a>${readerTools()}</div>
    <article class="reader clean-reader"><p class="reading-label">${lessons ? 'Lessons' : 'Summary'} · ${readingMinutes(sections)} min read${lessons ? '' : ' · Spoilers'}</p>
      <h1>${escapeText(book.title)}</h1>
      ${sections.map((section, index) => `<section class="${lessons ? 'lesson' : 'guide-section'}" id="${anchorPrefix}-${book.id}-${index}">
        <h2>${escapeText(section[0])}</h2>${paragraphs(section[1])}
        ${lessons ? `<p class="lesson-practice"><strong>Try this:</strong> ${escapeText(section[2])}</p>` : ''}
      </section>`).join('')}
    </article>`;
}

function readingParagraphs(paragraphs) {
  // Render the edition's plain-text emphasis and subscript markers as type.
  const text = escapeText(paragraphs.join('\n\n'));
  const formatted = text.replace(/_\{(\d+)\}|_([^_]+)_/g, (_, subscript, emphasis) => {
    if (subscript) return `<sub>${subscript}</sub>`;
    return emphasis.split('\n\n').map(part => `<em>${part}</em>`).join('\n\n');
  });
  return formatted.split('\n\n').map(part => `<p>${part}</p>`).join('');
}

async function fullReader(book, requestedSection, version) {
  if (!hostedEditions.has(book.id)) {
    main.innerHTML = `<article class="reader"><h1>${escapeText(book.title)}</h1><p>Visit the source catalogue for this edition and its available reading formats.</p><a class="primary" href="https://www.gutenberg.org/ebooks/${book.source}" target="_blank" rel="noopener noreferrer">Open source catalogue ↗</a><a class="back" href="#book/${book.id}">← Back to the book</a></article>`;
    return;
  }
  main.innerHTML = `<a class="back" href="#book/${book.id}">← ${escapeText(book.title)}</a><article class="reader"><h1>Opening your book…</h1><p role="status">Loading the complete source edition.</p></article>`;
  try {
    let data = fullBookCache.get(book.id);
    if (!data) {
      const response = await fetch(bookReaderUrl(book.id));
      if (!response.ok) throw new Error('Book unavailable');
      data = await response.json();
      if (!Array.isArray(data.sections) || !data.sections.length) throw new Error('Invalid edition');
      fullBookCache.set(book.id, data);
    }
    if (version !== renderVersion) return;
    const storedSection = readingProgress[book.id];
    const selected = requestedSection === undefined ? storedSection : Number(requestedSection);
    // Section numbers retain their original IDs so saved places and links
    // still work after edition-only sections are removed from the reader.
    const match = data.sections.findIndex(section => section.number === selected);
    const index = match >= 0 ? match : 0;
    const section = data.sections[index];
    readingProgress[book.id] = section.number;
    try { localStorage.setItem('bookstride-reading-progress', JSON.stringify(readingProgress)); }
    catch { status.textContent = 'Browser storage is unavailable. Your reading place cannot be saved.'; }
    main.innerHTML = `<div class="reading-topbar"><a class="reading-back" href="#book/${book.id}">← Back to book</a>${readerTools()}</div><article class="reader clean-reader full-reader">
      <p class="reading-label">Full book · ${escapeText(book.author)}</p><h1>${escapeText(book.title)}</h1>
      <div class="chapter-control"><label for="chapter-select">Reading section <span>${index + 1} of ${data.sections.length}</span></label>
        <div class="chapter-select-wrap"><svg class="chapter-book-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 5.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v14c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5z" stroke-linejoin="round"/><path d="M12 7v14"/></svg><select id="chapter-select" title="${escapeText(section.title)}">${data.sections.map(chapter => `<option value="${chapter.number}" ${section.number === chapter.number ? 'selected' : ''}>${escapeText(chapter.title)}</option>`).join('')}</select><svg class="chapter-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>
      <section class="full-section">${section.title.startsWith('Reading part ') ? '' : `<h2>${escapeText(section.title)}</h2>`}${readingParagraphs(section.paragraphs)}</section>
      <nav class="chapter-navigation" aria-label="Reading sections">
        ${index > 0 ? `<a class="secondary" href="#read/${book.id}/${data.sections[index - 1].number}">← Previous section</a>` : '<span></span>'}
        ${index < data.sections.length - 1 ? `<a class="primary" href="#read/${book.id}/${data.sections[index + 1].number}">Next section →</a>` : `<a class="primary" href="#lessons/${book.id}">Reflect on the book →</a>`}
      </nav>
    </article>`;
    document.querySelector('#chapter-select').addEventListener('change', event => {
      location.hash = `read/${book.id}/${event.target.value}`;
    });
    document.querySelector('#main').focus({preventScroll: true});
  } catch {
    if (version !== renderVersion) return;
    main.innerHTML = `<article class="reader"><h1>We couldn’t open that edition.</h1><p>Reconnect and try again. You can save a copy from the book page while online.</p><a class="primary" href="#book/${book.id}">Back to the book</a></article>`;
  }
}

function about() {
  main.innerHTML = `<article class="reader about-page">
    <span class="eyebrow">A NOTE FROM RUDRAUNSH</span><h1>Every book is a doorway.</h1>
    <p>I built Bookstride to make that first step into reading feel easier. Some days you have time for a whole chapter. Other days, you want to understand an idea and take something useful with you.</p>
    <p>Choose a book, read its summary, explore its lessons, or settle into the complete text. Save the ones you want to return to, and read at your own pace.</p>
    <p>This reading room brings classic books together with original guides and practical reflections. The lanterns and shelves are there to make it feel like a place you want to spend time.</p>
    <p class="about-signature">Rudraunsh Jadhav<br><span>Creator of Bookstride</span></p>
    <a class="primary" href="#library">Find your next read ↗</a>
    <p class="annotation">Your shelf, reading position, and offline copies stay on this device. Original editions and notices are linked from each book page.</p>
  </article>`;
}

function installPage() {
  main.innerHTML = `<article class="reader install-page">
    <span class="eyebrow">YOUR READING ROOM</span><h1>Install Bookstride</h1>
    <p>Open Bookstride from your Home Screen or desktop and keep selected books handy offline.</p>
    <button id="install-app" class="primary" type="button" ${installPrompt ? '' : 'hidden'}>Install app</button>
    <dl>
      <dt>iPhone and iPad</dt><dd>Open in Safari. Tap Share, then Add to Home Screen. Turn on Open as Web App if Safari offers it.</dd>
      <dt>Android</dt><dd>Open in Chrome. In the browser menu, choose Add to Home screen, then Install if offered.</dd>
      <dt>Desktop</dt><dd>Use the install option in Chrome or Edge, or choose File → Add to Dock in Safari on Mac.</dd>
    </dl>
    <h2>Read without a connection</h2>
    <p>While online, open a book page and choose <strong>Save for offline reading</strong> when available. Wait for the ready message before disconnecting.</p>
    <a class="secondary" href="#library">Back to the library</a>
  </article>`;
}

function render() {
  let [page = 'library', id, section] = location.hash.slice(1).split('/');
  let anchor = null;
  const guideMatch = page.match(/^(guide|lesson)-([a-z]+)-(\d+)$/);
  if (guideMatch) {
    if (document.getElementById(page)) return;
    anchor = page;
    page = guideMatch[1] === 'lesson' ? 'lessons' : 'summary';
    id = guideMatch[2];
  }
  if (page === 'main' && main.childElementCount) return;
  if (page === 'collection' && document.querySelector('#collection')) return;
  if (page === 'collection' || page === 'main') {
    anchor = page;
    page = 'library';
  }
  const version = ++renderVersion;
  const book = books.find(item => item.id === id);
  document.body.dataset.reading = String(Boolean(book && ['summary', 'lessons', 'read'].includes(page)));
  if (page === 'shelf') library(true);
  else if (page === 'about') about();
  else if (page === 'install') installPage();
  else if (book && page === 'book') detail(book);
  else if (book && ['summary', 'lessons'].includes(page)) reader(book, page === 'lessons');
  else if (book && page === 'read') fullReader(book, section, version);
  else if (['library', ''].includes(page)) library();
  else main.innerHTML = `<article class="reader"><h1>That page isn’t in this library.</h1><p>Choose a book to find its summary, lessons, or full text.</p><a class="primary" href="#library">Back to the library ↗</a></article>`;
  const pageTitle = book ? book.title : ({shelf: 'My shelf', about: 'About Bookstride', install: 'Install Bookstride'})[page] || 'Discover';
  document.title = `${pageTitle} · Bookstride`;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = page !== 'install' && link.dataset.nav === (['shelf', 'about'].includes(page) ? page : 'library');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.querySelector('#saved-count').textContent = saved.size;
  window.scrollTo(0, 0);
  if (anchor) document.getElementById(anchor)?.scrollIntoView();
  main.focus({preventScroll: true});
}

main.addEventListener('click', event => {
  const button = event.target.closest('[data-save]');
  if (!button) return;
  const book = books.find(item => item.id === button.dataset.save);
  if (!book) return;
  if (saved.has(book.id)) saved.delete(book.id); else saved.add(book.id);
  try {
    localStorage.setItem('reading-pilot-shelf', JSON.stringify([...saved]));
    status.textContent = saved.has(book.id) ? 'Book saved to your shelf.' : 'Book removed from your shelf.';
  } catch { status.textContent = 'Storage is unavailable. Your shelf will last only for this visit.'; }
  if (location.hash === '#shelf') render();
  else {
    button.setAttribute('aria-pressed', String(saved.has(book.id)));
    button.textContent = saved.has(book.id) ? 'Remove from MyShelf' : 'Add to MyShelf';
    button.setAttribute('aria-label', `${saved.has(book.id) ? 'Remove' : 'Save'} ${book.title}`);
    document.querySelector('#saved-count').textContent = saved.size;
  }
});
main.addEventListener('click', event => {
  const themeButton = event.target.closest('[data-theme-choice]');
  if (themeButton) applyTheme(themeButton.dataset.themeChoice);
  const sizeButton = event.target.closest('[data-size]');
  if (sizeButton) {
    fontSize = Math.max(16, Math.min(28, fontSize + Number(sizeButton.dataset.size)));
    document.documentElement.style.setProperty('--reader-size', `${fontSize}px`);
    document.querySelectorAll('[data-size]').forEach(control => {
      control.disabled = Number(control.dataset.size) < 0 ? fontSize <= 16 : fontSize >= 28;
    });
    try { localStorage.setItem('bookstride-font-size', String(fontSize)); } catch {}
    status.textContent = `Text size ${fontSize} pixels.`;
  }
});

let scrollFrame = null;
function updateLanterns() {
  scrollFrame = null;
  const distance = motionPreference.matches ? 0 : window.scrollY;
  document.documentElement.style.setProperty('--lantern-drop', `${Math.min(distance * 0.035, 34)}px`);
  document.documentElement.style.setProperty('--lantern-angle', `${Math.sin(distance / 240) * 3.5}deg`);
}
window.addEventListener('scroll', () => {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateLanterns);
}, {passive: true});
motionPreference.addEventListener('change', updateLanterns);
document.querySelector('#theme').addEventListener('click', () => applyTheme(theme === 'dark' ? 'sepia' : 'dark'));
window.addEventListener('hashchange', render);
applyTheme(theme);
document.documentElement.style.setProperty('--reader-size', `${fontSize}px`);
render();
updateLanterns();
