import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import ptBR from "./pt-BR.json";

const resources = {
  en: { translation: en },
  "pt-BR": { translation: ptBR },
};

const savedLanguage = localStorage.getItem("language") || "pt-BR";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "pt-BR",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
