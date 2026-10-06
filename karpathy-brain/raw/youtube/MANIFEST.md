# YouTube — @AndrejKarpathy — MANIFEST

**Status: NOT COLLECTED (network blocked)**

| File | Words |
|------|-------|
| _(none)_ | 0 |

**Videos found:** 0 · **Transcripts saved:** 0 · **Total words:** 0

## Failed

- **Entire source:** this cloud environment's network policy blocks YouTube. Every request to
  `www.youtube.com:443` is refused with `CONNECT tunnel failed, response 403`. yt-dlp reported
  `ProxyError('Unable to connect to proxy', OSError('Tunnel connection failed: 403 Forbidden'))`
  while listing the channel, so no videos could be listed and no transcripts fetched, by either
  youtube-transcript-api or yt-dlp.
- To fix: allow `www.youtube.com`, `youtubei.googleapis.com`, `*.googlevideo.com` and `i.ytimg.com`
  in the environment's network access settings, then re-run collection in a new session.
