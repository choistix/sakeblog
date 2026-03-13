// ─────────────────────────────────────────────
//  清酒手帖 — Admin JS
// ─────────────────────────────────────────────

const REPO       = `${SITE_CONFIG.owner}/${SITE_CONFIG.repo}`;
const BRANCH     = SITE_CONFIG.branch;
const ADMIN_PASS = SITE_CONFIG.adminPassword;

const CATEGORIES = [
  'junmai', 'ginjo', 'daiginjo', 'nama', 'tokubetsu',
  'nigori', 'sparkling', 'koshu', 'yamahai',
  'kimoto', 'muroka', 'futsu', 'honjozo', 'global'
];

// Image state per form
const imageState = {
  hero:      { b64: null, name: null },
  editorial: { b64: null, name: null },
  note:      { b64: null, name: null }
};

let existingPosts = [];           // all posts from index
let currentEditSlug = null;       // slug of post being edited
let currentEditSha = null;        // sha of the post file (for update)
let pat = '';
let existingIssues = [];

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
function authenticate() {
  const inputPat = document.getElementById('pat-input').value.trim();
  const inputPw  = document.getElementById('pw-input').value.trim();
  const authErr  = document.getElementById('auth-error');

  if (!inputPat) {
    authErr.textContent = 'Please enter your GitHub PAT.';
    return;
  }
  if (inputPw !== ADMIN_PASS) {
    authErr.textContent = 'Incorrect password.';
    return;
  }

  pat = inputPat;
  // Store PAT in sessionStorage so the page doesn't ask again on refresh
  sessionStorage.setItem('sake_pat', pat);
  document.getElementById('auth-panel').style.display = 'none';
  document.getElementById('main-panel').style.display = 'block';
  initAdmin();
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('sake_pat');
  if (saved) {
    pat = saved;
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('main-panel').style.display = 'block';
    initAdmin();
  }

  // Allow Enter key on password field
  document.getElementById('pw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') authenticate();
  });
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
async function initAdmin() {
  buildTagGrids();
  await loadIssueNumbers();
  await loadAllPosts();
  populateEditDropdowns();
  await cleanOrphans();
}


// ─────────────────────────────────────────────
//  ISSUE NUMBERS
// ─────────────────────────────────────────────
async function loadIssueNumbers() {
  try {
    const data = await ghGetFresh('data/posts.json');
    if (data) {
      const posts = JSON.parse(atob(data.content.replace(/\s/g, '')));
      const nums  = [...new Set(
        posts.map(p => p.issue).filter(n => typeof n === 'number' && !isNaN(n))
      )].sort((a, b) => a - b);
      existingIssues = nums;
    }
  } catch (e) {
    existingIssues = [];
  }
  populateIssueDropdowns();
}

function populateIssueDropdowns() {
  const next = existingIssues.length > 0 ? Math.max(...existingIssues) + 1 : 1;

  ['hero-issue', 'editorial-issue', 'note-issue'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';

    existingIssues.forEach(n => {
      const opt       = document.createElement('option');
      opt.value       = n;
      opt.textContent = `Issue ${n}`;
      sel.appendChild(opt);
    });

    const newOpt       = document.createElement('option');
    newOpt.value       = next;
    newOpt.textContent = `New Issue (Issue ${next})`;
    newOpt.selected    = true;
    sel.appendChild(newOpt);
  });
}

// ─────────────────────────────────────────────
//  EDITING HELPERS
// ─────────────────────────────────────────────

// Add this helper near the other helpers
function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function loadAllPosts() {
  try {
    const data = await ghGetFresh('data/posts.json');
    if (data) {
      const jsonString = base64ToUtf8(data.content);
      existingPosts = JSON.parse(jsonString);
      console.log('✅ Loaded posts:', existingPosts.length);
    } else {
      existingPosts = [];
    }
  } catch (e) {
    console.error('❌ Failed to load posts:', e);
    existingPosts = [];
  }
}

