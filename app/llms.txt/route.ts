import { getTranslations } from "next-intl/server";
import { getContent } from "@/lib/content/repo";
import { getSiteUrl } from "@/lib/site-url";

// /llms.txt — the llmstxt.org convention: a plain-text, link-first index that
// lets AI assistants discover and cite the useful pages. Generated from the live
// corpus and regenerated hourly (+ on content:import revalidation), like the
// sitemap, so it never goes stale.
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const base = getSiteUrl();
  const [{ sections, steps }, tApp] = await Promise.all([getContent(), getTranslations("app")]);

  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  const lines: string[] = [];

  lines.push(`# ${tApp("name")} — ${tApp("tagline")}`);
  lines.push("");
  lines.push(
    "> Бесплатный независимый навигатор адаптации для новых репатриантов (олим) в Израиле: персональный пошаговый план со сроками, шагами и ссылками на официальные источники.",
  );
  lines.push("");
  lines.push(
    "Практические гиды по репатриации и адаптации в Израиле: документы и статус, банк, больничная касса (купат холим), аренда и покупка жилья, работа, льготы, ульпан и другое. Каждый шаг ссылается на официальный источник (gov.il, Kol Zchut, Bituach Leumi, Nativ) и показывает дату последней проверки. Личные данные пользователя хранятся только в его браузере. Это не юридическая консультация — всегда проверяйте актуальность по официальному источнику.",
  );
  lines.push("");
  lines.push("## Основные страницы");
  lines.push(`- [Пройти опрос и получить персональный план](${base}/onboarding)`);
  lines.push(`- [Пошаговый план репатриации](${base}/plan)`);
  lines.push(`- [Все гиды по разделам](${base}/guides)`);
  lines.push(`- [О проекте и источниках](${base}/about)`);
  lines.push("");
  lines.push("## Гиды по разделам");

  for (const sec of [...sections].sort(bySort)) {
    const secUrl = `${base}/guides/${sec.slug}`;
    lines.push("");
    lines.push(`### [${sec.title}](${secUrl})`);
    if (sec.description) lines.push(sec.description);
    for (const st of steps.filter((s) => s.section_slug === sec.slug).sort(bySort)) {
      const stepUrl = `${base}/guides/${sec.slug}/${st.slug}`;
      lines.push(`- [${st.title}](${stepUrl})${st.summary ? `: ${st.summary}` : ""}`);
    }
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
