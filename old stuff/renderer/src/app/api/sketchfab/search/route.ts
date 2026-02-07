import { NextRequest, NextResponse } from "next/server";

const SKETCHFAB_API_BASE = "https://api.sketchfab.com/v3";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const cursor = searchParams.get("cursor");

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  const apiKey = process.env.SKETCHFAB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sketchfab API key not configured" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      type: "models",
      downloadable: "true",
      count: "24",
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(`${SKETCHFAB_API_BASE}/search?${params}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Sketchfab search error:", error);
      return NextResponse.json(
        { error: "Failed to search models" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform results to simpler format
    const results = data.results.map((model: any) => ({
      uid: model.uid,
      name: model.name,
      thumbnailUrl: model.thumbnails?.images?.[0]?.url || "",
      author: model.user?.displayName || model.user?.username || "Unknown",
      viewCount: model.viewCount || 0,
      likeCount: model.likeCount || 0,
      isDownloadable: model.isDownloadable || false,
    }));

    return NextResponse.json({
      results,
      nextCursor: data.cursors?.next || null,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
