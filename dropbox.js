// pages/api/auth/dropbox.js
// First-time helper to exchange OAuth ?code for a refresh_token.
// Set env: DROPBOX_APP_KEY, DROPBOX_APP_SECRET
// Redirect URI in Dropbox app must be: https://<domain>/api/auth/dropbox
export default async function handler(req, res) {
  const { code } = req.query;
  if (req.method !== "GET") return res.status(405).end();
  if (!code) {
    const key = process.env.DROPBOX_APP_KEY;
    const redirectUri = `https://${req.headers.host}/api/auth/dropbox`;
    const url = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(key)}&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <h3>Dropbox OAuth 시작</h3>
      <p><a href="${url}">여기를 눌러 Dropbox에 로그인하고 동의하세요.</a></p>
      <p>승인 후 이 페이지로 돌아오면 refresh_token을 발급해 보여줍니다.</p>
    `);
  }
  try {
    const key = process.env.DROPBOX_APP_KEY;
    const secret = process.env.DROPBOX_APP_SECRET;
    const redirectUri = `https://${req.headers.host}/api/auth/dropbox`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const j = await r.json();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!r.ok) {
      return res.status(r.status).send(`<pre>토큰 교환 실패\n${JSON.stringify(j, null, 2)}</pre>`);
    }
    // Show refresh_token once
    const rt = j.refresh_token;
    return res.status(200).send(`<h3>성공!</h3><p><b>refresh_token</b>을 Vercel 환경변수 <code>DROPBOX_REFRESH_TOKEN</code>에 저장하세요:</p><pre>${rt || "(없음)"}</pre>`);
  } catch (e) {
    return res.status(500).send("<pre>에러: " + String(e) + "</pre>");
  }
}
