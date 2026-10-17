import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, handle, verificationCode, creatorHandle } = body;

    if (!handle || !verificationCode) {
      return NextResponse.json(
        { error: "Handle and verification code are required" },
        { status: 400 }
      );
    }

    const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();
    const cleanCode = verificationCode.trim().toUpperCase();

    // Call FastAPI backend to perform live bio / description verification
    const fastApiUrl = process.env.BACKEND_API_URL || "http://localhost:8002";
    try {
      const backendRes = await fetch(`${fastApiUrl}/api/v1/creators/verify-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: cleanHandle,
          verification_code: cleanCode,
          creator_handle: creatorHandle || null,
        }),
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        return NextResponse.json({
          success: true,
          verified: backendData.verified,
          platform: backendData.platform || platform,
          handle: backendData.handle || cleanHandle,
          verificationCode: cleanCode,
          verifiedAt: new Date().toISOString(),
          message: backendData.message,
        });
      }
    } catch (backendErr) {
      console.warn("Backend verification call failed:", backendErr);
    }

    // Direct fallback live verification check in Next.js
    let liveVerified = false;
    let message = "";

    if (platform === "instagram") {
      try {
        const igUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanHandle}`;
        const igRes = await fetch(igUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "x-ig-app-id": "936619743392459",
            Referer: "https://www.instagram.com/",
          },
        });
        if (igRes.ok) {
          const igData = await igRes.json();
          const bio = (igData?.data?.user?.biography || "").toUpperCase();
          if (bio.includes(cleanCode) || bio.includes(`FLENZR.COM/@${cleanHandle.toUpperCase()}`)) {
            liveVerified = true;
            message = `Ownership confirmed live on Instagram! Found '${cleanCode}' in @${cleanHandle}'s bio.`;
          } else {
            message = `Verification code '${cleanCode}' was not found in @${cleanHandle}'s Instagram bio. Please paste it into your bio and try again.`;
          }
        } else {
          message = `Could not reach Instagram profile @${cleanHandle} (HTTP ${igRes.status}). Ensure account is public.`;
        }
      } catch (e) {
        message = "Could not reach Instagram. Please check your connection.";
      }
    } else {
      try {
        const ytUrl = `https://www.youtube.com/@${cleanHandle}`;
        const ytRes = await fetch(ytUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (ytRes.ok) {
          const ytText = await ytRes.text();
          if (ytText.toUpperCase().includes(cleanCode)) {
            liveVerified = true;
            message = `Ownership confirmed live on YouTube! Found '${cleanCode}' in channel description.`;
          } else {
            message = `Verification code '${cleanCode}' was not detected in YouTube channel description.`;
          }
        } else {
          message = `Could not reach YouTube channel @${cleanHandle} (HTTP ${ytRes.status}). Ensure channel exists.`;
        }
      } catch (e) {
        message = "Could not reach YouTube. Please check your connection.";
      }
    }

    return NextResponse.json({
      success: true,
      verified: liveVerified,
      platform,
      handle: cleanHandle,
      verificationCode: cleanCode,
      verifiedAt: new Date().toISOString(),
      message:
        message ||
        (liveVerified
          ? `Ownership verified for @${cleanHandle}!`
          : `Code ${cleanCode} not found on @${cleanHandle}.`),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify social bio" },
      { status: 500 }
    );
  }
}
