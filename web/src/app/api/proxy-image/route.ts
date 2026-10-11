import { NextResponse } from "next/server";

function createFallbackSvg(label?: string) {
  const initial = (label || "F").charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f1f1f"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#avatarGrad)"/>
  <circle cx="64" cy="64" r="62" fill="none" stroke="#333333" stroke-width="2"/>
  <text x="64" y="78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text>
</svg>`;
}

export async function GET(request: Request) {
  const reqUrl = request.url;
  const { searchParams } = new URL(reqUrl);
  
  // Extract target URL safely even if unescaped '&' is present in query string
  let targetUrl = searchParams.get("url");
  const urlParamIdx = reqUrl.indexOf("url=");
  if (urlParamIdx !== -1) {
    const rawUrlPart = reqUrl.substring(urlParamIdx + 4);
    try {
      targetUrl = decodeURIComponent(rawUrlPart);
    } catch {
      targetUrl = rawUrlPart;
    }
  }

  const nameParam = searchParams.get("name") || "Flenzr";

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return new Response(createFallbackSvg(nameParam), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new Response(createFallbackSvg(nameParam), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(createFallbackSvg(nameParam), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  }
}

export async function HEAD(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
