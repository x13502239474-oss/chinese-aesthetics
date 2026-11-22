/* ===========================================================
   中国美学思想史 · 数字书院 前端应用
   纯静态 / 数据来自 data/*.json / 用户数据存 localStorage
   =========================================================== */
'use strict';

const DATA = { courses:null, concepts:[], thinkers:[], timeline:[], texts:[], artworks:[] };
const LS = {
  fav:'meixue_fav',        // 收藏的课程/文献/概念 id
  bm:'meixue_bm',           // 书签 {id, title, hash, time}
  progress:'meixue_prog',   // 阅读位置 {lessonId:{scroll,time,read}}
  note:'meixue_note'        // 个人笔记
};

function get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def; }catch(e){ return def; } }
function set(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function toggleFav(id){ const a=get(LS.fav,[]); const i=a.indexOf(id); i>=0?a.splice(i,1):a.push(id); set(LS.fav,a); return i<0; }
function isFav(id){ return get(LS.fav,[]).includes(id); }

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// 全部课程扁平化
function allLessons(){
  if(!DATA.courses) return [];
  return DATA.courses.modules.flatMap(m=>m.lessons.map(l=>({...l, module:{id:m.id,title:m.title,no:m.no,era:m.era}})));
}
function findLesson(id){ return allLessons().find(l=>l.id===id); }
function findConcept(name){ return DATA.concepts.find(c=>c.name===name); }

// 路由：#/home  #/module/M01  #/lesson/M01-L01  #/concept  #/thinker  #/timeline  #/texts #/gallery #/search #/fav
function parseHash(){
  const h = location.hash.replace(/^#\/?/,'') || 'home';
  const [p1,p2] = h.split('/');
  return {page:p1, param:p2};
}

async function init(){
  try{
    const [c,co,t,tl,tx,ar] = await Promise.all([
      fetch('data/courses.json').then(r=>r.json()),
      fetch('data/concepts.json').then(r=>r.json()),
      fetch('data/thinkers.json').then(r=>r.json()),
      fetch('data/timeline.json').then(r=>r.json()),
      fetch('data/texts.json').then(r=>r.json()),
      fetch('data/artworks_raw.json').then(r=>r.json()),
    ]);
    DATA.courses=c; DATA.concepts=co; DATA.thinkers=t; DATA.timeline=tl; DATA.texts=tx; DATA.artworks=ar;
  }catch(e){
    document.getElementById('app').innerHTML='<div class="empty">资料加载失败，请通过本地服务器打开（详见说明）。<br>'+esc(e.message)+'</div>';
    return;
  }
  window.addEventListener('hashchange', render);
  render();
}

function render(){
  const {page,param} = parseHash();
  $$('.nav-links a').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  const app = $('#app');
  window.scrollTo(0,0);
  stopProgress();
  switch(page){
    case 'home': app.innerHTML = viewHome(); break;
    case 'module': app.innerHTML = viewModule(param); break;
    case 'lesson': app.innerHTML = viewLesson(param); afterLesson(param); break;
    case 'concept': app.innerHTML = viewConcepts(param); break;
    case 'thinker': app.innerHTML = viewThinkers(); break;
    case 'timeline': app.innerHTML = viewTimeline(); break;
    case 'texts': app.innerHTML = param ? viewTextDetail(param) : viewTexts(); break;
    case 'gallery': app.innerHTML = viewGallery(); break;
    case 'search': app.innerHTML = viewSearch(); bindSearch(); break;
    case 'fav': app.innerHTML = viewFav(); break;
    case 'about': app.innerHTML = viewAbout(); break;
    default: app.innerHTML = viewHome();
  }
  bindGlobal();
}

/* ---------------- 首页 ---------------- */
function viewHome(){
  const mods = DATA.courses.modules;
  const readyCount = allLessons().filter(l=>l.status==='ready').length;
  return `
  <section class="hero">
    <div class="hero-seal">美</div>
    <h1>${esc(DATA.courses.site.name)}</h1>
    <p class="tagline">${esc(DATA.courses.site.subtitle)}</p>
    <div class="hero-ornament"></div>
    <p class="note">${esc(DATA.courses.site.note)}</p>
  </section>

  <div class="notice">
    <b>About this digital academy｜</b>这里没有测验、打卡与积分。你可以顺着思想史的脉络长期阅读，用收藏、书签和自动保存的阅读位置，把书读到自己心里去。
  </div>

  <div class="sec-title"><span class="num">壹</span><h2>课程模块</h2><div class="line"></div><span class="more">共 ${mods.length} 模块 · ${allLessons().length} 课 · 正文 ${readyCount} 课</span></div>
  <div class="module-grid">
    ${mods.map(m=>`
      <a class="module-card" href="#/module/${m.id}">
        <div class="m-top"><span class="m-no">MODULE ${String(m.no).padStart(2,'0')}</span><span class="m-era">${esc(m.era)}</span></div>
        <h3>${esc(m.title)}</h3>
        <p class="m-sum">${esc(m.summary)}</p>
        <div class="m-foot"><span>${m.lessons.length} 课</span><span class="${m.lessons.every(l=>l.status==='ready')?'ready':''}">${m.lessons.every(l=>l.status==='ready')?'● 正文齐备':'部分待续'}</span></div>
      </a>`).join('')}
  </div>

  <div class="sec-title"><span class="num">贰</span><h2>中国美学发展时间轴</h2><div class="line"></div><a class="more" href="#/timeline">全览 →</a></div>
  <div class="timeline">
    ${DATA.timeline.slice(0,7).map(t=>`
      <div class="tl-item">
        <div class="tl-head"><span class="tl-period">${esc(t.period)}</span><span class="tl-years">${esc(t.years)}</span></div>
        <div class="tl-body"><b>思想：</b>${esc(t.thought)}<br><b>艺术：</b>${esc(t.art)}</div>
      </div>`).join('')}
  </div>

  <div class="sec-title"><span class="num">叁</span><h2>历代重要美学人物</h2><div class="line"></div><a class="more" href="#/thinker">索引 →</a></div>
  <div class="person-grid">
    ${DATA.thinkers.slice(0,10).map(t=>`
      <a class="person-card" href="#/lesson/${t.lesson}">
        <div class="p-name">${esc(t.name)}</div>
        <div class="p-meta">${esc(t.era)} · ${esc(t.school)}</div>
        <div class="p-claim">${esc(t.claim)}</div>
      </a>`).join('')}
  </div>

  <div class="sec-title"><span class="num">肆</span><h2>核心美学范畴</h2><div class="line"></div><a class="more" href="#/concept">词典 →</a></div>
  <div class="concept-cloud">
    ${DATA.concepts.map(c=>`
      <a class="concept-tag" href="#/lesson/${c.lesson}">${esc(c.name)}<span class="c-group">${esc(c.group)}</span></a>`).join('')}
  </div>

  <div class="sec-title"><span class="num">伍</span><h2>经典文献阅读区</h2><div class="line"></div><a class="more" href="#/texts">进入 →</a></div>
  <div class="module-grid">
    ${DATA.texts.slice(0,4).map(t=>`
      <a class="module-card" href="#/texts/${t.id}">
        <div class="m-top"><span class="m-no">第 ${t.order} 部</span><span class="m-era">${esc(t.era)}</span></div>
        <h3>${esc(t.name)}</h3>
        <p class="m-sum">${esc(t.core.slice(0,70))}…</p>
      </a>`).join('')}
  </div>
  `;
}

/* ---------------- 模块页 ---------------- */
function viewModule(id){
  const m = DATA.courses.modules.find(x=>x.id===id);
  if(!m) return notFound();
  return `
  <div class="page-head">
    <div class="eyebrow">MODULE ${String(m.no).padStart(2,'0')} · ${esc(m.era)}</div>
    <h1>${esc(m.title)}</h1>
    <p class="sub">${esc(m.summary)}</p>
  </div>
  <div class="sec-title"><span class="num">目录</span><h2>本课模块课程</h2><div class="line"></div><span class="more">${m.lessons.length} 课</span></div>
  ${m.lessons.map((l,i)=>`
    <div class="list-item" onclick="location.hash='#/lesson/${l.id}'">
      <span class="li-no">${String(i+1).padStart(2,'0')}</span>
      <div class="li-main">
        <div class="li-title">${esc(l.title)}</div>
        <div class="li-sum">${esc(l.summary)}</div>
        <div class="li-sum" style="color:var(--bronze)">依据：${l.sources.map(esc).join(' · ')}</div>
      </div>
      <span class="li-badge ${l.status==='ready'?'':'plan'}">${l.status==='ready'?'正文':'待续'}</span>
      <span class="li-arrow">›</span>
    </div>`).join('')}
  <div class="lesson-nav"><a href="#/home"><div class="nav-dir">← 返回</div><div class="nav-title">书院首页</div></a></div>
  `;
}

/* ---------------- 课程正文 ---------------- */
function viewLesson(id){
  const l = findLesson(id);
  if(!l) return notFound();
  // 正文文件存在与否
  const body = LESSON_BODIES[id] || `<div class="notice"><b>样章撰写中｜</b>《${esc(l.title)}》完整正文正在编写。本页已呈现课程定位与依据书目，正文将于样章阶段补齐。</div>
    <div class="article"><h2>本课定位</h2><p>${esc(l.summary)}</p><h2>依据文献</h2><p>${l.sources.map(esc).join('；')}。</p></div>`;
  const idx = allLessons().findIndex(x=>x.id===id);
  const all = allLessons();
  const prev = all[idx-1], next = all[idx+1];
  return `
  <div class="read-progress" id="readBar"></div>
  <div class="lesson-layout">
    <aside class="toc-side">
      <div class="toc-title">本课目录</div>
      <div id="tocLinks"></div>
      <div class="toc-title" style="margin-top:18px">模块导航</div>
      <a href="#/module/${l.module.id}">← ${esc(l.module.title)}</a>
    </aside>
    <article>
      <div class="lesson-head">
        <div class="crumb"><a href="#/home">书院</a> / <a href="#/module/${l.module.id}">${esc(l.module.title)}</a> / 第 ${l.no} 课</div>
        <h1>${esc(l.title)}</h1>
        <div class="sources"><b>依据：</b>${l.sources.map(esc).join(' · ')}</div>
      </div>
      <div class="lesson-actions">
        <button class="action-btn ${isFav(id)?'on':''}" data-act="fav" data-id="${id}">${isFav(id)?'★ 已收藏':'☆ 收藏本课'}</button>
        <button class="action-btn" data-act="bm" data-id="${id}">🔖 加书签</button>
        <span class="action-btn" id="readStatus">📖 阅读位置自动保存</span>
      </div>
      <div class="article" id="article">${body}</div>
      <div class="lesson-nav">
        ${prev?`<a href="#/lesson/${prev.id}"><div class="nav-dir">← 上一课</div><div class="nav-title">${esc(prev.title)}</div></a>`:'<div></div>'}
        ${next?`<a class="next" href="#/lesson/${next.id}"><div class="nav-dir">下一课 →</div><div class="nav-title">${esc(next.title)}</div></a>`:'<div></div>'}
      </div>
    </article>
  </div>
  `;
}

function afterLesson(id){
  // 生成目录
  const heads = $$('#article h2');
  $('#tocLinks').innerHTML = heads.map((h,i)=>`<a href="#h2-${i}">${esc(h.textContent)}</a>`).join('') || '<a href="#">（暂无小标题）</a>';
  heads.forEach((h,i)=>h.id='h2-'+i);
  // 恢复阅读位置
  const p = get(LS.progress,{})[id];
  if(p && p.scroll>0){ setTimeout(()=>window.scrollTo(0,p.scroll),80); }
  // 滚动保存 + 进度条
  const bar=$('#readBar');
  let timer;
  window.addEventListener('scroll',()=>{
    const h=document.documentElement;
    const pct=(h.scrollTop/(h.scrollHeight-h.clientHeight||1))*100;
    if(bar) bar.style.width=pct+'%';
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const all=get(LS.progress,{});
      all[id]={scroll:h.scrollTop,time:Date.now()};
      set(LS.progress,all);
      const st=$('#readStatus');
      if(st) st.textContent='📖 阅读位置已保存 ' + new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    },400);
  });
  // 灯箱
  bindLightbox();
}

