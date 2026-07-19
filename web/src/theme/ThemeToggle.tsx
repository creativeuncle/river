import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon01Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
      <HugeiconsIcon icon={theme === "light" ? Moon01Icon : Sun01Icon} size={18} />
    </button>
  );
}
