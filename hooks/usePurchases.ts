'use client';

import { useState, useEffect } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  getDocs,
  Timestamp
} from 'firebase/firestore';

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firestore 실시간 리스너
  useEffect(() => {
    try {
      const q = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const purchasesList: Purchase[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Purchase));
        
        setPurchases(purchasesList);
        setIsLoading(false);
      }, (err) => {
        console.error('Firestore 오류:', err);
        setError('데이터를 불러오는데 실패했습니다. 로컬 저장소로 전환합니다.');
        
        // Firestore 실패시 로컬스토리지 사용
        const stored = localStorage.getItem('purchases');
        if (stored) {
          setPurchases(JSON.parse(stored));
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Firebase 초기화 오류:', err);
      setError('Firebase 설정이 필요합니다. 로컬 저장소를 사용합니다.');
      
      // Firebase 설정 없으면 로컬스토리지 사용
      const stored = localStorage.getItem('purchases');
      if (stored) {
        setPurchases(JSON.parse(stored));
      }
      setIsLoading(false);
    }
  }, []);

  // 로컬 백업 (Firebase와 동시에)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('purchases', JSON.stringify(purchases));
    }
  }, [purchases, isLoading]);

  const addPurchase = async (data: PurchaseFormData) => {
    try {
      // 다음 신청번호 계산
      const maxNumber = purchases.length > 0 
        ? Math.max(...purchases.map(p => p.applicationNumber))
        : 0;
      
      // undefined 값 제거 (Firestore는 undefined를 지원하지 않음)
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      
      const newPurchase = {
        ...cleanData,
        applicationNumber: maxNumber + 1,
        createdAt: Timestamp.now(),
      };
      
      await addDoc(collection(db, 'purchases'), newPurchase);
    } catch (err) {
      console.error('추가 오류:', err);
      alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.\n오류: ' + (err as Error).message);
      // Firebase 실패시 로컬에서만 추가
      const newPurchase: Purchase = {
        ...data,
        id: Date.now().toString(),
        applicationNumber: (purchases.length > 0 ? Math.max(...purchases.map(p => p.applicationNumber)) : 0) + 1,
      };
      setPurchases([newPurchase, ...purchases]);
    }
  };

  const updatePurchase = async (id: string, data: Partial<PurchaseFormData> | PurchaseFormData) => {
    try {
      const docRef = doc(db, 'purchases', id);
      // undefined 값 제거 (Firestore는 undefined를 지원하지 않음)
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      await updateDoc(docRef, cleanData);
    } catch (err) {
      console.error('수정 오류:', err);
      alert('수정 중 오류가 발생했습니다.\n오류: ' + (err as Error).message);
      // Firebase 실패시 로컬에서만 수정
      setPurchases(purchases.map(p => 
        p.id === id ? { ...p, ...data, id, applicationNumber: p.applicationNumber } : p
      ));
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'purchases', id));
    } catch (err) {
      console.error('삭제 오류:', err);
      // Firebase 실패시 로컬에서만 삭제
      setPurchases(purchases.filter(p => p.id !== id));
    }
  };

  return {
    purchases,
    isLoading,
    error,
    addPurchase,
    updatePurchase,
    deletePurchase,
  };
}
