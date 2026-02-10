import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChargeHistory } from '@/types/purchase';

export function useChargeBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [chargeHistory, setChargeHistory] = useState<ChargeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';

  useEffect(() => {
    // 초기 데이터 로드
    const fetchChargeHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('charge_history')
          .select('*')
          .eq('system', systemName)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const history: ChargeHistory[] = (data || []).map((item: any) => ({
          id: item.id.toString(),
          date: item.date,
          amount: item.amount,
          balance: item.balance,
          createdAt: new Date(item.created_at).getTime(),
        }));

        setChargeHistory(history);
        
        // 최신 잔액 가져오기
        if (history.length > 0) {
          setBalance(history[0].balance);
        } else {
          setBalance(0);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('충전 내역 로드 실패:', error);
        setIsLoading(false);
      }
    };

    fetchChargeHistory();

    // 실시간 구독 설정
    const channel = supabase
      .channel('charge-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'charge_history',
        },
        () => {
          // 변경 발생 시 데이터 다시 로드
          fetchChargeHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    if (balance < amount) {
      return false; // 잔액 부족
    }

    try {
      const newBalance = balance - amount;
      const { error } = await supabase
        .from('charge_history')
        .insert({
          date: new Date().toISOString().split('T')[0],
          amount: -amount, // 차감은 음수로 표시
          system: systemName,
          balance: newBalance,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('차감 실패:', error);
      throw error;
    }
  };

  return {
    balance,
    chargeHistory,
    isLoading,
    addCharge,
    deductBalance,
  };
}
