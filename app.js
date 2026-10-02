/* Isolated UX prototype. No production API, credentials, or business storage. */
(() => {
  'use strict';
  const M = window.LPModel;
  let data = M.fresh();
  const state = { page: 'dashboard', range: 'today', search: '', category: 'all', stock: 'all', sort: 'id', filters: false, eventType: 'all', from: '', to: '', poSearch: '', selected: new Set(), kind: 'billing', step: 1, doc: null, pane: 'items', drafts: [], docError: '', updated: '10:30', orderStatus: 'all' };
  const pageFilters = {};
  const $ = id => document.getElementById(id);
  const main = $('main');
  const dialog = $('dialog');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(n);
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const button = (action, label, symbol, cls = 'secondary', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${symbol ? icon(symbol) : ''}<span>${label}</span></button>`;
  const utility = (action, label, symbol, extra = '') => `<button type="button" class="icon-button" data-action="${action}" aria-label="${label}" title="${label}" data-tip="${label}" ${extra}>${icon(symbol)}</button>`;
  const thumb = (p, extra = '') => `<img class="thumb ${extra}" src="assets/products/product-${p.image}.jpg" alt="${esc(p.name)}" width="68" height="68">`;
  const status = o => `<span class="badge ${o.status === 'pending' ? 'pending' : ''}">${o.status === 'pending' ? 'รออนุมัติ' : 'อนุมัติแล้ว'}</span>`;
  const date = value => new Date(`${value}T12:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const empty = (title, detail = '', clear = '') => `<div class="empty">${icon('search-x')}<strong>${title}</strong><p>${detail}</p>${clear ? button(clear, 'ล้างตัวกรอง', 'rotate-ccw') : ''}</div>`;
  const routes = [['dashboard', 'ภาพรวม', 'house'], ['products', 'สินค้า', 'gem'], ['timeline', 'ไทม์ไลน์สต๊อก', 'history'], ['orders', 'ออเดอร์', 'shopping-bag'], ['documents', 'เอกสาร', 'files'], ['menu', 'เมนู', 'menu']];
  const docTitle = () => state.kind === 'billing' ? 'ใบวางบิล' : 'ใบส่งของ';
  const symbols = () => window.lucide.createIcons({ attrs: { 'stroke-width': 1.7 } });
  function notify(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => $('toast').classList.remove('visible'), 3400);
  }
  function shell() {
    const active = state.page === 'builder' ? 'documents' : state.page;
    document.body.classList.toggle('task-view', state.page === 'builder');
    $('sidebar').innerHTML = `<div class="sidebar-brand"><div class="brand">LUOPANICH</div><div class="brand-sub">STOCK & ORDER WORKSPACE</div></div><nav class="sidebar-nav">${routes.map(([id, label, symbol]) => `<button class="nav-button ${active === id ? 'active' : ''}" data-action="nav" data-page="${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span></button>`).join('')}</nav><div class="sidebar-bottom row"><div class="avatar">A</div><div class="account-text"><strong class="small">ผู้ใช้ A</strong><div class="small muted">บัญชีจำลอง</div></div></div>`;
    $('topbar').innerHTML = `${state.page === 'builder' ? button('doc-back', 'กลับ', 'chevron-left', 'task-back') : '<span class="brand mobile-brand">LUOPANICH</span>'}<span class="top-caption">${state.page === 'builder' ? docTitle() : routes.find(r => r[0] === state.page)?.[1] || 'LUOPANICH'}</span><span class="demo-badge">ต้นแบบ · ข้อมูลจำลอง</span>`;
    $('tabbar').innerHTML = [routes[0], routes[1], routes[4], routes[5]].map(([id, label, symbol]) => `<button class="${active === id || (id === 'menu' && ['timeline', 'orders'].includes(active)) ? 'active' : ''}" data-action="nav" data-page="${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span></button>`).join('');
  }
  function heading(title, subtitle = '', controls = '') {
    return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}</div><div class="controls">${controls}</div></div>`;
  }
  function render(focusHeading = false) {
    shell();
    const views = { dashboard, products, timeline, orders, documents, menu, builder };
    main.innerHTML = views[state.page]();
    renderTaskbar();
    symbols();
    if (focusHeading) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }
  function nav(page) {
    if (!routes.some(r => r[0] === page)) return;
    if (page !== state.page) {
      pageFilters[state.page] = { search: state.search, filters: state.filters, from: state.from, to: state.to };
      Object.assign(state, pageFilters[page] || { search: '', filters: false, from: '', to: '' });
    }
    state.page = page;
    render(true);
    history.replaceState(null, '', `#${page}`);
  }
  function orderRow(order) {
    return `<button class="order-entry" data-action="order" data-id="${order.id}" aria-label="รายละเอียด ${order.id}"><div class="order-info"><strong>${order.id}</strong><div class="order-meta">${order.customer}</div><div class="order-meta">${date(order.date)} · ${order.items.reduce((n, i) => n + i.qty, 0)} ชิ้น</div></div><div class="order-status">${status(order)}</div><div class="order-value"><strong>฿${money(M.orderTotal(data, order))}</strong><small class="muted">${order.time}</small></div></button>`;
  }
  function dashboard() {
    const approved = data.orders.filter(o => o.status === 'approved' && (state.range === 'today' ? o.date === '2026-10-02' : state.range === 'month' ? o.date.startsWith('2026-10') : o.date >= '2026-09-26'));
    return heading('ภาพรวม', `ศุกร์ 2 ตุลาคม 2569 · อัปเดต ${state.updated}`, utility('date-dialog', 'เลือกช่วงวันที่', 'calendar-days') + utility('refresh', 'รีเฟรชข้อมูลจำลอง', 'refresh-cw')) +
      `<div class="segmented blue-selection" aria-label="ช่วงเวลา">${[['today', 'วันนี้'], ['week', '7 วัน'], ['month', 'เดือนนี้']].map(([value, label]) => `<button data-action="range" data-value="${value}" aria-pressed="${state.range === value}">${label}</button>`).join('')}</div>
      <div class="summary-band"><div class="metric"><div class="metric-label">ยอดออเดอร์ที่อนุมัติ</div><div class="metric-value num">฿${money(approved.reduce((n, o) => n + M.orderTotal(data, o), 0))}</div><div class="metric-caption">${state.range === 'today' ? '2 ตุลาคม 2569' : state.range === 'month' ? '1 – 2 ตุลาคม 2569' : '26 กันยายน – 2 ตุลาคม 2569'}</div></div><div class="metric"><div class="metric-label">ออเดอร์</div><div class="metric-value num">${approved.length}</div><div class="metric-caption">อนุมัติแล้ว</div></div><div class="metric"><div class="metric-label">สินค้าคงเหลือ</div><div class="metric-value num">${data.products.reduce((n, p) => n + p.stock, 0)}</div><div class="metric-caption">จาก ${data.products.length} SKU</div></div></div>
      <div class="dashboard-grid"><section class="section"><div class="section-title"><h2>ออเดอร์ล่าสุด</h2>${button('all-orders', 'ดูทั้งหมด', 'chevron-right', 'text-button')}</div><div class="list-header"><span>เลข PO / ลูกค้า</span><span>สถานะ</span><span>ยอดรวม</span></div>${approved.map(orderRow).join('')}</section><div><section class="section"><div class="section-title"><h2>งานที่ต้องดู</h2></div><div class="list-group"><button class="group-row" data-action="pending-orders"><span class="row-icon">${icon('clock-3')}</span><div class="grow"><h3>รออนุมัติ</h3><p>1 ออเดอร์</p></div>${icon('chevron-right')}</button><button class="group-row" data-action="low-stock"><span class="row-icon">${icon('package-open')}</span><div class="grow"><h3>สินค้าใกล้หมด</h3><p>${data.products.filter(p => p.stock <= 5).length} รายการ</p></div>${icon('chevron-right')}</button></div></section><section class="section"><div class="section-title"><h2>เอกสาร</h2></div><div class="list-group">${['billing', 'delivery'].map(kind => `<button class="group-row" data-action="start-doc" data-kind="${kind}"><span class="row-icon">${icon(kind === 'billing' ? 'file-text' : 'truck')}</span><div class="grow"><h3>${kind === 'billing' ? 'สร้างใบวางบิล' : 'สร้างใบส่งของ'}</h3><p>เลือกจาก PO ที่อนุมัติแล้ว</p></div>${icon('chevron-right')}</button>`).join('')}</div></section></div></div>`;
  }
  function searchInput(id, value, label) {
    return `<label class="search">${icon('search')}<input id="${id}" type="search" value="${esc(value)}" placeholder="${label}" aria-label="${label}" autocomplete="off"></label>`;
  }
  function products() {
    return heading('สินค้า', 'สินค้าทั้งหมด 6 รายการ', utility('refresh', 'รีเฟรชข้อมูลจำลอง', 'refresh-cw')) +
      `<div class="toolbar">${searchInput('product-search', state.search, 'ค้นหาชื่อสินค้า, SKU')}<button class="icon-button filter-toggle" data-action="filters" aria-label="ตัวกรองสินค้า" aria-expanded="${state.filters}">${icon('sliders-horizontal')}</button></div>
      ${state.filters ? `<div class="filter-panel"><label class="field"><span>หมวดสินค้า</span><select id="category-filter">${['all', 'สร้อยข้อมือ', 'สร้อยคอ', 'ต่างหู'].map(v => `<option value="${v}" ${state.category === v ? 'selected' : ''}>${v === 'all' ? 'ทุกหมวด' : v}</option>`).join('')}</select></label><label class="field"><span>สต๊อก</span><select id="stock-filter">${[['all', 'ทั้งหมด'], ['low', 'ใกล้หมด (ไม่เกิน 5)'], ['out', 'สินค้าหมด']].map(([v, l]) => `<option value="${v}" ${state.stock === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>` : ''}
      <div class="results-caption"><span id="product-count"></span><label>เรียงตาม <select id="product-sort" aria-label="เรียงสินค้า"><option value="id" ${state.sort === 'id' ? 'selected' : ''}>SKU</option><option value="stock" ${state.sort === 'stock' ? 'selected' : ''}>สต๊อกน้อยก่อน</option><option value="price" ${state.sort === 'price' ? 'selected' : ''}>ราคาน้อยก่อน</option></select></label></div><div id="product-list" class="products">${productRows()}</div>`;
  }
  function filteredProducts() {
    return data.products.filter(p => `${p.id} ${p.name}`.toLowerCase().includes(state.search.toLowerCase()) && (state.category === 'all' || p.category === state.category) && (state.stock === 'all' || (state.stock === 'low' ? p.stock <= 5 : p.stock === 0))).sort((a, b) => state.sort === 'stock' ? a.stock - b.stock : state.sort === 'price' ? a.price - b.price : b.id.localeCompare(a.id));
  }
  function productRows() {
    const list = filteredProducts();
    queueMicrotask(() => { if ($('product-count')) $('product-count').textContent = `พบ ${list.length} รายการ`; });
    return list.map(p => `<button class="product-row" data-action="product" data-id="${p.id}">${thumb(p)}<div class="product-info"><div class="product-name">${p.name}</div><small>SKU: ${p.id}</small><small class="product-stock-mobile ${p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : ''}">${p.stock === 0 ? 'สินค้าหมด' : `สต๊อก ${p.stock} ชิ้น`}</small></div><div class="product-stock ${p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : ''}"><strong class="num">${p.stock}</strong><small>${p.stock === 0 ? 'สินค้าหมด' : p.stock <= 5 ? 'ใกล้หมด' : 'พร้อมขาย'}</small></div><span class="product-price num">฿${money(p.price)}</span>${icon('chevron-right')}</button>`).join('') || empty('ไม่พบสินค้า', 'ลองค้นหาด้วยชื่อหรือ SKU อื่น', 'clear-products');
  }
  function timeline() {
    return heading('ไทม์ไลน์สต๊อก', 'ประวัติการเคลื่อนไหวของสินค้า', utility('refresh', 'รีเฟรชข้อมูลจำลอง', 'refresh-cw')) +
      `<div class="toolbar">${searchInput('event-search', state.search, 'ค้นหา SKU หรือรายการ')}<button class="icon-button filter-toggle" data-action="filters" aria-label="ตัวกรองไทม์ไลน์" aria-expanded="${state.filters}">${icon('sliders-horizontal')}</button></div>
      ${state.filters ? `<div class="filter-panel"><label class="field"><span>ตั้งแต่</span><input id="event-from" type="date" value="${state.from}"></label><label class="field"><span>ถึงวันที่</span><input id="event-to" type="date" value="${state.to}"></label><label class="field"><span>ประเภท</span><select id="event-type">${[['all', 'ทั้งหมด'], ['in', 'รับเข้า'], ['out', 'ตัดออก'], ['adjust', 'ปรับยอด']].map(([v, l]) => `<option value="${v}" ${state.eventType === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>` : ''}<div id="event-list">${eventRows()}</div>`;
  }
  function eventRows() {
    const events = data.events.filter(e => `${e.product} ${e.ref} ${e.note}`.toLowerCase().includes(state.search.toLowerCase()) && (state.eventType === 'all' || e.type === state.eventType) && (!state.from || e.date >= state.from) && (!state.to || e.date <= state.to));
    if (!events.length) return empty('ไม่พบรายการ', 'ลองเปลี่ยนช่วงเวลาหรือตัวกรอง', 'clear-events');
    return [...new Set(events.map(e => e.date))].map(d => `<section class="timeline-group"><h2 class="date-label">${d === '2026-10-02' ? 'วันนี้' : d === '2026-10-01' ? 'เมื่อวาน' : ''} · ${date(d)}</h2>${events.filter(e => e.date === d).map(e => {
      const p = M.product(data, e.product); const delta = e.after - e.before;
      return `<details class="event-row"><summary><span class="event-time">${e.time}</span>${thumb(p)}<div><div class="product-name">${e.product}</div><small class="muted event-title">${p.name}<br></small><small class="muted">${e.before} → ${e.after} ชิ้น</small></div><div class="event-value"><strong class="num ${delta > 0 ? 'green' : 'red'}">${delta > 0 ? '+' : ''}${delta}</strong><div class="event-type">${{ in: 'รับเข้า', out: 'ตัดออก', adjust: 'ปรับยอด' }[e.type]}</div></div></summary><div class="event-details"><div>ผู้ดำเนินการ: ${e.actor}</div><div>อ้างอิง: ${esc(e.ref)}</div><div>หมายเหตุ: ${esc(e.note)}</div></div></details>`;
    }).join('')}</section>`).join('');
  }
  function orders() {
    return heading('ออเดอร์', 'รายการสั่งซื้อจำลอง') + `<div class="toolbar">${searchInput('order-search', state.search, 'ค้นหา PO หรือลูกค้า')}<select id="order-status" aria-label="สถานะออเดอร์">${[['all', 'ทุกสถานะ'], ['approved', 'อนุมัติแล้ว'], ['pending', 'รออนุมัติ']].map(([v, l]) => `<option value="${v}" ${state.orderStatus === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div id="order-list">${orderRows()}</div>`;
  }
  function orderRows() { return data.orders.filter(o => `${o.id} ${o.customer}`.toLowerCase().includes(state.search.toLowerCase()) && (state.orderStatus === 'all' || o.status === state.orderStatus)).map(orderRow).join('') || empty('ไม่พบออเดอร์', 'ลองค้นหา PO หรือลูกค้าอื่น'); }
  function documents() {
    return heading('เอกสาร', 'ใบวางบิลและใบส่งของ') + `<div class="doc-hub">${['billing', 'delivery'].map(kind => `<button class="doc-launch" data-action="start-doc" data-kind="${kind}"><span class="row-icon">${icon(kind === 'billing' ? 'file-text' : 'truck')}</span><div><h2>${kind === 'billing' ? 'ใบวางบิล' : 'ใบส่งของ'}</h2><p>เลือก PO และตรวจรายการ</p></div>${icon('chevron-right')}</button>`).join('')}</div><section class="section"><div class="section-title"><h2>ร่างเอกสาร</h2><span class="small">${state.drafts.length} รายการ</span></div>${state.drafts.length ? state.drafts.map(d => `<button class="draft-row" data-action="open-draft" data-id="${d.draftId}"><span class="row-icon">${icon('file-pen-line')}</span><div class="grow"><strong>${d.draftId}</strong><div class="small muted">${d.customer} · ${d.pos.length} PO</div><span class="badge draft">ร่างใบวางบิล</span></div><span class="price num">฿${money(M.summary(data, d).total)}</span>${icon('chevron-right')}</button>`).join('') : empty('ยังไม่มีร่างเอกสาร', 'รายการที่บันทึกในรอบนี้จะอยู่ที่นี่')}</section>`;
  }
  function menu() {
    return heading('เมนู', 'ผู้ใช้ A · บัญชีจำลอง') + `<div class="menu-grid"><div class="list-group">${[['timeline', 'ไทม์ไลน์สต๊อก', 'history', 'ดูรายการรับเข้าและตัดออก'], ['orders', 'ออเดอร์', 'shopping-bag', 'ตรวจรายการและสถานะ'], ['documents', 'เอกสาร', 'files', 'ใบวางบิลและใบส่งของ']].map(([page, label, symbol, sub]) => `<button class="group-row" data-action="nav" data-page="${page}"><span class="row-icon">${icon(symbol)}</span><div class="grow"><h3>${label}</h3><p>${sub}</p></div>${icon('chevron-right')}</button>`).join('')}</div><div class="list-group"><button class="group-row" data-action="reset-confirm"><span class="row-icon">${icon('rotate-ccw')}</span><div class="grow"><h3>เริ่มข้อมูลจำลองใหม่</h3><p>ล้างการเปลี่ยนแปลงและร่างในต้นแบบ</p></div>${icon('chevron-right')}</button></div></div>`;
  }
  function startDoc(kind) {
    state.kind = kind; state.page = 'builder'; state.step = 1; state.selected = new Set(); state.poSearch = ''; state.doc = null; state.docError = ''; state.pane = 'items'; state.from = ''; state.to = ''; state.filters = false;
    render(true);
  }
  function stepper() {
    return `<div class="stepper" aria-label="ขั้นตอนเอกสาร">${['เลือก PO', 'ตรวจรายการ', 'เอกสาร'].map((label, i) => `<div class="step ${state.step === i + 1 ? 'active' : state.step > i + 1 ? 'done' : ''}" ${state.step === i + 1 ? 'aria-current="step"' : ''}><div class="step-dot">${state.step > i + 1 ? icon('check') : i + 1}</div>${label}</div>`).join('')}</div>`;
  }
  function poRows() {
    const chosen = data.orders.find(o => state.selected.has(o.id));
    const list = data.orders.filter(o => `${o.id} ${o.customer}`.toLowerCase().includes(state.poSearch.toLowerCase()) && (!state.from || o.date >= state.from) && (!state.to || o.date <= state.to));
    return list.map(o => {
      const reason = o.status !== 'approved' ? 'ยังไม่อนุมัติ' : chosen && chosen.customer !== o.customer ? 'คนละลูกค้า' : '';
      return `<label class="po-row ${reason ? 'disabled' : ''}"><input type="checkbox" data-po="${o.id}" ${state.selected.has(o.id) ? 'checked' : ''} ${reason ? 'disabled' : ''} aria-label="เลือก ${o.id}"><span class="po-data"><strong>${o.id}</strong><p>${o.customer}</p><p>${o.items.reduce((n, i) => n + i.qty, 0)} ชิ้น · ฿${money(M.orderTotal(data, o))}</p></span><span class="po-right">${reason ? `<span class="small muted">${reason}</span>` : status(o)}<small>${date(o.date)}</small></span></label>`;
    }).join('') || empty('ไม่พบ PO', 'ลองเปลี่ยนคำค้นหาหรือช่วงวันที่', 'clear-po');
  }
  function builder() {
    const header = heading(state.step === 1 ? 'เลือก PO' : docTitle(), state.step === 1 ? `สำหรับ${docTitle()}` : state.doc?.draftId ? `ร่าง ${state.doc.draftId}` : '');
    if (state.step === 1) return header + stepper() + `<div class="doc-layout only-picker"><div class="toolbar">${searchInput('po-search', state.poSearch, 'ค้นหา PO หรือชื่อลูกค้า')}<button class="icon-button" data-action="filters" aria-label="กรองวันที่ PO" aria-expanded="${state.filters}">${icon('calendar-days')}</button></div>${state.filters ? `<div class="filter-panel"><label class="field"><span>ตั้งแต่</span><input id="po-from" type="date" value="${state.from}"></label><label class="field"><span>ถึงวันที่</span><input id="po-to" type="date" value="${state.to}"></label></div>` : ''}<div class="po-list" id="po-list">${poRows()}</div><div class="selection-note" id="po-selected" aria-live="polite">${state.selected.size ? `เลือกแล้ว ${state.selected.size} PO` : 'เลือก PO ที่อนุมัติแล้วของลูกค้ารายเดียวกัน'}</div>${state.docError ? `<p class="error-text">${state.docError}</p>` : ''}</div>`;
    if (state.step === 3) return header + stepper() + `<div class="preview-full"><div class="preview-tools"><span class="preview-ready">${icon('circle-check')}ข้อมูลจำลอง</span>${utility('print', 'พิมพ์เอกสารตัวอย่าง', 'printer')}</div>${paper()}</div>`;
    return header + stepper() + `<div class="segmented editor-tabs" role="tablist" aria-label="มุมมองเอกสาร"><button role="tab" aria-selected="${state.pane === 'items'}" data-action="pane" data-value="items">รายการ</button><button role="tab" aria-selected="${state.pane === 'preview'}" data-action="pane" data-value="preview">ตัวอย่าง</button></div><div class="doc-layout ${state.pane === 'preview' ? 'show-preview' : ''}"><section class="editor-panel"><div class="doc-meta"><div><small>ลูกค้า</small><strong>${esc(state.doc.customer)}</strong><div class="po-tags">${state.doc.pos.map(po => `<span class="po-tag">${po}</span>`).join('')}</div></div>${state.doc.draftId ? '<span class="badge draft">ร่าง</span>' : button('change-po', 'แก้ไข PO', 'square-pen', 'text-button')}</div><div class="section-title"><h2>รายการสินค้า</h2><label class="row small"><input type="checkbox" id="select-all-items" ${state.doc.items.every(i => i.selected) ? 'checked' : ''}>ทั้งหมด</label></div><div id="doc-items">${state.doc.items.map(editItem).join('')}</div><div id="doc-totals">${docTotals()}</div><label class="field doc-note"><span>หมายเหตุ</span><textarea id="doc-note" rows="2" maxlength="300" placeholder="เพิ่มหมายเหตุ">${esc(state.doc.note)}</textarea></label><div class="error-text" role="alert" id="doc-error">${esc(state.docError)}</div></section><aside class="preview-panel" aria-label="ตัวอย่างเอกสาร"><div class="preview-tools"><h3>ตัวอย่าง${docTitle()}</h3>${utility('preview', 'ขยายตัวอย่างเอกสาร', 'maximize-2')}</div><div id="paper-region">${paper()}</div></aside></div>`;
  }
  function editItem(item) {
    const p = M.product(data, item.id);
    return `<article class="edit-item" data-item="${item.key}"><div class="edit-item-top"><label class="select-label"><input type="checkbox" data-item-select="${item.key}" ${item.selected ? 'checked' : ''} aria-label="เลือกสินค้า ${p.id} จาก ${item.po}"></label>${thumb(p)}<div class="grow"><div class="product-name">${p.name}</div><small class="muted">${p.id} · ${item.po}</small></div></div><div class="edit-item-controls"><div><div class="small muted">${state.kind === 'billing' ? 'จำนวน' : 'จำนวนส่ง'} <span class="small">/ ${item.max}</span></div><div class="qty-stepper"><button data-action="qty-down" data-key="${item.key}" aria-label="ลดจำนวน ${p.id}" ${!item.selected ? 'disabled' : ''}>${icon('minus')}</button><input type="number" min="1" max="${item.max}" step="1" inputmode="numeric" value="${Number.isFinite(item.qty) ? item.qty : ''}" data-item-qty="${item.key}" aria-label="จำนวน ${p.id} จาก ${item.po}" ${!item.selected ? 'disabled' : ''}><button data-action="qty-up" data-key="${item.key}" aria-label="เพิ่มจำนวน ${p.id}" ${!item.selected ? 'disabled' : ''}>${icon('plus')}</button></div></div><div class="item-sum" id="sum-${item.key}">${itemSum(item)}</div></div></article>`;
  }
  function itemSum(item) {
    const p = M.product(data, item.id); const qty = Number.isFinite(item.qty) ? item.qty : 0;
    return state.kind === 'billing' ? `<small>฿${money(p.price)} / ชิ้น</small><strong>฿${money(item.selected ? p.price * qty : 0)}</strong>` : `<small>เหลือจาก PO</small><strong>${item.max - (item.selected ? qty : 0)} ชิ้น</strong>`;
  }
  function docTotals() {
    const s = M.summary(data, state.doc);
    return `<div class="doc-total"><span>${state.kind === 'billing' ? 'รวมทั้งสิ้น' : 'จำนวนส่งรวม'}<small class="muted total-detail">${s.count} รายการ · ${s.qty} ชิ้น</small></span><strong class="num">${state.kind === 'billing' ? `฿${money(s.total)}` : `${s.qty} ชิ้น`}</strong></div>`;
  }
  function paper() {
    const doc = state.doc;
    const s = M.summary(data, doc);
    const valid = !M.validateDocument(doc);
    return `<article class="paper" aria-label="เอกสารตัวอย่าง"><div class="paper-head"><div><div class="paper-brand">LUOPANICH</div><div class="paper-label">เอกสารตัวอย่าง · ไม่มีผลทางธุรกรรม</div></div><div><h3>${docTitle()}</h3><div class="paper-meta">2 ตุลาคม 2569</div></div></div><div class="paper-meta"><span class="paper-label">ลูกค้า</span><br><strong>${esc(doc.customer)}</strong><br>เลข PO: ${doc.pos.join(', ')}${doc.draftId ? `<br>ร่าง: ${doc.draftId}` : ''}</div>${!valid ? '<p class="paper-note">กรุณาตรวจรายการและจำนวนก่อนออกเอกสาร</p>' : ''}<table><thead><tr><th>รูป</th><th>สินค้า / SKU</th><th class="numeric">จำนวน</th>${state.kind === 'billing' ? '<th class="numeric">ราคา</th><th class="numeric">รวม</th>' : ''}</tr></thead><tbody>${doc.items.filter(i => i.selected).map(i => { const p = M.product(data, i.id); const q = Number.isSafeInteger(i.qty) ? i.qty : 0; return `<tr><td><img src="assets/products/product-${p.image}.jpg" alt="${p.id}"></td><td>${p.name}<br><span class="paper-label">${p.id}</span></td><td class="numeric">${q}</td>${state.kind === 'billing' ? `<td class="numeric">${money(p.price)}</td><td class="numeric">${money(p.price * q)}</td>` : ''}</tr>`; }).join('')}</tbody></table><div class="paper-total"><span>${state.kind === 'billing' ? 'รวมทั้งสิ้น' : 'จำนวนรวม'}</span><span>${state.kind === 'billing' ? `${money(s.total)} บาท` : `${s.qty} ชิ้น`}</span></div>${doc.note ? `<div class="paper-note">หมายเหตุ: ${esc(doc.note)}</div>` : ''}<div class="paper-signatures"><span>ผู้จัดทำเอกสาร</span><span>ผู้รับเอกสาร</span></div><div class="paper-demo">ข้อมูลจำลอง · ต้นแบบ UX/UI</div></article>`;
  }
  function renderTaskbar() {
    if (state.page !== 'builder') { $('taskbar').innerHTML = ''; return; }
    const summary = state.doc ? M.summary(data, state.doc) : null;
    const label = state.step === 1 ? `เลือกแล้ว ${state.selected.size} PO` : `${summary.count} รายการ`;
    let actions;
    if (state.step === 1) actions = button('use-po', 'ใช้ PO ที่เลือก', 'check', 'primary', state.selected.size ? '' : 'disabled');
    else if (state.step === 2) actions = (state.kind === 'billing' ? `<button class="secondary save-draft" data-action="save-draft" aria-label="บันทึกร่างในต้นแบบ" title="บันทึกร่าง">${icon('save')}<span class="save-label">บันทึกร่าง</span></button>` : '') + button('preview', 'ดูตัวอย่าง', 'eye', 'primary');
    else actions = button('edit-document', 'แก้รายการ', 'square-pen', 'secondary') + button('print', 'พิมพ์', 'printer', 'primary');
    $('taskbar').innerHTML = `<div class="task-summary"><strong>${label}</strong><small>${state.step === 1 ? docTitle() : state.kind === 'billing' ? `฿${money(summary.total)}` : `${summary.qty} ชิ้น`}</small></div><div class="task-actions">${actions}</div>`;
  }
  function syncDocument() {
    $('doc-totals').innerHTML = docTotals();
    $('paper-region').innerHTML = paper();
    state.docError = M.validateDocument(state.doc);
    $('doc-error').textContent = state.docError;
    state.doc.items.forEach(i => { const el = $(`sum-${i.key}`); if (el) el.innerHTML = itemSum(i); });
    $('select-all-items').checked = state.doc.items.every(i => i.selected);
    $('select-all-items').indeterminate = state.doc.items.some(i => i.selected) && !state.doc.items.every(i => i.selected);
    renderTaskbar(); symbols();
  }
  function showDialog(title, content) {
    dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${utility('close-dialog', 'ปิดหน้าต่าง', 'x')}</div>${content}`;
    dialog.showModal(); symbols();
  }
  function productDialog(id) {
    const p = M.product(data, id);
    showDialog('สินค้า', `<div class="dialog-product">${thumb(p)}<div><h3>${p.name}</h3><p class="muted small">${p.id} · ${p.category}</p><p class="blue">฿${money(p.price)}</p></div></div><div class="row between"><span class="muted">จำนวนคงเหลือ</span><strong class="stock-number num">${p.stock} ชิ้น</strong></div><div class="dialog-actions">${button('product-history', 'ประวัติ', 'history', 'secondary', `data-id="${p.id}"`)}${button('adjust-open', 'ปรับสต๊อกจำลอง', 'arrow-up-down', 'primary', `data-id="${p.id}"`)}</div>`);
  }
  function adjustmentDialog(id) {
    const p = M.product(data, id);
    dialog.close();
    showDialog('ปรับสต๊อกจำลอง', `<form id="stock-form" data-id="${p.id}"><div class="dialog-product">${thumb(p)}<div><h3>${p.name}</h3><p class="small muted">${p.id} · คงเหลือ ${p.stock} ชิ้น</p></div></div><div class="dialog-fields"><label class="field"><span>รายการ</span><select id="adjust-mode"><option value="in">รับเข้า</option><option value="out">ตัดออก</option><option value="adjust">ตั้งยอดคงเหลือ</option></select></label><label class="field"><span id="adjust-qty-label">จำนวนเพิ่ม</span><input id="adjust-qty" type="number" min="1" step="1" inputmode="numeric" value="1" required></label></div><label class="field section"><span>เหตุผล</span><input id="adjust-reason" placeholder="ระบุเหตุผล" maxlength="150" required></label><div class="stock-preview"><span class="muted">${p.stock} ชิ้น</span>${icon('arrow-right')}<strong id="adjust-result">${p.stock + 1} ชิ้น</strong></div><div id="adjust-error" class="error-text" role="alert"></div><div class="dialog-actions">${button('close-dialog', 'ยกเลิก', '', 'secondary')}<button type="submit" class="primary">${icon('check')}บันทึกในต้นแบบ</button></div></form>`);
  }
  function updateStockPreview() {
    const p = M.product(data, $('stock-form').dataset.id); const mode = $('adjust-mode').value; const value = Number($('adjust-qty').value);
    $('adjust-qty').min = mode === 'adjust' ? '0' : '1';
    $('adjust-qty-label').textContent = { in: 'จำนวนเพิ่ม', out: 'จำนวนลด', adjust: 'ยอดใหม่' }[mode];
    const after = mode === 'adjust' ? value : p.stock + (mode === 'in' ? value : -value);
    $('adjust-result').textContent = `${money(after)} ชิ้น`;
    $('adjust-result').className = after < 0 ? 'red' : '';
  }
  function orderDialog(id) {
    const o = data.orders.find(o => o.id === id);
    showDialog(o.id, `<div class="row between"><strong>${o.customer}</strong>${status(o)}</div><p class="small muted">${date(o.date)} · ${o.time}</p><div class="section">${o.items.map(i => { const p = M.product(data, i.id); return `<div class="dialog-order-row">${thumb(p)}<div class="grow"><strong class="small">${p.name}</strong><p class="small muted">${p.id} · ${i.qty} ชิ้น</p></div><strong class="small">฿${money(i.qty * p.price)}</strong></div>`; }).join('')}</div><div class="doc-total"><span>รวมทั้งสิ้น</span><strong>฿${money(M.orderTotal(data, o))}</strong></div>${o.status === 'approved' ? `<div class="dialog-actions">${button('doc-from-order', 'ใบส่งของ', 'truck', 'secondary', `data-id="${o.id}" data-kind="delivery"`)}${button('doc-from-order', 'ใบวางบิล', 'file-text', 'primary', `data-id="${o.id}" data-kind="billing"`)}</div>` : ''}`);
  }
  function usePo() {
    try { state.doc = M.createDocument(data, [...state.selected], state.kind); state.docError = ''; state.step = 2; state.pane = 'items'; render(true); }
    catch (err) { state.docError = err.message; render(); }
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const action = el.dataset.action;
    switch (action) {
      case 'nav': nav(el.dataset.page); break;
      case 'range': state.range = el.dataset.value; render(); break;
      case 'refresh': state.updated = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); render(); notify('ข้อมูลจำลองเป็นปัจจุบัน'); break;
      case 'date-dialog': showDialog('ช่วงเวลา', `<div class="stack">${[['today', 'วันนี้'], ['week', '7 วันล่าสุด'], ['month', 'เดือนนี้']].map(([v, l]) => button('date-range', l, 'calendar-days', 'secondary', `data-value="${v}"`)).join('')}</div>`); break;
      case 'date-range': state.range = el.dataset.value; dialog.close(); render(); break;
      case 'all-orders': nav('orders'); state.search = ''; state.orderStatus = 'all'; render(); break;
      case 'pending-orders': nav('orders'); state.search = ''; state.orderStatus = 'pending'; render(); break;
      case 'low-stock': nav('products'); state.search = ''; state.stock = 'low'; state.filters = true; render(); break;
      case 'filters': state.filters = !state.filters; render(); break;
      case 'clear-products': state.search = ''; state.category = 'all'; state.stock = 'all'; render(); break;
      case 'clear-events': state.search = ''; state.eventType = 'all'; state.from = ''; state.to = ''; render(); break;
      case 'clear-po': state.poSearch = ''; state.from = ''; state.to = ''; render(); break;
      case 'product': productDialog(el.dataset.id); break;
      case 'close-dialog': dialog.close(); break;
      case 'product-history': dialog.close(); nav('timeline'); state.search = el.dataset.id; state.eventType = 'all'; state.from = ''; state.to = ''; render(); break;
      case 'adjust-open': adjustmentDialog(el.dataset.id); break;
      case 'order': orderDialog(el.dataset.id); break;
      case 'start-doc': startDoc(el.dataset.kind); break;
      case 'doc-from-order': dialog.close(); startDoc(el.dataset.kind); state.selected.add(el.dataset.id); usePo(); break;
      case 'use-po': usePo(); break;
      case 'change-po': state.selected = new Set(state.doc.pos); state.step = 1; state.docError = ''; render(true); break;
      case 'doc-back': if (state.step === 2 && state.doc?.draftId) nav('documents'); else if (state.step > 1) { state.step--; state.pane = 'items'; render(true); } else nav('documents'); break;
      case 'pane': state.pane = el.dataset.value; render(); break;
      case 'qty-up': case 'qty-down': {
        const item = state.doc.items.find(i => i.key === el.dataset.key);
        const next = (Number.isFinite(item.qty) ? item.qty : 1) + (action === 'qty-up' ? 1 : -1);
        if (next < 1 || next > item.max) { notify(`จำนวนต้องอยู่ระหว่าง 1 ถึง ${item.max}`); break; }
        item.qty = next;
        document.querySelector(`[data-item-qty="${item.key}"]`).value = next;
        syncDocument(); break;
      }
      case 'preview': {
        const error = M.validateDocument(state.doc);
        if (error) { state.docError = error; render(); notify(error); break; }
        state.step = 3; render(true); break;
      }
      case 'edit-document': state.step = 2; state.pane = 'items'; render(true); break;
      case 'save-draft': {
        const error = M.validateDocument(state.doc);
        if (error) { state.docError = error; render(); notify(error); break; }
        const existing = state.drafts.find(d => d.pos.slice().sort().join('|') === state.doc.pos.slice().sort().join('|'));
        if (!state.doc.draftId && existing) {
          showDialog('มีร่างของ PO ชุดนี้แล้ว', `<p class="muted">${existing.draftId}</p><div class="dialog-actions">${button('close-dialog', 'กลับ', '', 'secondary')}${button('open-draft', 'เปิดร่างเดิม', 'file-pen-line', 'primary', `data-id="${existing.draftId}"`)}</div>`);
          break;
        }
        if (!state.doc.draftId) state.doc.draftId = `DEMO-BN-${String(state.drafts.length + 1).padStart(3, '0')}`;
        const index = state.drafts.findIndex(d => d.draftId === state.doc.draftId);
        if (index < 0) state.drafts.unshift(M.clone(state.doc)); else state.drafts[index] = M.clone(state.doc);
        render(); notify(`บันทึก ${state.doc.draftId} ในต้นแบบแล้ว`); break;
      }
      case 'open-draft': if (dialog.open) dialog.close(); state.doc = M.clone(state.drafts.find(d => d.draftId === el.dataset.id)); state.kind = 'billing'; state.page = 'builder'; state.step = 2; state.pane = 'items'; state.selected = new Set(state.doc.pos); state.docError = ''; render(true); break;
      case 'print': if (M.validateDocument(state.doc)) notify('กรุณาตรวจรายการก่อนพิมพ์'); else window.print(); break;
      case 'reset-confirm': showDialog('เริ่มข้อมูลจำลองใหม่?', `<p class="muted">การปรับสต๊อกและร่างเอกสารในต้นแบบรอบนี้จะถูกล้าง ไม่กระทบข้อมูลร้านจริง</p><div class="dialog-actions">${button('close-dialog', 'ยกเลิก', '', 'secondary')}${button('reset-demo', 'เริ่มใหม่', 'rotate-ccw', 'primary')}</div>`); break;
      case 'reset-demo': data = M.fresh(); state.drafts = []; state.doc = null; state.selected = new Set(); state.search = ''; state.stock = 'all'; state.category = 'all'; state.filters = false; state.eventType = 'all'; state.from = ''; state.to = ''; state.orderStatus = 'all'; Object.keys(pageFilters).forEach(key => delete pageFilters[key]); dialog.close(); nav('dashboard'); notify('เริ่มข้อมูลจำลองใหม่แล้ว'); break;
    }
  });
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'product-search') { state.search = el.value; $('product-list').innerHTML = productRows(); symbols(); }
    if (el.id === 'event-search') { state.search = el.value; $('event-list').innerHTML = eventRows(); symbols(); }
    if (el.id === 'order-search') { state.search = el.value; $('order-list').innerHTML = orderRows(); symbols(); }
    if (el.id === 'po-search') { state.poSearch = el.value; $('po-list').innerHTML = poRows(); symbols(); }
    if (el.dataset.itemQty) { const item = state.doc.items.find(i => i.key === el.dataset.itemQty); item.qty = el.value === '' ? NaN : Number(el.value); syncDocument(); }
    if (el.id === 'doc-note') { state.doc.note = el.value; $('paper-region').innerHTML = paper(); }
    if (['adjust-qty', 'adjust-mode'].includes(el.id)) updateStockPreview();
  });
  document.addEventListener('change', event => {
    const el = event.target;
    const fields = { 'category-filter': 'category', 'stock-filter': 'stock', 'product-sort': 'sort', 'event-from': 'from', 'event-to': 'to', 'event-type': 'eventType', 'po-from': 'from', 'po-to': 'to', 'order-status': 'orderStatus' };
    if (fields[el.id]) { state[fields[el.id]] = el.value; render(); }
    if (el.dataset.po) {
      if (el.checked) state.selected.add(el.dataset.po); else state.selected.delete(el.dataset.po);
      $('po-list').innerHTML = poRows(); $('po-selected').textContent = `เลือกแล้ว ${state.selected.size} PO`; renderTaskbar(); symbols();
    }
    if (el.dataset.itemSelect) { state.doc.items.find(i => i.key === el.dataset.itemSelect).selected = el.checked; $('doc-items').innerHTML = state.doc.items.map(editItem).join(''); syncDocument(); }
    if (el.id === 'select-all-items') { state.doc.items.forEach(i => i.selected = el.checked); $('doc-items').innerHTML = state.doc.items.map(editItem).join(''); syncDocument(); }
    if (el.id === 'adjust-mode') updateStockPreview();
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id !== 'stock-form') return;
    try { const change = M.adjustStock(data, event.target.dataset.id, $('adjust-mode').value, Number($('adjust-qty').value), $('adjust-reason').value); dialog.close(); render(); notify(`บันทึกจำลองแล้ว ${change.before} → ${change.after} ชิ้น`); }
    catch (err) { $('adjust-error').textContent = err.message; }
  });
  window.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'p' && !(state.page === 'builder' && state.doc)) { event.preventDefault(); notify('เปิดตัวอย่างเอกสารก่อนพิมพ์'); } });
  const initial = location.hash.slice(1);
  if (routes.some(r => r[0] === initial)) state.page = initial;
  render();
})();
