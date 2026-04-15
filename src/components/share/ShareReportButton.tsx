import { useState } from 'react';
import { createKitchenAuditShare, createFoodSafetyShare, createMysteryShopShare, createMenuShare } from '../../services/reportShares';
import type {
  AuditFormState,
  FoodSafetyAuditState,
  MenuProjectState,
  MysteryShopAuditState
} from '../../types';

type ShareType = 'kitchen' | 'food-safety' | 'mystery-shop' | 'menu';

type SharePayloadMap = {
  kitchen: AuditFormState;
  'food-safety': FoodSafetyAuditState;
  'mystery-shop': MysteryShopAuditState;
  menu: MenuProjectState;
};

interface ShareReportButtonProps<T extends ShareType> {
  type: T;
  data: SharePayloadMap[T];
}

export function ShareReportButton<T extends ShareType>({ type, data }: ShareReportButtonProps<T>) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    
    try {
      let result: { url: string };
      
      switch(type) {
        case 'kitchen':
          result = await createKitchenAuditShare(data as AuditFormState);
          break;
        case 'food-safety':
          result = await createFoodSafetyShare(data as FoodSafetyAuditState);
          break;
        case 'mystery-shop':
          result = await createMysteryShopShare(data as MysteryShopAuditState);
          break;
        case 'menu':
          result = await createMenuShare(data as MenuProjectState);
          break;
      }

      setShareUrl(result.url);
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(result.url);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999
    }}>
      {shareUrl ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '16px 24px',
          boxShadow: '0 16px 64px rgba(0,0,0,0.18)',
          display: 'grid',
          gap: 12
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#4f8e67', fontSize: 14 }}>✅ Share link copied!</p>
          <input 
            value={shareUrl}
            readOnly
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid #ebe6e0',
              background: '#faf8f5',
              fontSize: 13,
              minWidth: 380
            }}
          />
          <button
            onClick={() => setShareUrl(null)}
            style={{
              border: 'none',
              background: 'none',
              color: '#7b6b54',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'right',
              padding: 0
            }}
          >
            Close
          </button>
        </div>
      ) : (
        <button
          onClick={handleShare}
          disabled={loading}
          style={{
            minHeight: 56,
            padding: '0 28px',
            borderRadius: 999,
            border: 'none',
            background: loading 
              ? '#948d83' 
              : 'linear-gradient(135deg, #4f8e67 0%, #67aa81 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'default' : 'pointer',
            boxShadow: '0 14px 42px rgba(47, 92, 64, 0.24)',
            transition: 'all 0.2s ease',
            transform: loading ? 'scale(0.98)' : 'translateY(0)'
          }}
        >
          {loading ? 'Creating link...' : '🔗 Share Report'}
        </button>
      )}
    </div>
  );
}
