# GAC

GAC is a free, open-source utility for resizing animated GIFs in the browser.

It was developed for Stratento.org as a sample project and as a genuinely useful everyday tool for reducing GIF dimensions and file size without needing desktop software.

## What It Does

- Upload an animated GIF
- Resize frames by scaling the animation down
- Reduce the number of frames with frame skipping
- Lower the color count to shrink file size further
- Preview and download the processed GIF

## Tech Stack

- React
- Vite
- Tailwind CSS
- gifuct-js
- gif.js

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## GitHub Pages Deployment

This project is configured to publish to:

```text
https://m14d3n.github.io/gac/
```

The Vite base path is set to `/gac/`, so built assets resolve correctly when the app is served from the repository subpath on GitHub Pages.

Deploy the current state of the app to the `gh-pages` branch:

```bash
npm run deploy
```

If GitHub Pages is not already configured for the repository, set the Pages source to the `gh-pages` branch in the repository settings after the first deploy.

## License

This project is free and open source.
