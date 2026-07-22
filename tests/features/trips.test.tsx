import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripList } from "../../src/features/trips/TripList";
import type { Trip } from "../../src/domain/models";

const trip: Trip = { id: "trip-1", schemaVersion: 1, title: "周末上海", startDate: "2026-08-01", endDate: "2026-08-02", timezone: "Asia/Shanghai", defaultCurrency: "CNY", participantIds: [], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };

describe("TripList", () => {
  it("lets a user select and manage a stored trip", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(<TripList trips={[trip]} activeTripId="trip-1" onSelect={onSelect} onCreate={vi.fn()} onEdit={onEdit} onDuplicate={vi.fn()} onArchive={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "打开 周末上海" }));
    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(onSelect).toHaveBeenCalledWith("trip-1");
    expect(onEdit).toHaveBeenCalledWith(trip);
  });
});
