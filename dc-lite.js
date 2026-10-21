/* Мини-рантайм для экранов мокапа: подстановка {{...}}, sc-for, sc-if, onClick */
(function () {
  var root = document.querySelector('x-dc');
  var helmet = root.querySelector('helmet');
  if (helmet) { while (helmet.firstChild) document.head.appendChild(helmet.firstChild); helmet.remove(); }
  var tpl = document.createElement('template');
  tpl.innerHTML = root.innerHTML;
  root.innerHTML = '';

  window.DCLogic = function (props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (p) { Object.assign(this.state, p); render(); };
  var src = document.querySelector('script[type="text/x-dc"]').textContent;
  var Component = new Function('DCLogic', src + '\nreturn Component;')(window.DCLogic);
  var comp = new Component({});

  function get(path, scope) {
    return path.trim().split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  function interp(str, scope) {
    return str.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = get(p, scope); return v == null ? '' : v; });
  }
  function processChildren(parent, scope) {
    Array.prototype.slice.call(parent.childNodes).forEach(function (n) { processNode(n, scope); });
  }
  function processNode(node, scope) {
    if (node.nodeType === 3) { if (node.nodeValue.indexOf('{{') > -1) node.nodeValue = interp(node.nodeValue, scope); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var list = get(node.getAttribute('list').replace(/[{}]/g, ''), scope) || [];
      var as = node.getAttribute('as');
      var frag = document.createDocumentFragment();
      list.forEach(function (item) {
        var s = Object.create(scope); s[as] = item;
        var holder = document.createElement('div');
        Array.prototype.forEach.call(node.childNodes, function (c) { holder.appendChild(c.cloneNode(true)); });
        processChildren(holder, s);
        while (holder.firstChild) frag.appendChild(holder.firstChild);
      });
      node.replaceWith(frag); return;
    }
    if (tag === 'sc-if') {
      var ok = get(node.getAttribute('value').replace(/[{}]/g, ''), scope);
      if (!ok) { node.remove(); return; }
      processChildren(node, scope);
      var f = document.createDocumentFragment();
      while (node.firstChild) f.appendChild(node.firstChild);
      node.replaceWith(f); return;
    }
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      if (a.name.indexOf('hint-') === 0) { node.removeAttribute(a.name); return; }
      if (a.value.indexOf('{{') < 0) return;
      if (a.name === 'onclick') {
        var fn = get(a.value.replace(/[{}]/g, ''), scope);
        node.removeAttribute('onclick');
        if (typeof fn === 'function') node.addEventListener('click', fn);
        return;
      }
      node.setAttribute(a.name, interp(a.value, scope));
    });
    processChildren(node, scope);
  }
  function scrolled(el, path, out) {
    if (el.scrollTop) out.push([path.slice(), el.scrollTop]);
    Array.prototype.forEach.call(el.children, function (c, i) { path.push(i); scrolled(c, path, out); path.pop(); });
    return out;
  }
  function byPath(el, path) { return path.reduce(function (e, i) { return e && e.children[i]; }, el); }
  function render() {
    var keep = scrolled(root, [], []);
    var frag = tpl.content.cloneNode(true);
    var holder = document.createElement('div'); holder.appendChild(frag);
    processChildren(holder, comp.renderVals());
    root.innerHTML = '';
    while (holder.firstChild) root.appendChild(holder.firstChild);
    keep.forEach(function (k) { var e = byPath(root, k[0]); if (e) e.scrollTop = k[1]; });
  }
  render();
  root.style.visibility = 'visible';
})();
