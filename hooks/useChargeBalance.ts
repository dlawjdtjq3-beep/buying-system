import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChargeHistory } from '@/types/purchase';

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

        const normalizedHistory = (chargeData || []).map((item: any) => ({
          id: item.id.toString(),
          date: item.date,
          amount: Number(item.amount || 0),
          balance: Number(item.balance || 0),
          createdAt: new Date(item.created_at).getTime(),
          isVisible: item.is_visible !== false,
        }));

        // 잔액 계산은 모든 충전(양수)을 포함
        const totalCharged = normalizedHistory
          .filter(item => item.amount > 0)
          .reduce((sum, item) => sum + item.amount, 0);

        // 충전 내역 표에는 노출 허용된 충전만 표시
        const chargeOnlyHistory: ChargeHistory[] = normalizedHistory
          .filter(item => item.amount > 0 && item.isVisible)
          .map(({ isVisible, ...history }) => history);
        const latestBalance = normalizedHistory.length > 0 ? Number(normalizedHistory[0].balance || 0) : 0;
        const deductedAmount = totalCharged - latestBalance;

        setChargeHistory(chargeOnlyHistory);
        setTotalDeducted(deductedAmount);
        setBalance(latestBalance);

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

    return () => {
      supabase.removeChannel(chargeChannel);
    };
  }, [systemName]);

  const addCharge = async (amount: number): Promise<void> => {
    try {
      const { data: latestRow, error: latestError } = await supabase
        .from('charge_history')
        .select('balance')
        .eq('system', systemName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;

      const currentBalance = Number(latestRow?.balance || 0);
      const newBalance = currentBalance + amount;
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
    try {
      const { data: latestRow, error: latestError } = await supabase
        .from('charge_history')
        .select('id, balance')
        .eq('system', systemName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;

      const currentBalance = Number(latestRow?.balance || 0);

      if (amount > 0 && currentBalance < amount) {
        return false;
      }

      if (!latestRow?.id) {
        return amount <= 0;
      }

      const newBalance = currentBalance - amount;
      const { error } = await supabase
        .from('charge_history')
        .update({ balance: newBalance })
        .eq('id', latestRow.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('잔액 차감 실패:', error);
      return false;
    }
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
