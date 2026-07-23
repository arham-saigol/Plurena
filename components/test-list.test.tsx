// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Id } from "@/convex/_generated/dataModel";
import { TestList, type DashboardTest } from "./test-list";

afterEach(cleanup);

const test = {
  _id: "test-1" as Id<"tests">,
  _creationTime: 1,
  ownerId: "user-1" as Id<"users">,
  name: "Loaded test",
  question: "Already on this page?",
  optionType: "text",
  audience: "Marketers",
  respondentCount: 20,
  status: "draft",
  dashboardBucket: "ignored",
  createdAt: 1,
  updatedAt: 1,
  progress: null,
} satisfies DashboardTest;

describe("TestList", () => {
  it("keeps loading pages while a search is active", async () => {
    const loadMore = vi.fn();
    const { rerender } = render(
      <TestList tests={[test]} showFilters canLoadMore loadMore={loadMore} />,
    );

    fireEvent.change(screen.getByLabelText("Search tests"), {
      target: { value: "later page" },
    });

    await waitFor(() => expect(loadMore).toHaveBeenCalledTimes(1));

    rerender(
      <TestList tests={[test]} showFilters loadingMore loadMore={loadMore} />,
    );
    rerender(
      <TestList tests={[test]} showFilters canLoadMore loadMore={loadMore} />,
    );

    await waitFor(() => expect(loadMore).toHaveBeenCalledTimes(2));
  });
});