/* ---------------- 概念词典 ---------------- */
function viewConcepts(name){
  if(name){
    const c = DATA.concepts.find(x=>x.id===name || x.name===decodeURIComponent(name));
    if(c) return conceptDetail(c);
  }
  const groups = [...new Set(DATA.concepts.map(c=>c.group))];
  return `
  <div class="page-head"><div class="eyebrow">DICTIONARY</div><h1>美学概念词典</h1><p class="sub">十八个核心范畴 · 每个概念六维解析 · 与专题课程互为入口</p></div>
  ${groups.map(g=>`
    <div class="sec-title"><span class="num">◆</span><h2>${esc(g)}</h2><div class="line"></div></div>
    <div class="concept-cloud">
      ${DATA.concepts.filter(c=>c.group===g).map(c=>`
        <a class="concept-tag" href="#/concept/${c.id}">${esc(c.name)}</a>`).join('')}
    </div>`).join('')}
  `;
}
function conceptDetail(c){
  const faved=isFav('concept-'+c.id);
  return `
  <div class="page-head"><div class="eyebrow">概念词典 · ${esc(c.group)}</div><h1>${esc(c.name)}</h1><p class="sub">${esc(c.brief)}</p></div>
  <div class="lesson-actions">
    <button class="action-btn ${faved?'on':''}" data-act="fav" data-id="concept-${c.id}">${faved?'★ 已收藏':'☆ 收藏'}</button>
    <a class="action-btn" href="#/lesson/${c.lesson}">阅读专题课 →</a>
  </div>
  <div class="article">
    <h2>概念源流</h2><p>${esc(c.origin)}</p>
    <h2>关键词</h2><p>${c.keys.map(k=>`<span class="chip">${esc(k)}</span>`).join(' ')}</p>
    <h2>相关概念</h2><p>${c.related.map(r=>{const rc=findConcept(r);return rc?`<a class="chip click" href="#/concept/${rc.id}">${esc(r)}</a>`:`<span class="chip">${esc(r)}</span>`}).join(' ')}</p>
  </div>
  <div class="notice">完整的「历史演变、代表思想家、各艺术门类中的体现、区别联系、艺术案例」六维解析，见<a href="#/lesson/${c.lesson}">专题课《${esc(c.name)}》</a>。</div>
  <div class="lesson-nav"><a href="#/concept"><div class="nav-dir">← 返回</div><div class="nav-title">概念词典</div></a></div>
  `;
}