function populateEditDropdowns() {
  const heroSelect = document.getElementById('hero-edit-select');
  const editorialSelect = document.getElementById('editorial-edit-select');
  const noteSelect = document.getElementById('note-edit-select');

  if (heroSelect) {
    heroSelect.innerHTML = '<option value="">— Select hero to edit —</option>';
    existingPosts.filter(p => p.type === 'hero').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = `${p.title_jp || p.slug} (Issue ${p.issue})`;
      heroSelect.appendChild(opt);
    });
  }

  if (editorialSelect) {
    editorialSelect.innerHTML = '<option value="">— Select editorial to edit —</option>';
    existingPosts.filter(p => p.type === 'index' || p.type === 'index_row').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = `${p.title_jp || p.slug} (Issue ${p.issue})`;
      editorialSelect.appendChild(opt);
    });
  }

  if (noteSelect) {
    noteSelect.innerHTML = '<option value="">— Select note to edit —</option>';
    existingPosts.filter(p => p.type === 'note' || p.type === 'tasting_note').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = `${p.sake_name_jp || p.title_jp || p.slug} (Issue ${p.issue})`;
      noteSelect.appendChild(opt);
    });
  }
}

async function loadPostForEdit(type, slug) {
  if (!slug) return;

  const dir = (type === 'note' || type === 'tasting_note') ? 'notes' : 'posts';
  try {
    const data = await ghGetFresh(`${dir}/${slug}.json`);
    if (!data) throw new Error('Post file not found');
    
    const post = JSON.parse(atob(data.content.replace(/\s/g, '')));
    currentEditSlug = slug;
    currentEditSha = data.sha;

    // Populate common fields
    document.getElementById(`${type}-slug`).value = post.slug || '';
    document.getElementById(`${type}-title`).value = post.title_jp || '';
    if (type !== 'note') {
      document.getElementById(`${type}-subtitle`).value = post.subtitle || post.title_en || '';
      document.getElementById(`${type}-body`).value = post.body || '';
    }

    const issueSelect = document.getElementById(`${type}-issue`);
    if (issueSelect) issueSelect.value = post.issue || '';

    // Tags
    document.querySelectorAll(`#${type}-tags .tag-chip`).forEach(c => c.classList.remove('selected'));
    if (Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        const chip = document.querySelector(`#${type}-tags .tag-chip[data-tag="${tag}"]`);
        if (chip) chip.classList.add('selected');
      });
    }

    // Image handling
    removeImage(type); // clear current preview
    if (post.image) {
      imageState[type].existingPath = post.image;  // custom property
      const previewWrap = document.getElementById(`${type}-preview-wrap`);
      const previewImg = document.getElementById(`${type}-preview-img`);
      previewImg.src = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${post.image}?t=${Date.now()}`;
      previewWrap.style.display = 'block';
    }

    // Note-specific fields
    if (type === 'note') {
      document.getElementById('note-name-en').value = post.sake_name_en || '';
      document.getElementById('note-classification').value = post.classification || '';
      document.getElementById('note-brewery').value = post.brewery || '';
      document.getElementById('note-region').value = post.region || post.prefecture || '';
      document.getElementById('note-rice').value = post.rice_variety || '';
      document.getElementById('note-seimai').value = post.seimaibuai || '';
      document.getElementById('note-smv').value = post.nihonshu_do || '';
      document.getElementById('note-acidity').value = post.acidity || '';
      document.getElementById('note-abv').value = post.alcohol || '';
      document.getElementById('note-tasting').value = post.tasting_notes || '';
      document.getElementById('note-pairing').value = post.pairing || '';
      document.getElementById('note-sweetness').value = post.sweetness || 0;
      document.getElementById('note-umami').value = post.umami || 0;
      document.getElementById('note-acidity-bar').value = post.acidity || 0;
      document.getElementById('note-finish').value = post.finish || 0;
    }

  } catch (err) {
    console.error('Error loading post:', err);
    // File doesn't exist – ask to remove from index
    if (confirm(`The file for "${slug}" does not exist. Remove it from the index?`)) {
      await removeOrphanFromIndex(type, slug);
      // Refresh dropdowns
      await loadAllPosts();
      populateEditDropdowns();
    }
  }
}

// ─────────────────────────────────────────────
//  AUTO CLEANUP – Remove missing posts from index
// ─────────────────────────────────────────────
async function cleanOrphans() {
  console.log('🧹 Cleaning orphaned index entries...');
  try {
    const indexData = await ghGetFresh('data/posts.json');
    if (!indexData) {
      console.log('No index file yet, skipping cleanup.');
      return;
    }

    let posts = JSON.parse(atob(indexData.content.replace(/\s/g, '')));
    const originalLength = posts.length;
    const validPosts = [];

    for (const post of posts) {
      const dir = (post.type === 'note' || post.type === 'tasting_note') ? 'notes' : 'posts';
      try {
        const fileData = await ghGetFresh(`${dir}/${post.slug}.json`);
        if (fileData) {
          validPosts.push(post); // file exists
        } else {
          console.log(`🗑️ Removing orphan: ${post.slug} (file not found)`);
        }
      } catch (err) {
        // Some other error (network, etc.) – assume file might exist, keep it
        console.warn(`⚠️ Error checking ${post.slug}: ${err.message} – keeping in index`);
        validPosts.push(post);
      }
    }

    if (validPosts.length === originalLength) {
      console.log('✅ No orphans found.');
      return;
    }

    // Write back the cleaned index
    const jsonString = JSON.stringify(validPosts, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const encoded = btoa(binary);

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/data/posts.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Auto-clean: removed ${originalLength - validPosts.length} orphans`,
        content: encoded,
        sha: indexData.sha,
        branch: BRANCH
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Index update failed: ${res.status} ${err.message}`);
    }

    console.log(`✅ Removed ${originalLength - validPosts.length} orphans.`);
    // Update local data and dropdowns
    existingPosts = validPosts;
    populateEditDropdowns();
  } catch (err) {
    console.error('❌ Orphan cleanup failed:', err);
  }
}

function resetEditState() {
  currentEditSlug = null;
  currentEditSha = null;
}

// New index update function (replaces appendToIndex for editing)
async function updateIndex(indexPath, newPost, oldSlug = null) {
  const existing = await ghGetFresh(indexPath);
  if (!existing) throw new Error('Index file not found');

  let posts = JSON.parse(atob(existing.content.replace(/\s/g, '')));

  if (oldSlug) {
    const index = posts.findIndex(p => p.slug === oldSlug && p.type === newPost.type);
    if (index !== -1) posts.splice(index, 1);
  } else {
    if (posts.find(p => p.slug === newPost.slug && p.type === newPost.type)) {
      throw new Error(`"${newPost.slug}" (${newPost.type}) already exists.`);
    }
  }

  posts.push(newPost);
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // ✅ CORRECT ENCODING (same as ghPutJson)
  const jsonString = JSON.stringify(posts, null, 2);
  const utf8Bytes = new TextEncoder().encode(jsonString);
  let binary = '';
  utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
  const encoded = btoa(binary);

  const body = {
    message: oldSlug ? `Update ${newPost.slug} in index` : `Add ${newPost.slug} to index`,
    content: encoded,
    branch: BRANCH,
    sha: existing.sha
  };

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${indexPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Index update failed: ${res.status} ${err.message}`);
  }
}

