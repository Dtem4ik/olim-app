import {
  Award,
  Backpack,
  BookOpen,
  Briefcase,
  Bus,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  House,
  IdCard,
  KeyRound,
  Landmark,
  type LucideIcon,
  PawPrint,
  PiggyBank,
  ShieldAlert,
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
  "id-card": IdCard,
  backpack: Backpack,
  "piggy-bank": PiggyBank,
  house: House,
  award: Award,
  "paw-print": PawPrint,
  "heart-handshake": HeartHandshake,
  "shield-alert": ShieldAlert,
};

export function sectionIcon(name: string | null): LucideIcon {
  return (name ? ICONS[name] : undefined) ?? BookOpen;
}
