

## Dropbox OAuth (권장, 자동 갱신)
1) Dropbox App Console에서 앱 생성 → 권한: `files.metadata.read`, `files.content.read` (+ 업로드는 `files.content.write`)
2) Redirect URI 등록: `https://<도메인>/api/auth/dropbox`
3) Vercel 환경변수 추가:
   - `DROPBOX_APP_KEY`
   - `DROPBOX_APP_SECRET`
   - (초기에는 `DROPBOX_REFRESH_TOKEN` 비워둠)
   - `DROPBOX_PATH`, `CRON_SECRET`
4) 최초 1회: 브라우저에서 `https://<도메인>/api/auth/dropbox` 접속 → 로그인/동의 → 돌아오면 **refresh_token** 표시됨
5) 표시된 값을 `DROPBOX_REFRESH_TOKEN`에 저장하고 Redeploy
6) `/api/oauth/test` 호출해 목록이 뜨면 성공

이후 모든 Dropbox 호출은 자동으로 단기 액세스 토큰을 갱신해 사용합니다.
