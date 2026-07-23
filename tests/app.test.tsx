import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { db } from "../src/db/travel-db";

describe("App", () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.delete();
    await db.open();
    const now = new Date().toISOString();
    await db.trips.add({ id: "starter-test-trip", schemaVersion: 1, title: "日本关西 6 日", startDate: "2025-10-12", endDate: "2025-10-17", timezone: "Asia/Tokyo", defaultCurrency: "JPY", participantIds: [], createdAt: now, updatedAt: now });
  });

  it("starts with no trip and offers an explicit create action", async () => {
    await db.trips.clear();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "还没有行程" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建行程" })).toBeInTheDocument();
    expect(screen.queryByText("日本关西 6 日")).not.toBeInTheDocument();
    expect(await db.trips.count()).toBe(0);
  });

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
    const stopDate = within(dialog).getByLabelText("日期");
    const startsAt = within(dialog).getByLabelText("开始时间");
    const endsAt = within(dialog).getByLabelText("结束时间");
    expect(stopDate).toHaveAttribute("min", "2025-10-12");
    expect(stopDate).toHaveAttribute("max", "2025-10-17");
    expect(startsAt).toHaveValue("2025-10-12T09:00");
    expect(endsAt).toHaveValue("2025-10-12T10:00");
    expect(startsAt).toHaveAttribute("min", "2025-10-12T00:00");
    expect(endsAt).toHaveAttribute("max", "2025-10-17T23:59");
    fireEvent.change(stopDate, { target: { value: "2025-10-14" } });
    expect(startsAt).toHaveValue("2025-10-14T09:00");
    expect(endsAt).toHaveValue("2025-10-14T10:00");
    await user.type(within(dialog).getByLabelText("所在城市"), "京都");
    await user.click(await within(dialog).findByRole("button", { name: "选择 京都，日本" }));
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));
    expect(await screen.findByText("京都")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加节点" }));
    const secondDialog = screen.getByRole("dialog", { name: "添加节点" });
    await user.type(within(secondDialog).getByLabelText("所在城市"), "大阪");
    await user.click(await within(secondDialog).findByRole("button", { name: "选择 大阪，日本" }));
    expect(within(secondDialog).getByLabelText("具体地点或地址（可选）")).toHaveAttribute("placeholder", "例如：景点、酒店或机场名称");
    expect(within(secondDialog).queryByPlaceholderText("例如：大阪外滩、酒店、机场")).not.toBeInTheDocument();
    await user.click(within(secondDialog).getByRole("button", { name: "保存节点" }));

    await user.click(await screen.findByRole("button", { name: "添加交通" }));
    const legDialog = screen.getByRole("dialog", { name: "添加交通" });
    await user.click(within(legDialog).getByRole("button", { name: "保存" }));

    const stops = await db.stops.toArray();
    expect(stops.map((stop) => stop.city)).toEqual(expect.arrayContaining(["京都", "大阪"]));
    expect(stops.every((stop) => stop.latitude !== 0 && stop.longitude !== 0)).toBe(true);
    expect(await db.legs.count()).toBe(1);
  });

  it("plans multiple precise places inside the same city", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "添加节点" }));
    let dialog = screen.getByRole("dialog", { name: "添加节点" });
    await user.type(within(dialog).getByLabelText("所在城市"), "上海");
    await user.click(within(dialog).getByRole("button", { name: "选择 上海，中国" }));
    await user.type(within(dialog).getByLabelText("具体地点或地址（可选）"), "外滩");
    await user.click(within(dialog).getByRole("button", { name: "搜索地点" }));
    await user.click(await within(dialog).findByRole("button", { name: "选择地点 外滩" }));
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));

    await user.click(screen.getByRole("button", { name: "添加节点" }));
    dialog = screen.getByRole("dialog", { name: "添加节点" });
    await user.type(within(dialog).getByLabelText("所在城市"), "上海");
    await user.click(within(dialog).getByRole("button", { name: "选择 上海，中国" }));
    await user.type(within(dialog).getByLabelText("具体地点或地址（可选）"), "浦东机场");
    await user.click(within(dialog).getByRole("button", { name: "搜索地点" }));
    await user.click(await within(dialog).findByRole("button", { name: "选择地点 上海浦东国际机场" }));
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));

    const stops = (await db.stops.toArray()).filter((stop) => stop.city === "上海");
    expect(stops).toHaveLength(2);
    expect(stops.map((stop) => stop.title)).toEqual(expect.arrayContaining(["外滩", "上海浦东国际机场"]));
    expect(new Set(stops.map((stop) => `${stop.latitude},${stop.longitude}`)).size).toBe(2);
    expect(stops.every((stop) => Boolean(stop.address))).toBe(true);
  });

  it("uses a node's local timezone and can fall back to the trip timezone", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "添加节点" }));
    let dialog = screen.getByRole("dialog", { name: "添加节点" });
    expect(within(dialog).getByLabelText("使用节点当地时间")).toBeChecked();
    expect(within(dialog).getByLabelText("节点时区")).toHaveValue("Asia/Tokyo");

    await user.type(within(dialog).getByLabelText("所在城市"), "曼谷");
    await user.click(within(dialog).getByRole("button", { name: "选择 曼谷，泰国" }));
    expect(within(dialog).getByLabelText("节点时区")).toHaveValue("Asia/Bangkok");
    expect(within(dialog).getByText("Asia/Bangkok（UTC+07:00）")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));

    let stop = (await db.stops.toArray())[0];
    expect(stop).toMatchObject({ city: "曼谷", timezone: "Asia/Bangkok", startsAt: "2025-10-12T09:00" });
    expect(await screen.findByText(/当地时间 Asia\/Bangkok/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "编辑" }));
    dialog = screen.getByRole("dialog", { name: "编辑节点" });
    await user.click(within(dialog).getByLabelText("使用节点当地时间"));
    expect(within(dialog).queryByLabelText("节点时区")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "保存节点" }));

    stop = (await db.stops.toArray())[0];
    expect(stop.timezone).toBeUndefined();
    expect(await screen.findByText("09:00—10:00 · 行程时区 Asia/Tokyo")).toBeInTheDocument();
  });

  it("merges a multi-day node instead of rendering covered days as empty", async () => {
    await db.stops.add({
      id: "multi-day-stop",
      tripId: "starter-test-trip",
      date: "2025-10-12",
      sortOrder: 0,
      title: "日本环球影城",
      country: "日本",
      city: "大阪",
      latitude: 34.6654,
      longitude: 135.4323,
      startsAt: "2025-10-12T09:00",
      endsAt: "2025-10-15T10:00",
      timezone: "Asia/Tokyo",
    });

    render(<App />);

    const timeline = await screen.findByLabelText("行程节点管理");
    expect(await within(timeline).findByRole("heading", { name: "2025-10-12 至 2025-10-15" })).toBeInTheDocument();
    expect(within(timeline).getByText(/2025-10-12 09:00—2025-10-15 10:00/)).toBeInTheDocument();
    expect(within(timeline).queryByRole("heading", { name: "2025-10-13" })).not.toBeInTheDocument();
    expect(within(timeline).queryByRole("heading", { name: "2025-10-14" })).not.toBeInTheDocument();
    expect(within(timeline).queryByRole("heading", { name: "2025-10-15" })).not.toBeInTheDocument();
    expect(within(timeline).getAllByText("暂无安排")).toHaveLength(2);
  });

  it("finds Suvarnabhumi Airport with its common Chinese name in Bangkok", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "添加节点" }));
    const dialog = screen.getByRole("dialog", { name: "添加节点" });
    await user.type(within(dialog).getByLabelText("所在城市"), "曼谷");
    await user.click(within(dialog).getByRole("button", { name: "选择 曼谷，泰国" }));
    await user.type(within(dialog).getByLabelText("具体地点或地址（可选）"), "素万那普机场");
    await user.click(within(dialog).getByRole("button", { name: "搜索地点" }));

    const result = await within(dialog).findByRole("button", { name: "选择地点 素万那普国际机场" });
    expect(result).toHaveTextContent("999 Nong Prue");
    await user.click(result);
    expect(within(dialog).getByText("已定位具体地点：素万那普国际机场")).toBeInTheDocument();
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

  it("deletes the last trip without recreating the starter trip", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(await screen.findByRole("button", { name: "管理行程" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByRole("heading", { name: "还没有行程" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建行程" })).toBeInTheDocument();
    expect(screen.queryByText("日本关西 6 日")).not.toBeInTheDocument();
    expect(await db.trips.count()).toBe(0);

    firstRender.unmount();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "还没有行程" })).toBeInTheDocument();
    expect(screen.queryByText("日本关西 6 日")).not.toBeInTheDocument();
    expect(await db.trips.count()).toBe(0);
  });

  it("edits and applies a reusable packing template", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "行李" }));
    await user.click(screen.getByRole("button", { name: "管理模板" }));
    const manager = screen.getByRole("dialog", { name: "管理行李模板" });
    await user.click(within(manager).getByRole("button", { name: "编辑 海外旅行" }));
    await user.clear(within(manager).getByLabelText("模板名称"));
    await user.type(within(manager).getByLabelText("模板名称"), "日本自由行");
    await user.clear(within(manager).getByLabelText("模板物品（每行一项）"));
    await user.type(within(manager).getByLabelText("模板物品（每行一项）"), "护照\n交通卡\n充电宝");
    await user.click(within(manager).getByRole("button", { name: "保存模板" }));
    await user.click(within(manager).getByRole("button", { name: "关闭模板管理" }));
    await user.click(screen.getByRole("button", { name: "日本自由行模板" }));
    expect(await screen.findByText("交通卡 × 1")).toBeInTheDocument();
    expect(localStorage.getItem("travel-planner:packing-templates:v1")).toContain("日本自由行");
  });
});
