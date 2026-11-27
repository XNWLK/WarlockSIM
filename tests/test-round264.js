// Round 264 tests — the user, 2026-11-27: "add a what changed in the sim that just links to the patchnotes.md in the github".
// index.html's top links: "What changed" → https://github.com/XNWLK/WarlockSIM/blob/main/PATCHNOTES.md, right after "Tour".
(function () {
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  T.run('round 264: "What changed" link to the patch notes', function () {
    var h = src('../index.html');
    if (!h) { T.warn('index.html not readable here (file://)'); return; }
    var nav = (h.match(/<nav class="toplinks"[\s\S]*?<\/nav>/) || [''])[0];
    T.ok(/<a href="https:\/\/github\.com\/XNWLK\/WarlockSIM\/blob\/main\/PATCHNOTES\.md" target="_blank" rel="noopener"[^>]*>What changed<\/a>/.test(nav), 'the top links have "What changed" → PATCHNOTES.md on GitHub (new tab)');
    T.ok(nav.indexOf('>Tour<') >= 0 && nav.indexOf('>Tour<') < nav.indexOf('>What changed<') && nav.indexOf('>What changed<') < nav.indexOf('>GitHub<'), 'between "Tour" and "GitHub"');
    var p = src('../PATCHNOTES.md');
    T.ok(!p || /^# Patch notes/.test(p), 'PATCHNOTES.md is the patch notes file');
  });
})();
