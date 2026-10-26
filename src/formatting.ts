import type { Options } from "prettier";

/** Keep source templates, generated files and the generated Prettier config aligned. */
export const backendFormatting: Options = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  arrowParens: "always",
  proseWrap: "preserve",
};
