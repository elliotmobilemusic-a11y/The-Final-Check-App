import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  CurrencyInput,
  NumericInput,
  PercentageInput,
  QuantityInput
} from '../ui/NumericInput';
import {
  defaultDietaryTagOptions,
  ingredientUnitOptions
} from '../../features/menu-engine/dishRecords';
import {
  dishMixCost,
  dishProfit,
  dishTheoGp,
  dishUnitCost,
  gpClass,
  toneClass,
  type DishEditorTab,
  type MenuInsight
} from '../../features/menu-engine/menuBuilderHelpers';
import {
  dishPriceGap,
  dishRecommendedPrice,
  dishWeeklyOpportunity,
  dishWeeklyProfit
} from '../../features/profit/menuProfit';
import { fmtCurrency, fmtPercent, num, safe } from '../../lib/utils';
import type {
  ClientRecord,
  DishIngredient,
  MeasurementUnit,
  MenuDish,
  MenuProjectState
} from '../../types';

type MenuBuilderWorkspaceSectionProps = {
  project: MenuProjectState;
  clients: ClientRecord[];
  availableClientSites: Array<{ id: string; name: string }>;
  selectedSection: MenuProjectState['sections'][number] | null;
  selectedSectionSummary: {
    dishCount: number;
    revenue: number;
    profit: number;
    avgGp: number;
  };
  sectionNameDraft: string;
  weightedGp: number;
  menuSummary: {
    totalOpportunity: number;
  };
  strongDishCount: number;
  watchDishCount: number;
  riskDishCount: number;
  onUpdateProject: <K extends keyof MenuProjectState>(key: K, value: MenuProjectState[K]) => void;
  onClientSelection: (clientId: string | null) => void;
  onClientSiteSelection: (siteId: string | null) => void;
  onSectionNameDraftChange: (value: string) => void;
  onAddSection: () => void;
  onRenameSection: () => void;
  onDeleteSection: () => void;
  onOpenDishEditor: (dishId?: string) => void;
  onUpdateDishInline: (
    sectionId: string,
    dishId: string,
    field: keyof MenuDish,
    value: number
  ) => void;
  onDeleteDish: (dishId: string) => void;
};

