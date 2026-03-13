// ─── SEISHU TECHOU — RENDER FUNCTIONS (Updated for new design) ───

const Renderer = (() => {

  function imgSrc(post) {
    if (!post.image) return null;
    if (!post.image.startsWith('http')) {
      return `https://raw.githubusercontent.com/${SITE_CONFIG.owner}/${SITE_CONFIG.repo}/${SITE_CONFIG.branch}/${post.image}`;
    }
    return post.image;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return dateStr;
    }
  }

  function firstTag(post) {
    if (Array.isArray(post.tags) && post.tags.length) return post.tags[0];
    return post.category || '';
  }

  // ── HERO (matches template's film‑strip hero) ──
  function heroIndex(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}">`
      : `<div class="img-placeholder">${post.kanji_bg || '酒'}</div>`;

    return `
    <section class="hero" data-slug="${post.slug}">
      <div class="hero-label">
        <div class="hero-label-text">${post.title_jp || ''}</div>
        <div class="hero-label-num">${post.issue ? 'Vol.' + post.issue : ''}</div>
      </div>
      <div class="hero-center">
        <div class="hero-bg-kanji">${post.kanji_bg || '酒'}</div>
        <div class="hero-content">
          <div class="hero-kicker">${firstTag(post)}</div>
          <h1 class="hero-title-jp">${post.title_jp || ''}</h1>
          <p class="hero-title-en">${post.title_en || post.subtitle || ''}</p>
          <div class="hero-meta">
            <span>${post.prefecture || ''}</span>
            <span>Polishing Ratio ${post.seimaibuai || '—'}</span>
            <span>${post.brewery || ''}</span>
            <span>${formatDate(post.date)}</span>
          </div>
        </div>
      </div>
      <div class="hero-film">
        <div class="film-frame">
          ${imgHtml}
          <div class="film-frame-label">${post.caption || post.title_en || 'Featured'}</div>
        </div>
        <!-- Additional film frames can be added if you have more images -->
      </div>
    </section>`;
  }

  // ── INDEX ROW (editorial list item) ──
  function indexRow(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}">`
      : `<div class="img-placeholder">${post.kanji_bg || '酒'}</div>`;

    return `
    <a href="post.html?slug=${post.slug}" class="index-row">
      <div class="index-row-num">
        <div class="row-issue">Issue — ${post.issue || ''}</div>
        <div class="row-circle">${post.row_num || '·'}</div>
      </div>
      <div class="index-row-body">
        <div class="row-text">
          <div class="row-bg-kanji">${post.kanji_bg || ''}</div>
          <div class="row-meta-top">
            <div class="row-category">${firstTag(post)}</div>
            <h2 class="row-title-jp">${post.title_jp || ''}</h2>
            <p class="row-title-en">${post.title_en || post.subtitle || ''}</p>
          </div>
          <div class="row-meta-bottom">
            <span>${post.prefecture || ''}</span>
            <span>${post.brewery || ''}</span>
            <span>${formatDate(post.date)}</span>
          </div>
        </div>
        <div class="row-image">
          ${imgHtml}
        </div>
      </div>
    </a>`;
  }

  // ── TASTING CARD (grid) ──
  function tastingCard(post) {
    return `
    <a href="post.html?slug=${post.slug}" class="tasting-card">
      <div class="tasting-card-bg">${post.kanji_bg || '酒'}</div>
      <div class="tasting-num">Note #${post.note_num || post.issue || ''}</div>
      <div class="tasting-sake-name">${post.sake_name_jp || post.title_jp || ''}</div>
      <div class="tasting-sake-en">${post.sake_name_en || post.title_en || ''}</div>
      <p class="tasting-notes-text">${post.tasting_notes || post.excerpt || ''}</p>
      <div class="flavor-chart-wrap">
        <div class="flavor-label">Sweetness</div>
        <div class="flavor-bar"><div class="flavor-fill" style="width:${post.sweetness || 0}%"></div></div>
        <div class="flavor-label">Acidity</div>
        <div class="flavor-bar"><div class="flavor-fill" style="width:${post.acidity || 0}%"></div></div>
        <div class="flavor-label">Umami</div>
        <div class="flavor-bar"><div class="flavor-fill" style="width:${post.umami || 0}%"></div></div>
        <div class="flavor-label">Finish</div>
        <div class="flavor-bar"><div class="flavor-fill" style="width:${post.finish || 0}%"></div></div>
      </div>
      <div class="tasting-data">
        <div class="tasting-data-row">
          <span class="tasting-data-label">Prefecture</span>
          <span class="tasting-data-value">${post.prefecture || '—'}</span>
        </div>
        <div class="tasting-data-row">
          <span class="tasting-data-label">Class</span>
          <span class="tasting-data-value">${post.classification || '—'}</span>
        </div>
        <div class="tasting-data-row">
          <span class="tasting-data-label">Seimaibuai</span>
          <span class="tasting-data-value">${post.seimaibuai || '—'}</span>
        </div>
      </div>
    </a>`;
  }

  // ── POST PAGE: Hero full article (optional, for completeness) ──
  function heroPost(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}" style="width:100%;max-height:500px;object-fit:cover;">`
      : `<div class="img-placeholder" style="height:400px;">${post.kanji_bg || '酒'}</div>`;

    const bodyHtml = (post.body || '')
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    return `
    <section class="post-hero">
      ${imgHtml}
      <h1 class="hero-title-jp">${post.title_jp || ''}</h1>
      <p class="hero-title-en">${post.title_en || post.subtitle || ''}</p>
      <div class="post-body-wrap">
        ${bodyHtml}
      </div>
    </section>`;
  }

  // ── Dispatch: render card for index page
  function renderCard(post) {
    switch (post.type) {
      case 'hero':         return heroIndex(post);
      case 'index':        return indexRow(post);
      case 'index_row':    return indexRow(post);
      case 'note':         return tastingCard(post);
      case 'tasting_note': return tastingCard(post);
      default: return '';
    }
  }

  // ── Dispatch: render full post page content
  function renderPostPage(post) {
    // For simplicity, we use heroPost for all types; you can expand as needed
    return heroPost(post);
  }

  return { renderCard, renderPostPage, heroIndex, indexRow, tastingCard, formatDate };
})();