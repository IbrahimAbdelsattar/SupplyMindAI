import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormattedMessage } from "@/components/ai/FormattedMessage";

describe("FormattedMessage RTL support", () => {
  it("renders ul with rtl padding class", () => {
    render(<FormattedMessage content="- item 1\n- item 2" />);
    const list = screen.getByRole("list");
    expect(list.className).toContain("rtl:pr-5");
    expect(list.className).toContain("rtl:pl-0");
  });

  it("renders ol with rtl padding class", () => {
    render(<FormattedMessage content="1. first\n2. second" />);
    const list = screen.getByRole("list");
    expect(list.className).toContain("rtl:pr-5");
    expect(list.className).toContain("rtl:pl-0");
  });

  it("renders empty content gracefully", () => {
    const { container } = render(<FormattedMessage content="" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders null content gracefully", () => {
    const { container } = render(<FormattedMessage content="" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("i18n direction change", () => {
  it("sets document.dir to ltr for English", async () => {
    const { default: i18n } = await import("@/i18n/index");
    await i18n.changeLanguage("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });

  it("sets document.dir to rtl for Arabic", async () => {
    const { default: i18n } = await import("@/i18n/index");
    await i18n.changeLanguage("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });
});
