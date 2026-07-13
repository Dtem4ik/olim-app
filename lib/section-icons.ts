import {
  BookOpen,
  Briefcase,
  Bus,
  GraduationCap,
  HandCoins,
  HeartPulse,
  KeyRound,
  Landmark,
  type LucideIcon,
  Smartphone,
} from "lucide-react";

/** Map a section's `icon` name (from content) to a Lucide component. */
const ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  "heart-pulse": HeartPulse,
  "hand-coins": HandCoins,
  "key-round": KeyRound,
  briefcase: Briefcase,
  bus: Bus,
  smartphone: Smartphone,
  "graduation-cap": GraduationCap,
};

export function sectionIcon(name: string | null): LucideIcon {
  return (name ? ICONS[name] : undefined) ?? BookOpen;
}
