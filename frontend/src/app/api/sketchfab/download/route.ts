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
    const response = await fetch(`${SKETCHFAB_API_BASE}/models/${uid}/download`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: "Model is not downloadable or requires authentication" },
          { status: 403 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Model not found" },
          { status: 404 }
        );
      }
      const error = await response.text();
      console.error("Sketchfab download error:", error);
      return NextResponse.json(
        { error: "Failed to get download URL" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const downloadUrl = data.glb?.url || data.gltf?.url;

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "No downloadable format available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      downloadUrl,
      format: data.glb?.url ? "glb" : "gltf",
      size: data.glb?.size || data.gltf?.size,
      expires: data.glb?.expires || data.gltf?.expires,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
