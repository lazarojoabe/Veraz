import { describe, expect, it } from "vitest";
import { addDaysToDayKey, appDayKey, startOfAppDayIso } from "./app-timezone";

describe("fuso horário do VERAZ", () => {
  it("mantém refeições noturnas no dia civil de São Paulo", () => {
    expect(appDayKey("2026-11-07T02:30:00.000Z")).toBe("2026-11-06");
    expect(appDayKey("2026-11-07T03:00:00.000Z")).toBe("2026-11-07");
  });

  it("converte o início do dia local para UTC", () => {
    expect(startOfAppDayIso("2026-11-06")).toBe("2026-11-06T03:00:00.000Z");
  });

  it("avança dias civis entre meses e anos", () => {
    expect(addDaysToDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDayKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});
