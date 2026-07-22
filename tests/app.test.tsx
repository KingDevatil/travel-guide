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

  it("explains how to unlock transport instead of showing a dead control", async () => {
    const user = userEvent.setup();
    render(<App />);
    const addTransport = await screen.findByRole("button", { name: "添加交通" });
    expect(addTransport).toBeEnabled();
    await user.click(addTransport);
    expect(screen.getByRole("status")).toHaveTextContent("先添加出发地和目的地两个节点");
    expect(screen.getAllByRole("button", { name: "添加第一个节点" }).length).toBeGreaterThan(0);
  });

  it("searches cities, adds two nodes, and connects them with transport", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "添加节点" }));
    const dialog = screen.getByRole("dialog", { name: "添加节点" });
    expect(within(dialog).queryByLabelText("纬度（WGS84）")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("城市或目的地"), "京都");
    await user.click(await within(dialog).findByRole("button", { name: "选择 京都，日本" }));
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));
    expect(await screen.findByText("京都")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加节点" }));
    const secondDialog = screen.getByRole("dialog", { name: "添加节点" });
    await user.type(within(secondDialog).getByLabelText("城市或目的地"), "大阪");
    await user.click(await within(secondDialog).findByRole("button", { name: "选择 大阪，日本" }));
    await user.click(within(secondDialog).getByRole("button", { name: "保存节点" }));

    await user.click(await screen.findByRole("button", { name: "添加交通" }));
    const legDialog = screen.getByRole("dialog", { name: "添加交通" });
    await user.click(within(legDialog).getByRole("button", { name: "保存" }));

    const stops = await db.stops.toArray();
    expect(stops.map((stop) => stop.city)).toEqual(expect.arrayContaining(["京都", "大阪"]));
    expect(stops.every((stop) => stop.latitude !== 0 && stop.longitude !== 0)).toBe(true);
    expect(await db.legs.count()).toBe(1);
  });

  it("opens trip editing and deletion as a single top-level dialog", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "管理行程" }));
    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(screen.getByRole("dialog", { name: "编辑行程" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "我的行程" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(screen.getByRole("button", { name: "管理行程" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("dialog", { name: "删除行程？" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "我的行程" })).not.toBeInTheDocument();
  });
});
