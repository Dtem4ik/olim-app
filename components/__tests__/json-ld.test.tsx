import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "@/components/seo/json-ld";

describe("JsonLd", () => {
  it("renders nothing for an empty graph", () => {
    const { container } = render(<JsonLd data={[]} />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("serializes the graph into an application/ld+json script", () => {
    const { container } = render(<JsonLd data={[{ "@type": "BreadcrumbList", name: "x" }]} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script?.innerHTML ?? "[]")).toEqual([
      { "@type": "BreadcrumbList", name: "x" },
    ]);
  });
});
