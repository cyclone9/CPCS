// Runs before first paint so a stored light theme doesn't flash dark. Only the theme is read here.
try {
  if (localStorage.getItem('cpcs-theme') === 'light') document.documentElement.dataset.theme = 'light';
} catch {
  // Storage blocked: stay on the dark default.
}