/* ---------------- 思想家索引 ---------------- */
function viewThinkers(){
  return `
  <div class="page-head"><div class="eyebrow">INDEX</div><h1>历代思想家索引</h1><p class="sub">${DATA.thinkers.length} 位 · 附时代、主张、代表文本与课程入口</p></div>
  ${DATA.thinkers.map(t=>`
    <div class="list-item" onclick="location.hash='#/lesson/${t.lesson}'">
      <span class="li-no">${esc(t.era)}</span>
      <div class="li-main">
        <div class="li-title">${esc(t.name)} <span class="chip">${esc(t.school)}</span></div>
        <div class="li-sum">${esc(t.claim)}</div>
        <div class="li-sum" style="color:var(--bronze)">${t.works.map(esc).join(' · ')}</div>
      </div>
      <span class="li-arrow">›</span>
    </div>`).join('')}
  `;
}

/* ---------------- 时间轴 ---------------- */
function viewTimeline(){
  return `
  <div class="page-head"><div class="eyebrow">TIMELINE</div><h1>中国美学发展时间轴</h1><p class="sub">从远古图腾到近代转型 · 思想与艺术并置</p></div>
  <div class="timeline">
    ${DATA.timeline.map(t=>`
      <div class="tl-item">
        <div class="tl-head"><span class="tl-period">${esc(t.period)}</span><span class="tl-years">${esc(t.years)}</span></div>
        <div class="tl-body"><b>思想：</b>${esc(t.thought)}<br><b>艺术：</b>${esc(t.art)}<br><b>依据：</b><span style="color:var(--bronze)">${t.refs.map(esc).join(' · ')}</span></div>
        <div class="tl-figures">${t.figures.map(f=>{
          const th=DATA.thinkers.find(x=>x.name===f);
          return th?`<a class="chip click" href="#/lesson/${th.lesson}">${esc(f)}</a>`:`<span class="chip">${esc(f)}</span>`;
        }).join('')} <a class="chip click" href="#/lesson/${t.lesson}">进入课程 →</a></div>
      </div>`).join('')}
  </div>
  `;
}

