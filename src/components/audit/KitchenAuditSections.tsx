import { Link } from 'react-router-dom';
import { PhotoEvidenceField } from '../common/PhotoEvidenceField';
import type {
  AuditActionItem,
  AuditCategoryScores,
  AuditControlCheck,
  AuditFormState,
  AuditOrderingItem,
  AuditPhoto,
  AuditPortionItem,
  AuditWasteItem,
  ClientRecord
} from '../../types';
import { fmtCurrency, fmtPercent, num, safe } from '../../lib/utils';
import {
  kitchenPhotoSections,
  sectionLinks,
  textareaFields,
  toneClass,
  type ArrayKeys,
  type InsightItem
} from '../../features/audits/kitchenAuditHelpers';

type KitchenAuditWorkspaceSectionProps = {
  form: AuditFormState;
  clients: ClientRecord[];
  availableClientSites: Array<{ id: string; name: string; address?: string }>;
  calc: {
    gpGap: number;
    gpOpportunityValue: number;
    annualWasteLoss: number;
    totalWeeklyOpportunity: number;
    missingControls: number;
  };
  onUpdateField: <K extends keyof AuditFormState>(key: K, value: AuditFormState[K]) => void;
  onHandleClientSelection: (clientId: string | null) => void;
  onHandleClientSiteSelection: (siteId: string | null) => void;
  onEstimateSalesFromTradingProfile: () => void;
  onDraftNarrative: () => void;
  onAddRepeatItem: (key: ArrayKeys) => void;
  onRemoveRepeatItem: (key: ArrayKeys, id: string) => void;
  onUpdateRepeatItem: <T extends AuditWasteItem | AuditPortionItem | AuditOrderingItem>(
    key: ArrayKeys,
    id: string,
    field: keyof T,
    value: string | number
  ) => void;
  onUpdateCategoryScore: (key: keyof AuditCategoryScores, value: number) => void;
  onUpdateControlCheck: (id: string, key: keyof AuditControlCheck, value: string) => void;
  onAddPhotos: (section: keyof typeof kitchenPhotoSections, photos: AuditPhoto[]) => void;
  onUpdatePhotoCaption: (photoId: string, caption: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onSetMessage: (message: string) => void;
  onGenerateActions: () => void;
  onAddActionItem: () => void;
  onRemoveActionItem: (id: string) => void;
  onUpdateActionItem: (id: string, key: keyof AuditActionItem, value: string) => void;
};

export function KitchenAuditWorkspaceSection({
  form,
  clients,
  availableClientSites,
  calc,
  onUpdateField,
  onHandleClientSelection,
  onHandleClientSiteSelection,
  onEstimateSalesFromTradingProfile,
  onDraftNarrative,
  onAddRepeatItem,
  onRemoveRepeatItem,
  onUpdateRepeatItem,
  onUpdateCategoryScore,
  onUpdateControlCheck,
  onAddPhotos,
  onUpdatePhotoCaption,
  onRemovePhoto,
  onSetMessage,
  onGenerateActions,
  onAddActionItem,
  onRemoveActionItem,
  onUpdateActionItem
}: KitchenAuditWorkspaceSectionProps) {
  return (
    <section className="workspace-grid full-width">
      <div className="workspace-main full-width">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Profit audit input</h3>
              <p className="muted-copy">
                Work section by section and turn kitchen observations into a quantified commercial case.
              </p>
            </div>
          </div>

          <div className="panel-body stack gap-20">
            <section className="sub-panel audit-nav-panel">
              <div className="sub-panel-header">
                <h4>Jump to section</h4>
                <span className="soft-pill">Fast navigation</span>
              </div>
              <div className="audit-section-nav">
                {sectionLinks.map((section) => (
                  <a className="audit-section-link" href={section.href} key={section.href}>
                    {section.label}
                  </a>
                ))}
              </div>
            </section>

            <section className="sub-panel" id="audit-site-details">
              <h4>Site details</h4>
              <div className="form-grid">
                <label className="field">
                  <span>Report title</span>
                  <input className="input" value={form.title} onChange={(e) => onUpdateField('title', e.target.value)} />
                </label>

                <label className="field">
                  <span>Business name</span>
                  <input className="input" value={form.businessName} onChange={(e) => onUpdateField('businessName', e.target.value)} />
                </label>

                <label className="field">
                  <span>Location</span>
                  <input className="input" value={form.location} onChange={(e) => onUpdateField('location', e.target.value)} />
                </label>

                <label className="field">
                  <span>Visit date</span>
                  <input className="input" type="date" value={form.visitDate} onChange={(e) => onUpdateField('visitDate', e.target.value)} />
                </label>

                <label className="field">
                  <span>Consultant</span>
                  <input className="input" value={form.consultantName} onChange={(e) => onUpdateField('consultantName', e.target.value)} />
                </label>

                <label className="field">
                  <span>Site contact</span>
                  <input className="input" value={form.contactName} onChange={(e) => onUpdateField('contactName', e.target.value)} />
                </label>

                <label className="field">
                  <span>Client profile</span>
                  <select className="input" value={form.clientId || ''} onChange={(e) => onHandleClientSelection(e.target.value || null)}>
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </label>

                {availableClientSites.length > 1 ? (
                  <label className="field">
                    <span>Client site</span>
                    <select className="input" value={form.clientSiteId || ''} onChange={(e) => onHandleClientSiteSelection(e.target.value || null)}>
                      <option value="">Select a site</option>
                      {availableClientSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="field">
                  <span>Review type</span>
                  <select className="input" value={form.auditType} onChange={(e) => onUpdateField('auditType', e.target.value)}>
                    <option>Kitchen Profit Audit</option>
                    <option>Menu & GP Recovery Review</option>
                    <option>Kitchen Efficiency Review</option>
                    <option>New Opening Support</option>
                    <option>Chef Mentoring Visit</option>
                  </select>
                </label>
              </div>

              {availableClientSites.length > 1 ? (
                <p className="muted-copy">
                  This client has multiple recorded sites. Pick the location you are visiting so the audit and export stay tied to the right site.
                </p>
              ) : null}

              {form.clientId ? (
                <div className="header-actions">
                  <Link className="button button-ghost" to={`/clients/${form.clientId}`}>
                    Open client profile
                  </Link>
                </div>
              ) : null}
            </section>

            <section className="sub-panel" id="audit-trading-profile">
              <div className="sub-panel-header">
                <h4>Trading and context profile</h4>
                <span className="soft-pill">Visit context</span>
              </div>

              <div className="form-grid three-balance">
                <label className="field">
                  <span>Service style</span>
                  <input className="input" value={form.serviceStyle} onChange={(e) => onUpdateField('serviceStyle', e.target.value)} />
                </label>
                <label className="field">
                  <span>Trading days</span>
                  <input className="input" value={form.tradingDays} onChange={(e) => onUpdateField('tradingDays', e.target.value)} />
                </label>
                <label className="field">
                  <span>Main supplier</span>
                  <input className="input" value={form.mainSupplier} onChange={(e) => onUpdateField('mainSupplier', e.target.value)} />
                </label>
                <label className="field">
                  <span>Covers per week</span>
                  <input className="input" inputMode="numeric" value={form.coversPerWeek} onChange={(e) => onUpdateField('coversPerWeek', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Average spend (£)</span>
                  <input className="input" inputMode="decimal" value={form.averageSpend} onChange={(e) => onUpdateField('averageSpend', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Kitchen team size</span>
                  <input className="input" inputMode="numeric" value={form.kitchenTeamSize} onChange={(e) => onUpdateField('kitchenTeamSize', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Allergen confidence</span>
                  <select className="input" value={form.allergenConfidence} onChange={(e) => onUpdateField('allergenConfidence', e.target.value as AuditFormState['allergenConfidence'])}>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <label className="field">
                  <span>Hygiene risk</span>
                  <select className="input" value={form.hygieneRisk} onChange={(e) => onUpdateField('hygieneRisk', e.target.value as AuditFormState['hygieneRisk'])}>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </label>
                <label className="field">
                  <span>Equipment condition</span>
                  <select className="input" value={form.equipmentCondition} onChange={(e) => onUpdateField('equipmentCondition', e.target.value as AuditFormState['equipmentCondition'])}>
                    <option value="Strong">Strong</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Poor">Poor</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="sub-panel" id="audit-commercial">
              <div className="sub-panel-header">
                <h4>Commercial opportunity snapshot</h4>
                <span className="soft-pill">Profit and control</span>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Weekly food sales (£)</span>
                  <input className="input" inputMode="decimal" value={form.weeklySales} onChange={(e) => onUpdateField('weeklySales', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Weekly food cost (£)</span>
                  <input className="input" inputMode="decimal" value={form.weeklyFoodCost} onChange={(e) => onUpdateField('weeklyFoodCost', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Target GP %</span>
                  <input className="input" inputMode="decimal" value={form.targetGp} onChange={(e) => onUpdateField('targetGp', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Weekly waste loss (£)</span>
                  <input className="input" inputMode="decimal" value={form.actualWasteValue} onChange={(e) => onUpdateField('actualWasteValue', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Current labour %</span>
                  <input className="input" inputMode="decimal" value={form.labourPercent} onChange={(e) => onUpdateField('labourPercent', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Target labour %</span>
                  <input className="input" inputMode="decimal" value={form.targetLabourPercent} onChange={(e) => onUpdateField('targetLabourPercent', num(e.target.value))} />
                </label>
                <label className="field">
                  <span>Ordering control</span>
                  <select className="input" value={form.orderingScore} onChange={(e) => onUpdateField('orderingScore', e.target.value as AuditFormState['orderingScore'])}>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <div className="audit-chip-row">
                <div className="audit-chip">
                  <strong>GP position</strong>
                  <span>
                    {form.weeklySales > 0
                      ? calc.gpGap > 0
                        ? `${fmtCurrency(calc.gpOpportunityValue)} per week below target`
                        : 'On or above target'
                      : 'Awaiting numbers'}
                  </span>
                </div>
                <div className="audit-chip">
                  <strong>Waste reading</strong>
                  <span>
                    {form.actualWasteValue > 0
                      ? `${fmtCurrency(form.actualWasteValue)} per week • ${fmtCurrency(calc.annualWasteLoss)} per year`
                      : 'No waste value logged'}
                  </span>
                </div>
                <div className="audit-chip">
                  <strong>Labour reading</strong>
                  <span>
                    {form.labourPercent > 0
                      ? `${fmtPercent(form.labourPercent)} vs ${fmtPercent(form.targetLabourPercent)} target`
                      : 'No labour data logged'}
                  </span>
                </div>
                <div className="audit-chip">
                  <strong>Total identified</strong>
                  <span>
                    {calc.totalWeeklyOpportunity > 0
                      ? `${fmtCurrency(calc.totalWeeklyOpportunity)} per week`
                      : 'Add commercial inputs'}
                  </span>
                </div>
              </div>

              <div className="header-actions">
                <button className="button button-secondary" onClick={onEstimateSalesFromTradingProfile}>
                  Use covers x spend as weekly sales
                </button>
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => onAddPhotos('commercial', photos)}
                onCaptionChange={onUpdatePhotoCaption}
                onMessage={onSetMessage}
                onRemovePhoto={onRemovePhoto}
                photos={form.photos}
                section="commercial"
                sectionLabel={kitchenPhotoSections.commercial}
              />
            </section>

            <section className="sub-panel" id="audit-scorecard">
              <div className="sub-panel-header">
                <h4>Operational scorecard</h4>
                <span className="soft-pill">0 to 10 scoring</span>
              </div>

              <div className="audit-score-grid">
                {(
                  [
                    ['leadership', 'Leadership'],
                    ['foodQuality', 'Food quality'],
                    ['systems', 'Systems'],
                    ['cleanliness', 'Cleanliness'],
                    ['flow', 'Flow'],
                    ['training', 'Training'],
                    ['stock', 'Stock'],
                    ['safety', 'Safety']
                  ] as Array<[keyof AuditCategoryScores, string]>
                ).map(([key, label]) => (
                  <label className="audit-score-card" key={key}>
                    <span>{label}</span>
                    <input className="input" inputMode="decimal" value={form.categoryScores[key]} onChange={(e) => onUpdateCategoryScore(key, num(e.target.value))} />
                    <small>{form.categoryScores[key].toFixed(1)}/10</small>
                  </label>
                ))}
              </div>
            </section>

            <section className="sub-panel" id="audit-controls">
              <div className="sub-panel-header">
                <h4>Controls and evidence register</h4>
                <div className="saved-actions">
                  <span className="soft-pill">{calc.missingControls} gaps</span>
                  <button className="button button-secondary" onClick={onDraftNarrative}>
                    Draft follow-up
                  </button>
                </div>
              </div>

              <div className="audit-control-grid">
                {form.controlChecks.map((item) => (
                  <div className="audit-control-card" key={item.id}>
                    <div className="audit-control-top">
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.category}</small>
                      </div>
                      <span
                        className={
                          item.status === 'Missing'
                            ? 'status-pill status-danger'
                            : item.status === 'Partial'
                              ? 'status-pill status-warning'
                              : 'status-pill status-success'
                        }
                      >
                        {item.status}
                      </span>
                    </div>

                    <label className="field">
                      <span>Status</span>
                      <select className="input" value={item.status} onChange={(e) => onUpdateControlCheck(item.id, 'status', e.target.value as AuditControlCheck['status'])}>
                        <option>In Place</option>
                        <option>Partial</option>
                        <option>Missing</option>
                        <option>N/A</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>What is happening and why?</span>
                      <textarea className="input textarea" value={item.note} onChange={(e) => onUpdateControlCheck(item.id, 'note', e.target.value)} />
                    </label>
                  </div>
                ))}
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => onAddPhotos('controls', photos)}
                onCaptionChange={onUpdatePhotoCaption}
                onMessage={onSetMessage}
                onRemovePhoto={onRemovePhoto}
                photos={form.photos}
                section="controls"
                sectionLabel={kitchenPhotoSections.controls}
              />
            </section>

            <section className="sub-panel" id="audit-observations">
              <div className="sub-panel-header">
                <h4>Consultancy narrative</h4>
                <span className="soft-pill">Quality and systems</span>
              </div>
              <div className="form-grid two-columns">
                {textareaFields.slice(0, 4).map((field) => (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea className="input textarea" value={form[field.key]} onChange={(e) => onUpdateField(field.key, e.target.value)} />
                  </label>
                ))}
              </div>
            </section>

            <section className="sub-panel" id="audit-waste">
              <div className="sub-panel-header">
                <h4>Where is money being lost?</h4>
                <button className="button button-secondary" onClick={() => onAddRepeatItem('wasteItems')}>
                  Add record
                </button>
              </div>
              <div className="stack gap-12">
                {form.wasteItems.map((item) => (
                  <div className="repeat-card" key={item.id}>
                    <div className="repeat-header">
                      <strong>{safe(item.item) || 'Waste loss area'}</strong>
                      <button className="button button-ghost" onClick={() => onRemoveRepeatItem('wasteItems', item.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="form-grid">
                      <label className="field">
                        <span>Where is money being lost?</span>
                        <input className="input" value={item.item} onChange={(e) => onUpdateRepeatItem<AuditWasteItem>('wasteItems', item.id, 'item', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Weekly loss (£)</span>
                        <input className="input" inputMode="decimal" value={item.cost} onChange={(e) => onUpdateRepeatItem<AuditWasteItem>('wasteItems', item.id, 'cost', num(e.target.value))} />
                      </label>
                      <label className="field">
                        <span>What is happening and why?</span>
                        <input className="input" value={item.cause} onChange={(e) => onUpdateRepeatItem<AuditWasteItem>('wasteItems', item.id, 'cause', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>What needs to change immediately?</span>
                        <input className="input" value={item.fix} onChange={(e) => onUpdateRepeatItem<AuditWasteItem>('wasteItems', item.id, 'fix', e.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => onAddPhotos('findings', photos)}
                onCaptionChange={onUpdatePhotoCaption}
                onMessage={onSetMessage}
                onRemovePhoto={onRemovePhoto}
                photos={form.photos}
                section="findings"
                sectionLabel={kitchenPhotoSections.findings}
              />
            </section>

            <section className="sub-panel" id="audit-portion">
              <div className="sub-panel-header">
                <h4>Which dishes are over-portioning and costing profit?</h4>
                <button className="button button-secondary" onClick={() => onAddRepeatItem('portionItems')}>
                  Add record
                </button>
              </div>
              <div className="stack gap-12">
                {form.portionItems.map((item) => (
                  <div className="repeat-card" key={item.id}>
                    <div className="repeat-header">
                      <strong>{safe(item.dish) || 'Dish margin leak'}</strong>
                      <button className="button button-ghost" onClick={() => onRemoveRepeatItem('portionItems', item.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="form-grid">
                      <label className="field">
                        <span>Dish or product</span>
                        <input className="input" value={item.dish} onChange={(e) => onUpdateRepeatItem<AuditPortionItem>('portionItems', item.id, 'dish', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Estimated weekly loss (£)</span>
                        <input className="input" inputMode="decimal" value={item.loss} onChange={(e) => onUpdateRepeatItem<AuditPortionItem>('portionItems', item.id, 'loss', num(e.target.value))} />
                      </label>
                      <label className="field">
                        <span>What is happening and why?</span>
                        <input className="input" value={item.issue} onChange={(e) => onUpdateRepeatItem<AuditPortionItem>('portionItems', item.id, 'issue', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>What needs to change immediately?</span>
                        <input className="input" value={item.fix} onChange={(e) => onUpdateRepeatItem<AuditPortionItem>('portionItems', item.id, 'fix', e.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="sub-panel" id="audit-ordering">
              <div className="sub-panel-header">
                <h4>Where is ordering creating waste or inefficiency?</h4>
                <button className="button button-secondary" onClick={() => onAddRepeatItem('orderingItems')}>
                  Add record
                </button>
              </div>
              <div className="stack gap-12">
                {form.orderingItems.map((item) => (
                  <div className="repeat-card" key={item.id}>
                    <div className="repeat-header">
                      <strong>{safe(item.category) || 'Ordering issue'}</strong>
                      <button className="button button-ghost" onClick={() => onRemoveRepeatItem('orderingItems', item.id)}>
                        Remove
                      </button>
                    </div>
                    <div className="form-grid">
                      <label className="field">
                        <span>Category or supplier</span>
                        <input className="input" value={item.category} onChange={(e) => onUpdateRepeatItem<AuditOrderingItem>('orderingItems', item.id, 'category', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>What is happening and why?</span>
                        <input className="input" value={item.problem} onChange={(e) => onUpdateRepeatItem<AuditOrderingItem>('orderingItems', item.id, 'problem', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Commercial impact</span>
                        <input className="input" value={item.impact} onChange={(e) => onUpdateRepeatItem<AuditOrderingItem>('orderingItems', item.id, 'impact', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>What needs to change immediately?</span>
                        <input className="input" value={item.fix} onChange={(e) => onUpdateRepeatItem<AuditOrderingItem>('orderingItems', item.id, 'fix', e.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="sub-panel" id="audit-layout">
              <div className="sub-panel-header">
                <h4>Kitchen layout review</h4>
                <span className="soft-pill">Flow and efficiency</span>
              </div>
              <div className="form-grid two-columns">
                {textareaFields.slice(4, 8).map((field) => (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea className="input textarea" value={form[field.key]} onChange={(e) => onUpdateField(field.key, e.target.value)} />
                  </label>
                ))}
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => onAddPhotos('layout', photos)}
                onCaptionChange={onUpdatePhotoCaption}
                onMessage={onSetMessage}
                onRemovePhoto={onRemovePhoto}
                photos={form.photos}
                section="layout"
                sectionLabel={kitchenPhotoSections.layout}
              />
            </section>

            <section className="sub-panel" id="audit-actions">
              <div className="sub-panel-header">
                <h4>Action planning and follow-up</h4>
                <div className="saved-actions">
                  <span className="soft-pill">Client outcomes</span>
                  <button className="button button-secondary" onClick={onGenerateActions}>
                    Generate actions
                  </button>
                  <button className="button button-secondary" onClick={onAddActionItem}>
                    Add action
                  </button>
                </div>
              </div>
              <div className="form-grid two-columns">
                {textareaFields.slice(8).map((field) => (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea className="input textarea" value={form[field.key]} onChange={(e) => onUpdateField(field.key, e.target.value)} />
                  </label>
                ))}
              </div>

              <div className="stack gap-12">
                {form.actionItems.map((item) => (
                  <div className="repeat-card audit-action-card" key={item.id}>
                    <div className="repeat-header">
                      <strong>{safe(item.title) || 'Action item'}</strong>
                      <button className="button button-ghost" onClick={() => onRemoveActionItem(item.id)}>
                        Remove
                      </button>
                    </div>

                    <div className="form-grid three-balance">
                      <label className="field">
                        <span>Action</span>
                        <input className="input" value={item.title} onChange={(e) => onUpdateActionItem(item.id, 'title', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Area</span>
                        <input className="input" value={item.area} onChange={(e) => onUpdateActionItem(item.id, 'area', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Priority</span>
                        <select className="input" value={item.priority} onChange={(e) => onUpdateActionItem(item.id, 'priority', e.target.value)}>
                          <option>Critical</option>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Owner</span>
                        <input className="input" value={item.owner} onChange={(e) => onUpdateActionItem(item.id, 'owner', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Due date</span>
                        <input className="input" type="date" value={item.dueDate} onChange={(e) => onUpdateActionItem(item.id, 'dueDate', e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <select className="input" value={item.status} onChange={(e) => onUpdateActionItem(item.id, 'status', e.target.value)}>
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Done</option>
                        </select>
                      </label>
                    </div>

                    <label className="field">
                      <span>Commercial or operational impact</span>
                      <textarea className="input textarea" value={item.impact} onChange={(e) => onUpdateActionItem(item.id, 'impact', e.target.value)} />
                    </label>
                  </div>
                ))}
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => onAddPhotos('actions', photos)}
                onCaptionChange={onUpdatePhotoCaption}
                onMessage={onSetMessage}
                onRemovePhoto={onRemovePhoto}
                photos={form.photos}
                section="actions"
                sectionLabel={kitchenPhotoSections.actions}
              />
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

type KitchenAuditControlsPanelProps = {
  completion: {
    complete: number;
    total: number;
    percent: number;
  };
  insights: InsightItem[];
  form: AuditFormState;
  calc: {
    controlScore: number;
    criticalMissingControls: number;
    totalNamedActions: number;
    totalWeeklyOpportunity: number;
  };
};

export function KitchenAuditControlsPanel({
  completion,
  insights,
  form,
  calc
}: KitchenAuditControlsPanelProps) {
  return (
    <>
      <div className="audit-side-block">
        <div className="audit-side-title-row">
          <h4>Readiness</h4>
          <span className="soft-pill">{completion.percent}% complete</span>
        </div>
        <div className="audit-progress-track">
          <div className="audit-progress-fill" style={{ width: `${completion.percent}%` }} />
        </div>
        <div className="audit-side-meta">
          {completion.complete} of {completion.total} key checkpoints completed
        </div>
      </div>

      <div className="audit-side-block" style={{ marginTop: '24px' }}>
        <div className="audit-side-title-row">
          <h4>System checks</h4>
          <span className="soft-pill">{insights.length}</span>
        </div>
        <div className="audit-insight-list">
          {insights.map((insight, index) => (
            <div className="audit-insight-card" key={`${insight.title}-${index}`}>
              <div className="audit-insight-top">
                <strong>{insight.title}</strong>
                <span className={toneClass(insight.tone)}>{insight.tone}</span>
              </div>
              <p>{insight.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="audit-side-block" style={{ marginTop: '24px' }}>
        <div className="audit-side-title-row">
          <h4>Profit snapshot</h4>
        </div>
        <div className="audit-chip-row audit-chip-row-vertical">
          <div className="audit-chip">
            <strong>Current site</strong>
            <span>{safe(form.businessName) || 'Unnamed site'}</span>
          </div>
          <div className="audit-chip">
            <strong>Visit date</strong>
            <span>{safe(form.visitDate) || 'Not set'}</span>
          </div>
          <div className="audit-chip">
            <strong>Main output</strong>
            <span>{calc.totalNamedActions} structured actions with live PDF-ready report</span>
          </div>
          <div className="audit-chip">
            <strong>Control position</strong>
            <span>
              {Math.round(calc.controlScore)}% compliant
              {calc.criticalMissingControls > 0 ? ` • ${calc.criticalMissingControls} critical gaps` : ''}
            </span>
          </div>
          <div className="audit-chip">
            <strong>Total opportunity identified</strong>
            <span>
              {calc.totalWeeklyOpportunity > 0
                ? `${fmtCurrency(calc.totalWeeklyOpportunity)} per week`
                : 'No commercial opportunity currently showing'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
