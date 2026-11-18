// instagram.js - publicarea unui Reel pe Instagram prin API-ul oficial Meta
// (calea "Facebook Login"). Tokenul se citeste din fisierul .env si NU e afisat niciodata.
const fs = require("fs");

const VERSION = process.env.IG_API_VERSION || "v26.0";
const GRAPH = process.env.IG_GRAPH_HOST || "https://graph.facebook.com";
const UPLOAD = process.env.IG_UPLOAD_HOST || "https://rupload.facebook.com";
const POLL_MS = Number(process.env.IG_POLL_MS) || 20000;
const MAX_WAIT_MS = Number(process.env.IG_MAX_WAIT_MS) || 6 * 60 * 1000;

function getConfig() {
  const token = (process.env.IG_ACCESS_TOKEN || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^Bearer\s+/i, "");
  const igId = (process.env.IG_USER_ID || "").trim();
  return { token, igId };
}

function isConfigured() {
  const { token, igId } = getConfig();
  return Boolean(token && igId);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// transforma raspunsul de eroare al Meta intr-un text pe care il poti citi
function metaError(data, status) {
  if (data && data.error) {
    const e = data.error;
    const text = e.error_user_msg || e.message || "eroare necunoscută";
    return text + (e.code ? " (cod " + e.code + ")" : "");
  }
  if (data && data.debug_info && data.debug_info.message) {
    return String(data.debug_info.message).slice(0, 300);
  }
  return "eroare HTTP " + status;
}

async function graph(method, path, body) {
  const { token } = getConfig();
  const res = await fetch(GRAPH + "/" + VERSION + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(metaError(data, res.status));
  return data;
}

// incarca fisierul direct de pe laptop (nu trebuie sa fie public pe internet)
async function uploadVideo(containerId, filePath) {
  const { token } = getConfig();
  const size = fs.statSync(filePath).size;
  const buffer = fs.readFileSync(filePath);

  const res = await fetch(UPLOAD + "/ig-api-upload/" + VERSION + "/" + containerId, {
    method: "POST",
    headers: {
      Authorization: "OAuth " + token,
      offset: "0",
      file_size: String(size)
    },
    body: buffer
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error("Încărcarea videoclipului a eșuat: " + metaError(data, res.status));
  }
}

async function waitUntilReady(containerId, onStep) {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const info = await graph("GET", "/" + containerId + "?fields=status_code,status");
    const code = info.status_code;

    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error("Instagram a respins videoclipul (" + code + "): " + (info.status || "fără detalii"));
    }
    onStep("Instagram procesează videoclipul...");
    await sleep(POLL_MS);
  }
  throw new Error("Instagram nu a terminat procesarea în 6 minute. Încearcă din nou mai târziu.");
}

// dryRun = true: face tot, MAI PUTIN publicarea (containerul expira singur in 24 de ore)
async function publishReel({ filePath, caption, dryRun, onStep }) {
  const step = onStep || (() => {});
  const { token, igId } = getConfig();

  if (!token || !igId) {
    throw new Error("Lipsesc IG_ACCESS_TOKEN sau IG_USER_ID din fișierul .env.");
  }

  step("Pregătesc postarea la Instagram...");
  const container = await graph("POST", "/" + igId + "/media", {
    media_type: "REELS",
    upload_type: "resumable",
    caption: caption,
    share_to_feed: true
  });
  if (!container.id) throw new Error("Instagram nu a returnat un container.");

  step("Încarc videoclipul...");
  await uploadVideo(container.id, filePath);

  step("Instagram procesează videoclipul...");
  await waitUntilReady(container.id, step);

  if (dryRun) {
    return { dryRun: true, containerId: container.id };
  }

  step("Public Reel-ul...");
  const published = await graph("POST", "/" + igId + "/media_publish", {
    creation_id: container.id
  });

  // linkul postarii (daca nu merge, nu e grav)
  let permalink = null;
  try {
    const info = await graph("GET", "/" + published.id + "?fields=permalink");
    permalink = info.permalink || null;
  } catch (e) {
    permalink = null;
  }

  return { dryRun: false, mediaId: published.id, permalink };
}

module.exports = { publishReel, isConfigured };