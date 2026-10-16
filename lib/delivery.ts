import { Purchase } from '@/types/purchase';

type DeliveryStatus = Purchase['deliveryStatus'];
type PurchaseStatus = Purchase['purchaseStatus'];

/**
 * 배송 단계 (화면에 보이는 순서)
 * 구매대기 → (구매완료 누르면 자동) 출고예정 → CN 미도착 → CN 도착 → 입고완료
 * «출고»·«출고완료»는 2026-10-17 대표님 지시로 뺌 (예전 데이터 호환용으로 타입에는 남김)
 */
export const DELIVERY_STEPS: DeliveryStatus[] = ['구매대기', '출고예정', 'CN 미도착', 'CN 도착', '입고완료'];

/**
 * 구매여부가 바뀔 때 배송 단계 자동 조정
 * - 구매완료가 되면: 구매대기 → 출고예정
 * - 구매완료에서 다른 걸로 되돌리면: 출고예정 → 구매대기
 * - 이미 CN 이후 단계면 건드리지 않음
 */
export function autoDelivery(nextPurchase: PurchaseStatus, current: DeliveryStatus): DeliveryStatus {
  if (nextPurchase === '구매완료' && current === '구매대기') return '출고예정';
  if (nextPurchase !== '구매완료' && current === '출고예정') return '구매대기';
  return current;
}

/** 운송장 칸을 보여줄 단계 */
export const hasTrackingStage = (s: DeliveryStatus) => !['구매대기', '출고예정'].includes(s);