/* ---------------- 经典文献 ---------------- */
function viewTexts(){
  return `
  <div class="page-head"><div class="eyebrow">CLASSICS</div><h1>经典文献阅读区</h1><p class="sub">${DATA.texts.length} 部经典 · 原文 / 今译 / 分析 / 影响 · 区分古今与学者解释</p></div>
  ${DATA.texts.slice().sort((a,b)=>a.order-b.order).map(t=>`
    <div class="list-item" onclick="location.hash='#/texts/${t.id}'">
      <span class="li-no">${String(t.order).padStart(2,'0')}</span>
      <div class="li-main">
        <div class="li-title">${esc(t.name)}</div>
        <div class="li-sum">${esc(t.author)} · ${esc(t.era)}　|　${esc(t.core.slice(0,60))}…</div>
      </div>
      <span class="li-arrow">›</span>
    </div>`).join('')}
  `;
}
function viewTextDetail(id){
  const t = DATA.texts.find(x=>x.id===id);
  if(!t) return notFound();
  const faved=isFav('text-'+t.id);
  return `
  <div class="page-head"><div class="eyebrow">经典第 ${t.order} 部 · ${esc(t.era)}</div><h1>${esc(t.name)}</h1><p class="sub">${esc(t.author)}</p></div>
  <div class="lesson-actions">
    <button class="action-btn ${faved?'on':''}" data-act="fav" data-id="text-${t.id}">${faved?'★ 已收藏':'☆ 收藏'}</button>
    <button class="action-btn" data-act="bm" data-id="text-${t.id}">🔖 加书签</button>
    <a class="action-btn" href="#/lesson/${t.lesson}">相关课程 →</a>
  </div>
  <div class="article">
    <h2>作者与时代背景</h2><p>${esc(t.author)}，${esc(t.era)}。${esc(t.background)}</p>
    <h2>核心思想</h2><p>${esc(t.core)}</p>
    <h2>重要美学概念</h2><p>${t.concepts.map(k=>`<span class="chip">${esc(k)}</span>`).join(' ')}</p>
    <h2>经典原文节选与解读</h2>
    <div class="classic-quote">
      <span class="lbl">原 文</span>
      <div class="orig">${esc(t.excerpt)}</div>
      <div class="src">— ${esc(t.name)}</div>
    </div>
    <div class="modern-trans"><span class="lbl">现代汉语解释</span>${esc(t.translation)}</div>
    <div class="scholar-note"><span class="lbl">思想分析</span>${esc(t.analysis)}</div>
    <h2>对中国美学史的影响</h2><p>${esc(t.influence)}</p>
    <h2>推荐阅读顺序</h2><p>本书列为阅读顺序第 <b>${t.order}</b> 部。建议先读《论语》《老子》《庄子》《周易》建立源头坐标，再进入魏晋文论，最后读宋明清诸家。</p>
  </div>
  <div class="notice"><b>文字分层说明｜</b>上方「原文」为古代文献；「现代汉语解释」与「思想分析」为本网站依据通行说法所作归纳，并非古籍原文，请对照权威版本研读。</div>
  <div class="lesson-nav"><a href="#/texts"><div class="nav-dir">← 返回</div><div class="nav-title">经典文献区</div></a></div>
  `;
}

