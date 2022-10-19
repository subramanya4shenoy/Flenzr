export const SCOPES = ['https://www.googleapis.com/auth/youtube',
'https://www.googleapis.com/auth/youtube.force-ssl',
'https://www.googleapis.com/auth/youtube.readonly',
'https://www.googleapis.com/auth/youtubepartner',
'https://www.googleapis.com/auth/youtubepartner-channel-audit'];

export const YT_CONFIG = {
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
}