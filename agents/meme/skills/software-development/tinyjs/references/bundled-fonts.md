# Bundling a font in a tinyjs app

## Fetch the file

- Ask Google Fonts with a browser user agent and read the `/* latin */` block: `curl -s -H "User-Agent: Mozilla/5.0 … Chrome/120.0" "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..600&display=swap"`
- Save the woff2 in `src/frontend/fonts/`, and its OFL from `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/OFL.txt`.
- Latin-1 (`U+0000-00FF`) covers English and Swedish; other scripts fall back to the system font — say what you left out.

## Wire it

```css
@font-face {
  font-family: "Newsreader";
  src: url("fonts/newsreader-latin.woff2") format("woff2");
  font-weight: 400 600;
  font-style: normal;
  font-display: block;
}
```

- Keep the UI font separate; the serif is for the reading surface only.
- Render with `font-optical-sizing: auto`, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`.

## Prove it ships

- After `tinyjs build`, `strings dist/<app> | grep -c <font-file>` is non-zero and the app shows the new face; a `file://` page loads the relative URL without readAccess.
- The build has no network: a CDN font breaks the offline promise.
