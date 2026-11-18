// server.js - SneakerReels AI (10 stiluri + mod Auto + variatii la intamplare)
const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { generateCaption } = require("./captions");
const { buildStyle, pickAutoStyle } = require("./styles");

// citeste tokenul Instagram din fisierul .env (daca exista)
try { process.loadEnvFile(path.join(__dirname, ".env")); } catch (e) {}
const { registerPublishRoutes } = require("./publish");

const app = express();
const PORT = 3000;

// foldere de lucru (se creeaza singure)
const uploadsDir = path.join(__dirname, "uploads");
const videosDir = path.join(__dirname, "videos");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });

// rutele pentru publicarea pe Instagram
registerPublishRoutes(app, { videosDir, rootDir: __dirname });

// primirea pozelor: pastram extensia, acceptam doar jpg/png/webp
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  }
});

const upload = multer({
  storage,
  limits: { files: 10, fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp)$/i.test(file.originalname));
  }
});

// ---------------------------------------------------------
// FONTURI (cele care vin cu Windows) SI TEXTUL DE PE VIDEO
// ---------------------------------------------------------
const FONT_DIR = process.env.FONT_DIR || "C:/Windows/Fonts/";

function findFont(name) {
  for (const f of [name, "arialbd.ttf", "arial.ttf"]) {
    if (fs.existsSync(FONT_DIR + f)) return FONT_DIR + f;
  }
  return null;
}

// FFmpeg vrea ca ":" din calea fontului sa fie scris "\:"
function ffPath(p) {
  return p.replace(/:/g, "\\:");
}