/* ---------------- 作品图鉴 ---------------- */
function viewGallery(){
  return `
  <div class="page-head"><div class="eyebrow">GALLERY</div><h1>中国传统艺术作品图鉴</h1><p class="sub">图片取自你提供的三本参考书原书插图 · 点击放大 · 共 ${DATA.artworks.length} 幅</p></div>
  <div class="notice">图鉴图片来自《美学散步》《美的历程》原书插图，仅作个人学习研究之用，版权归原书作者与出版社所有。</div>
  <div class="gallery">
    ${DATA.artworks.map((a,i)=>`
      <div class="gallery-item" data-src="${esc(a.file)}" data-cap="${esc(a.caption||a.chapter||'（原书插图）')}　【${esc(a.source)}】">
        <img loading="lazy" src="${esc(a.file)}" alt="${esc(a.caption||'原书插图')}">
        <div class="gi-cap">${esc((a.caption||a.chapter||'原书插图').slice(0,42))}<div class="gi-src">${esc(a.source)}</div></div>
      </div>`).join('')}
  </div>
  `;
}

/* ---------------- 搜索 ---------------- */
function viewSearch(){
  return `
  <div class="page-head"><div class="eyebrow">SEARCH</div><h1>全站搜索</h1><p class="sub">检索课程、概念、人物、经典与图鉴</p></div>
  <div class="search-box"><input id="searchInput" type="search" placeholder="输入关键词，如「意境」「气韵」「苏轼」…" autocomplete="off"></div>
  <div id="searchResults"><div class="empty"><div class="e-seal">檢</div>请输入关键词开始检索</div></div>
  `;
}
function buildIndex(){
  const idx=[];
  allLessons().forEach(l=>idx.push({type:'课程',title:l.title,desc:l.summary,hash:'#/lesson/'+l.id}));
  DATA.concepts.forEach(c=>idx.push({type:'概念',title:c.name,desc:c.brief,hash:'#/concept/'+c.id}));
  DATA.thinkers.forEach(t=>idx.push({type:'人物',title:t.name,desc:t.claim+' '+t.era+' '+t.school,hash:'#/lesson/'+t.lesson}));
  DATA.texts.forEach(t=>idx.push({type:'经典',title:t.name,desc:t.core,hash:'#/texts/'+t.id}));
  DATA.timeline.forEach(t=>idx.push({type:'时间轴',title:t.period+' '+t.years,desc:t.thought+' '+t.art,hash:'#/lesson/'+t.lesson}));
  return idx;
}
let SEARCH_IDX=null;
function bindSearch(){
  SEARCH_IDX = SEARCH_IDX || buildIndex();
  const inp=$('#searchInput'), res=$('#searchResults');
  inp.focus();
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    if(!q){ res.innerHTML='<div class="empty"><div class="e-seal">檢</div>请输入关键词开始检索</div>'; return; }
    const hits=SEARCH_IDX.filter(x=>(x.title+x.desc).toLowerCase().includes(q)).slice(0,40);
    res.innerHTML = hits.length ? hits.map(h=>`
      <div class="list-item" onclick="location.hash='${h.hash}'">
        <span class="li-no">${esc(h.type)}</span>
        <div class="li-main"><div class="li-title">${hl(h.title,q)}</div><div class="li-sum">${hl(h.desc.slice(0,90),q)}</div></div>
        <span class="li-arrow">›</span>
      </div>`).join('') : `<div class="empty"><div class="e-seal">無</div>未找到「${esc(q)}」相关内容</div>`;
  });
}
function hl(text,q){
  const t=esc(text);
  try{ return t.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<span class="search-result-mark">$1</span>'); }
  catch(e){ return t; }
}

/* ---------------- 收藏夹 ---------------- */
function viewFav(){
  const favs=get(LS.fav,[]), bms=get(LS.bm,[]), prog=get(LS.progress,{});
  const lessons=allLessons();
  const favItems=favs.map(id=>{
    let title='',hash='';
    const l=lessons.find(x=>x.id===id); if(l){title=l.title;hash='#/lesson/'+id;}
    const c=DATA.concepts.find(x=>'concept-'+x.id===id); if(c){title='概念：'+c.name;hash='#/concept/'+c.id;}
    const t=DATA.texts.find(x=>'text-'+x.id===id); if(t){title='经典：'+t.name;hash='#/texts/'+t.id;}
    return title?{title,hash}:null;
  }).filter(Boolean);
  const readList=Object.entries(prog).map(([id,p])=>{
    const l=lessons.find(x=>x.id===id);
    return l?{title:l.title,hash:'#/lesson/'+id,time:p.time}:null;
  }).filter(Boolean).sort((a,b)=>b.time-a.time);
  return `
  <div class="page-head"><div class="eyebrow">LIBRARY</div><h1>我的书架</h1><p class="sub">收藏、书签与阅读记录 · 全部保存在你的浏览器本地，不会上传</p></div>
  <div class="sec-title"><span class="num">★</span><h2>收藏（${favItems.length}）</h2><div class="line"></div></div>
  ${favItems.length?favItems.map(f=>listRow(f)).join(''):'<div class="empty"><div class="e-seal">☆</div>还没有收藏，去课程里点「收藏」吧</div>'}
  <div class="sec-title"><span class="num">🔖</span><h2>书签（${bms.length}）</h2><div class="line"></div></div>
  ${bms.length?bms.map(b=>listRow({title:b.title,hash:b.hash,extra:new Date(b.time).toLocaleString('zh-CN')})).join(''):'<div class="empty"><div class="e-seal">🔖</div>还没有书签</div>'}
  <div class="sec-title"><span class="num">📖</span><h2>阅读过的课程（${readList.length}）</h2><div class="line"></div></div>
  ${readList.length?readList.map(r=>listRow({title:r.title,hash:r.hash,extra:new Date(r.time).toLocaleString('zh-CN')})).join(''):'<div class="empty"><div class="e-seal">📖</div>还没有阅读记录</div>'}
  `;
}
function listRow(f){
  return `<div class="list-item" onclick="location.hash='${f.hash}'">
    <div class="li-main"><div class="li-title">${esc(f.title)}</div>${f.extra?`<div class="li-sum">${esc(f.extra)}</div>`:''}</div>
    <span class="li-arrow">›</span></div>`;
}

/* ---------------- 关于 ---------------- */
function viewAbout(){
  return `
  <div class="page-head"><div class="eyebrow">ABOUT</div><h1>关于这座数字书院</h1></div>
  <div class="article">
    <h2>宗旨</h2>
    <p>这里是一套以中国美学思想史为主线的系统课程，结合中国哲学、文学、绘画、书法、园林、建筑、音乐与工艺美术，目标是建立完整的中国美学知识体系，而非零星的传统文化介绍。</p>
    <h2>理论依据</h2>
    <p>叶朗《中国美学史大纲》提供思想史骨架；李泽厚《美的历程》补充各时代的审美心理与艺术风格；宗白华《美学散步》深化意境、空间与生命意识。三书互补而非重复。</p>
    <h2>阅读约定</h2>
    <p>古籍原文、现代汉语解释、网站归纳三者严格区分并作标记。原文注明出处与版本，不虚构章节与引文，不大段照抄。</p>
    <h2>关于功能</h2>
    <p>本站不设习题、测验、打卡、积分、排行榜与学习计划。收藏、书签、阅读位置保存在你的浏览器本地（localStorage），清除浏览器数据会一并清除。</p>
    <h2>图片版权</h2>
    <p>图鉴图片取自用户提供的三本参考书的原书插图，仅供个人学习研究使用。</p>
  </div>
  `;
}

function notFound(){ return '<div class="empty"><div class="e-seal">闕</div>内容不存在或尚未加载</div>'; }

/* ---------------- 全局事件 ---------------- */
function bindGlobal(){
  // 菜单
  const menuBtn=$('#menuBtn'), nav=$('#navLinks');
  if(menuBtn&&nav) menuBtn.onclick=()=>nav.classList.toggle('open');
  // 搜索入口
  const sb=$('#searchBtn'); if(sb) sb.onclick=()=>location.hash='#/search';
  const fb=$('#favBtn'); if(fb) fb.onclick=()=>location.hash='#/fav';
  // 收藏/书签按钮
  $$('[data-act]').forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.act==='bm' ? null : btn.dataset.id;
      if(btn.dataset.act==='fav'){
        const on=toggleFav(id);
        btn.classList.toggle('on',on);
        btn.textContent=on?'★ 已收藏':'☆ 收藏'+(id.startsWith('concept-')?'':'本课');
        updateBadges();
      }else if(btn.dataset.act==='bm'){
        const l=findLesson(btn.dataset.id)||DATA.texts.find(x=>'text-'+x.id===btn.dataset.id);
        const title=l?(l.title||l.name):btn.dataset.id;
        const bms=get(LS.bm,[]);
        bms.push({id:btn.dataset.id,title,hash:location.hash,time:Date.now()});
        set(LS.bm,bms);
        btn.textContent='✓ 已加书签';
        setTimeout(()=>btn.textContent='🔖 加书签',1500);
        updateBadges();
      }
    };
  });
  // 灯箱卡片
  $$('.gallery-item').forEach(it=>{
    it.onclick=()=>openLightbox(it.dataset.src,it.dataset.cap);
  });
  updateBadges();
}

