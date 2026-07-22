import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { db } from "../src/db/travel-db";

describe("App", () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it("renders the selected persisted trip", async () => {
    render(<App />);
    expect((await screen.findAllByText("日本关西 6 日")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "账单" })).toBeInTheDocument();
  });

  it("navigates to the real expense ledger", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "账单" }));
    expect(screen.getByRole("heading", { name: "账单与预算" })).toBeInTheDocument();
    expect(screen.getByLabelText("消费名称")).toBeInTheDocument();
    expect(screen.queryByText("旅行开支记录功能即将上线")).not.toBeInTheDocument();
  });

  it("adds a persisted itinerary node through the primary itinerary", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "添加节点" }));
    const dialog = screen.getByRole("dialog", { name: "编辑节点" });
    await user.type(within(dialog).getByLabelText("标题"), "东京站");
    const city = within(dialog).getByLabelText("城市");
    await user.type(city, "东京");
    await user.clear(within(dialog).getByLabelText("纬度（WGS84）"));
    await user.type(within(dialog).getByLabelText("纬度（WGS84）"), "35.6812");
    await user.clear(within(dialog).getByLabelText("经度（WGS84）"));
    await user.type(within(dialog).getByLabelText("经度（WGS84）"), "139.7671");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(await screen.findByText("东京站")).toBeInTheDocument();
    expect((await db.stops.toArray()).some((stop) => stop.title === "东京站")).toBe(true);
  });
});
