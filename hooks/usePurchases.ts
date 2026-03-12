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

  // Storage에 이미지 업로드
  const uploadImageToStorage = async (base64Data: string, fileName: string): Promise<string | null> => {
    if (!base64Data) return null;
    
    try {
      // base64를 Blob으로 변환
      const parts = base64Data.split(',');
      if (parts.length < 2) {
        console.error('유효하지 않은 base64 데이터');
        return null;
      }

      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      const blob = new Blob([u8arr], { type: mimeType });

      // Storage에 업로드
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const path = `${systemName}/${timestamp}-${randomStr}-${fileName}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('purchase-images')
        .upload(path, blob);

      if (uploadError) {
        console.error('Supabase Storage 업로드 오류:', uploadError);
        throw uploadError;
      }

      if (!data) {
        console.error('업로드 응답 없음');
        return null;
      }

      // 공개 URL 얻기
      const { data: publicUrl } = supabase.storage
        .from('purchase-images')
        .getPublicUrl(data.path);

      console.log('이미지 업로드 성공:', publicUrl.publicUrl);
      return publicUrl.publicUrl;
    } catch (err) {
      console.error('이미지 업로드 중 오류:', err);
      return null;
    }
  };

  // Supabase 실시간 리스너
  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchPurchases = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('purchases')
          .select('id, application_date, application_number, applicant, category, image_url, product_url, product_name, amount, commission, appraisal_fee, shipping_fee, purchase_status, payment_method, delivery_status, tracking_number, note, created_at')
          .eq('system', systemName)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const formattedData: Purchase[] = (data || []).map(item => ({
          id: item.id,
          applicationDate: item.application_date,
          applicationNumber: item.application_number,
          applicant: item.applicant,
          category: item.category as any,
          imageData: '',
          imageUrl: item.image_url || undefined,
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
          note: item.note || undefined,
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

  // 편집용 단일 구매 조회 (이미지 포함)
  const fetchPurchaseForEdit = async (id: string): Promise<Purchase | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return {
        id: data.id,
        applicationDate: data.application_date,
        applicationNumber: data.application_number,
        applicant: data.applicant,
        category: data.category as any,
        imageUrl: data.image_url || undefined,
        imageData: data.image_data || undefined,
        productUrl: data.product_url,
        productName: data.product_name,
        amount: Number(data.amount),
        commission: data.commission ? Number(data.commission) : undefined,
        appraisalFee: data.appraisal_fee ? Number(data.appraisal_fee) : undefined,
        shippingFee: data.shipping_fee ? Number(data.shipping_fee) : undefined,
        purchaseStatus: data.purchase_status as any,
        paymentMethod: data.payment_method as any,
        deliveryStatus: data.delivery_status as any,
        trackingNumber: data.tracking_number,
        note: data.note || undefined,
      };
    } catch (err) {
      console.error('단일 구매 조회 오류:', err);
      return null;
    }
  };

  const fetchImagesByIds = async (ids: string[]): Promise<Record<string, string>> => {
    if (ids.length === 0) {
      return {};
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('purchases')
        .select('id, image_data')
        .eq('system', systemName)
        .in('id', ids);

      if (fetchError) throw fetchError;

      return (data || []).reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.image_data || '';
        return acc;
      }, {});
    } catch (err) {
      console.error('이미지 조회 오류:', err);
      return {};
    }
  };

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

      // 이미지 업로드 (있으면)
      let imageUrl: string | null = null;
      if (data.imageData) {
        console.log('이미지 업로드 시작...');
        imageUrl = await uploadImageToStorage(data.imageData, `purchase-${nextNumber}.jpg`);
        if (!imageUrl) {
          console.warn('이미지 업로드 실패, base64로 저장합니다');
          // 이미지 업로드 실패해도 계속 진행 (base64로 저장)
        } else {
          console.log('이미지 업로드 성공:', imageUrl);
        }
      }

      const insertData = {
        application_date: data.applicationDate,
        application_number: nextNumber,
        applicant: data.applicant,
        category: data.category,
        image_url: imageUrl || null,
        image_data: imageUrl ? null : (data.imageData || null), // URL이 있으면 base64 제거, 없으면 base64 저장
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
        note: (data.note || '').replace(/[~]/g, '').trim() || null, // ~ 제거 + 빈값은 NULL
        system: systemName,
      };

      console.log('구매 데이터 저장:', insertData);

      const { error: insertError } = await supabase
        .from('purchases')
        .insert([insertData]);

      if (insertError) {
        console.error('등록 오류:', insertError);
        alert('등록 중 오류가 발생했습니다.\n오류: ' + insertError.message);
      } else {
        console.log('구매 등록 성공');
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
      
      // imageData 처리: base64 데이터가 있으면 Storage에 업로드
      if (data.imageData !== undefined) {
        if (data.imageData) {
          // base64 이미지가 있으면 업로드
          console.log('이미지 업로드 시작...');
          const imageUrl = await uploadImageToStorage(data.imageData, `purchase-${id}.jpg`);
          if (imageUrl) {
            updateData.image_url = imageUrl;
            updateData.image_data = null;
            console.log('이미지 업로드 성공:', imageUrl);
          } else {
            console.warn('이미지 업로드 실패, imageUrl 업데이트 안함');
          }
        } else {
          // 빈 이미지면 URL만 제거
          updateData.image_data = null;
        }
      }
      
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
      if (data.note !== undefined) {
        // 비고에서 ~ 기호 제거
        const cleanNote = (data.note || '').replace(/[~]/g, '').trim();
        updateData.note = cleanNote || null;
      }

      // updateData가 비어있으면 업데이트하지 않음
      if (Object.keys(updateData).length === 0) {
        console.log('수정할 데이터 없음');
        return;
      }

      console.log('수정 데이터:', updateData);

      const { error: updateError } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('수정 오류:', updateError);
        alert('수정 중 오류가 발생했습니다.\n오류: ' + updateError.message);
      } else {
        console.log('수정 성공');
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
    fetchPurchaseForEdit,
    fetchImagesByIds,
  };
}