// imparte textul lung pe mai multe randuri
function wrapText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const w of words) {
    if (current && (current + " " + w).length > maxChars) {
      lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

// un text care apare cu fade intre secundele a si b
function textFilter(fontPath, fileName, size, a, b, y, boxAlpha) {
  const fi = 0.4;
  const alpha =
    `if(lt(t,${a.toFixed(2)}),0,` +
    `if(lt(t,${(a + fi).toFixed(2)}),(t-${a.toFixed(2)})/${fi},` +
    `if(lt(t,${(b - fi).toFixed(2)}),1,` +
    `if(lt(t,${b.toFixed(2)}),(${b.toFixed(2)}-t)/${fi},0))))`;
  return (
    `drawtext=fontfile='${ffPath(fontPath)}':textfile='${fileName}':expansion=none:` +
    `fontsize=${size}:fontcolor=white:line_spacing=12:` +
    `x=(w-text_w)/2:y=${y}:` +
    `box=1:boxcolor=black@${boxAlpha}:boxborderw=26:alpha='${alpha}'`
  );
}

// ---------------------------------------------------------
// MISCAREA POZEI (fara sa taie nimic din ea)
// r = marimea pozei fata de cadrul maxim (1 = atinge marginile)
// ---------------------------------------------------------
function motionFor(type, zoom, bars, S) {
  const COS = `cos(PI*min(t/${S},1))`;
  const low = Math.max(0.6, 1 - zoom);
  const pan = Math.max(0.6, low - 0.04);

  let a = low;
  let b = 1;
  let x = "(W-w)/2";
  let y = "(H-h)/2";

  switch (type) {
    case "zoomOut":
      a = 1;
      b = low;
      break;
    case "panLeft":
      a = pan;
      b = pan + 0.06;
      x = `(W-w)/2+min(max((W-w)/2*0.9,0),160)*${COS}`;
      break;
    case "panRight":
      a = pan;
      b = pan + 0.06;
      x = `(W-w)/2-min(max((W-w)/2*0.9,0),160)*${COS}`;
      break;
    case "tiltUp":
      a = pan;
      b = pan + 0.06;
      y = `(H-h)/2+min(max(((H-h)/2-${bars})*0.85,0),200)*${COS}`;
      break;
    case "tiltDown":
      a = pan;
      b = pan + 0.06;
      y = `(H-h)/2-min(max(((H-h)/2-${bars})*0.85,0),200)*${COS}`;
      break;
    case "zoomIn":
    default:
      break;
  }

  const P = `((1-${COS})/2)`;
  const r = `(${a.toFixed(3)}+(${(b - a).toFixed(3)})*${P})`;
  return { r, x, y };
}

// creeaza videoclipul cu FFmpeg
function buildReel(photos, outputFile, cfg, info) {
  return new Promise((resolve, reject) => {
    const FPS = 30;
    const F = cfg.fade;
    const n = photos.length;
    const durations = cfg.durations;
    const sumDur = durations.reduce((s, d) => s + d, 0);
    const total = sumDur - (n - 1) * F;
    const bars = cfg.bars || 0;
    const boxH = 1920 - 2 * bars;

    const args = ["-y", "-hide_banner", "-loglevel", "error", "-nostdin"];
    photos.forEach(p => args.push("-i", p));

    // melodia (daca ai ales una) este ultima intrare
    if (info.music) {
      if (info.music.loop) args.push("-stream_loop", "-1");
      else if (info.music.offset > 0) args.push("-ss", info.music.offset.toFixed(2));
      args.push("-i", info.music.file);
    }

    const filters = [];

    // fiecare poza: fundal incetosat + poza intreaga deasupra, cu miscare
    photos.forEach((p, i) => {
      const frames = Math.round(durations[i] * FPS);
      const m = motionFor(cfg.motions[i], cfg.zoom, bars, durations[i]);

      filters.push(`[${i}:v]format=yuv420p,split=2[a${i}][b${i}]`);

      // fundalul: aceeasi poza, umpluta pe tot cadrul si incetosata
      filters.push(
        `[a${i}]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,` +
        `gblur=sigma=6,scale=1080:1920:flags=bicubic,` +
        `eq=brightness=-0.12:saturation=1.1,setsar=1,` +
        `loop=loop=${frames - 1}:size=1:start=0,setpts=N/(${FPS}*TB)[bg${i}]`
      );

      // poza intreaga, incadrata in cadru, cu marire/micsorare
      filters.push(
        `[b${i}]scale=1080:${boxH}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,setsar=1,` +
        `loop=loop=${frames - 1}:size=1:start=0,setpts=N/(${FPS}*TB),` +
        `scale=w='trunc(iw*${m.r}/2)*2':h='trunc(ih*${m.r}/2)*2':eval=frame:flags=bicubic[fg${i}]`
      );

      // le punem una peste alta
      filters.push(
        `[bg${i}][fg${i}]overlay=x='${m.x}':y='${m.y}':eval=frame:shortest=1,` +
        `fps=${FPS},format=yuv420p[v${i}]`
      );
    });

    // tranzitii (fiecare poza are durata ei, deci calculam momentul exact)
    let last = "v0";
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += durations[i - 1];
      const out = "x" + i;
      const offset = (acc - i * F).toFixed(3);
      filters.push(
        `[${last}][v${i}]xfade=transition=${cfg.transitions[i - 1]}:duration=${F}:offset=${offset}[${out}]`
      );
      last = out;
    }

    // ---- text pe video ----
    const tempFiles = [];
    const textFilters = [];
    const fontPath = findFont(cfg.font.font);

    function addCard(label, text, size, a, b, y) {
      if (!fontPath || !text || b - a < 0.8) return;
      const name = "t-" + Date.now() + "-" + label + ".txt";
      fs.writeFileSync(path.join(uploadsDir, name), text, "utf8");
      tempFiles.push(path.join(uploadsDir, name));
      textFilters.push(textFilter(fontPath, name, size, a, b, y, cfg.boxAlpha));
    }

    const fix = t => (cfg.font.upper ? t.toUpperCase() : t);
    const introEnd = Math.min(3.2, total * 0.5);
    const endStart = Math.max(introEnd + 0.3, total - 3.4);
    const endEnd = total - 0.1;

    if (info.model) {
      addCard("model", fix(wrapText(info.model, 18)), 70, 0.3, introEnd, `h*${cfg.modelY}`);
    }
    if (info.showSales) {
      if (info.price) {
        addCard("pret", fix(info.price + " lei"), 96, endStart, endEnd, `h*${cfg.priceY}`);
      }
      if (info.sizes) {
        addCard("marimi", fix(wrapText("Mărimi: " + info.sizes, 26)), 52, endStart, endEnd, `h*${cfg.priceY}+190`);
      }
    }

    // culori, text, aparitie/disparitie
    const finalChain = [cfg.grade, ...textFilters];
    if (cfg.fadeInOut) {
      finalChain.push("fade=t=in:st=0:d=0.5");
      finalChain.push(`fade=t=out:st=${(total - 0.6).toFixed(3)}:d=0.6`);
    }
    finalChain.push("format=yuv420p");
    filters.push(`[${last}]${finalChain.join(",")}[outv]`);

    // sunet: taiat la durata videoclipului, volum uniform, aparitie si disparitie lina
    if (info.music) {
      const fadeIn = 0.8;
      const fadeOut = Math.min(1.5, total / 2);
      filters.push(
        `[${n}:a]atrim=0:${(total + 0.3).toFixed(3)},asetpts=PTS-STARTPTS,` +
        `loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100,` +
        `afade=t=in:st=0:d=${fadeIn},` +
        `afade=t=out:st=${Math.max(0, total - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(2)},` +
        `aformat=channel_layouts=stereo[outa]`
      );
    }

    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "[outv]",
      ...(info.music ? ["-map", "[outa]", "-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-r", String(FPS),
      "-movflags", "+faststart",
      outputFile
    );

    // ffmpeg ruleaza din folderul "uploads" ca sa gaseasca fisierele text
    const ff = spawn("ffmpeg", args, { cwd: uploadsDir });
    let log = "";
    ff.stderr.on("data", d => {
      log = (log + d.toString()).slice(-4000);
    });
    ff.on("error", () => {
      tempFiles.forEach(f => fs.unlink(f, () => {}));
      reject(new Error("Nu pot porni FFmpeg."));
    });
    ff.on("close", code => {
      tempFiles.forEach(f => fs.unlink(f, () => {}));
      code === 0 ? resolve() : reject(new Error(log));
    });
  });
}

// ---------------------------------------------------------
// MOD AUTO: aplicatia se uita la poze (luminozitate si culori)
// ---------------------------------------------------------
function analyzePhoto(file) {
  return new Promise(resolve => {
    const ff = spawn("ffmpeg", [
      "-v", "error", "-nostdin", "-i", file,
      "-vf", "scale=16:16:flags=area",
      "-pix_fmt", "rgb24", "-frames:v", "1", "-f", "rawvideo", "-"
    ]);
    const chunks = [];
    ff.stdout.on("data", d => chunks.push(d));
    ff.on("error", () => resolve(null));
    ff.on("close", () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 768) return resolve(null);
      let lum = 0;
      let sat = 0;
      for (let i = 0; i < 256; i++) {
        const r = buf[i * 3];
        const g = buf[i * 3 + 1];
        const b = buf[i * 3 + 2];
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        lum += 0.299 * r + 0.587 * g + 0.114 * b;
        sat += mx > 0 ? (mx - mn) / mx : 0;
      }
      resolve({ brightness: lum / 256, saturation: sat / 256 });
    });
  });
}

