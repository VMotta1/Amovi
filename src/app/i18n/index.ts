import { en } from "./en";
import { fr } from "./fr";

export type AppLanguage = "English" | "Français";

export const SUPPORTED_LANGUAGES: AppLanguage[] = ["English", "Français"];

export const translations = {
  English: en,
  Français: fr,
} as const;

export type TranslationTree = typeof en;

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type NestedKeys<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : Join<K, NestedKeys<T[K]>>;
    }[keyof T & string];

export type TranslationKey = NestedKeys<TranslationTree>;
