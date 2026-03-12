// ─── SEISHU TECHOU — RENDER FUNCTIONS ───
// Converts post data objects → HTML strings for index + post pages

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

  // ── HERO — index card (full-width hero section)
  function heroIndex(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}" loading="lazy">`
      : `<div class="hero-img-placeholder">${post.kanji_bg || '酒'}</div>`;

    return `
    <section class="hero" data-slug="${post.slug}">
      <div class="hero-label">
        <div class="hero-label-text">${post.title_jp || ''}</div>
        <div class="hero-label-num">${post.issue ? 'No.' + post.issue : ''}</div>
      </div>
      <div class="hero-center">
        <div class="hero-bg-kanji">${post.kanji_bg || '酒'}</div>
        <div class="hero-eyebrow">
          <div class="hero-issue">${post.issue ? 'Issue ' + post.issue : ''}</div>
          <div class="hero-rule"></div>
          <div class="hero-category">${firstTag(post)}</div>
        </div>
        <h1 class="hero-title-jp">${post.title_jp || ''}</h1>
        <p class="hero-title-en">${post.title_en || post.subtitle || ''}</p>
        <p class="hero-excerpt">${post.subtitle || post.excerpt || ''}</p>
        <a href="post.html?slug=${post.slug}" class="hero-read-more">
          Read Essay &nbsp;→
        </a>
      </div>
      <div class="hero-image-panel">
        ${imgHtml}
        <div class="hero-image-overlay">
          <div class="hero-brewery">${post.brewery || ''}</div>
          <div class="hero-date">${post.prefecture || ''} ${post.prefecture && post.date ? '·' : ''} ${formatDate(post.date)}</div>
        </div>
      </div>
    </section>`;
  }

  // ── INDEX ROW — editorial list item
  function indexRow(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}" loading="lazy">`
      : `<div class="img-placeholder" style="height:200px;">${post.kanji_bg || '酒'}</div>`;

    return `
    <a href="post.html?slug=${post.slug}" class="index-row">
      <div class="index-row-num">
        <div class="row-issue">${post.issue ? 'No.' + post.issue : ''}</div>
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
        <div class="row-image">${imgHtml}</div>
      </div>
    </a>`;
  }

  // ── TASTING NOTE CARD — grid card
  function tastingCard(post) {
    return `
    <a href="post.html?slug=${post.slug}" class="tasting-card">
      <div class="tasting-card-bg">${post.kanji_bg || '酒'}</div>
      <div class="tasting-num">${post.note_num || ''}</div>
      <div class="tasting-sake-name">${post.sake_name_jp || post.title_jp || ''}</div>
      <div class="tasting-sake-en">${post.sake_name_en || post.title_en || ''}</div>
      <p class="tasting-notes-text">${post.tasting_notes || ''}</p>
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

  // ── POST PAGE: Hero full article
  function heroPost(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}" loading="lazy">`
      : `<div class="hero-img-placeholder">${post.kanji_bg || '酒'}</div>`;

    const bodyHtml = (post.body || '')
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    return `
    <section class="post-hero">
      <div class="hero-label">
        <div class="hero-label-text">${post.title_jp || ''}</div>
        <div class="hero-label-num">${post.issue ? 'No.' + post.issue : ''}</div>
      </div>
      <div class="hero-center">
        <div class="hero-bg-kanji">${post.kanji_bg || '酒'}</div>
        <div class="hero-eyebrow">
          <div class="hero-issue">${post.issue ? 'Issue ' + post.issue : ''}</div>
          <div class="hero-rule"></div>
          <div class="hero-category">${firstTag(post)}</div>
        </div>
        <h1 class="hero-title-jp">${post.title_jp || ''}</h1>
        <p class="hero-title-en">${post.title_en || post.subtitle || ''}</p>
        <p class="hero-excerpt">${post.subtitle || ''}</p>
      </div>
      <div class="hero-image-panel">
        ${imgHtml}
        <div class="hero-image-overlay">
          <div class="hero-brewery">${post.brewery || ''}</div>
          <div class="hero-date">${post.prefecture || ''} ${post.prefecture && post.date ? '·' : ''} ${formatDate(post.date)}</div>
        </div>
      </div>
    </section>
    <div class="post-body-wrap">
      ${bodyHtml}
    </div>`;
  }

  // ── POST PAGE: Editorial / index row full article
  function indexRowPost(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img src="${src}" alt="${post.title_jp || ''}" style="width:100%;max-height:500px;object-fit:cover;border-bottom:var(--border);margin-bottom:2rem;" loading="lazy">`
      : '';

    const bodyHtml = (post.body || '')
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    return `
    <div style="border-bottom:var(--border);padding:3rem 2rem;background:var(--paper-2);">
      <div class="row-category" style="margin-bottom:0.75rem;">${firstTag(post)}</div>
      <h1 class="hero-title-jp" style="font-size:clamp(1.8rem,4vw,3rem);margin-bottom:0.5rem;">${post.title_jp || ''}</h1>
      <p class="hero-title-en" style="font-size:1.2rem;margin-bottom:1.5rem;">${post.title_en || post.subtitle || ''}</p>
      <div class="row-meta-bottom">
        <span>${post.prefecture || ''}</span>
        <span>${post.brewery || ''}</span>
        <span>${formatDate(post.date)}</span>
      </div>
    </div>
    ${imgHtml}
    <div class="post-body-wrap">
      ${bodyHtml}
    </div>`;
  }

  // ── POST PAGE: Tasting Note expanded
  function tastingNotePost(post) {
    const src = imgSrc(post);
    const imgHtml = src
      ? `<img class="note-full-image" src="${src}" alt="${post.sake_name_jp || post.title_jp || ''}" loading="lazy">`
      : '';

    return `
    ${imgHtml}
    <div class="note-full">
      <div class="tasting-num">${post.note_num || ''}</div>
      <div class="tasting-sake-name" style="font-family:var(--font-jp);font-size:3rem;font-weight:700;margin-bottom:0.5rem;">${post.sake_name_jp || post.title_jp || ''}</div>
      <div class="tasting-sake-en" style="font-size:1.3rem;font-style:italic;color:var(--ink-muted);margin-bottom:2rem;">${post.sake_name_en || post.title_en || ''}</div>
      <p class="tasting-notes-text" style="font-size:1.15rem;line-height:1.85;max-width:600px;margin-bottom:2rem;">${post.tasting_notes || ''}</p>
      <div class="flavor-chart-wrap" style="max-width:400px;margin-bottom:2rem;">
        <div class="flavor-label">Sweetness</div>
        <div class="flavor-bar" style="height:5px;"><div class="flavor-fill" style="width:${post.sweetness || 0}%"></div></div>
        <div class="flavor-label">Acidity</div>
        <div class="flavor-bar" style="height:5px;"><div class="flavor-fill" style="width:${post.acidity || 0}%"></div></div>
        <div class="flavor-label">Umami</div>
        <div class="flavor-bar" style="height:5px;"><div class="flavor-fill" style="width:${post.umami || 0}%"></div></div>
        <div class="flavor-label">Finish</div>
        <div class="flavor-bar" style="height:5px;"><div class="flavor-fill" style="width:${post.finish || 0}%"></div></div>
      </div>
      <div class="tasting-data" style="max-width:400px;border-top:var(--border);padding-top:1.5rem;">
        <div class="tasting-data-row"><span class="tasting-data-label">Prefecture</span><span class="tasting-data-value">${post.prefecture || '—'}</span></div>
        <div class="tasting-data-row"><span class="tasting-data-label">Brewery</span><span class="tasting-data-value">${post.brewery || '—'}</span></div>
        <div class="tasting-data-row"><span class="tasting-data-label">Classification</span><span class="tasting-data-value">${post.classification || '—'}</span></div>
        <div class="tasting-data-row"><span class="tasting-data-label">Seimaibuai</span><span class="tasting-data-value">${post.seimaibuai || '—'}</span></div>
        ${post.nihonshu_do ? `<div class="tasting-data-row"><span class="tasting-data-label">SMV (日本酒度)</span><span class="tasting-data-value">${post.nihonshu_do}</span></div>` : ''}
        ${post.alcohol ? `<div class="tasting-data-row"><span class="tasting-data-label">Alcohol</span><span class="tasting-data-value">${post.alcohol}%</span></div>` : ''}
        ${post.rice_variety ? `<div class="tasting-data-row"><span class="tasting-data-label">Rice</span><span class="tasting-data-value">${post.rice_variety}</span></div>` : ''}
        ${post.yeast ? `<div class="tasting-data-row"><span class="tasting-data-label">Yeast</span><span class="tasting-data-value">${post.yeast}</span></div>` : ''}
        ${post.pairing ? `<div class="tasting-data-row"><span class="tasting-data-label">Pairing</span><span class="tasting-data-value">${post.pairing}</span></div>` : ''}
        <div class="tasting-data-row"><span class="tasting-data-label">Tasted</span><span class="tasting-data-value">${formatDate(post.date)}</span></div>
      </div>
    </div>`;
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
    switch (post.type) {
      case 'hero':         return heroPost(post);
      case 'index':        return indexRowPost(post);
      case 'index_row':    return indexRowPost(post);
      case 'note':         return tastingNotePost(post);
      case 'tasting_note': return tastingNotePost(post);
      default: return `<div class="error-state">Unknown post type: "${post.type}"</div>`;
    }
  }

  return { renderCard, renderPostPage, heroIndex, indexRow, tastingCard, formatDate };
})();
