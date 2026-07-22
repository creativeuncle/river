import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

export function ComingSoonPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: HugeiconsIconProps["icon"];
}) {
  return (
    <div className="settings-page coming-soon-page">
      <div className="coming-soon-icon">
        <HugeiconsIcon icon={icon} size={28} />
      </div>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
    </div>
  );
}