// Delete Helper
async function ghDeleteFile(path, sha, message) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      message: message,
      sha: sha,
      branch: BRANCH
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`DELETE failed: ${res.status} ${err.message}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
//  TAG GRIDS
// ─────────────────────────────────────────────
function buildTagGrids() {
  ['hero-tags', 'editorial-tags', 'note-tags'].forEach(buildGrid);
}

function buildGrid(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = '';
  CATEGORIES.forEach(tag => {
    const chip       = document.createElement('button');
    chip.type        = 'button';
    chip.className   = 'tag-chip';
    chip.textContent = tag;
    chip.dataset.tag = tag;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    wrap.appendChild(chip);
  });
}

function getSelectedTags(containerId) {
  return [...document.querySelectorAll(`#${containerId} .tag-chip.selected`)]
    .map(c => c.dataset.tag);
}

// ─────────────────────────────────────────────
//  TAB SWITCH
// ─────────────────────────────────────────────
function switchTab(type, btn) {
  document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['form-hero', 'form-editorial', 'form-note'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(`form-${type}`).style.display = 'block';
}

// ─────────────────────────────────────────────
//  IMAGE HANDLING
// ─────────────────────────────────────────────
function handleImageSelect(prefix) {
  const input = document.getElementById(`${prefix}-image-input`);
  const file  = input.files[0];
  if (!file) return;

  document.getElementById(`${prefix}-size-warn`).style.display =
    file.size > 2 * 1024 * 1024 ? 'block' : 'none';

  const reader  = new FileReader();
  reader.onload = e => {
    const result            = e.target.result;
    imageState[prefix].b64  = result.split(',')[1];
    imageState[prefix].name = file.name;
    document.getElementById(`${prefix}-preview-img`).src = result;
    document.getElementById(`${prefix}-preview-wrap`).style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeImage(prefix) {
  imageState[prefix].b64  = null;
  imageState[prefix].name = null;
  const input = document.getElementById(`${prefix}-image-input`);
  if (input) input.value = '';
  document.getElementById(`${prefix}-preview-wrap`).style.display = 'none';
  document.getElementById(`${prefix}-size-warn`).style.display    = 'none';
}

// ─────────────────────────────────────────────
//  PUBLISH — HERO FEATURE
// ─────────────────────────────────────────────
async function publishHero() {
  const btn    = document.getElementById('hero-submit-btn');
  const status = document.getElementById('hero-status');
  const slug   = slugify(document.getElementById('hero-slug').value);
  const title  = document.getElementById('hero-title').value.trim();
  const issue  = parseInt(document.getElementById('hero-issue').value);
  const tags   = getSelectedTags('hero-tags');

  if (!slug)  { setStatus(status, 'Slug is required.', 'err'); return; }
  if (!title) { setStatus(status, 'Title is required.', 'err'); return; }

  btn.disabled = true;
  try {
    let imagePath = imageState.hero.existingPath || null;
    if (imageState.hero.b64) {
      imagePath = `assets/images/${slug}-${imageState.hero.name}`;
      setStatus(status, 'Uploading image…', '');
      await ghPutFile(imagePath, imageState.hero.b64, `Upload image for ${slug}`);
    }

    const post = {
      slug,
      type:      'hero',
      issue,
      title_jp:  title,
      title_en:  document.getElementById('hero-subtitle').value.trim(),
      subtitle:  document.getElementById('hero-subtitle').value.trim(),
      body:      document.getElementById('hero-body').value.trim(),
      image:     imagePath,
      caption:   document.getElementById('hero-caption').value.trim(),
      kanji_bg:  '酒',
      tags,
      date:      new Date().toISOString()
    };

    // Determine the file slug and path
    let fileSlug = slug;
    let oldFilePath = null;
    let oldFileSha = null;

    if (currentEditSlug && currentEditSlug !== slug) {
      // Slug changed – we need to delete the old file
      oldFilePath = `posts/${currentEditSlug}.json`;
      try {
        const oldFileData = await ghGetFresh(oldFilePath);
        if (oldFileData) {
          oldFileSha = oldFileData.sha;
        }
      } catch (e) {
        console.warn('Could not fetch old file for deletion:', e);
      }
      fileSlug = slug; // new slug
    } else {
      fileSlug = currentEditSlug || slug;
    }

    const filePath = `posts/${fileSlug}.json`;

    // If there's an old file to delete, do it now
    if (oldFilePath && oldFileSha) {
      setStatus(status, 'Deleting old file…', '');
      await ghDeleteFile(oldFilePath, oldFileSha, `Delete old file for ${currentEditSlug} (slug changed to ${slug})`);
    }

    setStatus(status, currentEditSlug ? 'Updating post file…' : 'Writing post file…', '');
    await ghPutJson(filePath, post, `${currentEditSlug ? 'Update' : 'Add'} hero post: ${slug}`);

    setStatus(status, 'Updating index…', '');
    await updateIndex('data/posts.json', post, currentEditSlug);

    setStatus(status, `✓ Published — post.html?slug=${slug}`, 'ok');
    resetForm('hero', ['hero-slug','hero-title','hero-subtitle','hero-body','hero-caption']);
    resetEditState();
    // Refresh dropdowns
    await loadAllPosts();
    populateEditDropdowns();
  } catch (err) {
    setStatus(status, `Error: ${err.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
//  PUBLISH — EDITORIAL POST
// ─────────────────────────────────────────────
async function publishEditorial() {
  const btn    = document.getElementById('editorial-submit-btn');
  const status = document.getElementById('editorial-status');
  const slug   = slugify(document.getElementById('editorial-slug').value);
  const title  = document.getElementById('editorial-title').value.trim();
  const issue  = parseInt(document.getElementById('editorial-issue').value);
  const tags   = getSelectedTags('editorial-tags');

  if (!slug)  { setStatus(status, 'Slug is required.', 'err'); return; }
  if (!title) { setStatus(status, 'Title is required.', 'err'); return; }

  btn.disabled = true;
  try {
    let imagePath = imageState.editorial.existingPath || null;
    if (imageState.editorial.b64) {
      imagePath = `assets/images/${slug}-${imageState.editorial.name}`;
      setStatus(status, 'Uploading image…', '');
      await ghPutFile(imagePath, imageState.editorial.b64, `Upload image for ${slug}`);
    }

    const post = {
      slug,
      type:     'index',          // or 'index_row'? we'll keep 'index' for consistency
      issue,
      title_jp: title,
      title_en: document.getElementById('editorial-subtitle').value.trim(),
      subtitle: document.getElementById('editorial-subtitle').value.trim(),
      body:     document.getElementById('editorial-body').value.trim(),
      image:    imagePath,
      kanji_bg: '酒',
      tags,
      date:     new Date().toISOString()
    };

    // Determine the file slug and path
    let fileSlug = slug;
    let oldFilePath = null;
    let oldFileSha = null;

    if (currentEditSlug && currentEditSlug !== slug) {
      // Slug changed – we need to delete the old file
      oldFilePath = `posts/${currentEditSlug}.json`;
      try {
        const oldFileData = await ghGetFresh(oldFilePath);
        if (oldFileData) {
          oldFileSha = oldFileData.sha;
        }
      } catch (e) {
        console.warn('Could not fetch old file for deletion:', e);
      }
      fileSlug = slug; // new slug
    } else {
      fileSlug = currentEditSlug || slug;
    }

    const filePath = `posts/${fileSlug}.json`;

    // If there's an old file to delete, do it now
    if (oldFilePath && oldFileSha) {
      setStatus(status, 'Deleting old file…', '');
      await ghDeleteFile(oldFilePath, oldFileSha, `Delete old file for ${currentEditSlug} (slug changed to ${slug})`);
    }

    setStatus(status, currentEditSlug ? 'Updating post file…' : 'Writing post file…', '');
    await ghPutJson(filePath, post, `${currentEditSlug ? 'Update' : 'Add'} editorial post: ${slug}`);

    setStatus(status, 'Updating index…', '');
    await updateIndex('data/posts.json', post, currentEditSlug);

    setStatus(status, `✓ Published — post.html?slug=${slug}`, 'ok');
    resetForm('editorial', ['editorial-slug','editorial-title','editorial-subtitle','editorial-body']);
    resetEditState();
    await loadAllPosts();
    populateEditDropdowns();
  } catch (err) {
    setStatus(status, `Error: ${err.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
//  PUBLISH — TASTING NOTE
// ─────────────────────────────────────────────
async function publishNote() {
  const btn    = document.getElementById('note-submit-btn');
  const status = document.getElementById('note-status');
  const slug   = slugify(document.getElementById('note-slug').value);
  const title  = document.getElementById('note-title').value.trim();
  const issue  = parseInt(document.getElementById('note-issue').value);
  const tags   = getSelectedTags('note-tags');

  if (!slug)  { setStatus(status, 'Slug is required.', 'err'); return; }
  if (!title) { setStatus(status, 'Title is required.', 'err'); return; }

  btn.disabled = true;
  try {
    let imagePath = imageState.note.existingPath || null;
    if (imageState.note.b64) {
      imagePath = `assets/images/${slug}-${imageState.note.name}`;
      setStatus(status, 'Uploading image…', '');
      await ghPutFile(imagePath, imageState.note.b64, `Add note image for ${slug}`);
    }

    const post = {
      slug,
      type:           'note',
      issue,
      title_jp:       title,
      sake_name_jp:   title,
      sake_name_en:   document.getElementById('note-name-en').value.trim(),
      classification: document.getElementById('note-classification').value.trim(),
      brewery:        document.getElementById('note-brewery').value.trim(),
      prefecture:     document.getElementById('note-region').value.trim(),
      region:         document.getElementById('note-region').value.trim(),
      rice_variety:   document.getElementById('note-rice').value.trim(),
      seimaibuai:     document.getElementById('note-seimai').value.trim(),
      nihonshu_do:    document.getElementById('note-smv').value.trim(),
      acidity:        parseInt(document.getElementById('note-acidity-bar').value) || 0,
      alcohol:        document.getElementById('note-abv').value.trim(),
      tasting_notes:  document.getElementById('note-tasting').value.trim(),
      sweetness:      parseInt(document.getElementById('note-sweetness').value) || 0,
      umami:          parseInt(document.getElementById('note-umami').value) || 0,
      finish:         parseInt(document.getElementById('note-finish').value) || 0,
      pairing:        document.getElementById('note-pairing').value.trim(),
      image:          imagePath,
      kanji_bg:       '酒',
      tags,
      date:           new Date().toISOString()
    };
    
    // Determine the file slug and path
    let fileSlug = slug;
    let oldFilePath = null;
    let oldFileSha = null;

    if (currentEditSlug && currentEditSlug !== slug) {
      // Slug changed – we need to delete the old file
      oldFilePath = `notes/${currentEditSlug}.json`;
      try {
        const oldFileData = await ghGetFresh(oldFilePath);
        if (oldFileData) {
          oldFileSha = oldFileData.sha;
        }
      } catch (e) {
        console.warn('Could not fetch old file for deletion:', e);
      }
      fileSlug = slug; // new slug
    } else {
      fileSlug = currentEditSlug || slug;
    }

    const filePath = `notes/${fileSlug}.json`;

    // If there's an old file to delete, do it now
    if (oldFilePath && oldFileSha) {
      setStatus(status, 'Deleting old file…', '');
      await ghDeleteFile(oldFilePath, oldFileSha, `Delete old file for ${currentEditSlug} (slug changed to ${slug})`);
    }

    setStatus(status, 'Writing note file…', '');
    await ghPutJson(filePath, post, `Add tasting note: ${slug}`);

    setStatus(status, 'Updating index…', '');
    await updateIndex('data/posts.json', post, currentEditSlug);

    setStatus(status, `✓ Published — post.html?slug=${slug}`, 'ok');
    resetForm('note', [
      'note-slug','note-title','note-name-en','note-classification',
      'note-brewery','note-region','note-rice','note-seimai',
      'note-smv','note-acidity','note-abv','note-tasting','note-pairing',
      'note-sweetness','note-umami','note-acidity-bar','note-finish'
    ]);
  } catch (err) {
    setStatus(status, `Error: ${err.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

async function removeOrphanFromIndex(type, slug) {
  try {
    const indexData = await ghGetFresh('data/posts.json');
    if (!indexData) return;

    let posts = JSON.parse(atob(indexData.content.replace(/\s/g, '')));
    const originalLength = posts.length;
    posts = posts.filter(p => !(p.slug === slug && p.type === type));

    if (posts.length === originalLength) {
      alert('Entry not found in index.');
      return;
    }

    // Write back the cleaned index
    const jsonString = JSON.stringify(posts, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const encoded = btoa(binary);

    await fetch(`https://api.github.com/repos/${REPO}/contents/data/posts.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Remove orphaned entry ${slug} from index`,
        content: encoded,
        sha: indexData.sha,
        branch: BRANCH
      })
    });

    alert(`Removed "${slug}" from index.`);
  } catch (err) {
    alert(`Error removing orphan: ${err.message}`);
    console.error(err);
  }
}

// ─────────────────────────────────────────────
//  DELETE POST FUNCTIONALITY
// ─────────────────────────────────────────────
function getAllFieldIds(type) {
  if (type === 'hero') {
    return ['hero-slug','hero-title','hero-subtitle','hero-body','hero-caption'];
  } else if (type === 'editorial') {
    return ['editorial-slug','editorial-title','editorial-subtitle','editorial-body'];
  } else if (type === 'note') {
    return ['note-slug','note-title','note-name-en','note-classification',
            'note-brewery','note-region','note-rice','note-seimai',
            'note-smv','note-acidity','note-abv','note-tasting','note-pairing',
            'note-sweetness','note-umami','note-acidity-bar','note-finish'];
  }
  return [];
}

async function deletePost(type, slug) {
  if (!slug) {
    alert('No post selected to delete.');
    return;
  }

  const confirmDelete = confirm(`Are you sure you want to delete "${slug}"? This cannot be undone.`);
  if (!confirmDelete) return;

  const dir = (type === 'note' || type === 'tasting_note') ? 'notes' : 'posts';
  const filePath = `${dir}/${slug}.json`;

  try {
    const fileData = await ghGetFresh(filePath);
    if (!fileData) {
      alert('File not found on GitHub. It may have been already deleted.');
      return;
    }

    await ghDeleteFile(filePath, fileData.sha, `Delete ${type} post: ${slug}`);

    const indexData = await ghGetFresh('data/posts.json');
    if (indexData) {
      let posts = JSON.parse(atob(indexData.content.replace(/\s/g, '')));
      posts = posts.filter(p => !(p.slug === slug && p.type === type));
      
      const jsonString = JSON.stringify(posts, null, 2);
      const utf8Bytes = new TextEncoder().encode(jsonString);
      let binary = '';
      utf8Bytes.forEach(b => binary += String.fromCharCode(b));
      const encoded = btoa(binary);

      await fetch(`https://api.github.com/repos/${REPO}/contents/data/posts.json`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pat}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
        },
        body: JSON.stringify({
          message: `Remove deleted post ${slug} from index`,
          content: encoded,
          sha: indexData.sha,
          branch: BRANCH
        })
      });
    }

    alert(`Post "${slug}" deleted successfully.`);
    await loadAllPosts();
    populateEditDropdowns();
    resetForm(type, getAllFieldIds(type));
    resetEditState();
  } catch (err) {
    alert(`Error deleting post: ${err.message}`);
    console.error(err);
  }
}

async function syncIndex() {
  if (!confirm('This will rebuild the index from all files in posts/ and notes/. Continue?')) return;

  const status = document.getElementById('sync-status');
  status.textContent = 'Syncing...';

  try {
    let allPosts = [];

    const postsDir = await fetch(`https://api.github.com/repos/${REPO}/contents/posts?ref=${BRANCH}`, {
      headers: { Authorization: `Bearer ${pat}` }
    });
    if (postsDir.ok) {
      const files = await postsDir.json();
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const data = await ghGetFresh(`posts/${file.name}`);
          if (data) {
            const content = atob(data.content.replace(/\s/g, ''));
            const post = JSON.parse(content);
            allPosts.push(post);
          }
        }
      }
    }

    const notesDir = await fetch(`https://api.github.com/repos/${REPO}/contents/notes?ref=${BRANCH}`, {
      headers: { Authorization: `Bearer ${pat}` }
    });
    if (notesDir.ok) {
      const files = await notesDir.json();
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const data = await ghGetFresh(`notes/${file.name}`);
          if (data) {
            const content = atob(data.content.replace(/\s/g, ''));
            const post = JSON.parse(content);
            allPosts.push(post);
          }
        }
      }
    }

    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const indexData = await ghGetFresh('data/posts.json');
    const sha = indexData ? indexData.sha : null;

    const jsonString = JSON.stringify(allPosts, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const encoded = btoa(binary);

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/data/posts.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: 'Sync index with actual files',
        content: encoded,
        branch: BRANCH,
        sha: sha
      })
    });

    if (!res.ok) throw new Error('Failed to write index');

    status.textContent = '✅ Index synced!';
    await loadAllPosts();
    populateEditDropdowns();
  } catch (err) {
    status.textContent = `❌ Error: ${err.message}`;
    console.error(err);
  }
}

