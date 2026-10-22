'use client';

import { useState, useEffect, useRef } from 'react';
import { Purchase, PurchaseFormData } from '@/types/purchase';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { shrinkDataUrl } from '@/lib/image';
import { notifyPhotoRegistered } from '@/lib/notify';

/**
 * 목록에 필요한 칸만 가져옵니다.
 * ⚠️ image_data(옛 base64 사진)는 절대 목록에서 가져오지 말 것 — 한 번에 수 MB 가 딸려옴
 */
const LIST_COLUMNS =
  'id,application_date,application_number,applicant,category,image_url,product_url,product_name,amount,commission,appraisal_fee,shipping_fee,purchase_status,payment_method,delivery_status,tracking_number,note,created_at';

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  // 알림용: 화면이 알고 있는 건별 구매여부 (실시간 콜백 안에서 읽음)
  const statusRef = useRef<Map<string, string>>(new Map());
  // 이 탭에서 방금 새로 등록한 신청번호 — 내 등록은 나한테 알리지 않음
  const mineNumsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    statusRef.current = new Map(purchases.map(p => [p.id, p.purchaseStatus]));
  }, [purchases]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPartial, setIsPartial] = useState(false); // 최근 것만 먼저 보여주는 중
  const [error, setError] = useState<string | null>(null);
  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'ella';

  const mapRowToPurchase = (item: any): Purchase => ({
    id: item.id,
    applicationDate: item.application_date,
    applicationNumber: Number(item.application_number || 0),
    applicant: item.applicant,
    category: item.category as any,
    imageData: '',
    imageUrl: item.image_url || undefined,
    productUrl: item.product_url || '',
    productName: item.product_name || '',
    amount: Number(item.amount || 0),
    commission: item.commission ? Number(item.commission) : undefined,
    appraisalFee: item.appraisal_fee ? Number(item.appraisal_fee) : undefined,
    shippingFee: item.shipping_fee ? Number(item.shipping_fee) : undefined,
    purchaseStatus: item.purchase_status as any,
    paymentMethod: item.payment_method as any,
    deliveryStatus: item.delivery_status as any,
    trackingNumber: item.tracking_number,
    note: item.note || undefined,
    createdAt: item.created_at ? Date.parse(item.created_at) : undefined,
    updatedAt: item.updated_at ? Date.parse(item.updated_at) : undefined,
  });

  /**
   * 목록 불러오기
   * - 처음 열 때: 최근 150건만 먼저 받아서 바로 화면을 띄우고(중국 등 느린 회선 대비),
   *   나머지는 뒤에서 받아 합칩니다. 다 받기 전까지 isPartial = true.
   * - 실시간 갱신 때: 화면은 그대로 두고 뒤에서 전부 받아 한 번에 바꿈.
   * 상한 50,000건 (예전 5,000건 상한 제거)
   */
  const loadedOnce = useRef(false);
  const fetchPurchases = async () => {
    try {
      const FIRST = 150;
      const pageSize = 1000;
      const query = (from: number, to: number) =>
        supabase
          .from('purchases')
          .select(LIST_COLUMNS)
          .eq('system', systemName)
          .order('created_at', { ascending: false })
          .range(from, to);

      let allData: any[] = [];
      let offset = 0;

      if (!loadedOnce.current) {
        const { data, error: firstError } = await query(0, FIRST - 1);
        if (firstError) throw firstError;
        allData = data || [];
        offset = allData.length;
        setPurchases(allData.map(mapRowToPurchase));
        setError(null);
        setIsLoading(false);
        loadedOnce.current = true;
        if (allData.length < FIRST) {
          setIsPartial(false);
          return;
        }
        setIsPartial(true);
      }

      while (offset < 50000) {
        const { data, error: fetchError } = await query(offset, offset + pageSize - 1);
        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;
        allData.push(...data);
        offset += data.length;
        if (data.length < pageSize) break;
      }

      console.log(`✓ 구매 목록 ${allData.length}건`);
      setPurchases(allData.map(mapRowToPurchase));
      setError(null);
      setIsLoading(false);
      setIsPartial(false);
    } catch (err: any) {
      console.error('Supabase 오류:', err);
      setError(`데이터를 불러오는데 실패했습니다. (${err?.message || '알 수 없는 오류'})`);
      setIsLoading(false);
      setIsPartial(false);
    }
  };

  // Storage에 이미지 업로드 (최대 30초 타임아웃)
  const uploadImageToStorage = async (rawData: string, fileName: string): Promise<string | null> => {
    if (!rawData) return null;

    try {
      // 올리기 전에 작게 줄임 (긴 변 640px, JPEG) — 저장 용량·전송량 절약
      const base64Data = await shrinkDataUrl(rawData);
      // base64를 Blob으로 변환
      const parts = base64Data.split(',');
      if (parts.length < 2) {
        console.error('유효하지 않은 base64 데이터');
        return null;
      }

      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      const n = bstr.length;
      
      // 파일 크기 확인 (50MB 이상이면 업로드 거부)
      if (n > 50 * 1024 * 1024) {
        console.error('이미지 파일이 너무 큽니다 (50MB 초과)');
        alert('이미지 파일이 너무 큽니다. 50MB 이하의 파일을 선택해주세요.');
        return null;
      }

      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      const blob = new Blob([u8arr], { type: mimeType });

      // 타임아웃 처리: 30초 이상 걸리면 실패
      const uploadPromise = (async () => {
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
      })();

      // 30초 타임아웃 설정
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('이미지 업로드 타임아웃 (30초)');
          resolve(null);
        }, 30000);
      });

      const result = await Promise.race([uploadPromise, timeoutPromise]);
      return result;
    } catch (err) {
      console.error('이미지 업로드 중 오류:', err);
      return null;
    }
  };

  // Supabase 실시간 리스너
  useEffect(() => {
    let channel: RealtimeChannel;

    fetchPurchases();

    // 실시간 구독 — 이 사이트(system) 것만, 그리고 2초 모아서 한 번만 다시 불러옴.
    // (예전엔 엘라·VMCE 상관없이 한 줄 바뀔 때마다 전체를 다시 받아서,
    //  여러 건을 한꺼번에 바꾸면 열린 창마다 수백~수천 번 전체 조회가 터졌음)
    let timer: ReturnType<typeof setTimeout> | null = null;
    channel = supabase
      .channel(`purchases-changes-${systemName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `system=eq.${systemName}` }, (payload: any) => {
        // «사진 등록»으로 새로 바뀐 건이면 크롬 알림
        //  - 새 등록(INSERT)이 처음부터 사진 등록이거나
        //  - 화면이 알던 상태가 사진 등록이 아니었는데 사진 등록으로 바뀐 경우(UPDATE)
        //  - 내가 바꾼 건 화면이 먼저 바뀌어 있어서 자연히 빠짐 / 내가 새로 등록한 건 번호로 뺌
        try {
          const row = payload?.new;
          if (row && row.id && row.purchase_status === '사진 등록') {
            const known = statusRef.current.get(row.id);
            const isNew = payload.eventType === 'INSERT';
            const mine = mineNumsRef.current.has(Number(row.application_number));
            if (!mine && ((isNew && known === undefined) || (!isNew && known !== undefined && known !== '사진 등록'))) {
              notifyPhotoRegistered(row);
            }
            statusRef.current.set(row.id, '사진 등록'); // 같은 건 다른 칸 수정으로 또 울리지 않게
          } else if (row && row.id && row.purchase_status) {
            statusRef.current.set(row.id, row.purchase_status);
          }
        } catch { /* 알림 실패는 무시 */ }

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; fetchPurchases(); }, 2000);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * 화면에 있는 그 한 줄만 바로 고칩니다.
   * 목록 전체(1,500건+)를 서버에서 다시 받지 않으므로 기다림이 없습니다.
   * 저장이 실패하면 호출한 쪽에서 fetchPurchases() 로 되돌립니다.
   */
  const patchLocal = (id: string, d: Partial<PurchaseFormData>) => {
    setPurchases(prev => prev.map(p => {
      if (p.id !== id) return p;
      const n: Purchase = { ...p };
      if (d.applicationDate !== undefined) n.applicationDate = d.applicationDate;
      if (d.applicant !== undefined) n.applicant = d.applicant;
      if (d.category !== undefined) n.category = d.category as any;
      if (d.imageUrl !== undefined) n.imageUrl = d.imageUrl || undefined;
      if (d.productUrl !== undefined) n.productUrl = d.productUrl;
      if (d.productName !== undefined) n.productName = d.productName;
      if (d.amount !== undefined) n.amount = d.amount;
      if (d.commission !== undefined) n.commission = d.commission;
      if (d.appraisalFee !== undefined) n.appraisalFee = d.appraisalFee;
      if (d.shippingFee !== undefined) n.shippingFee = d.shippingFee;
      if (d.purchaseStatus !== undefined) n.purchaseStatus = d.purchaseStatus as any;
      if (Object.prototype.hasOwnProperty.call(d, 'paymentMethod')) n.paymentMethod = (d.paymentMethod || undefined) as any;
      if (d.deliveryStatus !== undefined) n.deliveryStatus = d.deliveryStatus as any;
      if (d.trackingNumber !== undefined) n.trackingNumber = ((d.trackingNumber || '').trim() || undefined) as any;
      if (d.note !== undefined) n.note = ((d.note || '').replace(/[~]/g, '').trim() || undefined) as any;
      return n;
    }));
  };

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

  /** 성공하면 true (완료 안내는 등록 폼에서 띄움) */
  const addPurchase = async (data: PurchaseFormData): Promise<boolean> => {
    try {
      // 가장 큰 application_number 찾기 (현재 시스템만)
      const { data: maxData } = await supabase
        .from('purchases')
        .select('application_number')
        .eq('system', systemName)
        .order('application_number', { ascending: false })
        .limit(1);

      const nextNumber = maxData && maxData.length > 0 ? maxData[0].application_number + 1 : 1;
      mineNumsRef.current.add(Number(nextNumber));

      // 이미지 업로드 (있으면)
      let imageUrl: string | null = null;
      console.log('=== 등록 시작 ===');
      console.log('전달받은 데이터:', {
        productName: data.productName,
        productUrl: data.productUrl,
        hasImageData: !!data.imageData,
        imageDataLength: data.imageData?.length || 0,
      });
      
      if (data.imageData) {
        console.log('② 이미지 업로드 시작...', { 
          imageDataLength: data.imageData.length,
          nextNumber: nextNumber 
        });
        imageUrl = await uploadImageToStorage(data.imageData, `purchase-${nextNumber}.jpg`);
        if (!imageUrl) {
          console.error('❌ 이미지 업로드 실패!');
          alert('❌ 이미지 업로드가 실패했습니다.\n\n이유:\n- 네트워크 연결 확인\n- 이미지 크기 5MB 이하 확인\n\n이미지 없이 URL만 등록하거나,\n나중에 수정에서 이미지를 추가해보세요.');
          return false;
        } else {
          console.log('✓ 이미지 업로드 성공:', imageUrl);
        }
      } else {
        console.log('(!) 이미지 없음 - imageData가 전달되지 않았습니다');
      }

      // 필수값 검증
      if (!data.productUrl && !data.productName) {
        alert('❌ 상품명 또는 URL 중 최소 하나는 입력해야 합니다.');
        return false;
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

      console.log('✓ 데이터베이스 저장 준비됨:', {
        applicationNumber: nextNumber,
        hasImage: !!imageUrl,
        hasUrl: !!data.productUrl,
        hasName: !!data.productName
      });

      const { error: insertError } = await supabase
        .from('purchases')
        .insert([insertData]);

      if (insertError) {
        console.error('❌ 데이터베이스 저장 오류:', insertError);
        alert('❌ 등록 중 오류가 발생했습니다.\n\n오류: ' + insertError.message + '\n\n상세:\n- 이미 등록된 번호는 아닌지 확인\n- 입력값 형식 확인');
        return false;
      }
      console.log('✓ 구매 등록 완료! 번호:', nextNumber);
      await fetchPurchases();
      return true;
    } catch (err: any) {
      console.error('❌ 등록 오류:', err);
      alert('❌ 등록 중 예상치 못한 오류가 발생했습니다.\n\n' + (err?.message || '알 수 없는 오류'));
      return false;
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
      
      // 사진 창에서 고른 대표사진 (이미 저장소에 올라간 주소)
      if (data.imageUrl !== undefined && data.imageData === undefined) updateData.image_url = data.imageUrl || null;
      if (data.productUrl !== undefined) updateData.product_url = data.productUrl;
      if (data.productName !== undefined) updateData.product_name = data.productName;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.commission !== undefined) updateData.commission = data.commission;
      if (data.appraisalFee !== undefined) updateData.appraisal_fee = data.appraisalFee;
      if (data.shippingFee !== undefined) updateData.shipping_fee = data.shippingFee;
      if (data.purchaseStatus !== undefined) updateData.purchase_status = data.purchaseStatus;
      if (Object.prototype.hasOwnProperty.call(data, 'paymentMethod')) {
        updateData.payment_method = data.paymentMethod || null;
      }
      if (data.deliveryStatus !== undefined) updateData.delivery_status = data.deliveryStatus;
      // 빈 값으로 고치면 «지우기» 입니다 — 빈 글자 대신 비움(null)으로 저장합니다
      if (data.trackingNumber !== undefined) updateData.tracking_number = (data.trackingNumber || '').trim() || null;
      if (data.note !== undefined) {
        // 비고에서 ~ 기호 제거
        const cleanNote = (data.note || '').replace(/[~]/g, '').trim();
        updateData.note = cleanNote || null;
      }

      // updateData가 비어있으면 업데이트하지 않음
      if (Object.keys(updateData).length === 0) {
        console.log('수정할 데이터 없음');
        await fetchPurchases(); // 이미지만 변경했을 때도 목록 갱신
        return;
      }

      console.log('수정 데이터:', updateData);

      // ① 화면부터 먼저 바꿉니다 — 저장을 기다리지 않습니다.
      patchLocal(id, data);

      // ② 저장은 뒤에서 합니다.
      const { error: updateError } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('수정 오류:', updateError);
        alert('수정 중 오류가 발생했습니다.\n오류: ' + updateError.message);
        await fetchPurchases();   // 실패했으니 서버 값으로 되돌립니다
      } else {
        console.log('수정 성공');
        // 성공하면 목록 전체를 다시 받지 않습니다.
        // (1,500건을 다시 받느라 드롭다운 하나 바꾸는 데 몇 초씩 걸리던 원인)
        // 사진이 바뀐 경우만 새 주소를 받아야 해서 다시 불러옵니다.
        if (data.imageData !== undefined && data.imageData) await fetchPurchases();
      }
    } catch (err) {
      console.error('수정 오류:', err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      // 화면에서 먼저 지웁니다 — 기다림 없음
      setPurchases(prev => prev.filter(p => p.id !== id));

      const { error: deleteError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('삭제 오류:', deleteError);
        alert('삭제 중 오류가 발생했습니다.');
        await fetchPurchases();   // 실패했으니 되돌립니다
      }
    } catch (err) {
      console.error('삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return {
    purchases,
    isLoading,
    isPartial,
    error,
    addPurchase,
    updatePurchase,
    deletePurchase,
    fetchPurchaseForEdit,
    fetchImagesByIds,
  };
}
