import { TEST_COUPONS } from "@/contracts";

/** Cupons do mock (códigos documentados no README). */
export type CouponKind = "percent" | "free-fee";

export interface CouponFixture {
  code: string;
  kind: CouponKind;
  /** Percentual do subtotal (só para kind = percent). */
  percent?: number;
  expired?: boolean;
}

export const COUPONS: readonly CouponFixture[] = [
  { code: TEST_COUPONS.valid, kind: "percent", percent: 10 },
  { code: TEST_COUPONS.expired, kind: "percent", percent: 20, expired: true },
  { code: TEST_COUPONS.freeFee, kind: "free-fee" },
];

export function findCoupon(code: string): CouponFixture | undefined {
  const normalized = code.trim().toUpperCase();
  return COUPONS.find((coupon) => coupon.code === normalized);
}