export function MenuBuilderWorkspaceSection({
  project,
  clients,
  availableClientSites,
  selectedSection,
  selectedSectionSummary,
  sectionNameDraft,
  weightedGp,
  menuSummary,
  strongDishCount,
  watchDishCount,
  riskDishCount,
  onUpdateProject,
  onClientSelection,
  onClientSiteSelection,
  onSectionNameDraftChange,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onOpenDishEditor,
  onUpdateDishInline,
  onDeleteDish
}: MenuBuilderWorkspaceSectionProps) {
  return (
    <section>
      <div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Menu Profit Engine</h3>
              <p className="muted-copy">
                Control costing, pricing, mix, and weekly contribution from one commercial view.
              </p>
            </div>
          </div>

          <div className="panel-body stack gap-20">
            <section className="sub-panel menu-nav-panel">
              <div className="sub-panel-header">
                <h4>Menu section navigation</h4>
                <span className="soft-pill">Quick access</span>
              </div>

              <div className="menu-section-nav">
                {project.sections.map((section) => (
                  <button
                    className={`menu-section-link ${project.selectedSectionId === section.id ? 'active' : ''}`}
                    key={section.id}
                    type="button"
                    onClick={() => onUpdateProject('selectedSectionId', section.id)}
                  >
                    {section.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="sub-panel">
              <h4>Menu information</h4>
              <div className="form-grid">
                <label className="field">
                  <span>Menu name</span>
                  <input
                    className="input"
                    value={project.menuName}
                    onChange={(e) => onUpdateProject('menuName', e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Site / location</span>
                  <input
                    className="input"
                    value={project.siteName}
                    onChange={(e) => onUpdateProject('siteName', e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Review date</span>
                  <input
                    className="input"
                    type="date"
                    value={project.reviewDate}
                    onChange={(e) => onUpdateProject('reviewDate', e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Default target GP %</span>
                  <PercentageInput
                    value={project.defaultTargetGp}
                    onChange={(value) => onUpdateProject('defaultTargetGp', num(value))}
                  />
                </label>

                <label className="field">
                  <span>Client profile</span>
                  <select
                    className="input"
                    value={project.clientId || ''}
                    onChange={(e) => onClientSelection(e.target.value || null)}
                  >
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
                    <select
                      className="input"
                      value={project.clientSiteId || ''}
                      onChange={(e) => onClientSiteSelection(e.target.value || null)}
                    >
                      <option value="">Select a site</option>
                      {availableClientSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {availableClientSites.length > 1 ? (
                <p className="muted-copy">
                  This client has more than one site. Choose the location you are pricing so the
                  menu review stays tied to the right trading site.
                </p>
              ) : null}

              {project.clientId ? (
                <div className="header-actions">
                  <Link className="button button-ghost" to={`/clients/${project.clientId}`}>
                    Open client profile
                  </Link>
                </div>
              ) : null}
            </section>

            <section className="sub-panel">
              <div className="sub-panel-header">
                <h4>Commercial overview</h4>
                <span className="soft-pill">Live performance</span>
              </div>

              <div className="menu-chip-row">
                <div className="menu-chip">
                  <strong>Default target GP</strong>
                  <span>{fmtPercent(project.defaultTargetGp)}</span>
                </div>
                <div className="menu-chip">
                  <strong>Current actual GP</strong>
                  <span>{fmtPercent(weightedGp)}</span>
                </div>
                <div className="menu-chip">
                  <strong>Weekly opportunity</strong>
                  <span>{fmtCurrency(menuSummary.totalOpportunity)}</span>
                </div>
                <div className="menu-chip">
                  <strong>Strong dishes</strong>
                  <span>{strongDishCount}</span>
                </div>
                <div className="menu-chip">
                  <strong>Watch dishes</strong>
                  <span>{watchDishCount}</span>
                </div>
                <div className="menu-chip">
                  <strong>At-risk dishes</strong>
                  <span>{riskDishCount}</span>
                </div>
                <div className="menu-chip">
                  <strong>Total sections</strong>
                  <span>{project.sections.length}</span>
                </div>
              </div>
            </section>

            <section className="sub-panel">
              <div className="sub-panel-header">
                <h4>Section management</h4>
                <div className="header-actions">
                  <button className="button button-secondary" onClick={onAddSection}>
                    Add section
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={onRenameSection}
                    disabled={!selectedSection}
                  >
                    Rename
                  </button>
                  <button
                    className="button button-ghost danger-text"
                    onClick={onDeleteSection}
                    disabled={!selectedSection}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="form-grid two-columns">
                <label className="field">
                  <span>Section name</span>
                  <input
                    className="input"
                    placeholder="For example: Starters, Grill, Desserts"
                    value={sectionNameDraft}
                    onChange={(event) => onSectionNameDraftChange(event.target.value)}
                  />
                </label>
              </div>

              <div className="section-list">
                {project.sections.map((section) => {
                  const count = section.dishes.length;
                  const avgGp =
                    count > 0
                      ? section.dishes.reduce((sum, dish) => sum + dishTheoGp(dish), 0) / count
                      : 0;

                  return (
                    <button
                      className={`section-button ${project.selectedSectionId === section.id ? 'active' : ''}`}
                      key={section.id}
                      onClick={() => onUpdateProject('selectedSectionId', section.id)}
                      type="button"
                    >
                      <div>
                        <strong>{section.name}</strong>
                        <div className="saved-meta">
                          {count} dish{count === 1 ? '' : 'es'} • Avg GP {fmtPercent(avgGp)}
                        </div>
                      </div>
                      <span className="soft-pill">{count}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="sub-panel">
              <div className="sub-panel-header">
                <h4>Selected section</h4>
                <button
                  className="button button-primary"
                  disabled={!selectedSection}
                  onClick={() => onOpenDishEditor()}
                >
                  Add dish
                </button>
              </div>

              <div className="menu-performance-grid">
                <div className="menu-performance-card">
                  <span>Dishes</span>
                  <strong>{selectedSectionSummary.dishCount}</strong>
                </div>
                <div className="menu-performance-card">
                  <span>Revenue</span>
                  <strong>{fmtCurrency(selectedSectionSummary.revenue)}</strong>
                </div>
                <div className="menu-performance-card">
                  <span>Profit</span>
                  <strong>{fmtCurrency(selectedSectionSummary.profit)}</strong>
                </div>
                <div className="menu-performance-card">
                  <span>Average GP</span>
                  <strong>{fmtPercent(selectedSectionSummary.avgGp)}</strong>
                </div>
              </div>

              {!selectedSection ? (
                <div className="muted-copy">Create a section to start building dishes.</div>
              ) : (
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Dish</th>
                        <th>Ingredient cost</th>
                        <th>Weekly cost</th>
                        <th>Sell</th>
                        <th>Profit / sale</th>
                        <th>Target GP</th>
                        <th>Actual GP</th>
                        <th>Target sell</th>
                        <th>Move</th>
                        <th>Sales mix %</th>
                        <th>Weekly volume</th>
                        <th>Weekly profit</th>
                        <th>Opportunity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedSection.dishes.length ? (
                        <tr>
                          <td colSpan={14} className="empty-cell">
                            No dishes in this section yet.
                          </td>
                        </tr>
                      ) : (
                        selectedSection.dishes.map((dish) => (
                          <tr key={dish.id}>
                            <td>
                              <div className="dish-name">{dish.name}</div>
                              <div className="saved-meta">{safe(dish.notes) || 'No notes added.'}</div>
                            </td>
                            <td>{fmtCurrency(dishUnitCost(dish))}</td>
                            <td>{fmtCurrency(dishMixCost(dish))}</td>
                            <td>
                              <CurrencyInput
                                className="compact-input"
                                value={dish.sellPrice}
                                onChange={(value) =>
                                  onUpdateDishInline(selectedSection.id, dish.id, 'sellPrice', num(value))
                                }
                              />
                            </td>
                            <td>{fmtCurrency(dishProfit(dish))}</td>
                            <td>
                              <PercentageInput
                                className="compact-input"
                                value={dish.targetGp}
                                onChange={(value) =>
                                  onUpdateDishInline(selectedSection.id, dish.id, 'targetGp', num(value))
                                }
                              />
                            </td>
                            <td>
                              <span className={gpClass(dish)}>{fmtPercent(dishTheoGp(dish))}</span>
                            </td>
                            <td>{fmtCurrency(dishRecommendedPrice(dish))}</td>
                            <td>
                              <span
                                className={
                                  dishPriceGap(dish) > 0
                                    ? 'status-pill status-warning'
                                    : 'status-pill status-success'
                                }
                              >
                                {dishPriceGap(dish) > 0 ? '+' : ''}
                                {fmtCurrency(dishPriceGap(dish))}
                              </span>
                            </td>
                            <td>
                              <PercentageInput
                                className="compact-input"
                                value={dish.salesMixPercent}
                                onChange={(value) =>
                                  onUpdateDishInline(
                                    selectedSection.id,
                                    dish.id,
                                    'salesMixPercent',
                                    num(value)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <QuantityInput
                                className="compact-input"
                                value={dish.weeklySalesVolume}
                                onChange={(value) =>
                                  onUpdateDishInline(
                                    selectedSection.id,
                                    dish.id,
                                    'weeklySalesVolume',
                                    num(value)
                                  )
                                }
                              />
                            </td>
                            <td>{fmtCurrency(dishWeeklyProfit(dish))}</td>
                            <td>{fmtCurrency(dishWeeklyOpportunity(dish))}</td>
                            <td>
                              <div className="saved-actions">
                                <button
                                  className="button button-ghost"
                                  onClick={() => onOpenDishEditor(dish.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="button button-ghost danger-text"
                                  onClick={() => onDeleteDish(dish.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

type MenuDishEditorModalProps = {
  open: boolean;
  editingDishId: string | null;
  dishDraft: MenuDish | null;
  dishEditorTab: DishEditorTab;
  isDishSharing: boolean;
  dishShareUrl: string;
  onClose: () => void;
  onSetDishEditorTab: (tab: DishEditorTab) => void;
  onUpdateDish: <K extends keyof MenuDish>(key: K, value: MenuDish[K]) => void;
  onUpdateRecipeCosting: <K extends keyof MenuDish['recipeCosting']>(
    key: K,
    value: MenuDish['recipeCosting'][K]
  ) => void;
  onUpdateSpecSheet: <K extends keyof MenuDish['specSheet']>(
    key: K,
    value: MenuDish['specSheet'][K]
  ) => void;
  onToggleDietaryTag: (tag: string) => void;
  onUpdateIngredient: (id: string, field: keyof DishIngredient, value: string | number) => void;
  onAddIngredient: () => void;
  onRemoveIngredient: (id: string) => void;
  onAddDishImages: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDishImage: (imageId: string) => void;
  onSetPrimaryDishImage: (imageId: string) => void;
  onExportDishReport: (kind: 'spec' | 'recipe') => void;
  onCreateDishReportShare: (kind: 'spec' | 'recipe') => void;
  onCopyDishShareLink: () => Promise<void>;
  onSaveDish: () => void;
};

const DISH_EDITOR_TABS: Array<{ key: DishEditorTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'recipe', label: 'Recipe costing' },
  { key: 'spec', label: 'Spec sheet' },
  { key: 'allergens', label: 'Allergens & notes' },
  { key: 'images', label: 'Images' }
];

export function MenuDishEditorModal({
  open,
  editingDishId,
  dishDraft,
  dishEditorTab,
  isDishSharing,
  dishShareUrl,
  onClose,
  onSetDishEditorTab,
  onUpdateDish,
  onUpdateRecipeCosting,
  onUpdateSpecSheet,
  onToggleDietaryTag,
  onUpdateIngredient,
  onAddIngredient,
  onRemoveIngredient,
  onAddDishImages,
  onRemoveDishImage,
  onSetPrimaryDishImage,
  onExportDishReport,
  onCreateDishReportShare,
  onCopyDishShareLink,
  onSaveDish
}: MenuDishEditorModalProps) {
  if (!open || !dishDraft || typeof document === 'undefined') return null;

  return createPortal(
    <div className="drawer-backdrop dish-modal-backdrop" onClick={onClose}>
      <div
        aria-modal="true"
        className="drawer-panel dish-modal-panel"
        role="dialog"
        aria-label={editingDishId ? 'Edit dish' : 'Add dish'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header dish-modal-header">
          <div>
            <h3>{editingDishId ? 'Edit dish' : 'Add dish'}</h3>
            <p className="muted-copy">
              Build each dish from ingredients, selling price, target GP, and weekly sales volume so
              the profit opportunity is explicit.
            </p>
          </div>
          <div className="dish-modal-header-actions">
            <button className="button button-secondary" onClick={() => onExportDishReport('spec')} type="button">
              Export spec PDF
            </button>
            <button className="button button-secondary" onClick={() => onExportDishReport('recipe')} type="button">
              Export recipe PDF
            </button>
            <button className="button button-ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className="panel-body stack gap-20 dish-modal-body">
          <div className="menu-dish-tab-row" role="tablist" aria-label="Dish workspace">
            {DISH_EDITOR_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={dishEditorTab === tab.key}
                className={`menu-dish-tab ${dishEditorTab === tab.key ? 'active' : ''}`}
                onClick={() => onSetDishEditorTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dish-editor-layout">
            <div className="dish-editor-main">
              {dishEditorTab === 'overview' ? (
                <section className="sub-panel">
                  <div className="sub-panel-header">
                    <div>
                      <h4>Dish overview</h4>
                      <p className="muted-copy">
                        This is now the central dish record for menu, pricing, specs, allergens, and
                        images.
                      </p>
                    </div>
                  </div>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Dish name</span>
                      <input
                        className="input"
                        value={dishDraft.name}
                        onChange={(e) => onUpdateDish('name', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Portion size</span>
                      <input
                        className="input"
                        value={dishDraft.portionSize}
                        onChange={(e) => onUpdateDish('portionSize', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Selling price (£)</span>
                      <CurrencyInput
                        value={dishDraft.sellPrice}
                        onChange={(value) => onUpdateDish('sellPrice', num(value))}
                      />
                    </label>
                    <label className="field">
                      <span>Target GP %</span>
                      <PercentageInput
                        value={dishDraft.targetGp}
                        onChange={(value) => onUpdateDish('targetGp', num(value))}
                      />
                    </label>
                    <label className="field">
                      <span>Sales mix %</span>
                      <PercentageInput
                        value={dishDraft.salesMixPercent}
                        onChange={(value) => onUpdateDish('salesMixPercent', num(value))}
                      />
                    </label>
                    <label className="field">
                      <span>Weekly sales volume</span>
                      <QuantityInput
                        value={dishDraft.weeklySalesVolume}
                        onChange={(value) => onUpdateDish('weeklySalesVolume', num(value))}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Dish description</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.description}
                      onChange={(e) => onUpdateDish('description', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Commercial notes</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.notes}
                      onChange={(e) => onUpdateDish('notes', e.target.value)}
                    />
                  </label>
                </section>
              ) : null}

              {dishEditorTab === 'recipe' ? (
                <section className="sub-panel">
                  <div className="sub-panel-header">
                    <div>
                      <h4>Recipe costing</h4>
                      <p className="muted-copy">
                        Ingredient lines stay as the costing engine. This dish record will become the
                        linked recipe costing sheet.
                      </p>
                    </div>
                    <button className="button button-secondary" onClick={onAddIngredient}>
                      Add ingredient
                    </button>
                  </div>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Costing portion size</span>
                      <input
                        className="input"
                        value={dishDraft.recipeCosting.portionSize}
                        onChange={(e) => onUpdateRecipeCosting('portionSize', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Number of portions</span>
                      <QuantityInput
                        value={dishDraft.recipeCosting.numberOfPortions}
                        onChange={(value) =>
                          onUpdateRecipeCosting('numberOfPortions', Math.max(1, num(value) || 1))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Target GP %</span>
                      <PercentageInput
                        value={dishDraft.recipeCosting.targetGpPercentage}
                        onChange={(value) =>
                          onUpdateRecipeCosting('targetGpPercentage', num(value))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>VAT included in sell price</span>
                      <select
                        className="input"
                        value={dishDraft.recipeCosting.vatEnabled ? 'yes' : 'no'}
                        onChange={(e) =>
                          onUpdateRecipeCosting('vatEnabled', e.target.value === 'yes')
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Recipe costing notes</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.recipeCosting.notes}
                      onChange={(e) => onUpdateRecipeCosting('notes', e.target.value)}
                    />
                  </label>

                  <div className="stack gap-12">
                    {dishDraft.ingredients.map((ingredient) => (
                      <div className="ingredient-card" key={ingredient.id}>
                        <div className="ingredient-card-top">
                          <strong>{safe(ingredient.name) || 'New ingredient line'}</strong>
                          <button
                            className="button button-ghost danger-text"
                            onClick={() => onRemoveIngredient(ingredient.id)}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="ingredient-card-grid">
                          <label className="field ingredient-field ingredient-field-name">
                            <span>Ingredient</span>
                            <input
                              className="input"
                              value={ingredient.name}
                              onChange={(e) => onUpdateIngredient(ingredient.id, 'name', e.target.value)}
                            />
                          </label>
                          <label className="field ingredient-field">
                            <span>Supplier</span>
                            <input
                              className="input"
                              value={ingredient.supplier}
                              onChange={(e) =>
                                onUpdateIngredient(ingredient.id, 'supplier', e.target.value)
                              }
                            />
                          </label>
                          <label className="field ingredient-field ingredient-field-qty">
                            <span>Qty used</span>
                            <div className="unit-input-row">
                              <NumericInput
                                value={ingredient.qtyUsed}
                                inputMode="decimal"
                                decimalPlaces={2}
                                onChange={(value) =>
                                  onUpdateIngredient(ingredient.id, 'qtyUsed', num(value))
                                }
                              />
                              <select
                                className="input unit-select"
                                value={ingredient.qtyUnit}
                                onChange={(e) =>
                                  onUpdateIngredient(
                                    ingredient.id,
                                    'qtyUnit',
                                    e.target.value as MeasurementUnit
                                  )
                                }
                              >
                                {ingredientUnitOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                          <label className="field ingredient-field ingredient-field-pack">
                            <span>Pack size</span>
                            <div className="unit-input-row">
                              <NumericInput
                                value={ingredient.packQty}
                                inputMode="decimal"
                                decimalPlaces={2}
                                onChange={(value) =>
                                  onUpdateIngredient(
                                    ingredient.id,
                                    'packQty',
                                    Math.max(1, num(value) || 1)
                                  )
                                }
                              />
                              <select
                                className="input unit-select"
                                value={ingredient.packUnit}
                                onChange={(e) =>
                                  onUpdateIngredient(
                                    ingredient.id,
                                    'packUnit',
                                    e.target.value as MeasurementUnit
                                  )
                                }
                              >
                                {ingredientUnitOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                          <label className="field ingredient-field ingredient-field-cost">
                            <span>Pack cost (£)</span>
                            <CurrencyInput
                              value={ingredient.packCost}
                              onChange={(value) =>
                                onUpdateIngredient(ingredient.id, 'packCost', num(value))
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {dishEditorTab === 'spec' ? (
                <section className="sub-panel">
                  <div className="sub-panel-header">
                    <div>
                      <h4>Dish spec sheet</h4>
                      <p className="muted-copy">
                        This stays linked to the dish record so it can later be exported from Menu
                        Builder, client profile, and portal.
                      </p>
                    </div>
                  </div>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Spec portion size</span>
                      <input
                        className="input"
                        value={dishDraft.specSheet.portionSize}
                        onChange={(e) => onUpdateSpecSheet('portionSize', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Equipment required</span>
                      <input
                        className="input"
                        value={dishDraft.specSheet.equipmentRequired}
                        onChange={(e) => onUpdateSpecSheet('equipmentRequired', e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Recipe method</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.specSheet.recipeMethod}
                      onChange={(e) => onUpdateSpecSheet('recipeMethod', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Plating instructions</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.specSheet.platingInstructions}
                      onChange={(e) => onUpdateSpecSheet('platingInstructions', e.target.value)}
                    />
                  </label>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Prep notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.specSheet.prepNotes}
                        onChange={(e) => onUpdateSpecSheet('prepNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Service notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.specSheet.serviceNotes}
                        onChange={(e) => onUpdateSpecSheet('serviceNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Holding / storage notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.specSheet.holdingStorageNotes}
                        onChange={(e) => onUpdateSpecSheet('holdingStorageNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Client-facing notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.specSheet.clientFacingNotes}
                        onChange={(e) => onUpdateSpecSheet('clientFacingNotes', e.target.value)}
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {dishEditorTab === 'allergens' ? (
                <section className="sub-panel">
                  <div className="sub-panel-header">
                    <div>
                      <h4>Allergens, dietary tags, and notes</h4>
                      <p className="muted-copy">
                        Keep compliance, prep guidance, and internal notes on the same dish record.
                      </p>
                    </div>
                  </div>

                  <label className="field">
                    <span>Allergen information</span>
                    <textarea
                      className="input textarea"
                      value={dishDraft.allergenInformation}
                      onChange={(e) => onUpdateDish('allergenInformation', e.target.value)}
                    />
                  </label>

                  <div className="field">
                    <span>Dietary tags</span>
                    <div className="menu-dish-tag-row">
                      {defaultDietaryTagOptions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`client-filter-chip ${dishDraft.dietaryTags.includes(tag) ? 'active' : ''}`}
                          onClick={() => onToggleDietaryTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Prep notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.prepNotes}
                        onChange={(e) => onUpdateDish('prepNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Service notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.serviceNotes}
                        onChange={(e) => onUpdateDish('serviceNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Holding / storage notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.holdingStorageNotes}
                        onChange={(e) => onUpdateDish('holdingStorageNotes', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Internal notes</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.internalNotes}
                        onChange={(e) => onUpdateDish('internalNotes', e.target.value)}
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {dishEditorTab === 'images' ? (
                <section className="sub-panel">
                  <div className="sub-panel-header">
                    <div>
                      <h4>Dish images</h4>
                      <p className="muted-copy">
                        Add one or more dish images so the menu engine can later feed spec PDFs and
                        client-facing exports.
                      </p>
                    </div>
                    <label className="button button-secondary inline-file-button">
                      Upload image
                      <input accept="image/*" hidden multiple type="file" onChange={onAddDishImages} />
                    </label>
                  </div>

                  {!dishDraft.dishImages.length ? (
                    <div className="dashboard-empty">No dish images uploaded yet.</div>
                  ) : (
                    <div className="menu-dish-image-grid">
                      {dishDraft.dishImages.map((image) => (
                        <div className="menu-dish-image-card" key={image.id}>
                          <img alt={image.label || dishDraft.name || 'Dish image'} src={image.imageDataUrl} />
                          <div className="menu-dish-image-meta">
                            <strong>{image.label || 'Dish image'}</strong>
                            <div className="saved-actions">
                              <button
                                className="button button-ghost"
                                type="button"
                                onClick={() => onSetPrimaryDishImage(image.id)}
                              >
                                {image.isPrimary ? 'Primary image' : 'Set primary'}
                              </button>
                              <button
                                className="button button-ghost danger-text"
                                type="button"
                                onClick={() => onRemoveDishImage(image.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            <aside className="dish-editor-side">
              <section className="sub-panel">
                <div className="sub-panel-header">
                  <div>
                    <h4>Profit snapshot</h4>
                    <p className="muted-copy">
                      Live costing updates as ingredients, pack sizes, pricing, and weekly volume
                      are added.
                    </p>
                  </div>
                </div>
                <div className="dish-editor-stat-grid">
                  <div className="mini-box">
                    <span>Ingredient cost</span>
                    <strong>{fmtCurrency(dishUnitCost(dishDraft))}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Actual GP</span>
                    <strong>{fmtPercent(dishTheoGp(dishDraft))}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Profit / sale</span>
                    <strong>{fmtCurrency(dishProfit(dishDraft))}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Weekly profit</span>
                    <strong>{fmtCurrency(dishWeeklyProfit(dishDraft))}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Target sell</span>
                    <strong>{fmtCurrency(dishRecommendedPrice(dishDraft))}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Opportunity</span>
                    <strong>{fmtCurrency(dishWeeklyOpportunity(dishDraft))}</strong>
                  </div>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <div>
                    <h4>Dish record readiness</h4>
                    <p className="muted-copy">
                      This dish record now feeds the linked recipe costing sheet, dish spec sheet,
                      client-profile documents, and shareable exports.
                    </p>
                  </div>
                </div>
                <div className="menu-chip-row menu-chip-row-vertical">
                  <div className="menu-chip">
                    <strong>Images</strong>
                    <span>{dishDraft.dishImages.length}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Dietary tags</strong>
                    <span>{dishDraft.dietaryTags.length}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Spec linked</strong>
                    <span>{safe(dishDraft.specSheet.id) ? 'Ready' : 'Pending'}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Recipe costing</strong>
                    <span>
                      {dishDraft.ingredients.filter((ingredient) => safe(ingredient.name)).length} lines
                    </span>
                  </div>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <div>
                    <h4>Dish exports</h4>
                    <p className="muted-copy">
                      Export or share this individual dish record straight from the Menu Builder.
                    </p>
                  </div>
                </div>

                <div className="dish-export-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => onExportDishReport('spec')}
                    type="button"
                  >
                    Export spec PDF
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => onExportDishReport('recipe')}
                    type="button"
                  >
                    Export recipe PDF
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={isDishSharing}
                    onClick={() => onCreateDishReportShare('spec')}
                    type="button"
                  >
                    {isDishSharing ? 'Creating link...' : 'Create spec link'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={isDishSharing}
                    onClick={() => onCreateDishReportShare('recipe')}
                    type="button"
                  >
                    {isDishSharing ? 'Creating link...' : 'Create recipe link'}
                  </button>
                </div>

                {dishShareUrl ? (
                  <div className="share-link-row dish-share-row">
                    <input
                      className="input"
                      readOnly
                      value={dishShareUrl}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <button className="button button-secondary" type="button" onClick={onCopyDishShareLink}>
                      Copy link
                    </button>
                    <a className="button button-primary" href={dishShareUrl} rel="noreferrer" target="_blank">
                      Open link
                    </a>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>

          <div className="header-actions">
            <button className="button button-primary" onClick={onSaveDish}>
              Save dish
            </button>
            <button className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

type MenuBuilderControlsPanelProps = {
  completion: { complete: number; total: number; percent: number };
  insights: MenuInsight[];
  weightedGp: number;
  dishCount: number;
  strongDishCount: number;
  watchDishCount: number;
  riskDishCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalOpportunity: number;
  sectionCount: number;
};

export function MenuBuilderControlsPanel({
  completion,
  insights,
  weightedGp,
  dishCount,
  strongDishCount,
  watchDishCount,
  riskDishCount,
  totalRevenue,
  totalProfit,
  totalOpportunity,
  sectionCount
}: MenuBuilderControlsPanelProps) {
  return (
    <>
      <div className="audit-side-block">
        <div className="audit-side-title-row">
          <h4>Completion</h4>
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
          <h4>Menu insights</h4>
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
            <strong>Weighted GP</strong>
            <span>{fmtPercent(weightedGp)}</span>
          </div>
          <div className="audit-chip">
            <strong>Total dishes</strong>
            <span>{dishCount}</span>
          </div>
          <div className="audit-chip">
            <strong>Strong dishes</strong>
            <span>{strongDishCount}</span>
          </div>
          <div className="audit-chip">
            <strong>Watch dishes</strong>
            <span>{watchDishCount}</span>
          </div>
          <div className="audit-chip">
            <strong>At risk dishes</strong>
            <span>{riskDishCount}</span>
          </div>
          <div className="audit-chip">
            <strong>Weekly revenue</strong>
            <span>{fmtCurrency(totalRevenue)}</span>
          </div>
          <div className="audit-chip">
            <strong>Weekly profit</strong>
            <span>{fmtCurrency(totalProfit)}</span>
          </div>
          <div className="audit-chip">
            <strong>Weekly opportunity</strong>
            <span>{fmtCurrency(totalOpportunity)}</span>
          </div>
          <div className="audit-chip">
            <strong>Total sections</strong>
            <span>{sectionCount}</span>
          </div>
        </div>
      </div>
    </>
  );
}
