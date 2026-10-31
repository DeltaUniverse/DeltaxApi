/**
 * Champagne Theme configuration and custom CSS for Scalar API Reference.
 *
 * Requirements:
 * - Font: Hanken Grotesk (body text), JetBrains Mono (code), Cormorant Garamond (section titles) from Google Fonts
 * - Light Mode:
 *     Backgrounds: #fafaf9 / #f3f1ee / #e9e5df
 *     Text: #1c1917 / #57534e / #78716c
 *     Accent: #8a6a3b
 *     Border: #e7e5e4
 *     Button: #1c1917 with text #fafaf9
 * - Dark Mode:
 *     Backgrounds: #0c0a09 / #171412 / #221e1b
 *     Text: #f5f5f4 / #c9c3bc / #8f8780
 *     Accent: #c9a56b
 *     Border: #292524
 *     Button: #c9a56b with text #0c0a09
 * - Download and client buttons hidden
 */

export const champagneCustomCss = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Hanken+Grotesk:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

:root {
  --scalar-font: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --scalar-font-code: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Light Mode: Champagne Palette */
.light-mode {
  color-scheme: light;
  --scalar-background-1: #fafaf9;
  --scalar-background-2: #f3f1ee;
  --scalar-background-3: #e9e5df;
  --scalar-color-1: #1c1917;
  --scalar-color-2: #57534e;
  --scalar-color-3: #78716c;
  --scalar-color-accent: #8a6a3b;
  --scalar-border-color: #e7e5e4;
  --scalar-button-1: #1c1917;
  --scalar-button-1-color: #fafaf9;
  --scalar-button-1-hover: #292524;
  --scalar-background-accent: #8a6a3b1a;

  --scalar-font: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --scalar-font-code: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Dark Mode: Champagne Palette */
.dark-mode {
  color-scheme: dark;
  --scalar-background-1: #0c0a09;
  --scalar-background-2: #171412;
  --scalar-background-3: #221e1b;
  --scalar-color-1: #f5f5f4;
  --scalar-color-2: #c9c3bc;
  --scalar-color-3: #8f8780;
  --scalar-color-accent: #c9a56b;
  --scalar-border-color: #292524;
  --scalar-button-1: #c9a56b;
  --scalar-button-1-color: #0c0a09;
  --scalar-button-1-hover: #d8b67d;
  --scalar-background-accent: #c9a56b22;

  --scalar-font: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --scalar-font-code: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Sidebar navigation */
.light-mode .sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);
  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-active-background: var(--scalar-background-2);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-color: var(--scalar-color-2);
}

.dark-mode .sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);
  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-active-background: var(--scalar-background-2);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-color: var(--scalar-color-2);
}

/* Typography: Hanken Grotesk for general text */
body,
#app,
.scalar-api-reference,
.scalar-card,
p,
span,
li,
td,
th,
input,
textarea,
select,
button {
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Typography: JetBrains Mono for code elements */
code,
pre,
.scalar-code,
.cm-editor,
.cm-editor *,
.cm-content,
.cm-line,
var,
kbd,
samp {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}

/* Typography: Cormorant Garamond for section titles / headings */
.section-header,
.section-header *,
.section-header-wrapper,
.section-header-label,
.section-title,
.scalar-card-header-title,
.t-editor__heading,
.t-editor__page-title h1,
h1,
h2,
h3,
h4,
h5,
h6,
.markdown h1,
.markdown h2,
.markdown h3,
.markdown h4,
.markdown h5,
.markdown h6 {
  font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif !important;
  letter-spacing: 0.015em;
}

.light-mode .section-header:not(::selection),
.light-mode h1.section-header:not(::selection),
.light-mode .section-title,
.light-mode h1,
.light-mode h2,
.light-mode h3,
.light-mode h4 {
  color: #1c1917 !important;
  -webkit-text-fill-color: #1c1917 !important;
  background-image: none !important;
  background: none !important;
}

.dark-mode .section-header:not(::selection),
.dark-mode h1.section-header:not(::selection),
.dark-mode .section-title,
.dark-mode h1,
.dark-mode h2,
.dark-mode h3,
.dark-mode h4 {
  color: #f5f5f4;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(to right bottom, #f5f5f4 40%, #c9a56b 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
}

/* Buttons in light and dark mode */
.light-mode .scalar-button,
.light-mode button.scalar-button-primary {
  background-color: #1c1917 !important;
  color: #fafaf9 !important;
}

.light-mode .scalar-button:hover,
.light-mode button.scalar-button-primary:hover {
  background-color: #292524 !important;
}

.dark-mode .scalar-button,
.dark-mode button.scalar-button-primary {
  background-color: #c9a56b !important;
  color: #0c0a09 !important;
}

.dark-mode .scalar-button:hover,
.dark-mode button.scalar-button-primary:hover {
  background-color: #d8b67d !important;
}

/* Sembunyikan tombol download */
.download-container,
.download-button,
.download-link,
[aria-label*="download" i],
[aria-label*="unduh" i],
button:has([data-icon="download"]) {
  display: none !important;
}
`;
