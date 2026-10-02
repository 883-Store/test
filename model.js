(function (root) {
  'use strict';
  const fixtures = {
    products: [
      { id: 'BY981', name: 'สร้อยข้อมือเงิน Orietta', category: 'สร้อยข้อมือ', stock: 20, price: 350, image: 1 },
      { id: 'BY980', name: 'สร้อยคอทอง Orietta', category: 'สร้อยคอ', stock: 12, price: 320, image: 2 },
      { id: 'BY979', name: 'ต่างหูเงิน Narcissa', category: 'ต่างหู', stock: 8, price: 450, image: 3 },
      { id: 'BY978', name: 'สร้อยคอเงิน Orb Pendant', category: 'สร้อยคอ', stock: 46, price: 450, image: 4 },
      { id: 'BY383', name: 'สร้อยข้อมือ Una โรสโกลด์', category: 'สร้อยข้อมือ', stock: 4, price: 320, image: 5 },
      { id: 'BY370', name: 'ต่างหูมุกแต่งหัวใจ', category: 'ต่างหู', stock: 0, price: 300, image: 6 }
    ],
    orders: [
      { id: 'PO-DEMO-01', customer: 'ลูกค้าตัวอย่าง A', date: '2026-10-02', time: '10:24', status: 'approved', items: [{ id: 'BY981', qty: 2 }, { id: 'BY980', qty: 1 }] },
      { id: 'PO-DEMO-02', customer: 'ลูกค้าตัวอย่าง A', date: '2026-10-02', time: '09:10', status: 'approved', items: [{ id: 'BY979', qty: 4 }] },
      { id: 'PO-DEMO-03', customer: 'ลูกค้าตัวอย่าง B', date: '2026-10-01', time: '16:45', status: 'pending', items: [{ id: 'BY383', qty: 3 }] },
      { id: 'PO-DEMO-04', customer: 'ลูกค้าตัวอย่าง B', date: '2026-09-30', time: '14:20', status: 'approved', items: [{ id: 'BY978', qty: 2 }] }
    ],
    events: [
      { id: 'EV-01', product: 'BY981', date: '2026-10-02', time: '10:24', type: 'out', before: 23, after: 20, actor: 'ผู้ใช้ A', ref: 'รายการจำลอง 001', note: 'ตัดสินค้าออก' },
      { id: 'EV-02', product: 'BY981', date: '2026-10-02', time: '09:10', type: 'in', before: 18, after: 23, actor: 'ผู้ใช้ A', ref: 'รายการจำลอง 002', note: 'รับสินค้าเข้ารอบเช้า' },
      { id: 'EV-03', product: 'BY980', date: '2026-10-01', time: '16:40', type: 'in', before: 2, after: 12, actor: 'ผู้ใช้ B', ref: 'รายการจำลอง 003', note: 'รับสินค้าเข้า' },
      { id: 'EV-04', product: 'BY383', date: '2026-10-01', time: '14:15', type: 'adjust', before: 5, after: 4, actor: 'ผู้ใช้ A', ref: 'รายการจำลอง 004', note: 'ตรวจนับสินค้า' }
    ]
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const product = (data, id) => data.products.find(p => p.id === id);
  const orderTotal = (data, order) => order.items.reduce((n, item) => n + product(data, item.id).price * item.qty, 0);
  function createDocument(data, ids, kind) {
    if (!['billing', 'delivery'].includes(kind)) throw new Error('ประเภทเอกสารไม่ถูกต้อง');
    const orders = [...new Set(ids)].map(id => data.orders.find(o => o.id === id));
    if (!orders.length || orders.some(o => !o || o.status !== 'approved')) throw new Error('เลือก PO ที่อนุมัติแล้วอย่างน้อย 1 รายการ');
    if (new Set(orders.map(o => o.customer)).size !== 1) throw new Error('เลือก PO ของลูกค้ารายเดียวกัน');
    return { kind, customer: orders[0].customer, pos: orders.map(o => o.id), note: '', draftId: '',
      items: orders.flatMap(o => o.items.map((item, index) => ({ key: `${o.id}-${index}`, po: o.id, id: item.id, qty: item.qty, max: item.qty, selected: true }))) };
  }
  function validateDocument(doc) {
    if (!doc || !doc.items.some(i => i.selected)) return 'เลือกสินค้าอย่างน้อย 1 รายการ';
    if (doc.items.some(i => i.selected && (!Number.isSafeInteger(i.qty) || i.qty < 1 || i.qty > i.max))) return 'จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึงจำนวนใน PO';
    return '';
  }
  function summary(data, doc) {
    const selected = doc.items.filter(i => i.selected);
    return { count: selected.length, qty: selected.reduce((n, i) => n + (Number.isFinite(i.qty) ? i.qty : 0), 0),
      total: selected.reduce((n, i) => n + (Number.isFinite(i.qty) ? i.qty : 0) * product(data, i.id).price, 0) };
  }
  function adjustStock(data, id, mode, quantity, reason) {
    const p = product(data, id);
    if (!p || !['in', 'out', 'adjust'].includes(mode)) throw new Error('ไม่พบสินค้า');
    if (!Number.isSafeInteger(quantity) || quantity < 0 || (mode !== 'adjust' && quantity === 0)) throw new Error('กรอกจำนวนเต็มที่ถูกต้อง');
    if (!String(reason).trim()) throw new Error('กรุณาระบุเหตุผล');
    const after = mode === 'adjust' ? quantity : p.stock + (mode === 'in' ? quantity : -quantity);
    if (!Number.isSafeInteger(after) || after < 0) throw new Error('จำนวนคงเหลือไม่เพียงพอ');
    if (after === p.stock) throw new Error('จำนวนยังไม่เปลี่ยนแปลง');
    const before = p.stock;
    p.stock = after;
    data.events.unshift({ id: `EV-DEMO-${data.events.length + 1}`, product: id, date: '2026-10-02', time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), type: mode, before, after, actor: 'ผู้ใช้ A', ref: 'ปรับในต้นแบบ', note: String(reason).trim() });
    return { before, after };
  }
  const api = { fresh: () => clone(fixtures), clone, product, orderTotal, createDocument, validateDocument, summary, adjustStock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LPModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