function updateBadges(){
  const f=get(LS.fav,[]).length, b=get(LS.bm,[]).length;
  const fb=$('#favBadge'); if(fb){ fb.textContent=f+b; fb.style.display=(f+b)?'grid':'none'; }
}

/* 灯箱 */
function openLightbox(src,cap){
  let lb=$('#lightbox');
  if(!lb){
    lb=document.createElement('div'); lb.id='lightbox'; lb.className='lightbox';
    lb.innerHTML='<button class="lb-close">×</button><img><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    lb.querySelector('.lb-close').onclick=()=>lb.classList.remove('show');
    lb.onclick=e=>{ if(e.target===lb) lb.classList.remove('show'); };
  }
  lb.querySelector('img').src=src;
  lb.querySelector('.lb-cap').textContent=cap||'';
  lb.classList.add('show');
}
function bindLightbox(){
  $$('#article img').forEach(img=>{
    img.style.cursor='zoom-in';
    img.onclick=()=>openLightbox(img.src,img.closest('.fig')?.querySelector('figcaption')?.textContent||'');
  });
}
function stopProgress(){ /* 进度监听随 innerHTML 重建失效，此处占位 */ }

/* ---------------- 课程正文数据 ---------------- */
/* 样章正文在此注入，key 为课程 id */
const LESSON_BODIES = (window.LESSON_BODIES || {});

