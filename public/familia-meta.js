(function () {
  var path = window.location.pathname || '';
  var host = window.location.hostname || '';
  var isFamiliaSubdomain = /^(familia|pais)\./i.test(host);
  var isFamilia =
    isFamiliaSubdomain ||
    path === '/familia' ||
    path === '/pais' ||
    path === '/educacao/familia' ||
    path.indexOf('/familia/') === 0;
  if (!isFamilia) return;

  var manifestHref = isFamiliaSubdomain ? '/manifest-familia-root.json' : '/manifest-familia.json';

  function applyFamiliaMeta() {
    document.title = 'Família & Escola';
    var setMeta = function (name, content) {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (el) el.setAttribute('content', content);
    };
    setMeta('application-name', 'Família & Escola');
    setMeta('apple-mobile-web-app-title', 'Família & Escola');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('theme-color', '#0a0907');

    var appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.setAttribute('href', '/familia-192x192.png');

    document.querySelectorAll('link[rel="icon"]').forEach(function (el) {
      el.setAttribute('href', '/familia-192x192.png');
      el.setAttribute('type', 'image/png');
    });

    var manifests = document.querySelectorAll('link[rel="manifest"]');
    if (manifests.length === 0) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestHref;
      document.head.appendChild(link);
    } else {
      manifests.forEach(function (el, idx) {
        if (idx === 0) el.setAttribute('href', manifestHref);
        else el.remove();
      });
    }
  }

  applyFamiliaMeta();
  document.addEventListener('DOMContentLoaded', applyFamiliaMeta);
})();
