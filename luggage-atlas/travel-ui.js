(function () {
  'use strict';
  if (document.body.dataset.soundScene !== 'workshop') return;
  const ids = ['studio-controls', 'specifications', 'upgrade-details'];
  const links = [...document.querySelectorAll('.workshop-nav a')].filter(a => ids.includes(a.hash.slice(1)));
  function current(id) {
    links.forEach(a => { const active = a.hash === '#' + id; a.classList.toggle('is-current', active); if (active) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  }
  current(ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'studio-controls');
  links.forEach(a => a.addEventListener('click', () => current(a.hash.slice(1))));
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      const entering = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (entering.length) current(entering[0].target.id);
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    ids.forEach(id => { const section = document.getElementById(id); if (section) observer.observe(section); });
    window.addEventListener('pagehide', () => observer.disconnect());
    window.addEventListener('pageshow', e => { if (e.persisted) ids.forEach(id => { const section = document.getElementById(id); if (section) observer.observe(section); }); });
  }
})();