document.addEventListener('DOMContentLoaded', ()=>{
  // 顶栏
  document.body.insertAdjacentHTML('afterbegin',`
    <div class="topbar"><div class="topbar-inner">
      <a class="brand" href="#/home"><span class="brand-seal">美</span><span class="brand-text">中国美学思想史<small>数字书院</small></span></a>
      <nav class="nav-links" id="navLinks">
        <a href="#/home" data-page="home">首页</a>
        <a href="#/concept" data-page="concept">概念词典</a>
        <a href="#/thinker" data-page="thinker">思想家</a>
        <a href="#/timeline" data-page="timeline">时间轴</a>
        <a href="#/texts" data-page="texts">经典文献</a>
        <a href="#/gallery" data-page="gallery">作品图鉴</a>
        <a href="#/about" data-page="about">关于</a>
      </nav>
      <div class="nav-tools">
        <button class="icon-btn" id="searchBtn" title="全站搜索">🔍</button>
        <button class="icon-btn" id="favBtn" title="我的书架">☆<span class="badge" id="favBadge" style="display:none">0</span></button>
        <button class="icon-btn mobile-menu-btn" id="menuBtn" title="菜单">☰</button>
      </div>
    </div></div>
  `);
  const app=document.createElement('main'); app.id='app'; app.className='wrap';
  document.body.appendChild(app);
  const foot=document.createElement('footer'); foot.className='footer';
  foot.innerHTML='<div class="f-seal">❖</div>中国美学思想史 · 数字书院<br>以叶朗《中国美学史大纲》为骨架，李泽厚《美的历程》、宗白华《美学散步》互为经纬<br>图片与文本仅供个人学习研究之用';
  document.body.appendChild(foot);
  init();
});
