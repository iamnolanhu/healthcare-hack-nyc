import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const jetMono = loadMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const fonts = {
  sans: inter.fontFamily,
  mono: jetMono.fontFamily,
};

export const colors = {
  bg: "#FAF8F5",
  card: "#FFFFFF",
  ink: "#1C1917",
  inkSoft: "#57534E",
  inkFaint: "#A8A29E",
  line: "#E7E5E4",
  teal: "#0F766E",
  tealBg: "#E7F2F0",
  tealDeep: "#115E59",
  danger: "#B91C1C",
  dangerBg: "#FDEDED",
};

export const PHONE = "+1 (848) 249-1409";

// Emil-style restrained ease-out
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
