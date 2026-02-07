import { NextRequest, NextResponse } from "next/server";

const SKETCHFAB_API_BASE = "https://api.sketchfab.com/v3";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "Model UID is required" }, { status: 400 });
  }

  const apiKey = process.env.SKETCHFAB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sketchfab API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${SKETCHFAB_API_BASE}/models/${uid}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Model not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to get model details" },
        { status: response.status }
      );
    }

    const model = await response.json();

    return NextResponse.json({
      uid: model.uid,
      name: model.name,
      thumbnailUrl: model.thumbnails?.images?.[0]?.url || "",
      author: model.user?.displayName || model.user?.username || "Unknown",
      viewCount: model.viewCount || 0,
      likeCount: model.likeCount || 0,
      isDownloadable: model.isDownloadable || false,
    });
  } catch (error) {
    console.error("Details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