async function analyzePhotos(files) {
  const results = (await Promise.all(files.map(analyzePhoto))).filter(Boolean);
  if (results.length === 0) return null;
  return {
    brightness: results.reduce((s, r) => s + r.brightness, 0) / results.length,
    saturation: results.reduce((s, r) => s + r.saturation, 0) / results.length
  };
}

// ---------------------------------------------------------
// MUZICA: pune fisierele tale audio in folderul "music"
// ---------------------------------------------------------
const musicDir = path.join(__dirname, "music");
fs.mkdirSync(musicDir, { recursive: true });
const MUSIC_EXT = /\.(mp3|m4a|aac|wav|ogg|flac)$/i;

function listMusic() {
  try {
    return fs.readdirSync(musicDir).filter(f => MUSIC_EXT.test(f)).sort();
  } catch (e) {
    return [];
  }
}

// verifica ca fisierul chiar are sunet si afla cat dureaza
function probeAudio(file) {
  return new Promise(resolve => {
    const ff = spawn("ffprobe", [
      "-v", "error", "-select_streams", "a:0",
      "-show_entries", "stream=codec_type:format=duration", "-of", "json", file
    ]);
    let out = "";
    ff.stdout.on("data", d => (out += d.toString()));
    ff.on("error", () => resolve(null));
    ff.on("close", () => {
      try {
        const data = JSON.parse(out);
        const hasAudio = data.streams && data.streams.length > 0;
        const duration = parseFloat(data.format && data.format.duration);
        resolve(hasAudio && Number.isFinite(duration) ? { duration } : null);
      } catch (e) {
        resolve(null);
      }
    });
  });
}

