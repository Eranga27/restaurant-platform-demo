import { describe, expect, it } from "vitest";

import {
  checkoutHash,
  formatPayHereAmount,
  localPhone,
  notificationSignature,
  parsePayHereAmount,
  payhereCheckoutUrl,
  payhereText,
  splitName,
  verifyNotificationSignature,
} from "@/lib/payments/payhere";

const SECRET = "test-merchant-secret";

describe("PayHere amounts", () => {
  it("formats cents with two decimals and no separators", () => {
    expect(formatPayHereAmount(334573)).toBe("3345.73");
    expect(formatPayHereAmount(100000_00)).toBe("100000.00");
    expect(formatPayHereAmount(5)).toBe("0.05");
  });

  it("refuses fractional or negative amounts", () => {
    expect(() => formatPayHereAmount(10.5)).toThrow(TypeError);
    expect(() => formatPayHereAmount(-100)).toThrow(RangeError);
  });

  it("parses only PayHere's format", () => {
    expect(parsePayHereAmount("3345.73")).toBe(334573);
    expect(parsePayHereAmount("0.05")).toBe(5);
    for (const bad of ["3345.7", "3,345.73", "3345", "-1.00", "1e3.00", ""]) {
      expect(parsePayHereAmount(bad)).toBeNull();
    }
  });
});

describe("PayHere signatures", () => {
  // Expected values computed independently (Python hashlib) from PayHere's formula.
  it("signs a checkout request", () => {
    expect(
      checkoutHash(
        { merchantId: "1211149", orderId: "NEXC7N-1", amountCents: 334573, currency: "LKR" },
        SECRET,
      ),
    ).toBe("487A912FDC983BCA0EF4AFFDEEDF8CD0");
  });

  const notification = {
    merchant_id: "1211149",
    order_id: "NEXC7N-1",
    payhere_amount: "3345.73",
    payhere_currency: "LKR",
    status_code: "2",
  };

  it("computes a notification's md5sig", () => {
    expect(notificationSignature(notification, SECRET)).toBe("FB5E9826A48AC07E3AE662066EE5BCD1");
  });

  it("accepts a genuine notification, in either letter case", () => {
    const md5sig = "FB5E9826A48AC07E3AE662066EE5BCD1";
    expect(verifyNotificationSignature({ ...notification, md5sig }, SECRET)).toBe(true);
    expect(
      verifyNotificationSignature({ ...notification, md5sig: md5sig.toLowerCase() }, SECRET),
    ).toBe(true);
  });

  it("rejects a tampered notification or the wrong secret", () => {
    const md5sig = notificationSignature(notification, SECRET);
    expect(
      verifyNotificationSignature({ ...notification, payhere_amount: "1.00", md5sig }, SECRET),
    ).toBe(false);
    expect(
      verifyNotificationSignature({ ...notification, status_code: "-2", md5sig }, SECRET),
    ).toBe(false);
    expect(verifyNotificationSignature({ ...notification, md5sig }, "another-secret")).toBe(false);
    expect(verifyNotificationSignature({ ...notification, md5sig: "abc" }, SECRET)).toBe(false);
  });
});

describe("PayHere fields", () => {
  it("uses the sandbox or the live checkout (with www)", () => {
    expect(payhereCheckoutUrl(true)).toBe("https://sandbox.payhere.lk/pay/checkout");
    expect(payhereCheckoutUrl(false)).toBe("https://www.payhere.lk/pay/checkout");
  });

  it("splits names into first and last", () => {
    expect(splitName("Nimal Perera")).toEqual({ first: "Nimal", last: "Perera" });
    expect(splitName("  Kumari  de Silva ")).toEqual({ first: "Kumari de", last: "Silva" });
    expect(splitName("Sunil")).toEqual({ first: "Sunil", last: "Sunil" });
  });

  it("sends Sri Lankan numbers in local form", () => {
    expect(localPhone("+94771234567")).toBe("0771234567");
  });

  it("strips markup and emoji PayHere would reject", () => {
    expect(payhereText("No. 12/3, Galle Rd <script>")).toBe("No. 12/3, Galle Rd script");
    expect(payhereText("Kithul & Co. order 🍛 NEXC7N")).toBe("Kithul & Co. order NEXC7N");
    expect(payhereText("x".repeat(150))).toHaveLength(100);
  });
});
