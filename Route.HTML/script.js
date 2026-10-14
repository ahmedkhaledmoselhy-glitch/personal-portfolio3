document.documentElement.classList.add('js');

(function () {
  'use strict';

  var D = document,
      R = D.documentElement;

  function $(s) {
    return D.querySelector(s);
  }

  function $$(s) {
    return Array.prototype.slice.call(D.querySelectorAll(s));
  }

  var lang = 'en',
      navH = 64,
      lastY = 0;

  try {
    lang = localStorage.getItem('lang') === 'ar' ? 'ar' : 'en';

    R.dataset.theme =
      localStorage.getItem('theme') === 'dark'
        ? 'dark'
        : 'light';

  } catch (e) {
    R.dataset.theme = 'light';
  }


  /* ---------- Letter reveal ---------- */

  var rvs = $$('.rv'),
      heroRv = $$('#home .rv'),
      revealBusy = false,
      revealTimers = [];


  $$('[data-ar], .rv').forEach(function (el) {

    if (!el.dataset.en) {
      el.dataset.en = el.textContent.trim();
    }

  });


  function clearRevealTimers() {

    for (var i = 0; i < revealTimers.length; i++) {
      clearTimeout(revealTimers[i]);
    }

    revealTimers = [];
    revealBusy = false;
  }


  function paint(el) {

    var n = el.n,
        s = el._s,
        c = el._c,
        i;

    if (n > s) {

      for (i = s; i < n; i++) {
        c[i].className = 'on';
      }

    } else {

      for (i = n; i < s; i++) {
        c[i].className = '';
      }

    }

    el._s = n;
  }


  function build(el, frac) {

    var t =
        (lang === 'ar' && el.dataset.ar)
          ? el.dataset.ar
          : el.dataset.en,

        words = t.split(' '),
        cs = [];


    el.setAttribute('aria-label', t);
    el.textContent = '';


    words.forEach(function (w, i) {

      var ws = D.createElement('span');

      ws.className = 'w';
      ws.setAttribute('aria-hidden', 'true');


      for (var k = 0; k < w.length; k++) {

        var c = D.createElement('span');

        c.textContent = w.charAt(k);
        c.style.transitionDelay = '0ms';

        ws.appendChild(c);
        cs.push(c);
      }


      el.appendChild(ws);


      if (i < words.length - 1) {
        el.appendChild(D.createTextNode(' '));
      }

    });


    el._c = cs;
    el.len = cs.length;
    el._s = 0;
    el.n = Math.round(frac * cs.length);

    paint(el);
  }


  function inView(el) {

    var r = el.getBoundingClientRect();

    return r.top < innerHeight * 0.88 &&
           r.bottom > navH;
  }


  function autoAbove() {

    rvs.forEach(function (el) {

      if (
        el.n < el.len &&
        el.getBoundingClientRect().bottom < navH - 4
      ) {

        el.n = el.len;
        paint(el);
      }

    });
  }


  function nextEl() {

    for (var i = 0; i < rvs.length; i++) {

      if (rvs[i].n < rvs[i].len) {
        return rvs[i];
      }

    }

    return null;
  }


  /*
   * Reveal queued letters one at a time.
   * The page remains locked while the letters are being revealed.
   */
  function revealQueue(queue) {

    if (!queue.length) {
      revealBusy = false;
      schedule();
      return;
    }

    revealBusy = true;

    var index = 0,
        position = 0;


    function revealNext() {

      if (index >= queue.length) {

        revealBusy = false;
        revealTimers = [];

        schedule();
        return;
      }


      var item = queue[index],
          el = item.el;


      if (
        !el ||
        !el._c ||
        position >= item.count ||
        el.n >= el.len
      ) {

        index++;
        position = 0;

        revealNext();
        return;
      }


      /*
       * Exactly ONE new letter becomes blue per step.
       */
      el.n++;

      paint(el);

      position++;


      /*
       * One letter every 1 millisecond.
       */
      var timer = setTimeout(function () {
        revealNext();
      }, 1);

      revealTimers.push(timer);
    }


    revealNext();
  }


  /*
   * Returns true only if a visible, unrevealed element
   * consumed the scroll.
   */
  function advance(c) {

    if (revealBusy) {
      return true;
    }


    var el = nextEl();

    if (!el || !inView(el)) {
      return false;
    }


    /*
     * Convert wheel distance into a reasonable number of letters.
     * They are still revealed strictly one by one.
     */
    var count = Math.max(
      1,
      Math.min(
        28,
        Math.round(Math.abs(c) * 0.3)
      )
    );


    var queue = [];


    while (
      count > 0 &&
      el &&
      inView(el)
    ) {

      var available = el.len - el.n;

      if (available <= 0) {
        el = nextEl();
        continue;
      }


      var take = Math.min(
        count,
        available
      );


      queue.push({
        el: el,
        count: take
      });


      count -= take;


      if (el.n + take >= el.len) {
        el = nextEl();
      } else {
        break;
      }

    }


    if (!queue.length) {
      return false;
    }


    revealQueue(queue);
    schedule();

    return true;
  }


  function resetHero() {

    clearRevealTimers();

    heroRv.forEach(function (el) {
      el.n = 0;
      paint(el);
    });

    schedule();
  }


  /*
   * Downward only.
   * Upward wheel/touch/keys are never intercepted.
   */
  addEventListener(
    'wheel',
    function (e) {

      if (e.ctrlKey) {
        return;
      }


      if (e.deltaY < 0) {

        /*
         * Upward scrolling is always allowed.
         */
        if (scrollY <= 2) {
          resetHero();
        }

        return;
      }


      if (e.deltaY === 0) {
        return;
      }


      autoAbove();


      var d =
        e.deltaMode === 1
          ? e.deltaY * 16
          : e.deltaY;


      if (
        advance(
          Math.max(
            6,
            Math.abs(d) * 0.3
          )
        )
      ) {

        e.preventDefault();
      }

    },
    {
      passive: false
    }
  );


  var ty = 0;


  addEventListener(
    'touchstart',
    function (e) {

      ty = e.touches[0].clientY;

    },
    {
      passive: true
    }
  );


  addEventListener(
    'touchmove',
    function (e) {

      var y = e.touches[0].clientY,
          dy = ty - y;

      ty = y;


      /*
       * Upward touch movement is allowed.
       */
      if (dy <= 0) {
        return;
      }


      autoAbove();


      if (
        advance(
          Math.max(
            4,
            dy * 1.2
          )
        ) &&
        e.cancelable
      ) {

        e.preventDefault();
      }

    },
    {
      passive: false
    }
  );


  addEventListener(
    'keydown',
    function (e) {

      if (
        ['ArrowDown', 'PageDown', ' '].indexOf(e.key) < 0 ||
        (
          e.target.closest &&
          e.target.closest(
            'button,a,input,textarea'
          )
        )
      ) {

        return;
      }


      autoAbove();


      if (advance(40)) {
        e.preventDefault();
      }

    }
  );


  addEventListener(
    'scroll',
    function () {

      autoAbove();


      if (
        scrollY <= 2 &&
        lastY > scrollY
      ) {

        resetHero();
      }


      lastY = scrollY;

      mark();
      schedule();

    },
    {
      passive: true
    }
  );


  /* ---------- Language & Theme ---------- */

  function labels() {

    var d = R.dataset.theme === 'dark',
        ar = lang === 'ar';


    $('#langBtn').textContent =
      ar
        ? 'English'
        : 'العربية';


    $('#themeBtn').textContent =
      ar
        ? (
            d
              ? '☀ الوضع الفاتح'
              : '🌙 الوضع الداكن'
          )
        : (
            d
              ? '☀ Light Mode'
              : '🌙 Dark Mode'
          );
  }


  function setLang(l) {

    clearRevealTimers();

    lang = l;

    R.lang = l;
    R.dir = l === 'ar'
      ? 'rtl'
      : 'ltr';


    $$('[data-ar]').forEach(function (el) {

      if (!el.classList.contains('rv')) {

        el.textContent =
          l === 'ar'
            ? el.dataset.ar
            : el.dataset.en;
      }

    });


    rvs.forEach(function (el) {

      build(
        el,
        el.len
          ? el.n / el.len
          : 0
      );

    });


    D.title =
      l === 'ar'
        ? 'أحمد خالد | أخصائي SEO ومطوّر Full Stack'
        : 'Ahmed Khaled | SEO Specialist & Full Stack Developer';


    try {
      localStorage.setItem(
        'lang',
        l
      );
    } catch (e) {}


    labels();
    schedule();
  }


  $('#langBtn').addEventListener(
    'click',
    function () {

      setLang(
        lang === 'ar'
          ? 'en'
          : 'ar'
      );

    }
  );


  $('#themeBtn').addEventListener(
    'click',
    function () {

      R.dataset.theme =
        R.dataset.theme === 'dark'
          ? 'light'
          : 'dark';


      try {

        localStorage.setItem(
          'theme',
          R.dataset.theme
        );

      } catch (e) {}


      labels();

    }
  );


  /* ---------- Nav ---------- */

  var secs = $$('main section'),
      links = $$('#nav a');


  function measure() {

    navH = $('.bar').offsetHeight;

    R.style.setProperty(
      '--nav',
      navH + 'px'
    );
  }


  function mark() {

    var cur = secs[0].id;


    secs.forEach(function (s) {

      if (
        s.getBoundingClientRect().top <=
        navH + innerHeight * 0.3
      ) {

        cur = s.id;
      }

    });


    links.forEach(function (a) {

      a.classList.toggle(
        'active',
        a.getAttribute('href') ===
        '#' + cur
      );

    });

  }


  /*
   * Keep navigation clicks fully functional.
   */
  links.forEach(function (a) {

    a.addEventListener(
      'click',
      function () {

        clearRevealTimers();

        /*
         * Let the browser perform the normal anchor jump.
         */
        setTimeout(function () {
          autoAbove();
          mark();
          schedule();
        }, 50);

      }
    );

  });


  /* ---------- Cards ---------- */

  var cards = $$('.card');


  cards.forEach(function (c, i) {

    c.style.setProperty(
      '--d',
      (i % 4) * 80 + 'ms'
    );

  });


  if ('IntersectionObserver' in window) {

    var io = new IntersectionObserver(
      function (es) {

        es.forEach(function (e) {

          if (e.isIntersecting) {

            e.target.classList.add('in');

            io.unobserve(e.target);
          }

        });

      },
      {
        threshold: 0.12
      }
    );


    cards.forEach(function (c) {
      io.observe(c);
    });

  } else {

    cards.forEach(function (c) {
      c.classList.add('in');
    });

  }


  /* ---------- Hero Particle Effect ---------- */

  var img = $('#heroImg'),
      cv = $('#fx'),
      cx = cv.getContext('2d'),
      P = [],
      GW = 52,
      GH = 64,
      W = 0,
      H = 0,
      raf = 0;


  function sizeCv() {

    var dpr =
      Math.min(
        devicePixelRatio || 1,
        2
      );


    W = innerWidth;
    H = innerHeight;


    cv.width = W * dpr;
    cv.height = H * dpr;


    cx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

  }


  function makeParticles() {

    if (!img.naturalWidth) {
      return;
    }


    var o = D.createElement('canvas');

    o.width = GW;
    o.height = GH;


    var oc = o.getContext('2d'),
        iw = img.naturalWidth,
        ih = img.naturalHeight,
        ar = GW / GH,
        sw = iw,
        sh = ih,
        data = null;


    if (iw / ih > ar) {
      sw = ih * ar;
    } else {
      sh = iw / ar;
    }


    oc.drawImage(
      img,
      (iw - sw) / 2,
      (ih - sh) / 2,
      sw,
      sh,
      0,
      0,
      GW,
      GH
    );


    try {

      data = oc.getImageData(
        0,
        0,
        GW,
        GH
      ).data;

    } catch (e) {}


    P = [];


    for (var y = 0; y < GH; y++) {

      for (var x = 0; x < GW; x++) {

        var i =
          (y * GW + x) * 4;

        var a =
          Math.random() * 6.283;

        var s =
          90 +
          Math.random() * 380;


        P.push({

          u: (x + 0.5) / GW,

          v: (y + 0.5) / GH,

          dx:
            Math.cos(a) * s,

          dy:
            Math.sin(a) * s - 30,

          z:
            0.6 +
            Math.random() * 0.8,


          c:
            data
              ? 'rgb(' +
                data[i] +
                ',' +
                data[i + 1] +
                ',' +
                data[i + 2] +
                ')'

              : 'hsl(' +
                (
                  190 +
                  Math.random() * 35
                ) +
                ',100%,' +
                (
                  55 +
                  Math.random() * 35
                ) +
                '%)'
        });

      }

    }


    schedule();
  }


  function schedule() {

    if (!raf) {
      raf =
        requestAnimationFrame(
          frame
        );
    }

  }


  frame.smoothP = 0;


  function frame() {

    raf = 0;


    var hs = 0,
        ht = 0;


    heroRv.forEach(function (el) {

      hs += el.n;
      ht += el.len;

    });


    var targetP =
      Math.max(
        0,
        Math.min(
          1,
          Math.max(
            scrollY /
              (innerHeight * 0.6),

            ht
              ? hs / ht
              : 0
          )
        )
      );


    /*
     * Smooth particle progress instead of
     * instantly jumping between positions.
     */
    frame.smoothP +=
      (
        targetP -
        frame.smoothP
      ) * 0.12;


    var p = frame.smoothP;


    /*
     * The original image never fades out.
     */
    img.style.opacity = '1';


    cx.clearRect(
      0,
      0,
      W,
      H
    );


    if (
      p <= 0.002 ||
      !P.length
    ) {

      if (
        Math.abs(
          targetP - p
        ) > 0.001
      ) {

        schedule();
      }

      return;
    }


    var r =
      img.getBoundingClientRect();


    var e =
      1 -
      Math.pow(
        1 - p,
        2
      );


    var sz =
      1 -
      0.55 * p;


    var cw =
      (
        r.width / GW +
        0.6
      ) * sz;


    var ch =
      (
        r.height / GH +
        0.6
      ) * sz;


    cx.globalAlpha =
      Math.min(
        0.72,
        p * 3.5
      ) *
      Math.pow(
        1 - p,
        1.1
      );


    for (
      var i = 0;
      i < P.length;
      i++
    ) {

      var q = P[i];

      cx.fillStyle = q.c;


      cx.fillRect(

        r.left +
          q.u * r.width +
          q.dx * e * q.z -
          cw / 2,

        r.top +
          q.v * r.height +
          q.dy * e * q.z -
          ch / 2,

        cw,
        ch
      );

    }


    cx.globalAlpha = 1;


    if (
      Math.abs(
        targetP - p
      ) > 0.001
    ) {

      schedule();
    }

  }


  if (img.complete) {

    makeParticles();

  } else {

    img.addEventListener(
      'load',
      makeParticles
    );

  }


  addEventListener(
    'resize',
    function () {

      measure();
      sizeCv();
      mark();
      schedule();

    }
  );


  /* ---------- Init ---------- */

  measure();
  sizeCv();

  setLang(lang);


  if (
    matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
  ) {

    rvs.forEach(function (el) {

      el.n = el.len;

      paint(el);

    });

  }


  mark();
  schedule();

})();