// alege melodia (sau una la intamplare) si o parte din ea, potrivita cu durata videoclipului
async function chooseMusic(choice, total) {
  const tracks = listMusic();
  if (!choice || choice === "none" || tracks.length === 0) return null;

  const name = choice === "random"
    ? tracks[Math.floor(Math.random() * tracks.length)]
    : tracks.find(t => t === choice);
  if (!name) return null;

  const file = path.join(musicDir, name);
  const info = await probeAudio(file);
  if (!info) {
    console.log("Muzica ignorata (fisier audio invalid): " + name);
    return null;
  }

  const result = { file, name: name.replace(MUSIC_EXT, ""), offset: 0, loop: false };
  if (info.duration >= total + 2) {
    // melodie mai lunga: incepem de la inceput (de multe ori) sau dintr-un punct la intamplare
    const maxStart = info.duration - total - 0.5;
    result.offset = Math.random() * maxStart;
    result.loop = true; // melodie mai scurta: se repeta
  }
  return result;
}

app.get("/music-list", (req, res) => {
  res.json({ tracks: listMusic().map(f => ({ file: f, name: f.replace(MUSIC_EXT, "") })) });
});

// pagina principala
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// videoclipurile gata facute
app.use("/videos", express.static(videosDir));

// generarea videoclipului
app.post("/generate", (req, res) => {
  upload.array("photos", 10)(req, res, async err => {
    if (err) {
      return res.status(400).json({ error: "Maxim 10 poze, fiecare sub 25 MB." });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        error: "Nu am primit poze valide. Folosește fișiere .jpg, .png sau .webp."
      });
    }

    const requestedStyle = req.body.style;
    const objective = req.body.objective;

    const info = {
      model: cleanText(req.body.model, 60),
      price: cleanText(req.body.price, 10).replace(/[^\d.,]/g, ""),
      sizes: cleanText(req.body.sizes, 50),
      showSales: objective === "sales" || objective === "both"
    };

    const fileName = "reel-" + Date.now() + ".mp4";
    const outputFile = path.join(videosDir, fileName);

    try {
      const paths = files.map(f => f.path);

      // stilul ales (sau ales de aplicatie, in modul Auto)
      let styleName = requestedStyle;
      let styleLabel;
      if (requestedStyle === "Auto") {
        const stats = await analyzePhotos(paths);
        styleName = pickAutoStyle(stats, objective);
        styleLabel = "Auto → " + styleName;
      }

      const cfg = buildStyle(styleName, paths.length);
      styleLabel = styleLabel || cfg.name;

      // muzica (optionala)
      const totalSeconds =
        cfg.durations.reduce((s, d) => s + d, 0) - (paths.length - 1) * cfg.fade;
      info.music = await chooseMusic(req.body.music, totalSeconds);

      console.log(
        `Cerere noua: ${files.length} poze | stil: ${styleLabel} | obiectiv: ${objective}\n` +
        `  poze: ${cfg.durations.join("s, ")}s | tranzitii: ${cfg.transitions.join(", ") || "-"} | miscari: ${cfg.motions.join(", ")}`
      );

      try {
        await buildReel(paths, outputFile, cfg, info);
      } catch (e) {
        if (!info.music) throw e;
        // daca melodia a dat probleme, refacem videoclipul fara ea
        console.log("Problema cu muzica, refac videoclipul fara muzica:\n" + e.message);
        info.music = null;
        await buildReel(paths, outputFile, cfg, info);
      }
      console.log("Videoclip gata: " + fileName + (info.music ? " | muzica: " + info.music.name : ""));

      const text = generateCaption({
        objective: objective,
        style: cfg.tone,
        model: req.body.model,
        price: req.body.price,
        sizes: req.body.sizes
      });
      res.json({
        url: "/videos/" + fileName,
        caption: text.caption,
        hashtags: text.hashtags,
        styleUsed: styleLabel,
        musicUsed: info.music ? info.music.name : null
      });
    } catch (e) {
      console.log("Eroare FFmpeg:\n" + e.message);
      res.status(500).json({ error: "Nu am putut crea videoclipul. Vezi detalii în terminal." });
    } finally {
      files.forEach(f => fs.unlink(f.path, () => {}));
    }
  });
});

app.listen(PORT, () => {
  console.log("SneakerReels AI funcționează!");
  console.log("Deschide în browser: http://localhost:" + PORT);
});