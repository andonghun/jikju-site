// 직장 페이지: 30·45·60분 고르기로 표(#near)의 역과 지도(#map) 점·이름표를 같이 거르고, 출근·집값 열 머리 버튼(폰은 정렬 칸)으로 줄을 세운다.
// 절 제목·표 캡션·화면 읽기 알림은 지금 거르기와 정렬을 따라 다시 쓴다. 정렬하면 띠 묶음 대신 행마다 띠 기호(.flat tr.s30 등)를 붙인다.
// 스크립트가 꺼지면 고르기 칸은 숨고 정렬 버튼·칸은 생기지 않아 60분 안 역이 모두 출근 시간순으로 보인다.
// 고른 시간은 홈과 같은 localStorage 칸(jikju:pick)의 max에 남긴다.
(function () {
  var box = document.getElementById('limit')
  var table = document.getElementById('near')
  if (!box || !table) return
  var fig = document.getElementById('map')
  var out = document.getElementById('limit-count')
  var head = document.getElementById('near-h')
  var warn = document.querySelector('.sort-warn')
  var place = table.getAttribute('data-w') || ''
  var bands = [].slice.call(table.tBodies)
  var rows = [].slice.call(table.querySelectorAll('tr[data-min]'))
  var home = rows.map(function (tr) { return tr.parentNode })
  var flat = document.createElement('tbody')
  flat.className = 'flat'
  var KEY = 'jikju:pick'
  var LABELS = ['아파트 전세', '오피스텔 월세(월 금액)', '아파트 매매']
  var max = 60
  var sortKey = 'min'
  var sortDir = 1
  var picker = null

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch (e) { return {} }
  }
  function write(m) {
    try { var v = read(); v.max = m; localStorage.setItem(KEY, JSON.stringify(v)) } catch (e) { /* 저장 못 해도 거르기는 된다 */ }
  }

  function order() {
    return sortKey === 'min' ? '출근 시간순' : LABELS[Number(sortKey)] + (sortDir === 1 ? ' 낮은 순' : ' 높은 순')
  }

  function sayState(n) {
    var state = max + '분 안 ' + n + '곳'
    if (out) out.textContent = state + ', ' + order()
    if (table.caption) table.caption.textContent = place + '까지 ' + max + '분 안 역 ' + n + '곳, ' + order()
    if (head && head.firstChild) head.firstChild.nodeValue = order() + ' 역 '
    var small = head && head.querySelector('small')
    if (small) small.textContent = state
  }

  function markSort() {
    ;[].forEach.call(table.tHead.querySelectorAll('th[data-sort]'), function (h) {
      if (h.getAttribute('data-sort') === sortKey) h.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending')
      else h.removeAttribute('aria-sort')
    })
    if (picker) picker.value = sortKey === 'min' ? 'min' : sortKey + ':' + sortDir
    if (warn) warn.hidden = sortKey === 'min'
  }

  function apply() {
    var n = 0
    rows.forEach(function (tr) {
      tr.hidden = Number(tr.getAttribute('data-min')) > max
      if (!tr.hidden) n++
    })
    bands.forEach(function (g) { g.hidden = sortKey !== 'min' || Number(g.getAttribute('data-band')) > max })
    flat.hidden = sortKey === 'min'
    if (fig) fig.setAttribute('data-max', String(max))
    markSort()
    sayState(n)
  }

  // 집값 정렬값(data-v의 i번째). 빈 칸은 null이고 방향과 상관없이 맨 뒤로 간다. 같으면 출근 시간순(처음 순서).
  function value(tr, i) {
    var v = (tr.getAttribute('data-v') || '').split(',')[i]
    return v === '' || v === undefined ? null : Number(v)
  }
  function sortRows(i, dir) {
    var list = rows.map(function (tr, k) { return { tr: tr, k: k, v: value(tr, i) } })
    list.sort(function (a, b) {
      if (a.v === null || b.v === null) return (a.v === null) - (b.v === null) || a.k - b.k
      return (a.v - b.v) * dir || a.k - b.k
    })
    list.forEach(function (o) { flat.appendChild(o.tr) })
  }
  function restore() {
    rows.forEach(function (tr, k) { home[k].appendChild(tr) })
  }

  function sortBy(key, dir) {
    sortKey = key
    sortDir = key === 'min' ? 1 : dir
    if (key === 'min') restore()
    else sortRows(Number(key), sortDir)
    apply()
  }

  // 머리 버튼: 출근은 짧은 순 한 방향, 집값은 누를 때마다 낮은 순·높은 순을 바꾼다.
  var UP = '<path class="up" d="M3 5l3-3 3 3"/>'
  var DN = '<path class="dn" d="M3 7l3 3 3-3"/>'
  ;[].forEach.call(table.tHead.querySelectorAll('th[data-sort]'), function (th) {
    var key = th.getAttribute('data-sort')
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'sort'
    while (th.firstChild) btn.appendChild(th.firstChild)
    btn.insertAdjacentHTML('beforeend', '<svg class="sort-ico" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">' + UP + (key === 'min' ? '' : DN) + '</svg>')
    btn.addEventListener('click', function () {
      sortBy(key, key !== 'min' && sortKey === key && sortDir === 1 ? -1 : 1)
    })
    th.appendChild(btn)
  })

  // 폰 정렬 칸: 폰에서는 월세·매매 열 머리가 숨으므로 같은 정렬을 고르는 칸 하나를 표 위에 둔다(넓은 화면에서는 CSS가 숨긴다).
  function makePicker() {
    var opts = ['<option value="min">출근 짧은 순</option>']
    LABELS.forEach(function (l, i) {
      opts.push('<option value="' + i + ':1">' + l + ' 낮은 순</option>', '<option value="' + i + ':-1">' + l + ' 높은 순</option>')
    })
    var label = document.createElement('label')
    label.className = 'field sort-pick'
    label.innerHTML = '<span class="field-k">정렬</span><span class="select"><select>' + opts.join('') + '</select>' +
      '<svg class="chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></span>'
    picker = label.querySelector('select')
    picker.addEventListener('change', function () {
      var v = picker.value.split(':')
      sortBy(v[0], Number(v[1] || 1))
    })
    var at = warn || table
    at.parentNode.insertBefore(label, at)
  }

  rows.forEach(function (tr) {
    var m = Number(tr.getAttribute('data-min'))
    tr.classList.add(m <= 30 ? 's30' : m <= 45 ? 's45' : 's60')
  })
  makePicker()
  table.appendChild(flat)

  var saved = read().max
  max = [30, 45, 60].indexOf(saved) >= 0 ? saved : 60
  // fieldset.elements.max는 라디오 묶음이 아니라 첫 라디오 하나라서 value를 쓰면 그 버튼 값이 바뀐다. 직접 체크한다.
  ;[].forEach.call(box.querySelectorAll('input[name="max"]'), function (i) { i.checked = Number(i.value) === max })
  box.hidden = false
  box.addEventListener('change', function (e) {
    max = Number(e.target.value)
    apply()
    write(max)
  })
  apply()
})()
