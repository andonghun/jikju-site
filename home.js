// 홈: 업무지구·최대 출근 시간·정렬을 고르면 역 목록을 바로 거른다.
// 데이터는 페이지 안 JSON(#home-data, src/pages/home.ts homeJson)이고 고른 값은 이 브라우저(localStorage jikju:pick)에만 남긴다.
// 표 모양은 직장 페이지 표(.rows)와 같다. 폰 칸 이름은 static/style.css가 칸 순서(.rows-h td:nth-child)로 붙인다. 출근 짧은 순이면 30분 안·31~45분·46~60분 띠로 묶는다.
(function () {
  var data = document.getElementById('home-data')
  var form = document.getElementById('pick')
  var out = document.getElementById('picked')
  var cap = document.getElementById('picked-cap')
  var notes = document.getElementById('picked-notes')
  if (!data || !form || !out || !cap) return
  var d = JSON.parse(data.textContent)
  var KEY = 'jikju:pick'
  // 띠: [기준 분, 아래, 위, 이름, 기호 반지름(지도 점과 같은 값, src/pages/map.ts DOT_R)]
  var BANDS = [[30, 0, 30, '30분 안', 4.5], [45, 31, 45, '31~45분', 3.5], [60, 46, 60, '46~60분', 2.5]]

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch (e) { return {} }
  }
  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)) } catch (e) { /* 저장 못 해도 목록은 보여 준다 */ }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' })
  }

  function rowsFor(slug, max) {
    var flat = d.r[slug] || []
    var paid = (d.p && d.p[slug]) || {}
    var list = []
    for (var i = 0; i < flat.length; i += 3) {
      if (flat[i + 1] <= max) list.push({ s: d.s[flat[i]], min: flat[i + 1], tr: flat[i + 2], paid: paid[flat[i]] })
    }
    return list
  }

  // 값이 없는 역(3건 미만·법정동 미상)은 뒤로 보낸다. 같으면 출근 짧은 순.
  function sorted(list, sort) {
    if (sort === 'min') return list
    var c = 3 + Number(sort)
    return list.slice().sort(function (a, b) {
      var x = a.s[c]
      var y = b.s[c]
      if (x === null || y === null) return (x === null) - (y === null) || a.min - b.min
      return x - y || a.min - b.min
    })
  }

  function row(x) {
    var name = '<a href="' + esc(encodeURI(x.s[1])) + '">' + esc(x.s[0]) + '</a> <span class="rt">' + esc(x.s[2]) + '</span>' +
      (x.paid ? '<span class="paid">' + esc(x.paid) + '</span>' : '')
    return '<tr><th scope="row">' + name + '</th><td class="go">' + x.min + '<span class="u">분</span></td><td>' + x.tr + '회</td>' +
      '<td class="key">' + esc(x.s[6]) + '</td><td>' + esc(x.s[7]) + '</td><td>' + esc(x.s[8]) + '</td></tr>'
  }
  function sym(b) {
    return '<svg class="sym" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><g class="b' + b[0] + '"><circle cx="7" cy="7" r="' + b[4] + '"/></g></svg>'
  }
  function band(b, list) {
    if (list.length === 0) return ''
    return '<tbody><tr class="band-row"><th colspan="6" scope="rowgroup">' + sym(b) + b[3] + ' <span class="cnt">' + list.length + '곳</span></th></tr>' + list.map(row).join('') + '</tbody>'
  }
  function head() {
    var price = d.h.map(function (h, i) {
      var sub = h[1] ? '<span class="th-sub">' + esc(h[1]) + '</span>' : ''
      return '<th scope="col"' + (i === 0 ? ' class="key"' : '') + '>' + esc(h[0]) + sub + '</th>'
    }).join('')
    return '<thead><tr><th scope="col">역</th><th scope="col" class="go">출근</th><th scope="col">환승</th>' + price + '</tr></thead>'
  }

  function current() {
    var max = form.querySelector('input[name="max"]:checked')
    return { w: form.elements.w.value, max: max ? Number(max.value) : 30, sort: form.elements.sort.value }
  }

  function render() {
    var v = current()
    var name = form.elements.w.options[form.elements.w.selectedIndex].text
    var list = sorted(rowsFor(v.w, v.max), v.sort)
    var body = v.sort === 'min'
      ? BANDS.filter(function (b) { return b[0] <= v.max }).map(function (b) { return band(b, list.filter(function (x) { return x.min >= b[1] && x.min <= b[2] })) }).join('')
      : '<tbody>' + list.map(row).join('') + '</tbody>'
    var text = name + '까지 ' + v.max + '분 안 역 ' + list.length + '곳'
    cap.textContent = text
    out.innerHTML = '<p class="unit">단위: 분, 회, 억원·만원</p><table class="rows rows-h"><caption class="sr">' + esc(text) + '</caption>' + head() + body + '</table>'
    if (notes) notes.hidden = false
    write(v)
  }

  function restore() {
    var v = read()
    if (v.w && d.r[v.w]) form.elements.w.value = v.w
    var max = [30, 45, 60].indexOf(v.max) >= 0 ? v.max : 30
    ;[].forEach.call(form.querySelectorAll('input[name="max"]'), function (i) { i.checked = Number(i.value) === max })
    if (v.sort === 'min' || ['0', '1', '2'].indexOf(v.sort) >= 0) form.elements.sort.value = v.sort
  }

  restore()
  form.hidden = false
  form.addEventListener('change', render)
  render()
})()
