import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChargeHistory, Purchase } from '@/types/purchase';

export function useChargeBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [totalDeducted, setTotalDeducted] = useState<number>(0);
  const [chargeHistory, setChargeHistory] = useState<ChargeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';

  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        const { data: chargeData, error: chargeError } = await supabase
          .from('charge_history')
          .select('*')
          .eq('system', systemName)
          .order('created_at', { ascending: false });

        if (chargeError) throw chargeError;

        const { data: purchaseData, error: purchaseError } = await supabase
          .from('purchases')
          .select('amount, commission, appraisal_fee, shipping_fee, purchase_status, payment_method, created_at')
          .eq('system', systemName);

        if (purchaseError) throw purchaseError;

        const fullHistory: ChargeHistory[] = (chargeData || []).map((item: any) => ({
          id: item.id.toString(),
          date: item.date,
          amount: item.amount,
          balance: item.balance,
          createdAt: new Date(item.created_at).getTime(),
        }));

        const chargeOnlyHistory = fullHistory.filter(item => item.amount > 0);
        const totalCharged = chargeOnlyHistory.reduce((sum, item) => sum + item.amount, 0);

        // 충전 리셋 이후만 차감 계산하도록 기준 시점을 충전 내역의 시작일로 잡는다.
        const baselineCreatedAt = chargeOnlyHistory.length > 0
          ? Math.min(...chargeOnlyHistory.map(item => item.createdAt))
          : null;

        const deductedAmount = !baselineCreatedAt
          ? 0
          : (purchaseData || []).reduce((sum, item: any) => {
          const purchaseStatus = item.purchase_status as Purchase['purchaseStatus'];
          const paymentMethod = item.payment_method as Purchase['paymentMethod'] | null;
          const isDeductTarget = (purchaseStatus === '구매원함' || purchaseStatus === '구매완료') && paymentMethod === '충전금액';
          const purchaseCreatedAt = item.created_at ? new Date(item.created_at).getTime() : 0;

          if (purchaseCreatedAt < baselineCreatedAt) {
            return sum;
          }

          if (!isDeductTarget) {
            return sum;
          }

          return sum + Number(item.amount || 0) + Number(item.commission || 0) + Number(item.appraisal_fee || 0) + Number(item.shipping_fee || 0);
        }, 0);

        setChargeHistory(chargeOnlyHistory);
        setTotalDeducted(deductedAmount);
        setBalance(totalCharged - deductedAmount);

        setIsLoading(false);
      } catch (error) {
        console.error('충전 내역 로드 실패:', error);
        setIsLoading(false);
      }
    };

    fetchBalanceData();

    const chargeChannel = supabase
      .channel('charge-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'charge_history',
        },
        () => {
          fetchBalanceData();
        }
      )
      .subscribe();

    const purchaseChannel = supabase
      .channel('purchases-balance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
        },
        () => {
          fetchBalanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chargeChannel);
      supabase.removeChannel(purchaseChannel);
    };
  }, [systemName]);

  const addCharge = async (amount: number): Promise<void> => {
    try {
      const newBalance = balance + amount;
      const { error } = await supabase
        .from('charge_history')
        .insert({
          date: new Date().toISOString().split('T')[0],
          amount,
          balance: newBalance,
          system: systemName,
        });

      if (error) throw error;
    } catch (error) {
      console.error('충전 추가 실패:', error);
      throw error;
    }
  };

  const deductBalance = async (amount: number): Promise<boolean> => {
    // 현재 잔액은 purchases 상태 기준으로 재계산되므로 차감은 검증만 수행
    if (amount <= 0) {
      return true;
    }

    return balance >= amount;
  };

  return {
    balance,
    totalDeducted,
    chargeHistory,
    isLoading,
    addCharge,
    deductBalance,
  };
}
