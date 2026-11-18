// publish.js - rutele pentru publicarea pe Instagram
// Publicarea ruleaza "in fundal" pe laptop, iar pagina intreaba din cand in cand cum merge.
// Asa nu se pierde nimic daca telefonul isi stinge ecranul in timpul publicarii.
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { publishReel, isConfigured } = require("./instagram");

const MIN_SECONDS = 3.1; // precautie: Reels foarte scurte pot fi respinse de Instagram
const MAX_CAPTION = 2200;
const MAX_HASHTAGS = 30;

function getDuration(file) {
  return new Promise(resolve => {
    const ff = spawn("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file
    ]);
    let out = "";
    ff.stdout.on("data", d => (out += d.toString()));
    ff.on("error", () => resolve(null));
    ff.on("close", () => {
      const n = parseFloat(out.trim());
      resolve(Number.isFinite(n) ? n : null);
    });
  });
}

function buildCaption(caption, hashtags) {
  const c = String(caption || "").trim();
  const h = String(hashtags || "").trim();
  let text = c;
  if (h && !c.includes(h)) text = c ? c + "\n\n" + h : h;
  return text.slice(0, MAX_CAPTION);
}

function registerPublishRoutes(app, options) {
  const videosDir = options.videosDir;
  const publishedFile = path.join(options.rootDir, "published.json");
  const jobs = new Map();
  let busy = false;

  function readPublished() {
    try {
      return JSON.parse(fs.readFileSync(publishedFile, "utf8"));
    } catch (e) {
      return {};
    }
  }

  function savePublished(file, info) {
    const all = readPublished();
    all[file] = { ...info, at: new Date().toISOString() };
    fs.writeFileSync(publishedFile, JSON.stringify(all, null, 2));
  }

  function cleanOldJobs() {
    const limit = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of jobs) {
      if (job.createdAt < limit) jobs.delete(id);
    }
  }

  app.post("/publish", express.json({ limit: "200kb" }), async (req, res) => {
    const body = req.body || {};
    const file = String(body.file || "");
    const dryRun = body.dryRun === true;

    if (!/^reel-\d+\.mp4$/.test(file)) {
      return res.status(400).json({ error: "Nume de fișier invalid." });
    }
    const filePath = path.join(videosDir, file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Nu găsesc videoclipul. Generează-l din nou." });
    }
    if (!isConfigured()) {
      return res.status(400).json({
        error: "Lipsesc IG_ACCESS_TOKEN sau IG_USER_ID din fișierul .env. Repornește serverul după ce le adaugi."
      });
    }

    const published = readPublished();
    if (!dryRun && published[file]) {
      return res.status(409).json({
        error: "Acest videoclip a fost deja publicat. Generează unul nou ca să nu postezi de două ori.",
        permalink: published[file].permalink || null
      });
    }

    const caption = buildCaption(body.caption, body.hashtags);
    const hashtagCount = (caption.match(/#/g) || []).length;
    if (hashtagCount > MAX_HASHTAGS) {
      return res.status(400).json({ error: "Instagram permite maxim " + MAX_HASHTAGS + " de hashtaguri." });
    }

    if (busy) {
      return res.status(409).json({ error: "Se publică deja un alt videoclip. Așteaptă să termine." });
    }
    busy = true;

    try {
      const duration = await getDuration(filePath);
      if (duration !== null && duration < MIN_SECONDS) {
        busy = false;
        return res.status(400).json({
          error: "Videoclipul are doar " + duration.toFixed(1) +
            " secunde, iar Instagram poate respinge Reels sub 3 secunde. Încarcă mai multe poze sau alege un stil mai lent."
        });
      }
    } catch (e) {
      busy = false;
      return res.status(500).json({ error: "Nu am putut verifica videoclipul." });
    }

    cleanOldJobs();
    const id = crypto.randomBytes(8).toString("hex");
    const job = { status: "running", step: "Pornesc...", dryRun, createdAt: Date.now() };
    jobs.set(id, job);

    console.log((dryRun ? "[Instagram] TEST (fără publicare): " : "[Instagram] Public: ") + file);

    publishReel({
      filePath,
      caption,
      dryRun,
      onStep: s => {
        job.step = s;
      }
    })
      .then(result => {
        if (!dryRun) {
          savePublished(file, { mediaId: result.mediaId, permalink: result.permalink });
        }
        job.status = "done";
        job.result = result;
        console.log("[Instagram] " + (dryRun ? "Test reușit." : "Publicat: " + (result.permalink || result.mediaId)));
      })
      .catch(e => {
        job.status = "error";
        job.error = e.message;
        console.log("[Instagram] EROARE: " + e.message);
      })
      .finally(() => {
        busy = false;
      });

    res.json({ jobId: id });
  });

  app.get("/publish-status/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Nu găsesc această operațiune." });
    res.json({
      status: job.status,
      step: job.step,
      dryRun: job.dryRun,
      error: job.error || null,
      result: job.result || null
    });
  });
}

module.exports = { registerPublishRoutes };