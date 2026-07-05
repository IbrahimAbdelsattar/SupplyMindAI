import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../../locales/en/common.json";
import enDashboard from "../../locales/en/dashboard.json";
import enForecasting from "../../locales/en/forecasting.json";
import enInventory from "../../locales/en/inventory.json";
import enInsights from "../../locales/en/insights.json";
import enReports from "../../locales/en/reports.json";
import enMlops from "../../locales/en/mlops.json";
import enSettings from "../../locales/en/settings.json";
import enLanding from "../../locales/en/landing.json";
import enChatbot from "../../locales/en/chatbot.json";
import enUi from "../../locales/en/ui.json";
import enAi from "../../locales/en/ai.json";
import enAlerts from "../../locales/en/alerts.json";


import arCommon from "../../locales/ar/common.json";
import arDashboard from "../../locales/ar/dashboard.json";
import arForecasting from "../../locales/ar/forecasting.json";
import arInventory from "../../locales/ar/inventory.json";
import arInsights from "../../locales/ar/insights.json";
import arReports from "../../locales/ar/reports.json";
import arMlops from "../../locales/ar/mlops.json";
import arSettings from "../../locales/ar/settings.json";
import arLanding from "../../locales/ar/landing.json";
import arChatbot from "../../locales/ar/chatbot.json";
import arUi from "../../locales/ar/ui.json";
import arAi from "../../locales/ar/ai.json";
import arAlerts from "../../locales/ar/alerts.json";


i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "supplymind_lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        common: enCommon,
        dashboard: enDashboard,
        forecasting: enForecasting,
        inventory: enInventory,
        insights: enInsights,
        reports: enReports,
        mlops: enMlops,
        settings: enSettings,
        landing: enLanding,
        chatbot: enChatbot,
        ui: enUi,
        ai: enAi,
        alerts: enAlerts,
      },
      ar: {
        common: arCommon,
        dashboard: arDashboard,
        forecasting: arForecasting,
        inventory: arInventory,
        insights: arInsights,
        reports: arReports,
        mlops: arMlops,
        settings: arSettings,
        landing: arLanding,
        chatbot: arChatbot,
        ui: arUi,
        ai: arAi,
        alerts: arAlerts,
      },
    },
  });

const setDocumentDirection = (lng: string) => {
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
};

i18n.on("languageChanged", setDocumentDirection);
setDocumentDirection(i18n.language);

export default i18n;
