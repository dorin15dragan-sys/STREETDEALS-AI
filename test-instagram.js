// test-instagram.js - verifica tokenul pe calea "Facebook Login"
const token = (process.env.IG_ACCESS_TOKEN || "").trim()
  .replace(/^["']+|["']+$/g, "").replace(/^Bearer\s+/i, "");
const igId = (process.env.IG_USER_ID || "").trim();

if (!token) {
  console.log("Nu gasesc IG_ACCESS_TOKEN in .env.");
  process.exit(1);
}
if (!igId) {
  console.log("Nu gasesc IG_USER_ID in .env.");
  process.exit(1);
}

async function get(label, path) {
  try {
    const res = await fetch("https://graph.facebook.com" + path, {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    if (!res.ok) {
      console.log("[" + label + "] EROARE " + res.status + ": " +
        ((data.error && data.error.message) || "necunoscuta"));
      return null;
    }
    return data;
  } catch (e) {
    console.log("[" + label + "] nu pot contacta serverul: " + e.message);
    return null;
  }
}

async function main() {
  const perms = await get("Permisiuni", "/me/permissions");
  if (perms && perms.data) {
    const granted = perms.data.filter(p => p.status === "granted").map(p => p.permission);
    console.log("[Permisiuni] acordate: " + (granted.join(", ") || "(niciuna)"));
  }

  const account = await get("Cont Instagram", "/" + igId + "?fields=id,username,media_count");
  if (account) {
    console.log("[Cont Instagram] MERGE: @" + account.username + " | postari: " + account.media_count);
  }

  const limit = await get("Limita publicare",
    "/" + igId + "/content_publishing_limit?fields=quota_usage,config");
  if (limit) {
    console.log("[Limita publicare] " + JSON.stringify(limit.data || limit));
  }
}

main();