/* ==========================================================================
   明戸杯2026 トーナメント表
   ・データ元は「成績管理スプレッドシート」から吐き出された bracket.json だけ
   ・描画は全部SVG。だからそのままPNGに焼ける
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.MEIDO_CONFIG || {};
  var A   = window.MEIDO_ASSETS || {};

  /* ---------- パレット（配信画面・ロゴから採色） -------------------------- */
  var C = {
    crimson:'#D8143F', crimsonD:'#A50E30', crimsonDD:'#7A0722', crimsonL:'#F04A6C',
    rose:'#FFE4EA',                       // 通過者の行。金グラデの代わり
    gold:'#F2C14E', goldL:'#F7D785',
    paper:'#FFFFFF', paper2:'#F4F1EA', line:'#DDD6CC',
    ink:'#2E2A28', inkMute:'#8C8580',
    teal:'#0E8C77', tealL:'#16B197', tealD:'#0A6656',
    white:'#FFFFFF',
    // 旧名の互換（他の箇所から参照されているもの）
    cream:'#FFFFFF', creamD:'#F4F1EA',
  };
  var FONT_SANS  = "'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif";
  var FONT_SERIF = "'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif";

  /* ---------- レイアウト定数 ---------------------------------------------- */
  var L = {
    pad: 60, headerH: 200,
    cardW: 208, headH: 24, rowH: 22, cardPad: 6,
    colGap: 58, vGap: 16, blockGap: 96,
    centerW: 340,
  };
  L.cardH = L.headH + L.rowH * 4 + L.cardPad * 2;   // 122
  L.pitch = L.cardH + L.vGap;                       // 138
  L.blockH = L.pitch * 8 - L.vGap;                  // 1088
  L.sideW = 4 * (L.cardW + L.colGap);               // 1064
  L.W = L.pad * 2 + L.sideW * 2 + L.centerW;        // 2588
  L.H = L.headerH + L.blockH * 2 + L.blockGap + L.pad;

  var ROUND_COL = { R1:0, R2:1, R3:2, R4:3 };
  var SIDE = { A:{side:'L',row:0}, B:{side:'L',row:1}, C:{side:'R',row:0}, D:{side:'R',row:1} };

  /* ========================================================================
     SVGユーティリティ
     ======================================================================== */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  /** 全角=1, 半角=0.55 として概算幅で切り詰める */
  function fit(s, maxUnits){
    s = String(s == null ? '' : s);
    var w = 0, out = '';
    for (var i=0;i<s.length;i++){
      var c = s.charCodeAt(i);
      var u = (c < 0x100 || (c >= 0xFF61 && c <= 0xFF9F)) ? 0.55 : 1;
      if (w + u > maxUnits) return out + '…';
      w += u; out += s[i];
    }
    return out;
  }
  function txt(x, y, s, o){
    o = o || {};
    return '<text x="'+r2(x)+'" y="'+r2(y)+'"' +
      ' font-family="'+(o.serif ? FONT_SERIF : FONT_SANS)+'"' +
      ' font-size="'+(o.size || 12)+'"' +
      ' font-weight="'+(o.weight || 400)+'"' +
      ' fill="'+(o.fill || C.ink)+'"' +
      (o.anchor ? ' text-anchor="'+o.anchor+'"' : '') +
      (o.spacing ? ' letter-spacing="'+o.spacing+'"' : '') +
      (o.opacity ? ' opacity="'+o.opacity+'"' : '') +
      '>'+esc(s)+'</text>';
  }
  function rect(x,y,w,h,o){
    o = o || {};
    return '<rect x="'+r2(x)+'" y="'+r2(y)+'" width="'+r2(w)+'" height="'+r2(h)+'"' +
      (o.rx ? ' rx="'+o.rx+'"' : '') +
      ' fill="'+(o.fill || 'none')+'"' +
      (o.stroke ? ' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1.5)+'"' : '') +
      (o.opacity ? ' opacity="'+o.opacity+'"' : '') + '/>';
  }
  function r2(n){ return Math.round(n*100)/100; }
  function fmtPt(v){
    if (v === null || v === undefined || v === '') return '';
    var n = Number(v);
    return (n > 0 ? '+' : '') + (Math.round(n*10)/10).toFixed(1);
  }

  /* 梅の花（区切り飾り） */
  function plum(x, y, s, fill){
    var p = 'M0 -17 C 7 -17 11 -11 11 -6 C 11 -1 6 2 0 2 C -6 2 -11 -1 -11 -6 C -11 -11 -7 -17 0 -17 Z';
    var g = '<g transform="translate('+r2(x)+','+r2(y)+') scale('+s+')">';
    for (var i=0;i<5;i++) g += '<path d="'+p+'" transform="rotate('+(i*72)+')" fill="'+(fill||C.crimson)+'"/>';
    g += '<circle r="4.2" fill="'+C.goldL+'"/></g>';
    return g;
  }

  /* ========================================================================
     カード
     ======================================================================== */
  var SIZES = {
    small:  { w:L.cardW, headH:L.headH, rowH:L.rowH, pad:L.cardPad, name:12.5, pt:11,   head:12,   rx:7 },
    medium: { w:300,     headH:32,      rowH:34,     pad:9,         name:17,   pt:14.5, head:15,   rx:9 },
    final:  { w:L.centerW,headH:38,     rowH:52,     pad:12,        name:23,   pt:17,   head:18,   rx:12 },
  };
  function cardH(S){ return S.headH + S.rowH*4 + S.pad*2; }

  function cardSvg(t, x, y, S, subLabel){
    var h = cardH(S), o = [];
    var done = t.status === 'done';
    // 3状態を色で出し分ける: 決着=深緑 / これから打つ=金 / 未定=グレー
    var accent  = done ? C.teal : (t.status === 'ready' ? C.gold : C.line);
    var headInk = done ? C.white : (t.status === 'ready' ? C.crimsonD : C.inkMute);

    o.push('<g class="tcard">');
    o.push(rect(x, y, S.w, h, {rx:S.rx, fill:C.paper, stroke:accent, sw:2.5}));

    // ヘッダ帯（べた塗り）
    o.push('<path d="M'+r2(x)+' '+r2(y+S.headH)+' L'+r2(x)+' '+r2(y+S.rx)+
      ' Q'+r2(x)+' '+r2(y)+' '+r2(x+S.rx)+' '+r2(y)+
      ' L'+r2(x+S.w-S.rx)+' '+r2(y)+' Q'+r2(x+S.w)+' '+r2(y)+' '+r2(x+S.w)+' '+r2(y+S.rx)+
      ' L'+r2(x+S.w)+' '+r2(y+S.headH)+' Z" fill="'+accent+'"/>');
    o.push(txt(x+10, y+S.headH*0.71, t.label, {size:S.head, weight:900, fill:headInk, serif:true, spacing:'.04em'}));
    if (subLabel) o.push(txt(x+S.w-10, y+S.headH*0.71, subLabel, {size:S.head*0.78, weight:700, fill:headInk, anchor:'end'}));

    // 4人分の行。起家は雀魂側でランダムに決まるので座順(東南西北)は出さない。
    // 左のバッジは「卓内順位」で、対局前は空欄。
    var seats = t.seats || [];
    for (var i=0;i<4;i++){
      var s = seats[i];
      var ry = y + S.headH + S.pad + i*S.rowH;
      var base = ry + S.rowH*0.71;
      var adv = s && s.advanced;

      if (adv) o.push(rect(x+3, ry+1, S.w-6, S.rowH-2, {rx:3, fill:C.rose}));
      else if (i%2) o.push(rect(x+3, ry+1, S.w-6, S.rowH-2, {rx:3, fill:C.paper2}));

      var bx = x + 8 + S.rowH*0.33, by = ry + S.rowH/2, br = S.rowH*0.33;
      if (s && s.rank){
        o.push('<circle cx="'+r2(bx)+'" cy="'+r2(by)+'" r="'+r2(br)+'" fill="'+(adv?C.crimson:C.tealD)+'"/>');
        o.push(txt(bx, by + br*0.60, String(s.rank), {size:br*1.28, weight:900, fill:C.white, anchor:'middle'}));
      } else {
        o.push('<circle cx="'+r2(bx)+'" cy="'+r2(by)+'" r="'+r2(br-1)+'" fill="none" stroke="'+C.line+'" stroke-width="1.6"/>');
      }

      var nameX = bx + br + 7;
      var ptW = S.pt * 3.4;
      var maxUnits = ((S.w - (nameX - x) - ptW - 10) / S.name);

      if (!s || !s.playerId){
        o.push(txt(nameX, base, '—', {size:S.name, fill:C.inkMute}));
        continue;
      }
      o.push(txt(nameX, base, fit(s.name, maxUnits), {
        size:S.name, weight: adv ? 900 : 500, fill: adv ? C.crimsonD : C.ink }));

      if (s.games > 0){
        o.push(txt(x + S.w - 9, base, fmtPt(s.pt), {
          size:S.pt, weight:700, anchor:'end',
          fill: Number(s.pt) >= 0 ? C.tealD : C.crimsonD }));
      }
    }
    o.push('</g>');
    return o.join('');
  }

  /* コネクタ（親→子） */
  function link(x1, y1, x2, y2, active){
    var mid = (x1 + x2) / 2;
    return '<path d="M'+r2(x1)+' '+r2(y1)+' C'+r2(mid)+' '+r2(y1)+' '+r2(mid)+' '+r2(y2)+' '+r2(x2)+' '+r2(y2)+'"' +
      ' fill="none" stroke="'+(active ? C.gold : 'rgba(255,255,255,.26)')+'"' +
      ' stroke-width="'+(active ? 3 : 2)+'" stroke-linecap="round"/>';
  }

  /* ========================================================================
     背景・ヘッダ
     ======================================================================== */
  function background(w, h){
    return [
      '<defs>',
      '<pattern id="seigaiha" width="120" height="60" patternUnits="userSpaceOnUse">',
        '<path d="M0 60 A60 60 0 0 1 120 60" fill="none" stroke="rgba(255,255,255,.055)" stroke-width="2"/>',
        '<path d="M-60 60 A60 60 0 0 1 60 60" fill="none" stroke="rgba(255,255,255,.055)" stroke-width="2"/>',
      '</pattern>',
      '</defs>',
      rect(0,0,w,h,{fill:'#BF1339'}),
      rect(0,0,w,h,{fill:'url(#seigaiha)'}),
      rect(18,18,w-36,h-36,{rx:12, stroke:C.gold, sw:3}),
      rect(27,27,w-54,h-54,{rx:8, stroke:C.teal, sw:6}),
      rect(32,32,w-64,h-64,{rx:6, stroke:C.gold, sw:1.6}),
    ].join('');
  }

  function header(data, w){
    var o = [];
    var t = data.tournament || {};
    if (A.logoYoko) o.push('<image href="'+A.logoYoko+'" x="'+L.pad+'" y="46" height="104" preserveAspectRatio="xMinYMid meet"/>');
    o.push(txt(w/2, 96, t.name || '明戸杯', {size:46, weight:900, serif:true, fill:C.white, anchor:'middle', spacing:'.1em'}));
    var sub = [t.subtitle, t.date].filter(Boolean).join('　／　');
    o.push(txt(w/2, 130, sub, {size:16, weight:700, fill:C.gold, anchor:'middle', spacing:'.22em'}));
    o.push(plum(w/2 - 150, 122, 0.9));
    o.push(plum(w/2 + 150, 122, 0.9));

    // ラウンド進行
    var x = w - L.pad, chips = (data.rounds || []).slice().reverse();
    chips.forEach(function (r) {
      var label = r.short + ' ' + r.done + '/' + r.tables;
      var cw = 108;
      x -= cw + 8;
      var full = r.done === r.tables && r.tables > 0;
      o.push(rect(x, 62, cw, 30, {rx:15, fill: full ? C.teal : C.crimsonDD, stroke:C.gold, sw:1.6}));
      o.push(txt(x + cw/2, 82, label, {size:13, weight:700, fill:C.white, anchor:'middle'}));
    });
    o.push(txt(w - L.pad, 120, 'rev.' + (data.rev||0) + '  ' + (data.updatedAt||'').replace('T',' ').slice(0,16),
      {size:11.5, fill:'rgba(255,255,255,.62)', anchor:'end'}));
    return o.join('');
  }

  /* ========================================================================
     ビュー1: 全体
     ======================================================================== */
  function buildOverview(data){
    var byId = {}; (data.tables||[]).forEach(function(t){ byId[t.id]=t; });
    var W = L.W, H = L.H;
    var o = [background(W,H), header(data, W)];

    // --- 立ち絵（中央の余白に忍ばせる） ---
    var cx = L.pad + L.sideW;
    if (A.enaSd)   o.push('<image href="'+A.enaSd+'" x="'+(cx+18)+'" y="300" width="304" opacity=".30" preserveAspectRatio="xMidYMax meet"/>');
    if (A.ataruSd) o.push('<image href="'+A.ataruSd+'" x="'+(cx+18)+'" y="'+(H-760)+'" width="304" opacity=".30" preserveAspectRatio="xMidYMin meet"/>');

    var pos = {};   // 卓ID → {x,y,cyc,side}
    var links = [];

    CONFIG_BLOCKS(data).forEach(function (b) {
      var meta = SIDE[b] || {side:'L',row:0};
      var y0 = L.headerH + meta.row * (L.blockH + L.blockGap);

      // ブロック見出し
      var headX = meta.side === 'L' ? L.pad : W - L.pad;
      o.push(txt(headX, y0 - 16, b + ' ブロック', {
        size:19, weight:900, serif:true, fill:C.gold, spacing:'.24em',
        anchor: meta.side === 'L' ? 'start' : 'end' }));

      ['R1','R2','R3','R4'].forEach(function (rid) {
        var col = ROUND_COL[rid];
        var ts = (data.tables||[]).filter(function(t){ return t.round===rid && t.block===b; })
                  .sort(function(a,b2){ return a.order-b2.order; });
        var x = meta.side === 'L'
          ? L.pad + col * (L.cardW + L.colGap)
          : W - L.pad - L.cardW - col * (L.cardW + L.colGap);

        ts.forEach(function (t, i) {
          var y;
          if (rid === 'R1') {
            y = y0 + i * L.pitch;
          } else {
            var pcy = t.parents.map(function(p){ return pos[p] ? pos[p].cy : null; }).filter(function(v){ return v!==null; });
            var avg = pcy.length ? pcy.reduce(function(a,b3){return a+b3;},0)/pcy.length : y0 + L.blockH/2;
            y = avg - L.cardH/2;
          }
          pos[t.id] = { x:x, y:y, cy:y + L.cardH/2, side:meta.side, t:t };
          o.push(cardSvg(t, x, y, SIZES.small, null));

          t.parents.forEach(function (pid) {
            var p = pos[pid]; if (!p) return;
            var x1 = meta.side==='L' ? p.x + L.cardW : p.x;
            var x2 = meta.side==='L' ? x : x + L.cardW;
            links.push(link(x1, p.cy, x2, y + L.cardH/2, p.t.status === 'done'));
          });
        });
      });
    });

    // --- 決勝卓 ---
    var fin = (data.tables||[]).filter(function(t){ return t.round==='R5'; })[0];
    if (fin){
      var fh = cardH(SIZES.final);
      var fy = L.headerH + L.blockH + L.blockGap/2 - fh/2;
      var fx = L.pad + L.sideW;
      o.push('<g>');
      o.push(txt(fx + L.centerW/2, fy - 26, '決　勝', {size:26, weight:900, serif:true, fill:C.gold, anchor:'middle', spacing:'.44em'}));
      o.push(cardSvg(fin, fx, fy, SIZES.final, null));
      o.push('</g>');

      fin.parents.forEach(function (pid) {
        var p = pos[pid]; if (!p) return;
        var x1 = p.side==='L' ? p.x + L.cardW : p.x;
        var x2 = p.side==='L' ? fx : fx + L.centerW;
        links.push(link(x1, p.cy, x2, fy + fh/2, p.t.status === 'done'));
      });

      // 優勝者
      var champ = (data.tournament||{}).champion;
      if (champ){
        var by = fy + fh + 26;
        o.push(rect(fx-14, by, L.centerW+28, 74, {rx:37, fill:C.gold, stroke:C.white, sw:3}));
        o.push(txt(fx + L.centerW/2, by+28, '優　勝', {size:14, weight:900, serif:true, fill:C.crimsonD, anchor:'middle', spacing:'.5em'}));
        o.push(txt(fx + L.centerW/2, by+60, fit(champ, 11), {size:27, weight:900, serif:true, fill:C.crimsonDD, anchor:'middle'}));
      }
    }

    return { svg: links.join('') + o.join(''), w: W, h: H, order:'links-first' };
  }

  function CONFIG_BLOCKS(data){ return (data.blocks && data.blocks.length) ? data.blocks : ['A','B','C','D']; }

  /* ========================================================================
     ビュー2: ブロック
     ======================================================================== */
  function buildBlock(data, block){
    var S = SIZES.medium, ch = cardH(S);
    var pitch = ch + 22;
    var colGap = 86;
    var W = L.pad*2 + 4*S.w + 3*colGap;
    var top = 190;
    var H = top + pitch*8 - 22 + L.pad;

    var o = [background(W,H)];
    o.push(txt(W/2, 92, (data.tournament||{}).name || '明戸杯', {size:34, weight:900, serif:true, fill:C.cream, anchor:'middle', spacing:'.1em'}));
    o.push(txt(W/2, 130, block + ' ブロック', {size:20, weight:900, serif:true, fill:C.goldL, anchor:'middle', spacing:'.4em'}));
    o.push(plum(W/2-118, 122, .85)); o.push(plum(W/2+118, 122, .85));

    var pos = {}, links = [];
    ['R1','R2','R3','R4'].forEach(function (rid) {
      var col = ROUND_COL[rid];
      var x = L.pad + col*(S.w+colGap);
      var rd = (data.rounds||[]).filter(function(r){return r.id===rid;})[0] || {};
      o.push(txt(x + S.w/2, top - 22, rd.name || rid, {size:16, weight:900, serif:true, fill:C.gold, anchor:'middle', spacing:'.2em'}));

      var ts = (data.tables||[]).filter(function(t){ return t.round===rid && t.block===block; })
                .sort(function(a,b){ return a.order-b.order; });
      ts.forEach(function (t, i) {
        var y;
        if (rid === 'R1') y = top + i*pitch;
        else {
          var pcy = t.parents.map(function(p){ return pos[p] ? pos[p].cy : null; }).filter(function(v){return v!==null;});
          var avg = pcy.length ? pcy.reduce(function(a,b){return a+b;},0)/pcy.length : top + (pitch*8)/2;
          y = avg - ch/2;
        }
        pos[t.id] = { x:x, y:y, cy:y+ch/2, t:t };
        o.push(cardSvg(t, x, y, S, null));
        t.parents.forEach(function (pid) {
          var p = pos[pid]; if (!p) return;
          links.push(link(p.x+S.w, p.cy, x, y+ch/2, p.t.status==='done'));
        });
      });
    });
    return { svg: links.join('') + o.join(''), w:W, h:H };
  }

  /* ========================================================================
     ビュー3: ラウンド
     ======================================================================== */
  function buildRound(data, roundId){
    var ts = (data.tables||[]).filter(function(t){ return t.round===roundId; })
              .sort(function(a,b){ return a.order-b.order; });
    var rd = (data.rounds||[]).filter(function(r){ return r.id===roundId; })[0] || {};
    var S = roundId==='R5' ? SIZES.final : SIZES.medium;
    var ch = cardH(S);
    var cols = Math.min(8, Math.max(1, Math.ceil(Math.sqrt(ts.length*1.6))));
    var gapX = 30, gapY = 30, top = 190;
    var W = L.pad*2 + cols*S.w + (cols-1)*gapX;
    var rows = Math.ceil(ts.length/cols);
    var H = top + rows*(ch+gapY) - gapY + L.pad;

    var o = [background(W,H)];
    o.push(txt(W/2, 92, (data.tournament||{}).name || '明戸杯', {size:34, weight:900, serif:true, fill:C.cream, anchor:'middle', spacing:'.1em'}));
    o.push(txt(W/2, 132, (rd.name||roundId) + '　' + (rd.entrants||'') + '名 → ' + Math.round((rd.entrants||0)/4*(rd.advance||2)) + '名',
      {size:18, weight:900, serif:true, fill:C.gold, anchor:'middle', spacing:'.24em'}));

    ts.forEach(function (t, i) {
      var cx = i % cols, cy = Math.floor(i/cols);
      o.push(cardSvg(t, L.pad + cx*(S.w+gapX), top + cy*(ch+gapY), S, null));
    });
    return { svg:o.join(''), w:W, h:H };
  }

  /* ========================================================================
     データ取得と同期
     ======================================================================== */
  var data = null, curRev = -1, timer = null, view = CFG.defaultView || 'overview';
  var scopeBlock = 'A', scopeRound = 'R1', zoom = 'fit';

  function urlFor(kind){
    if (CFG.staticBase) return CFG.staticBase + (kind === 'rev' ? 'rev.json' : 'bracket.json');
    if (CFG.gasUrl) {
      var u = CFG.gasUrl + (CFG.gasUrl.indexOf('?')<0 ? '?' : '&') + 'api=' + (kind==='rev'?'rev':'bracket');
      if (CFG.apiToken) u += '&token=' + encodeURIComponent(CFG.apiToken);
      return u;
    }
    return null;
  }

  function getJson(url){
    return fetch(url + (url.indexOf('?')<0?'?':'&') + '_=' + Date.now(), { cache:'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .catch(function(err){
        if (!CFG.allowJsonp || !CFG.gasUrl || CFG.staticBase) throw err;
        return getJsonp(url);
      });
  }
  /** GASにCORSで弾かれたとき用 */
  function getJsonp(url){
    return new Promise(function(resolve, reject){
      var cb = '__meido_cb_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');
      var to = setTimeout(function(){ cleanup(); reject(new Error('JSONP timeout')); }, 15000);
      function cleanup(){ clearTimeout(to); delete window[cb]; s.remove(); }
      window[cb] = function(d){ cleanup(); resolve(d); };
      s.src = url + (url.indexOf('?')<0?'?':'&') + 'callback=' + cb + '&_=' + Date.now();
      s.onerror = function(){ cleanup(); reject(new Error('JSONP error')); };
      document.head.appendChild(s);
    });
  }

  function setLive(cls, text){
    var el = document.getElementById('live');
    el.className = 'live' + (cls ? ' ' + cls : '');
    document.getElementById('liveTxt').textContent = text;
  }

  function loadFull(){
    var u = urlFor('bracket');
    if (!u) return Promise.reject(new Error('config.js に staticBase か gasUrl を設定してください'));
    return getJson(u).then(function (d) {
      data = d; curRev = d.rev;
      render();
      setLive('ok', 'rev.' + d.rev + ' / ' + (d.updatedAt||'').replace('T',' ').slice(11,16));
      return d;
    });
  }

  /** rev.json だけを見て、変わったときだけ本体を取りに行く */
  function pollRev(){
    var u = urlFor('rev');
    if (!u) return;
    getJson(u).then(function (r) {
      if (Number(r.rev) !== curRev) { toast('更新がありました'); loadFull(); }
      else setLive('ok', 'rev.' + curRev);
    }).catch(function (e) { setLive('err', '取得失敗'); });
  }

  function startPolling(){
    if (timer) clearInterval(timer);
    var ms = Math.max(3000, Number(CFG.pollRevMs || 15000));
    timer = setInterval(pollRev, ms);
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) pollRev();     // タブに戻ったら即確認
    });
  }

  /* ========================================================================
     描画
     ======================================================================== */
  var current = null;
  function render(){
    if (!data) return;
    var b;
    if (view === 'block')      b = buildBlock(data, scopeBlock);
    else if (view === 'round') b = buildRound(data, scopeRound);
    else                       b = buildOverview(data);
    current = b;

    document.getElementById('viewport').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'id="bracketSvg" viewBox="0 0 '+b.w+' '+b.h+'" width="'+b.w+'" height="'+b.h+'">' +
      b.svg + '</svg>';
    applyZoom();

    var t = data.tournament || {};
    document.getElementById('tbTitle').textContent = t.name || '明戸杯';
    document.getElementById('tbSub').textContent =
      (t.champion ? '優勝: ' + t.champion : '進行中: ' + (roundName(t.currentRound) || '-'));
  }
  /** 画面上の表示倍率。PNG書き出しには影響しない（常に原寸×exportScale） */
  function applyZoom(){
    var vp = document.getElementById('viewport');
    var svg = document.getElementById('bracketSvg');
    if (!svg) return;
    if (zoom === 'fit'){ vp.classList.add('fit'); svg.style.width = ''; }
    else { vp.classList.remove('fit'); svg.style.width = (current.w * zoom) + 'px'; }
    document.getElementById('zFit').classList.toggle('on', zoom === 'fit');
  }
  function stepZoom(dir){
    var vp = document.getElementById('viewport');
    var base = (zoom === 'fit')
      ? (document.getElementById('bracketSvg').getBoundingClientRect().width / current.w)
      : zoom;
    zoom = Math.min(3, Math.max(0.15, Math.round((base + dir*0.15) * 100) / 100));
    applyZoom();
    toast(Math.round(zoom*100) + '%');
  }

  function roundName(id){
    var r = (data.rounds||[]).filter(function(x){ return x.id===id; })[0];
    return r ? r.name : id;
  }

  /* ========================================================================
     PNG書き出し
     ======================================================================== */
  function exportPng(){
    if (!current) return;
    var btn = document.getElementById('btnPng');
    btn.disabled = true; toast('PNGを生成しています…');

    var scale = Number(CFG.exportScale || 2);
    var svg = document.getElementById('bracketSvg').cloneNode(true);
    svg.setAttribute('width', current.w);
    svg.setAttribute('height', current.h);
    var src = new XMLSerializer().serializeToString(svg);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);

    var img = new Image();
    img.onload = function(){
      var cv = document.createElement('canvas');
      cv.width  = Math.round(current.w * scale);
      cv.height = Math.round(current.h * scale);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#BF1339';
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function(blob){
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName() + '.png';
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
        btn.disabled = false; toast('保存しました');
      }, 'image/png');
    };
    img.onerror = function(){ btn.disabled = false; toast('PNG生成に失敗しました'); };
    img.src = url;
  }
  function fileName(){
    var t = (data && data.tournament) || {};
    var v = view === 'block' ? '_' + scopeBlock + 'ブロック'
          : view === 'round' ? '_' + roundName(scopeRound) : '_全体';
    return (t.name || 'bracket') + v + '_rev' + (data ? data.rev : 0);
  }

  /* ========================================================================
     UI
     ======================================================================== */
  function toast(msg){
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('show'); }, 2600);
  }

  function initUi(){
    document.getElementById('views').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-view]'); if (!b) return;
      [].forEach.call(this.querySelectorAll('button'), function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      view = b.dataset.view;
      document.getElementById('scopeBlock').hidden = view !== 'block';
      document.getElementById('scopeRound').hidden = view !== 'round';
      render();
    });

    var sb = document.getElementById('scopeBlock');
    ['A','B','C','D'].forEach(function(b){ sb.add(new Option(b + 'ブロック', b)); });
    sb.onchange = function(){ scopeBlock = this.value; render(); };

    var sr = document.getElementById('scopeRound');
    [['R1','1回戦'],['R2','2回戦'],['R3','3回戦'],['R4','準決勝'],['R5','決勝']]
      .forEach(function(r){ sr.add(new Option(r[1], r[0])); });
    sr.onchange = function(){ scopeRound = this.value; render(); };

    document.getElementById('zIn').onclick  = function(){ stepZoom(+1); };
    document.getElementById('zOut').onclick = function(){ stepZoom(-1); };
    document.getElementById('zFit').onclick = function(){ zoom = 'fit'; applyZoom(); };

    document.getElementById('btnPng').onclick = exportPng;
    document.getElementById('btnReload').onclick = function(){ toast('再取得中…'); loadFull().catch(fail); };

    document.addEventListener('keydown', function(e){
      if (e.key === 'p' && (e.metaKey||e.ctrlKey)) { e.preventDefault(); exportPng(); }
    });
  }

  /** URLパラメータで指定された表示状態をツールバーに反映する */
  function syncUi(){
    [].forEach.call(document.querySelectorAll('#views button'), function (b) {
      b.classList.toggle('on', b.dataset.view === view);
    });
    document.getElementById('scopeBlock').hidden = view !== 'block';
    document.getElementById('scopeRound').hidden = view !== 'round';
    document.getElementById('scopeBlock').value = scopeBlock;
    document.getElementById('scopeRound').value = scopeRound;
  }

  function fail(e){
    setLive('err', 'エラー');
    toast(e.message || String(e));
    document.getElementById('viewport').innerHTML =
      '<div style="padding:80px;text-align:center;font-family:' + FONT_SANS + '">' +
      '<p style="font-size:18px">データを取得できませんでした</p>' +
      '<p style="opacity:.7;font-size:13px">' + esc(e.message||e) + '</p>' +
      '<p style="opacity:.7;font-size:13px">bracket/config.js の staticBase / gasUrl を確認してください。</p></div>';
  }

  /* ---------- 起動 -------------------------------------------------------- */
  window.addEventListener('DOMContentLoaded', function () {
    initUi();

    // ?src=... でローカルJSONを直接読める（デモ・オフライン用）
    var q = new URLSearchParams(location.search);
    if (q.get('view'))  view = q.get('view');
    if (q.get('block')) scopeBlock = q.get('block');
    if (q.get('round')) scopeRound = q.get('round');
    syncUi();
    if (q.get('src')) {
      getJson(q.get('src')).then(function (d) {
        data = d; curRev = d.rev; render(); setLive('ok', 'ローカル rev.' + d.rev);
      }).catch(fail);
      return;
    }
    loadFull().then(startPolling).catch(fail);
  });
})();
