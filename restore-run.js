import crypto from "crypto";
import { listFolder, downloadText } from "../../lib/dropbox";
import { getTextFile } from "../../lib/zip";
import { parseCsv, tail } from "../../lib/parser";

function authOk(req) {
  const hdr = req.headers.authorization || "";
  const qs = req.query.token;
  const want = `Bearer ${process.env.CRON_SECRET}`;
  return (hdr === want) || (qs && qs === process.env.CRON_SECRET);
}

function pickLatest(entries, exts = [".b64"]) {
  const files = (entries || []).filter(
    e => e[".tag"] === "file" && exts.some(ext => e.name.toLowerCase().endsWith(ext))
  );
  files.sort((a, b) => new Date(a.server_modified) - new Date(b.server_modified));
  return files.at(-1) || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!authOk(req)) return res.status(401).end("Unauthorized");

  const base = (process.env.DROPBOX_PATH || "/system_backups/").replace(/\/?$/, "/");
  const { path, expect } = req.query;

  // 1) 대상 .b64 결정
  let targetPath = path;
  let listing = await listFolder(base);
  if (!targetPath) {
    const latest = pickLatest(listing.entries);
    if (!latest) return res.status(404).json({ ok: false, error: "no .b64 found" });
    targetPath = latest.path_lower;
  }

  // 2) .b64 다운로드 & 디코드
  const { text, name } = await downloadText(targetPath);
  const normalized = text.replace(/\s+/g, "");
  const buf = Buffer.from(normalized, "base64");

  // 3) SHA-256 검증(옵션)
  let expected = expect;
  if (!expected) {
    if (!listing.entries) listing = await listFolder(base);
    const baseName = name.replace(/\.b64$/i, "");
    const cand = listing.entries.filter(e =>
      e[".tag"] === "file" &&
      (e.name.toLowerCase() === `${baseName}.sha256` ||
       e.name.toLowerCase() === `${baseName}.sha256.txt`)
    );
    if (cand.length) {
      const sha = await downloadText(cand[0].path_lower);
      const m = sha.text.match(/[a-f0-9]{64}/i);
      if (m) expected = m[0];
    }
  }
  const digest = crypto.createHash("sha256").update(buf).digest("hex");
  if (expected && digest.toLowerCase() !== String(expected).toLowerCase()) {
    return res.status(422).json({ ok:false, error:"sha256 mismatch", got:digest, expected });
  }

  // 4) ZIP 메모리 로드 후 핵심 파일 파싱
  const configText = getTextFile(buf, "SYN2.1R_Config.json");
  const modulesCsv = getTextFile(buf, "Modules_Status_After_Recovery.csv");
  const pathsLog  = getTextFile(buf, "DataPaths_Check.log");
  const integText = getTextFile(buf, "Integrity_Report.txt");

  let config = null, modules = null;
  try { if (configText) config = JSON.parse(configText); } catch {}
  if (modulesCsv) modules = parseCsv(modulesCsv);

  const summary = {
    sourceB64: name,
    sha256: digest,
    configKeys: config ? Object.keys(config).length : 0,
    modulesCount: modules ? modules.rows.length : 0,
    integrityHints: integText ? (/\bok\b|\bpass\b/i.test(integText) ? "PASS" : "CHECK") : "N/A",
    pathsTail: pathsLog ? tail(pathsLog, 20) : null
  };

  return res.status(200).json({ ok: true, summary });
}
