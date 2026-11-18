// styles.js - stilurile SneakerReels AI
// De fiecare data cand generezi un videoclip, valorile se aleg la intamplare
// din intervalele de mai jos, deci doua videoclipuri cu acelasi stil nu arata la fel.

const rnd = (a, b) => a + Math.random() * (b - a);
const v = (a, b, d = 2) => rnd(a, b).toFixed(d);
const r2 = x => Math.round(x * 100) / 100;
const pick = list => list[Math.floor(Math.random() * list.length)];

// alege o secventa fara ca acelasi element sa apara de doua ori la rand
function randomSequence(pool, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    let c;
    let tries = 0;
    do {
      c = pick(pool);
      tries++;
    } while (pool.length > 1 && c === out[out.length - 1] && tries < 20);
    out.push(c);
  }
  return out;
}

const STYLE_DEFS = {
  "Cinematic": {
    tone: "Cinematic",
    seconds: [3.6, 4.6], fade: [0.6, 1.0], zoom: [0.12, 0.22], bars: [130, 190],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp", "tiltDown"],
    transitions: ["fade", "fadeblack", "dissolve", "fadegrays", "smoothleft", "smoothright"],
    fonts: [
      { font: "georgiab.ttf", upper: false },
      { font: "timesbd.ttf", upper: false },
      { font: "bahnschrift.ttf", upper: true }
    ],
    fadeInOut: true,
    grades: [
      () => `eq=contrast=${v(1.08, 1.18)}:saturation=${v(0.85, 1.0)}:brightness=-0.02,colorbalance=rs=-0.06:bs=0.08:rh=0.08:bh=-0.06,vignette=angle=PI/4`,
      () => `eq=contrast=${v(1.1, 1.2)}:saturation=${v(0.7, 0.85)},colorbalance=bs=0.1:bm=0.05:rh=-0.03,vignette=angle=PI/3.5`,
      () => `eq=contrast=1.1:saturation=${v(0.9, 1.05)}:gamma=0.95,colorbalance=rm=0.06:rh=0.08:bh=-0.07,vignette=angle=PI/4`
    ]
  },

  "Streetwear": {
    tone: "Streetwear",
    seconds: [2.2, 3.0], fade: [0.25, 0.45], zoom: [0.14, 0.26], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp"],
    transitions: ["slideleft", "slideright", "wipeleft", "wiperight", "slideup", "pixelize", "hlslice", "hrslice", "vuslice"],
    fonts: [
      { font: "impact.ttf", upper: true },
      { font: "arialbd.ttf", upper: true },
      { font: "bahnschrift.ttf", upper: true }
    ],
    fadeInOut: false,
    grades: [
      () => `eq=contrast=${v(1.2, 1.3)}:saturation=${v(1.25, 1.45)}:brightness=0.01,noise=alls=${Math.round(rnd(10, 18))}:allf=t+u,unsharp=5:5:0.8`,
      () => `eq=contrast=1.3:saturation=${v(0.7, 0.85)}:brightness=-0.02,noise=alls=${Math.round(rnd(16, 24))}:allf=t+u,unsharp=5:5:1.0`,
      () => `eq=contrast=1.2:saturation=${v(1.4, 1.6)},curves=preset=increase_contrast,unsharp=5:5:0.6`
    ]
  },

  "Luxury": {
    tone: "Luxury",
    seconds: [4.0, 5.2], fade: [0.8, 1.2], zoom: [0.08, 0.16], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "tiltUp", "tiltDown", "panRight", "panLeft"],
    transitions: ["fade", "dissolve", "fadeblack", "fadegrays", "smoothup", "smoothdown"],
    fonts: [
      { font: "times.ttf", upper: false },
      { font: "timesbd.ttf", upper: false },
      { font: "georgia.ttf", upper: false }
    ],
    fadeInOut: true,
    grades: [
      () => `eq=contrast=1.1:saturation=${v(0.75, 0.85)}:brightness=-0.05,colorbalance=rm=0.06:gm=0.02:bm=-0.05:rh=0.07:bh=-0.07,vignette=angle=PI/3.2`,
      () => `eq=contrast=1.12:saturation=${v(0.55, 0.65)}:brightness=-0.03,colorbalance=bs=0.04:bm=0.03,vignette=angle=PI/3.2`,
      () => `eq=contrast=1.15:saturation=0.75:brightness=-0.08:gamma=0.92,colorbalance=rh=0.05:bh=-0.04,vignette=angle=PI/3`
    ]
  },

  "TikTok Style": {
    tone: "TikTok Style",
    seconds: [1.5, 2.2], fade: [0.2, 0.3], zoom: [0.22, 0.40], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight"],
    transitions: ["zoomin", "circleopen", "slideleft", "radial", "slideup", "fadewhite", "squeezeh", "squeezev", "pixelize"],
    fonts: [
      { font: "arialbd.ttf", upper: true },
      { font: "impact.ttf", upper: true },
      { font: "segoeuib.ttf", upper: true }
    ],
    fadeInOut: false,
    grades: [
      () => `eq=contrast=1.15:saturation=${v(1.35, 1.45)}:brightness=0.03`,
      () => `eq=contrast=1.1:saturation=1.6:brightness=0.05,unsharp=5:5:0.5`,
      () => `eq=contrast=1.2:saturation=1.3:gamma=1.05,colorbalance=rs=0.04:bs=-0.03`
    ]
  },

  "Neon Night": {
    tone: "TikTok Style",
    seconds: [2.0, 2.8], fade: [0.3, 0.45], zoom: [0.14, 0.28], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp"],
    transitions: ["fadeblack", "hblur", "wipeleft", "radial", "circleclose", "diagbl", "diagtr"],
    fonts: [
      { font: "bahnschrift.ttf", upper: true },
      { font: "arialbd.ttf", upper: true },
      { font: "impact.ttf", upper: true }
    ],
    fadeInOut: false,
    grades: [
      () => `eq=contrast=1.2:saturation=1.6:brightness=-0.05,colorbalance=rs=0.1:bs=0.15:gm=-0.05:rh=0.1:bh=0.12,vignette=angle=PI/3.5`,
      () => `eq=contrast=1.25:saturation=1.5:brightness=-0.06,colorbalance=rs=-0.12:gs=0.04:bs=0.14:bh=0.1,vignette=angle=PI/3.5`,
      () => `eq=contrast=1.2:saturation=1.7:brightness=-0.05,hue=h=${v(-25, 25, 0)},colorbalance=bs=0.12:gh=0.05`
    ]
  },

  "Retro VHS": {
    tone: "Streetwear",
    seconds: [2.2, 3.2], fade: [0.3, 0.5], zoom: [0.10, 0.20], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight"],
    transitions: ["fadegrays", "pixelize", "hblur", "dissolve", "wipeleft", "wiperight"],
    fonts: [
      { font: "consolab.ttf", upper: true },
      { font: "courbd.ttf", upper: true },
      { font: "arialbd.ttf", upper: true }
    ],
    fadeInOut: false,
    grades: [
      () => `curves=preset=vintage,eq=saturation=0.85:contrast=1.05,noise=alls=${Math.round(rnd(14, 24))}:allf=t+u,chromashift=crh=3:cbh=-3`,
      () => `eq=saturation=0.7:contrast=1.1:gamma=1.05,colorbalance=rs=0.05:bs=-0.04,noise=alls=24:allf=t+u,chromashift=crh=-3:cbh=3`,
      () => `curves=preset=cross_process,eq=saturation=0.9,noise=alls=${Math.round(rnd(12, 20))}:allf=t+u,chromashift=crh=-4:cbh=4:crv=1`
    ]
  },

  "Clean Shop": {
    tone: "Streetwear",
    seconds: [2.8, 3.6], fade: [0.35, 0.6], zoom: [0.06, 0.14], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp"],
    transitions: ["fade", "slideleft", "slideright", "wipeup", "smoothleft", "dissolve"],
    fonts: [
      { font: "segoeuib.ttf", upper: false },
      { font: "arialbd.ttf", upper: false },
      { font: "trebucbd.ttf", upper: false }
    ],
    fadeInOut: false,
    grades: [
      () => `eq=brightness=0.04:contrast=1.06:saturation=${v(1.05, 1.15)}:gamma=1.04,unsharp=5:5:0.6`,
      () => `eq=brightness=0.06:contrast=1.04:saturation=1.0,unsharp=5:5:0.5`,
      () => `curves=preset=lighter,eq=saturation=1.1:contrast=1.05,unsharp=5:5:0.5`
    ]
  },

  "Dramatic": {
    tone: "Cinematic",
    seconds: [3.2, 4.4], fade: [0.5, 0.9], zoom: [0.12, 0.22], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "tiltUp", "tiltDown", "panLeft", "panRight"],
    transitions: ["fadeblack", "fadegrays", "dissolve", "circleclose", "vertclose", "horzclose"],
    fonts: [
      { font: "impact.ttf", upper: true },
      { font: "georgiab.ttf", upper: true },
      { font: "bahnschrift.ttf", upper: true }
    ],
    fadeInOut: true,
    grades: [
      () => `eq=contrast=1.35:saturation=${v(0.4, 0.5)}:brightness=-0.04,vignette=angle=PI/3`,
      () => `curves=preset=strong_contrast,eq=saturation=${v(0.3, 0.4)},vignette=angle=PI/3.2`,
      () => `eq=contrast=1.4:saturation=0.15:brightness=-0.05,colorbalance=rh=0.05:bh=-0.03,vignette=angle=PI/3`,
      () => `eq=contrast=1.3:saturation=0.6,colorbalance=rm=0.08:rs=0.06,vignette=angle=PI/3`
    ]
  },

  "Vibrant Pop": {
    tone: "TikTok Style",
    seconds: [1.8, 2.6], fade: [0.2, 0.35], zoom: [0.18, 0.32], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp"],
    transitions: ["slideleft", "slideright", "zoomin", "circleopen", "wipeup", "wipedown", "squeezeh", "fadewhite"],
    fonts: [
      { font: "arialbd.ttf", upper: true },
      { font: "impact.ttf", upper: true },
      { font: "segoeuib.ttf", upper: true }
    ],
    fadeInOut: false,
    grades: [
      () => `eq=saturation=${v(1.6, 1.75)}:contrast=1.15:brightness=0.03,unsharp=5:5:0.6`,
      () => `eq=saturation=1.55:contrast=1.2:gamma=1.06,unsharp=5:5:0.6`,
      () => `eq=saturation=1.8:contrast=1.1:brightness=0.04,colorbalance=rs=0.03:bs=0.03`
    ]
  },

  "Sunset": {
    tone: "Cinematic",
    seconds: [3.4, 4.6], fade: [0.6, 1.0], zoom: [0.08, 0.16], bars: [0, 0],
    motions: ["zoomIn", "zoomOut", "panLeft", "panRight", "tiltUp", "tiltDown"],
    transitions: ["fade", "dissolve", "smoothleft", "smoothright", "fadeblack"],
    fonts: [
      { font: "georgiab.ttf", upper: false },
      { font: "trebucbd.ttf", upper: false },
      { font: "segoeuib.ttf", upper: false }
    ],
    fadeInOut: true,
    grades: [
      () => `eq=saturation=${v(1.1, 1.3)}:brightness=0.02:contrast=1.08,colorbalance=rs=0.12:gs=-0.02:bs=-0.1:rm=0.1:bm=-0.08:rh=0.1:bh=-0.1,vignette=angle=PI/4`,
      () => `eq=saturation=1.2:contrast=1.1,colorbalance=rs=0.1:bs=0.05:rh=0.12:bh=-0.05,vignette=angle=PI/4`,
      () => `eq=saturation=1.15:brightness=0.03,colorbalance=rm=0.08:gm=0.03:bm=-0.1:rh=0.1:bh=-0.12,vignette=angle=PI/4.5`
    ]
  }
};

