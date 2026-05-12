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
  const [errorMessage, setErrorMessage] = useState('');

  async function handleShare() {
    setLoading(true);
    setErrorMessage('');
    
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
      setErrorMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="share-report-button-wrap">
      {shareUrl ? (
        <div className="share-report-popover">
          <p className="share-report-success">Share link copied.</p>
          <input 
            value={shareUrl}
            readOnly
            className="input share-report-input"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            onClick={() => setShareUrl(null)}
            className="button button-small button-ghost"
            type="button"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {errorMessage ? <div className="share-report-error">{errorMessage}</div> : null}
          <button
            onClick={handleShare}
            disabled={loading}
            className="button button-primary share-report-trigger"
            type="button"
          >
            {loading ? 'Creating link...' : 'Share report'}
          </button>
        </>
      )}
    </div>
  );
}
