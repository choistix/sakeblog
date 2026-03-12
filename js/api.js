// ─── SEISHU TECHOU — FRONTEND API ───
// Read-only helpers for index.html and post.html.
// Reads public JSON files served by GitHub Pages — no PAT required.

const API = (() => {

  async function fetchJSON(path) {
    const res = await fetch(`${path}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`${res.status} fetching ${path}`);
    return res.json();
  }

  // Load all posts from the master index
  async function getPosts() {
    return fetchJSON('data/posts.json');
  }

  // Load a single post by slug.
  // Tries posts/ first, then notes/ for tasting note entries.
  async function getPost(slug) {
    for (const dir of ['posts', 'notes']) {
      try {
        const res = await fetch(`${dir}/${slug}.json?t=${Date.now()}`);
        if (res.ok) return res.json();
      } catch (e) {
        // network error on this dir — try next
      }
    }
    return null;
  }

  return { getPosts, getPost };
})();