const STYLE_NAMES = Object.keys(STYLE_DEFS);

// construieste setarile concrete pentru UN videoclip (cu valori la intamplare)
function buildStyle(name, photoCount) {
  const def = STYLE_DEFS[name] || STYLE_DEFS["Cinematic"];
  const realName = STYLE_DEFS[name] ? name : "Cinematic";

  const fade = r2(rnd(def.fade[0], def.fade[1]));
  const base = rnd(def.seconds[0], def.seconds[1]);
  const minDuration = fade * 2 + 0.4;

  // fiecare poza dureaza putin diferit
  const durations = [];
  for (let i = 0; i < photoCount; i++) {
    durations.push(r2(Math.max(base * rnd(0.88, 1.18), minDuration)));
  }

  const bars = Math.round(rnd(def.bars[0], def.bars[1]));
  let grade = pick(def.grades)();
  if (bars > 0) {
    grade +=
      `,drawbox=x=0:y=0:w=iw:h=${bars}:color=black:t=fill` +
      `,drawbox=x=0:y=ih-${bars}:w=iw:h=${bars}:color=black:t=fill`;
  }

  return {
    name: realName,
    tone: def.tone,
    durations,
    fade,
    zoom: r2(rnd(def.zoom[0], def.zoom[1])),
    bars,
    motions: randomSequence(def.motions, photoCount),
    transitions: randomSequence(def.transitions, Math.max(photoCount - 1, 0)),
    grade,
    fadeInOut: def.fadeInOut,
    font: pick(def.fonts),
    modelY: r2(rnd(0.62, 0.70)),
    priceY: r2(rnd(0.54, 0.60)),
    boxAlpha: r2(rnd(0.40, 0.60))
  };
}

