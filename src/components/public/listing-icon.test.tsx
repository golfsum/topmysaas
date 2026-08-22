import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListingIcon } from "./listing-icon";

describe("listing icon", () => {
  it("renders a same-origin favicon over the initials fallback", () => {
    const html = renderToStaticMarkup(
      <ListingIcon name="Client Plot" url="https://clientplot.com" />,
    );

    expect(html).toContain("CP");
    expect(html).toContain("/api/favicon?domain=clientplot.com");
    expect(html).toContain('alt=""');
  });

  it("keeps only initials when a website cannot safely load a favicon", () => {
    const html = renderToStaticMarkup(
      <ListingIcon name="Internal Tool" url="https://localhost" />,
    );

    expect(html).toContain("IT");
    expect(html).not.toContain("/api/favicon");
  });
});
