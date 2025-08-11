// pages/api/oauth/test.js
import { listFolder } from "../../../lib/dropbox";
export default async function handler(req, res) {
  try {
    const base = (process.env.DROPBOX_PATH || "/system_backups/").replace(/\/?$/, "/");
    const j = await listFolder(base);
    res.status(200).json({ ok:true, count: (j.entries||[]).length, sample: (j.entries||[]).slice(0,5) });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e) });
  }
}