// ─────────────────────────────────────────────
//  GITHUB API PRIMITIVES
// ─────────────────────────────────────────────

// Fresh GET — always bypasses browser cache, returns raw GitHub API response object or null
async function ghGetFresh(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      method:  'GET',
      headers: {
        Authorization:   `Bearer ${pat}`,
        Accept:          'application/vnd.github+json',
      }
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GET ${path} → ${res.status}: ${err.message || 'unknown error'}`);
  }
  return res.json();
}

// PUT a file — fetches fresh SHA immediately before writing to avoid 409 conflicts
async function ghPutFile(path, contentB64, message) {
  const existing = await ghGetFresh(path);
  const body     = { message, content: contentB64, branch: BRANCH };
  if (existing) body.sha = existing.sha;

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method:  'PUT',
      headers: {
        Authorization:  `Bearer ${pat}`,
        Accept:         'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PUT ${path} → ${res.status}: ${err.message || 'unknown error'}`);
  }
  return res.json();
}

// PUT a JSON object as a UTF-8 encoded file
async function ghPutJson(path, obj, message) {
  // Convert JSON string to UTF-8 bytes, then to Base64
  const jsonString = JSON.stringify(obj, null, 2);
  const utf8Bytes = new TextEncoder().encode(jsonString);
  let binary = '';
  utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
  const encoded = btoa(binary);
  
  return ghPutFile(path, encoded, message);
}

