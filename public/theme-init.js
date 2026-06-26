// Hydrate theme before paint to avoid flash.
// Loaded synchronously in <head> — must not import anything and must work stand-alone.
(function () {
  try {
    var stored = localStorage.getItem('linkedout:theme');
    var theme =
      stored ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'linkedin-dark'
        : 'linkedin-light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'linkedin-light';
  }
})();
