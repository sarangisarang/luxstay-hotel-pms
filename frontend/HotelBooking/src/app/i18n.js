"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/locales/en.json";
import ka from "@/locales/ka.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import it from "@/locales/it.json";
import pt from "@/locales/pt.json";
import ru from "@/locales/ru.json";
import ar from "@/locales/ar.json";
import zh from "@/locales/zh.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import tr from "@/locales/tr.json";
import nl from "@/locales/nl.json";
import pl from "@/locales/pl.json";
import ro from "@/locales/ro.json";
import uk from "@/locales/uk.json";
import hi from "@/locales/hi.json";

if (!i18n.isInitialized) {
    i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources: {
                en: { translation: en },
                ka: { translation: ka },
                de: { translation: de },
                fr: { translation: fr },
                es: { translation: es },
                it: { translation: it },
                pt: { translation: pt },
                ru: { translation: ru },
                ar: { translation: ar },
                zh: { translation: zh },
                ja: { translation: ja },
                ko: { translation: ko },
                tr: { translation: tr },
                nl: { translation: nl },
                pl: { translation: pl },
                ro: { translation: ro },
                uk: { translation: uk },
                hi: { translation: hi },
            },
            fallbackLng: "en",
            interpolation: { escapeValue: false },
            detection: {
                order: ["localStorage", "navigator"],
                lookupLocalStorage: "i18n-lang",
                caches: ["localStorage"],
            },
        });
}

export default i18n;
