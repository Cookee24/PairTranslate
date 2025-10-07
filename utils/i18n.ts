import { createI18n } from "@wxt-dev/i18n";
import type { GeneratedI18nStructure } from "../.wxt/i18n/structure";

export const i18n = createI18n<GeneratedI18nStructure>();
export const t = i18n.t;
