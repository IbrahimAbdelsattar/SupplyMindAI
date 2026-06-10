import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export const LanguageSwitcher = ({ collapsed }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const currentLng = i18n.language?.startsWith("ar") ? "ar" : "en";

  const toggleLanguage = () => {
    const next = currentLng === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleLanguage}
      className={cn(
        "w-full justify-start gap-3",
        collapsed && "justify-center px-0"
      )}
      title={currentLng === "en" ? "التبديل إلى العربية" : "Switch to English"}
    >
      <Languages className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{currentLng === "en" ? "العربية" : "English"}</span>}
    </Button>
  );
};