// Read index, append new post, write back — all sequential to avoid SHA conflicts
/* async function appendToIndex(indexPath, post) {
  const existing = await ghGetFresh(indexPath);

  let posts = [];
  let sha;

  if (existing) {
    sha   = existing.sha;
    posts = JSON.parse(atob(existing.content.replace(/\s/g, '')));
  }

  // Guard against duplicate slugs
  if (posts.find(p => p.slug === post.slug && p.type === post.type)) {
    throw new Error(`"${post.slug}" (${post.type}) already exists in the index. Use a different slug.`);
  }

  posts.push(post);
  // Most recent first
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2))));
  const body    = { message: `Index: add ${post.slug}`, content: encoded, branch: BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${indexPath}`,
    {
      method:  'PUT',
      cache:   'no-store',
      headers: {
        Authorization:  `Bearer ${pat}`,
        Accept:         'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Index update → ${res.status}: ${err.message || 'unknown error'}`);
  }
  return res.json();
}
*/

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
function slugify(str) {
  return (str || '').trim().toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className   = type === 'ok' ? 'status-ok' : type === 'err' ? 'status-err' : '';
}

function resetForm(prefix, fieldIds) {
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  removeImage(prefix);
  document.querySelectorAll(`#${prefix}-tags .tag-chip`)
    .forEach(c => c.classList.remove('selected'));
}
