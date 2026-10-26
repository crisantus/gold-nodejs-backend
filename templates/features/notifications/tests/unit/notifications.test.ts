import { beforeEach, expect, it, vi } from "vitest";
__NOTIFICATION_TEST_SETUP__
import { notifyUser } from "../../src/services/notifications/notify.service.js";
beforeEach(() => {
  vi.clearAllMocks();
});
it("uses only the selected notification channels", async () => {
  const result = await notifyUser("user-id", {
    title: "Account update",
    body: "Your update is ready",
    data: { screen: "inbox" },
  });
  __NOTIFICATION_TEST_ASSERT__
});
__NOTIFICATION_FAILURE_TEST__
