# ModelForge - 3D Model Viewer

A modern 3D model viewer built with Next.js, Three.js, and Sketchfab API integration. Browse, search, and view 3D models with multiple rendering modes including wireframe, solid, and x-ray views.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Three.js](https://img.shields.io/badge/Three.js-0.181-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan)

## Features

- 🎨 **Multiple View Modes** - Switch between wireframe, solid, and x-ray rendering
- 🔍 **Sketchfab Search** - Browse millions of 3D models from Sketchfab
- 🖱️ **Interactive Controls** - Orbit, zoom, and pan around models
- 📦 **GLB/GLTF Support** - Load and display industry-standard 3D formats
- 🌗 **Dark Theme** - Easy on the eyes with a sleek dark interface
- ⚡ **Fast Loading** - Optimized model loading with DRACO compression support

## Quick Start

### Prerequisites

- Node.js 18+
- Sketchfab API Key (get one at [sketchfab.com/developers](https://sketchfab.com/developers))

### Installation

1. **Install dependencies:**
   ```bash
   cd model-forge
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your Sketchfab API key:
   ```
   SKETCHFAB_API_KEY=your_api_key_here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Searching Models

1. Click the "Search Models" button in the sidebar
2. Enter a search term (e.g., "car", "robot", "building")
3. Click on a model card to load it into the viewer

### Viewing Models

- **Orbit**: Click and drag to rotate around the model
- **Zoom**: Scroll to zoom in/out
- **Pan**: Right-click and drag to pan

### Rendering Modes

Toggle between three rendering modes using the buttons in the header:

| Mode | Description |
|------|-------------|
| **Wireframe** | Shows the mesh structure with edge lines |
| **Solid** | Full materials and textures (default) |
| **X-Ray** | Semi-transparent view to see internal structure |

## Project Structure

```
model-forge/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── sketchfab/
│   │   │       ├── search/route.ts    # Search API endpoint
│   │   │       └── download/route.ts  # Download URL endpoint
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Main application page
│   ├── components/
│   │   ├── ModelViewer.tsx            # 3D model viewer component
│   │   ├── ModelSearch.tsx            # Sketchfab search UI
│   │   └── WireframeCube.tsx          # Decorative animated cube
│   └── lib/
│       ├── sketchfab.ts               # Sketchfab API service
│       ├── three-utils.ts             # Three.js utilities
│       └── utils.ts                   # General utilities
├── .env.local.example
├── next.config.ts
├── package.json
└── README.md
```

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **3D Rendering**: [Three.js](https://threejs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **3D Models**: [Sketchfab API](https://sketchfab.com/developers)

## API Routes

### `GET /api/sketchfab/search`

Search for models on Sketchfab.

**Query Parameters:**
- `q` - Search query (required)
- `count` - Number of results (default: 24)

**Response:**
```json
{
  "results": [
    {
      "uid": "model-id",
      "name": "Model Name",
      "thumbnailUrl": "https://...",
      "author": "Author Name",
      "viewCount": 1000,
      "likeCount": 50
    }
  ]
}
```

### `GET /api/sketchfab/download`

Get download URL for a specific model.

**Query Parameters:**
- `uid` - Model UID (required)

**Response:**
```json
{
  "url": "https://...",
  "format": "glb"
}
```

## Three.js Utilities

The `src/lib/three-utils.ts` module provides reusable utilities:

- `initializeScene()` - Create scene, camera, and renderer
- `addOrbitControls()` - Add interactive camera controls
- `addBasicLighting()` - Set up ambient and directional lights
- `createWireframeMaterial()` - Generate wireframe material
- `applyWireframeToObject()` - Convert model to wireframe
- `normalizeObject()` - Center and scale models
- `createAnimationLoop()` - Standard render loop setup
- `disposeObject()` - Clean up Three.js resources

## Customization

### Adding Custom Models

You can load local GLB/GLTF files by modifying the `ModelViewer` component to accept a file URL prop instead of using Sketchfab.

### Changing Themes

Edit `src/app/globals.css` to customize colors and styling.

### Adding New View Modes

Extend the `ViewMode` type in `ModelViewer.tsx` and add corresponding material logic in the `applyViewMode` function.

## License

MIT

## Credits

- Inspired by [CyberSea](https://github.com/your-org/cybersea) military equipment visualization
- 3D models provided by [Sketchfab](https://sketchfab.com)
- Built with [Next.js](https://nextjs.org) and [Three.js](https://threejs.org)
