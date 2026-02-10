'use client';

import { useState, useEffect } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';

  // Supabase 실시간 리스너
  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchPurchases = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('purchases')
          .select('*')
          .eq('system', systemName)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const formattedData: Purchase[] = (data || []).map(item => ({
          id: item.id,
          applicationDate: item.application_date,
          applicationNumber: item.application_number,
          applicant: item.applicant,
          category: item.category as any,
          imageData: item.image_data || '',
          productUrl: item.product_url,
          productName: item.product_name,
          amount: Number(item.amount),
          commission: item.commission ? Number(item.commission) : undefined,
          appraisalFee: item.appraisal_fee ? Number(item.appraisal_fee) : undefined,
          shippingFee: item.shipping_fee ? Number(item.shipping_fee) : undefined,
          purchaseStatus: item.purchase_status as any,
          paymentMethod: item.payment_method as any,
          deliveryStatus: item.delivery_status as any,
          trackingNumber: item.tracking_number,
        }));

        setPurchases(formattedData);
        setIsLoading(false);
      } catch (err) {
        console.error('Supabase 오류:', err);
        setError('데이터를 불러오는데 실패했습니다.');
        setIsLoading(false);
      }
    };

    fetchPurchases();

    // 실시간 구독
    channel = supabase
      .channel('purchases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        fetchPurchases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addPurchase = async (data: PurchaseFormData) => {
    try {
      // 가장 큰 application_number 찾기 (현재 시스템만)
      const { data: maxData } = await supabase
        .from('purchases')
        .select('application_number')
        .eq('system', systemName)
        .order('application_number', { ascending: false })
        .limit(1);

      const nextNumber = maxData && maxData.length > 0 ? maxData[0].application_number + 1 : 1;

      const insertData = {
        application_date: data.applicationDate,
        application_number: nextNumber,
        applicant: data.applicant,
        category: data.category,
        image_data: data.imageData || '',
        product_url: data.productUrl,
        product_name: data.productName,
        amount: data.amount,
        commission: data.commission || null,
        appraisal_fee: data.appraisalFee || null,
        shipping_fee: data.shippingFee || null,
        purchase_status: data.purchaseStatus,
        payment_method: data.paymentMethod || null,
        delivery_status: data.deliveryStatus,
        tracking_number: data.trackingNumber || null,
        system: systemName,
      };

      const { error: insertError } = await supabase
        .from('purchases')
        .insert([insertData]);

      if (insertError) {
        console.error('등록 오류:', insertError);
        alert('등록 중 오류가 발생했습니다.\n오류: ' + insertError.message);
      }
    } catch (err) {
      console.error('등록 오류:', err);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const updatePurchase = async (id: string, data: Partial<PurchaseFormData> | PurchaseFormData) => {
    try {
      const updateData: any = {};
      
      if (data.applicationDate !== undefined) updateData.application_date = data.applicationDate;
      if (data.applicant !== undefined) updateData.applicant = data.applicant;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.imageData !== undefined) updateData.image_data = data.imageData;
      if (data.productUrl !== undefined) updateData.product_url = data.productUrl;
      if (data.productName !== undefined) updateData.product_name = data.productName;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.commission !== undefined) updateData.commission = data.commission;
      if (data.appraisalFee !== undefined) updateData.appraisal_fee = data.appraisalFee;
      if (data.shippingFee !== undefined) updateData.shipping_fee = data.shippingFee;
      if (data.purchaseStatus !== undefined) updateData.purchase_status = data.purchaseStatus;
      if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod;
      if (data.deliveryStatus !== undefined) updateData.delivery_status = data.deliveryStatus;
      if (data.trackingNumber !== undefined) updateData.tracking_number = data.trackingNumber;

      const { error: updateError } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('수정 오류:', updateError);
        alert('수정 중 오류가 발생했습니다.\n오류: ' + updateError.message);
      }
    } catch (err) {
      console.error('수정 오류:', err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('삭제 오류:', deleteError);
        alert('삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
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