// alegere automata a stilului, in functie de poze
function pickAutoStyle(stats, objective) {
  const w = {};
  STYLE_NAMES.forEach(n => (w[n] = 1));
  const add = (names, amount) => names.forEach(n => (w[n] += amount));

  if (stats) {
    const dark = stats.brightness < 85;
    const bright = stats.brightness > 150;
    const colorful = stats.saturation > 0.38;
    const muted = stats.saturation < 0.18;

    if (dark) {
      add(["Cinematic", "Dramatic", "Neon Night"], 2);
      add(["Luxury"], 1.5);
    }
    if (bright) {
      add(["Clean Shop"], 3);
      add(["Vibrant Pop"], 2);
      add(["Sunset", "TikTok Style"], 1);
    }
    if (colorful) {
      add(["Vibrant Pop", "TikTok Style"], 1.5);
      add(["Neon Night", "Streetwear", "Sunset"], 1);
    }
    if (muted) {
      add(["Dramatic"], 2);
      add(["Luxury", "Cinematic"], 1.5);
      add(["Retro VHS", "Clean Shop"], 1);
    }
  }

  if (objective === "sales" || objective === "both") {
    add(["Clean Shop"], 1.5);
    add(["Luxury", "Streetwear"], 1);
  }
  if (objective === "growth" || objective === "both") {
    add(["TikTok Style", "Neon Night", "Vibrant Pop"], 1);
  }

  const total = STYLE_NAMES.reduce((sum, n) => sum + w[n], 0);
  let roll = Math.random() * total;
  for (const n of STYLE_NAMES) {
    roll -= w[n];
    if (roll <= 0) return n;
  }
  return STYLE_NAMES[0];
}

module.exports = { buildStyle, pickAutoStyle, STYLE_NAMES };