import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { ChargeHistory } from '@/types/purchase';

export function useChargeBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [chargeHistory, setChargeHistory] = useState<ChargeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const q = query(
        collection(db, 'chargeHistory'),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const history: ChargeHistory[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            history.push({
              id: doc.id,
              date: data.date,
              amount: data.amount,
              balance: data.balance,
              createdAt: data.createdAt,
            });
          });

          setChargeHistory(history);
          
          // 최신 잔액 가져오기
          if (history.length > 0) {
            setBalance(history[0].balance);
          } else {
            setBalance(0);
          }
          
          setIsLoading(false);
        },
        (error) => {
          console.error('충전 내역 실시간 동기화 실패:', error);
          // localStorage에서 fallback
          const localHistory = localStorage.getItem('chargeHistory');
          const localBalance = localStorage.getItem('chargeBalance');
          if (localHistory) {
            setChargeHistory(JSON.parse(localHistory));
          }
          if (localBalance) {
            setBalance(parseFloat(localBalance));
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Firebase 초기화 실패:', error);
      // localStorage fallback
      const localHistory = localStorage.getItem('chargeHistory');
      const localBalance = localStorage.getItem('chargeBalance');
      if (localHistory) {
        setChargeHistory(JSON.parse(localHistory));
      }
      if (localBalance) {
        setBalance(parseFloat(localBalance));
      }
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // localStorage에 자동 백업
  useEffect(() => {
    localStorage.setItem('chargeHistory', JSON.stringify(chargeHistory));
    localStorage.setItem('chargeBalance', balance.toString());
  }, [chargeHistory, balance]);

  const addCharge = async (amount: number): Promise<void> => {
    try {
      const newBalance = balance + amount;
      await addDoc(collection(db, 'chargeHistory'), {
        date: new Date().toISOString().split('T')[0],
        amount,
        balance: newBalance,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('충전 추가 실패:', error);
      // localStorage fallback
      const newBalance = balance + amount;
      const newHistory: ChargeHistory = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        amount,
        balance: newBalance,
        createdAt: Date.now(),
      };
      const updated = [newHistory, ...chargeHistory];
      setChargeHistory(updated);
      setBalance(newBalance);
      localStorage.setItem('chargeHistory', JSON.stringify(updated));
      localStorage.setItem('chargeBalance', newBalance.toString());
    }
  };

  const deductBalance = async (amount: number): Promise<boolean> => {
    if (balance < amount) {
      return false; // 잔액 부족
    }

    try {
      const newBalance = balance - amount;
      await addDoc(collection(db, 'chargeHistory'), {
        date: new Date().toISOString().split('T')[0],
        amount: -amount, // 차감은 음수로 표시
        balance: newBalance,
        createdAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('차감 실패:', error);
      // localStorage fallback
      const newBalance = balance - amount;
      const newHistory: ChargeHistory = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        amount: -amount,
        balance: newBalance,
        createdAt: Date.now(),
      };
      const updated = [newHistory, ...chargeHistory];
      setChargeHistory(updated);
      setBalance(newBalance);
      localStorage.setItem('chargeHistory', JSON.stringify(updated));
      localStorage.setItem('chargeBalance', newBalance.toString());
      return true;
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
