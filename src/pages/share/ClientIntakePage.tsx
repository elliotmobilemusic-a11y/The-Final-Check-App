import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClientIntakeShareByToken } from '../../services/clientIntakeShares';
import type { ClientIntakeFormData, ClientIntakeSharePayload } from '../../types';

const blankForm: ClientIntakeFormData = {
  businessName: '',
  tradingName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  address: '',
  postcode: '',
  businessType: '',
  siteCount: 1,
  weeklySalesBand: '',
  challenges: '',
  supportNeeded: '',
  extraNotes: ''
};

export function ClientIntakePage() {
  const { token = '' } = useParams();
  const [sharePayload, setSharePayload] = useState<ClientIntakeSharePayload | null>(null);
  const [form, setForm] = useState<ClientIntakeFormData>(blankForm);
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitted' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Opening intake form...');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This intake link is incomplete.');
      return;
    }

    getClientIntakeShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This intake link is no longer available.');
          return;
        }

        setSharePayload(share.payload ?? {});
        setStatus('ready');
        setMessage('');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this intake form.');
      });
  }, [token]);

  const helperText = useMemo(() => {
    if (!sharePayload?.message) {
      return 'Complete this short form and we will set up your client record and review the information before the next step.';
    }

    return sharePayload.message;
  }, [sharePayload]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.businessName.trim() || !form.contactEmail.trim()) {
      setMessage('Please add the business name and contact email before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/client-intake-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          form
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not submit this intake form.');
      }

      setStatus('submitted');
      setMessage('Thank you. Your information has been sent and your record is now being prepared.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit this intake form.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== 'ready') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '16px 12px',
          background:
            'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 40%), #f6f1ea'
        }}
      >
        <div
          style={{
            width: 'min(620px, 100%)',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(115, 95, 64, 0.12)',
            borderRadius: '24px',
            padding: 'clamp(20px, 6vw, 28px)',
            boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
          }}
        >
          <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', color: '#7b6b54', fontWeight: 700 }}>
            The Final Check
          </p>
          <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(24px, 6vw, 32px)', color: '#2d2b31' }}>
            {status === 'submitted' ? 'Submission received' : 'Client intake'}
          </h1>
          <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.6 }}>{message}</p>
          {status === 'submitted' ? null : (
            <div style={{ marginTop: '22px' }}>
              <Link to="/login" style={{ color: '#4d6484', fontWeight: 700, textDecoration: 'none' }}>
                Return to workspace
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '16px 12px 32px',
        background:
          'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 42%), #f6f1ea'
      }}
    >
      <div
        style={{
          width: 'min(840px, 100%)',
          margin: '0 auto',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(115, 95, 64, 0.12)',
          borderRadius: '28px',
          padding: 'clamp(20px, 4vw, 32px)',
          boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
        }}
      >
        <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', color: '#7b6b54', fontWeight: 700 }}>
          The Final Check
        </p>
        <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.05, color: '#2d2b31' }}>
          Client intake form
        </h1>
        <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.7, maxWidth: '68ch' }}>{helperText}</p>

         <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px', marginTop: '28px' }}>
           
           <div style={{
             padding: 'clamp(16px, 4vw, 24px)',
             borderRadius: '20px',
             background: 'linear-gradient(135deg, rgba(198, 161, 97, 0.06), transparent)',
             border: '1px solid rgba(198, 161, 97, 0.15)'
           }}>
             <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#5c4f3a', letterSpacing: '0.02em' }}>Business details</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Business name *</span>
                 <input 
                   value={form.businessName} 
                   onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Trading name</span>
                 <input 
                   value={form.tradingName} 
                   onChange={(event) => setForm({ ...form, tradingName: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Business type</span>
                 <input 
                   placeholder="Restaurant, pub, hotel, cafe..." 
                   value={form.businessType} 
                   onChange={(event) => setForm({ ...form, businessType: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Number of sites</span>
                 <input 
                   type="number" 
                   min={1} 
                   value={form.siteCount} 
                   onChange={(event) => setForm({ ...form, siteCount: Number(event.target.value) || 1 })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Business address</span>
                 <input 
                   value={form.address} 
                   onChange={(event) => setForm({ ...form, address: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Postcode</span>
                 <input 
                   value={form.postcode} 
                   onChange={(event) => setForm({ ...form, postcode: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Weekly sales band</span>
                 <input 
                   placeholder="e.g. £10k-£20k" 
                   value={form.weeklySalesBand} 
                   onChange={(event) => setForm({ ...form, weeklySalesBand: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Website</span>
                 <input 
                   value={form.website} 
                   onChange={(event) => setForm({ ...form, website: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
             </div>
           </div>

           <div style={{
             padding: 'clamp(16px, 4vw, 24px)',
             borderRadius: '20px',
             background: 'linear-gradient(135deg, rgba(79, 142, 103, 0.06), transparent)',
             border: '1px solid rgba(79, 142, 103, 0.15)'
           }}>
             <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#3d5446', letterSpacing: '0.02em' }}>Contact details</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Main contact name</span>
                 <input 
                   value={form.contactName} 
                   onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Main contact email *</span>
                 <input 
                   type="email" 
                   value={form.contactEmail} 
                   onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Main contact phone</span>
                 <input 
                   value={form.contactPhone} 
                   onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     minHeight: '54px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
             </div>
           </div>

           <div style={{
             padding: 'clamp(16px, 4vw, 24px)',
             borderRadius: '20px',
             background: 'linear-gradient(135deg, rgba(68, 92, 122, 0.06), transparent)',
             border: '1px solid rgba(68, 92, 122, 0.15)'
           }}>
             <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#3a495c', letterSpacing: '0.02em' }}>About your business</h3>
             <div style={{ display: 'grid', gap: '20px' }}>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>What are the biggest current challenges?</span>
                 <textarea 
                   rows={4} 
                   value={form.challenges} 
                   onChange={(event) => setForm({ ...form, challenges: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     minHeight: '120px',
                     resize: 'vertical',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>What support are you looking for?</span>
                 <textarea 
                   rows={4} 
                   value={form.supportNeeded} 
                   onChange={(event) => setForm({ ...form, supportNeeded: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     minHeight: '120px',
                     resize: 'vertical',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
               <label style={{ display: 'grid', gap: '6px' }}>
                 <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>Anything else we should know?</span>
                 <textarea 
                   rows={4} 
                   value={form.extraNotes} 
                   onChange={(event) => setForm({ ...form, extraNotes: event.target.value })}
                   style={{
                     padding: '16px 18px',
                     borderRadius: '16px',
                     border: '1px solid rgba(86, 81, 91, 0.14)',
                     background: 'rgba(255,255,255,0.95)',
                     fontSize: '16px',
                     minHeight: '120px',
                     resize: 'vertical',
                     transition: 'all 0.18s ease',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
               </label>
             </div>
           </div>

           {message ? (
             <p style={{ 
               margin: '8px 0 0 0', 
               padding: '14px 18px',
               borderRadius: '12px',
               background: 'rgba(198, 161, 97, 0.12)',
               border: '1px solid rgba(198, 161, 97, 0.25)',
               color: '#6b5530',
               fontWeight: 500
             }}>{message}</p>
           ) : null}

           <div style={{ display: 'flex', justifyContent: 'stretch', marginTop: '8px' }}>
             <button
               type="submit"
               disabled={submitting}
               style={{
                 border: 0,
                 borderRadius: '999px',
                 padding: '18px 24px',
                 minHeight: '58px',
                 width: '100%',
                 background: 'linear-gradient(135deg, #4f4a53 0%, #69646f 100%)',
                 color: '#fff',
                 fontWeight: 700,
                 fontSize: '16px',
                 cursor: 'pointer',
                 boxShadow: '0 12px 32px rgba(36, 31, 38, 0.16)',
                 transition: 'all 0.2s ease'
               }}
             >
               {submitting ? 'Sending...' : 'Submit details'}
             </button>
           </div>
         </form>
      </div>
    </main>
  );
}