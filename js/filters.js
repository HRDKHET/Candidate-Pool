// Position (category) + Prescreen date-range filters and grouping by position.
// Views keep a filter state object and wire changes through [data-f] controls.
import { esc, ICONS } from './ui.js';

export const RANGES = [
  { id: 'all', label: 'ทุกช่วงเวลา' },
  { id: '7', label: '7 วันล่าสุด' },
  { id: '30', label: '30 วันล่าสุด' },
  { id: '90', label: '90 วันล่าสุด' },
  { id: 'custom', label: 'กำหนดเอง' }
];

export const newFilterState = () => ({ pos: 'all', range: 'all', from: '', to: '', group: true });

export function positionsOf(list) {
  return [...new Set(list.map((c) => c.position || '(ไม่ระบุตำแหน่ง)'))].sort((a, b) => a.localeCompare(b));
}

// Prescreen date, falling back to when the record entered the system.
const dateOf = (c) => {
  const v = c.prescreenDate || c.createdAt;
  return v ? new Date(v.length === 10 ? v + 'T00:00:00' : v) : null;
};

export function applyFilters(list, f) {
  let from = null, to = null;
  if (f.range === 'custom') {
    if (f.from) from = new Date(f.from + 'T00:00:00');
    if (f.to) to = new Date(f.to + 'T23:59:59');
  } else if (f.range !== 'all') {
    from = new Date(Date.now() - Number(f.range) * 86400000);
  }
  return list.filter((c) => {
    if (f.pos !== 'all' && (c.position || '(ไม่ระบุตำแหน่ง)') !== f.pos) return false;
    if (from || to) {
      const d = dateOf(c);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
    }
    return true;
  });
}

// [[position, items], …] in position order; one bucket when grouping is off.
export function groupByPosition(list, on) {
  if (!on) return [[null, list]];
  const m = new Map();
  list.forEach((c) => {
    const k = c.position || '(ไม่ระบุตำแหน่ง)';
    m.set(k, [...(m.get(k) || []), c]);
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// True when any filter differs from the defaults.
export const filtersActive = (f) => f.pos !== 'all' || f.range !== 'all' || !!f.from || !!f.to || !f.group;

// prefix keeps ids unique when two bars exist on a page. dirty enables the clear
// button (views pass true when their own search box or chips are also set).
export function filterBarHTML(f, positions, { prefix = 'f', grouping = true, dirty = false } = {}) {
  const canClear = dirty || filtersActive(f);
  return `
  <div class="filter-bar" role="group" aria-label="ตัวกรองผู้สมัคร">
    <div class="field">
      <label for="${prefix}-pos">ตำแหน่ง</label>
      <select id="${prefix}-pos" class="input" data-f="pos">
        <option value="all">ทุกตำแหน่ง</option>
        ${positions.map((p) => `<option value="${esc(p)}" ${p === f.pos ? 'selected' : ''}>${esc(p)}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label for="${prefix}-range">ช่วงวันที่ Prescreen</label>
      <select id="${prefix}-range" class="input" data-f="range">
        ${RANGES.map((r) => `<option value="${r.id}" ${r.id === f.range ? 'selected' : ''}>${r.label}</option>`).join('')}
      </select>
    </div>
    ${f.range === 'custom' ? `
      <div class="field"><label for="${prefix}-from">ตั้งแต่</label><input id="${prefix}-from" class="input" type="date" data-f="from" value="${esc(f.from)}"></div>
      <div class="field"><label for="${prefix}-to">ถึง</label><input id="${prefix}-to" class="input" type="date" data-f="to" value="${esc(f.to)}"></div>` : ''}
    ${grouping ? `<button type="button" class="chip" data-f-group aria-pressed="${f.group}" style="align-self:flex-end">จัดกลุ่มตามตำแหน่ง</button>` : ''}
    <button type="button" class="btn btn-sm filter-clear" data-f-clear ${canClear ? '' : 'disabled'}>${ICONS.refresh} ล้างตัวกรอง</button>
  </div>`;
}

// Apply a change event from a [data-f] control; returns true when handled.
export function updateFilter(f, el) {
  const k = el.dataset.f;
  if (!k) return false;
  f[k] = el.value;
  if (k === 'range' && el.value !== 'custom') { f.from = ''; f.to = ''; }
  return true;
}
