/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#26343a',
    tint: '#c7684a',

    // Core surfaces
    background: '#f7f2ea',
    foreground: '#26343a',

    // Cards / elevated surfaces
    card: '#fffaf2',
    cardForeground: '#26343a',

    // Primary action color (buttons, links, active states)
    primary: '#c7684a',
    primaryForeground: '#fffaf2',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e7eee9',
    secondaryForeground: '#35564f',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ede5da',
    mutedForeground: '#71807c',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#d9e8df',
    accentForeground: '#35564f',

    // Destructive actions (delete, error states)
    destructive: '#b94d45',
    destructiveForeground: '#fffaf2',

    // Borders and input outlines
    border: '#dddbd1',
    input: '#d5d5ca',
  },
  dark: {
    text: '#f4eee5',
    tint: '#e0805d',
    background: '#1d2929',
    foreground: '#f4eee5',
    card: '#263735',
    cardForeground: '#f4eee5',
    primary: '#e0805d',
    primaryForeground: '#1d2929',
    secondary: '#334946',
    secondaryForeground: '#d9e8df',
    muted: '#2a3a39',
    mutedForeground: '#aab8ad',
    accent: '#3c5b52',
    accentForeground: '#e3f0e5',
    destructive: '#e8786d',
    destructiveForeground: '#1d2929',
    border: '#41534e',
    input: '#50615a',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
