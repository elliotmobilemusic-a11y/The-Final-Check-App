import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  MenuBuilderControlsPanel,
  MenuBuilderWorkspaceSection,
  MenuDishEditorModal
} from '../../components/menu-builder/MenuBuilderSections';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  blankDishImage,
  blankIngredient,
  normalizeDish,
  normalizeIngredient,
  syncDishLinkedRecords
} from '../../features/menu-engine/dishRecords';
import {
  buildDishSpecReportHtml,
  buildRecipeCostingReportHtml
} from '../../features/menu-engine/reports';
import {
  buildMenuInsights,
  buildMenuReport,
  buildReportClientProfile,
  buildReportMenuRecord,
  completionSummary,
  createDefaultMenu,
  dishTheoGp,
  MENU_BUILDER_DRAFT_KEY,
  normalizeMenuProject,
  readFileAsDataUrl,
  type DishEditorTab
} from '../../features/menu-engine/menuBuilderHelpers';
import { openPdfDocument } from '../../reports/pdf';
import {
  getMenuProjectById,
  saveMenuProject
} from '../../services/menus';
import { listClients } from '../../services/clients';
import type {
  ClientRecord,
  DishIngredient,
  MenuDish,
  MenuProjectState
} from '../../types';
import { fmtCurrency, fmtPercent, num, safe, uid } from '../../lib/utils';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import {
  createDishSpecShare,
  createMenuShare,
  createRecipeCostingShare
} from '../../services/reportShares';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { ControlPanelModal } from '../../components/layout/ControlPanelModal';
import {
  buildMenuProfitSummary,
  dishWeeklyProfit
} from '../../features/profit/menuProfit';


export function MenuBuilderPage() {
  const { runWithActivity } = useActivityOverlay();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClientId = searchParams.get('client') || null;
  const queryLoadId = searchParams.get('load');
  const queryDishId = searchParams.get('dish');
  const queryDishTab = searchParams.get('dishTab');

  const [project, setProject] = useState<MenuProjectState>(() =>
    (queryLoadId || searchParams.get('new'))
      ? normalizeMenuProject(createDefaultMenu(queryClientId))
      : normalizeMenuProject(
          readDraft<MenuProjectState>(MENU_BUILDER_DRAFT_KEY) ?? createDefaultMenu(queryClientId)
        )
  );
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishDraft, setDishDraft] = useState<MenuDish | null>(null);
  const [dishEditorTab, setDishEditorTab] = useState<DishEditorTab>('overview');
  const [sectionNameDraft, setSectionNameDraft] = useState('Starters');
  const [message, setMessage] = useState('Menu draft ready.');
  const [dishShareUrl, setDishShareUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDishSharing, setIsDishSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const controlDrawerBodyRef = useRef<HTMLDivElement>(null);
  const openedLinkedDishRef = useRef<string | null>(null);

  const selectedSection = useMemo(
    () => project.sections.find((section) => section.id === project.selectedSectionId) ?? null,
    [project]
  );

  useEffect(() => {
    setSectionNameDraft(selectedSection?.name ?? '');
  }, [selectedSection?.id, selectedSection?.name]);

  const allDishes = useMemo(
    () => project.sections.flatMap((section) => section.dishes),
    [project.sections]
  );

  const menuSummary = useMemo(() => buildMenuProfitSummary(project), [project]);
  const totalRevenue = menuSummary.weeklyRevenue;
  const totalProfit = menuSummary.weeklyProfit;
  const weightedGp = menuSummary.weightedGp;

  const reportHtml = useMemo(() => buildMenuReport(project), [project]);
  const completion = useMemo(() => completionSummary(project), [project]);
  const insights = useMemo(
    () => buildMenuInsights(project, weightedGp, totalRevenue, totalProfit),
    [project, weightedGp, totalRevenue, totalProfit]
  );

  const activeClient = useMemo(
    () => clients.find((client) => client.id === project.clientId) ?? null,
    [clients, project.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );
  const reportClient = useMemo(
    () => buildReportClientProfile(activeClient, project),
    [activeClient, project]
  );
  const reportMenuRecord = useMemo(() => buildReportMenuRecord(project), [project]);

  useBodyScrollLock(controlModalOpen || Boolean(dishDraft));

  useEffect(() => {
    if (!controlModalOpen) return;
    controlDrawerBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [controlModalOpen]);

  const strongDishCount = useMemo(
    () => allDishes.filter((dish) => dishTheoGp(dish) >= num(dish.targetGp)).length,
    [allDishes]
  );

  const watchDishCount = useMemo(
    () =>
      allDishes.filter((dish) => {
        const theo = dishTheoGp(dish);
        const target = num(dish.targetGp);
        return theo < target && theo >= target - 3;
      }).length,
    [allDishes]
  );

  const riskDishCount = useMemo(
    () => allDishes.filter((dish) => dishTheoGp(dish) < num(dish.targetGp) - 3).length,
    [allDishes]
  );
  const selectedSectionSummary = useMemo(() => {
    if (!selectedSection) {
      return {
        dishCount: 0,
        revenue: 0,
        profit: 0,
        avgGp: 0
      };
    }

    const dishes = selectedSection.dishes;
    const revenue = dishes.reduce(
      (sum, dish) => sum + num(dish.sellPrice) * num(dish.weeklySalesVolume),
      0
    );
    const profit = dishes.reduce((sum, dish) => sum + dishWeeklyProfit(dish), 0);
    const avgGp =
      dishes.length > 0
        ? dishes.reduce((sum, dish) => sum + dishTheoGp(dish), 0) / dishes.length
        : 0;

    return {
      dishCount: dishes.length,
      revenue,
      profit,
      avgGp
    };
  }, [selectedSection]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(MENU_BUILDER_DRAFT_KEY, project);
  }, [project]);

  useEffect(() => {
    const state = location.state as { prefill?: Partial<MenuProjectState>; fromSubmissionId?: string } | null;
    if (!state?.prefill) return;
    setProject((current) => normalizeMenuProject({ ...current, ...state.prefill }));
    setMessage('Menu project prefilled from pre-visit questionnaire.');
    window.history.replaceState({}, '', window.location.href);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (queryClientId) {
      setProject((current) => ({ ...current, clientId: queryClientId }));
    }
  }, [queryClientId]);

  useEffect(() => {
    if (!project.clientId) return;

    if (!availableClientSites.length) {
      if (project.clientSiteId) {
        setProject((current) => ({ ...current, clientSiteId: null }));
      }
      return;
    }

    const matchingSite = availableClientSites.find((site) => site.id === project.clientSiteId);
    if (matchingSite) return;

    if (availableClientSites.length === 1) {
      const singleSite = availableClientSites[0];
      setProject((current) => ({
        ...current,
        clientSiteId: singleSite.id,
        siteName:
          !current.siteName.trim() ? singleSite.name || activeClient?.company_name || '' : current.siteName
      }));
      return;
    }

    if (project.clientSiteId) {
      setProject((current) => ({ ...current, clientSiteId: null }));
    }
  }, [activeClient, availableClientSites, project.clientId, project.clientSiteId]);

  useEffect(() => {
    if (!queryLoadId) return;

    getMenuProjectById(queryLoadId)
      .then((record) => {
        if (!record) return;

        setProject({
          ...normalizeMenuProject(record.data),
          id: record.id,
          clientId: record.client_id ?? record.data.clientId ?? null,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        });

        setMessage(`Loaded "${record.title}".`);
      })
      .catch(() => {});
  }, [queryLoadId]);

  function updateProject<K extends keyof MenuProjectState>(
    key: K,
    value: MenuProjectState[K]
  ) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function handleClientSelection(nextClientId: string | null) {
    const nextClient = clients.find((client) => client.id === nextClientId) ?? null;
    const nextSites = selectableSitesForClient(nextClient);
    const singleSite = nextSites.length === 1 ? nextSites[0] : null;

    setProject((current) => ({
      ...current,
      clientId: nextClientId,
      clientSiteId: singleSite?.id ?? null,
      siteName: singleSite
        ? singleSite.name || nextClient?.company_name || current.siteName
        : nextClientId && current.clientId !== nextClientId
          ? ''
          : current.siteName
    }));
  }

  function handleClientSiteSelection(nextSiteId: string | null) {
    const nextSite = availableClientSites.find((site) => site.id === nextSiteId) ?? null;

    setProject((current) => ({
      ...current,
      clientSiteId: nextSiteId,
      siteName: nextSite?.name || current.siteName
    }));
  }

  function addSection() {
    const nextName = safe(sectionNameDraft) || `Section ${project.sections.length + 1}`;

    const id = uid('section');
    setProject((current) => ({
      ...current,
      selectedSectionId: id,
      sections: [...current.sections, { id, name: nextName, dishes: [] }]
    }));
    setSectionNameDraft('');
    setMessage(`Section "${nextName}" added.`);
  }

  function renameSection() {
    if (!selectedSection) return;
    const nextName = safe(sectionNameDraft);
    if (!nextName) return;

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSection.id ? { ...section, name: nextName } : section
      )
    }));
    setMessage(`Section renamed to "${nextName}".`);
  }

  function deleteSection() {
    if (!selectedSection) return;
    if (!window.confirm(`Delete section "${selectedSection.name}" and its dishes?`)) return;

    const nextSections = project.sections.filter(
      (section) => section.id !== selectedSection.id
    );
    const fallbackId = nextSections[0]?.id ?? uid('section');

    setProject((current) => ({
      ...current,
      sections: nextSections.length
        ? nextSections
        : [{ id: fallbackId, name: 'New section', dishes: [] }],
      selectedSectionId: fallbackId
    }));
  }

  function openDishEditor(dishId?: string) {
    if (!selectedSection) return;

    const existing = dishId
      ? selectedSection.dishes.find((dish) => dish.id === dishId)
      : undefined;

    setDishEditorTab('overview');
    setEditingDishId(existing?.id ?? null);
    setDishDraft(
      existing
        ? normalizeDish(JSON.parse(JSON.stringify(existing)) as MenuDish)
        : normalizeDish({
            id: uid('dish'),
            name: '',
            description: '',
            sellPrice: 0,
            targetGp: project.defaultTargetGp,
            mix: 1,
            salesMixPercent: 0,
            weeklySalesVolume: 0,
            portionSize: '',
            allergenInformation: '',
            dietaryTags: [],
            recipeMethod: '',
            platingInstructions: '',
            prepNotes: '',
            serviceNotes: '',
            holdingStorageNotes: '',
            equipmentRequired: '',
            internalNotes: '',
            clientFacingNotes: '',
            notes: '',
            ingredients: [blankIngredient()],
            dishImages: [],
            recipeCosting: {
              id: uid('dish-costing'),
              linkedDishId: '',
              portionSize: '',
              numberOfPortions: 1,
              targetGpPercentage: project.defaultTargetGp,
              actualGpPercentage: 0,
              suggestedSellingPrice: 0,
              vatEnabled: false,
              notes: '',
              portalVisible: false
            },
            specSheet: {
              id: uid('dish-spec'),
              linkedDishId: '',
              portionSize: '',
              recipeMethod: '',
              platingInstructions: '',
              prepNotes: '',
              serviceNotes: '',
              holdingStorageNotes: '',
              equipmentRequired: '',
              internalNotes: '',
              clientFacingNotes: '',
              portalVisible: false
            }
          })
    );
  }

  function closeDishEditor() {
    setEditingDishId(null);
    setDishEditorTab('overview');
    setDishShareUrl('');
    setDishDraft(null);
  }

  function updateDish<K extends keyof MenuDish>(key: K, value: MenuDish[K]) {
    if (!dishDraft) return;
    setDishDraft(syncDishLinkedRecords({ ...dishDraft, [key]: value }));
  }

  function updateRecipeCosting<K extends keyof MenuDish['recipeCosting']>(
    key: K,
    value: MenuDish['recipeCosting'][K]
  ) {
    if (!dishDraft) return;

    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        recipeCosting: {
          ...dishDraft.recipeCosting,
          [key]: value
        }
      })
    );
  }

  function updateSpecSheet<K extends keyof MenuDish['specSheet']>(
    key: K,
    value: MenuDish['specSheet'][K]
  ) {
    if (!dishDraft) return;

    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        specSheet: {
          ...dishDraft.specSheet,
          [key]: value
        }
      })
    );
  }

  function toggleDietaryTag(tag: string) {
    if (!dishDraft) return;

    const nextTags = dishDraft.dietaryTags.includes(tag)
      ? dishDraft.dietaryTags.filter((value) => value !== tag)
      : [...dishDraft.dietaryTags, tag];

    setDishDraft(syncDishLinkedRecords({ ...dishDraft, dietaryTags: nextTags }));
  }

  function updateIngredient(
    id: string,
    field: keyof DishIngredient,
    value: string | number
  ) {
    if (!dishDraft) return;

    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        ingredients: dishDraft.ingredients.map((ingredient) =>
          ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
        )
      })
    );
  }

  function addIngredient() {
    if (!dishDraft) return;

    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        ingredients: [...dishDraft.ingredients, blankIngredient()]
      })
    );
  }

  function removeIngredient(id: string) {
    if (!dishDraft) return;

    const next = dishDraft.ingredients.filter((ingredient) => ingredient.id !== id);
    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        ingredients: next.length ? next : [blankIngredient()]
      })
    );
  }

  async function addDishImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!dishDraft || !files.length) return;

    try {
      const images = await Promise.all(
        files.map(async (file, index) => ({
          ...blankDishImage(),
          label: file.name.replace(/\.[^.]+$/, ''),
          imageDataUrl: await readFileAsDataUrl(file),
          isPrimary: dishDraft.dishImages.length === 0 && index === 0
        }))
      );

      setDishDraft(
        syncDishLinkedRecords({
          ...dishDraft,
          dishImages: [...dishDraft.dishImages, ...images]
        })
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add dish image.');
    } finally {
      event.target.value = '';
    }
  }

  function removeDishImage(imageId: string) {
    if (!dishDraft) return;

    const nextImages = dishDraft.dishImages.filter((image) => image.id !== imageId);
    const normalizedImages = nextImages.map((image, index) => ({
      ...image,
      isPrimary: index === 0 ? true : image.isPrimary && nextImages.some((item) => item.isPrimary)
    }));

    if (normalizedImages.length > 0 && !normalizedImages.some((image) => image.isPrimary)) {
      normalizedImages[0] = { ...normalizedImages[0], isPrimary: true };
    }

    setDishDraft(syncDishLinkedRecords({ ...dishDraft, dishImages: normalizedImages }));
  }

  function setPrimaryDishImage(imageId: string) {
    if (!dishDraft) return;

    setDishDraft(
      syncDishLinkedRecords({
        ...dishDraft,
        dishImages: dishDraft.dishImages.map((image) => ({
          ...image,
          isPrimary: image.id === imageId
        }))
      })
    );
  }

  function saveDish() {
    if (!dishDraft || !selectedSection) return;

    if (!safe(dishDraft.name)) {
      setMessage('Please enter a dish name.');
      return;
    }

    const cleanDish = syncDishLinkedRecords({
      ...normalizeDish(dishDraft),
      ingredients: dishDraft.ingredients
        .filter((ingredient) => safe(ingredient.name))
        .map((ingredient) => normalizeIngredient(ingredient))
    });

    if (!cleanDish.ingredients.length) {
      setMessage('Add at least one ingredient.');
      return;
    }

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== selectedSection.id) return section;

        const existingIndex = section.dishes.findIndex((dish) => dish.id === cleanDish.id);

        if (existingIndex >= 0) {
          return {
            ...section,
            dishes: section.dishes.map((dish) =>
              dish.id === cleanDish.id ? cleanDish : dish
            )
          };
        }

        return { ...section, dishes: [...section.dishes, cleanDish] };
      })
    }));

    closeDishEditor();
    setMessage('Dish updated.');
  }

  function exportDishReport(kind: 'spec' | 'recipe') {
    if (!dishDraft) return;

    const sectionName = selectedSection?.name || 'Menu section';
    const title =
      kind === 'spec'
        ? `${dishDraft.name || 'Dish'} spec sheet`
        : `${dishDraft.name || 'Dish'} recipe costing`;
    const html =
      kind === 'spec'
        ? buildDishSpecReportHtml({
            client: reportClient,
            menuRecord: reportMenuRecord,
            dish: dishDraft,
            sectionName,
            preparedBy: 'Jason Wardill / The Final Check'
          })
        : buildRecipeCostingReportHtml({
            client: reportClient,
            menuRecord: reportMenuRecord,
            dish: dishDraft,
            sectionName,
            preparedBy: 'Jason Wardill / The Final Check'
          });

    openPdfDocument(title, html);
    setMessage(`${kind === 'spec' ? 'Dish spec' : 'Recipe costing'} export opened.`);
  }

  async function createDishReportShare(kind: 'spec' | 'recipe') {
    if (!dishDraft) return;

    const sectionName = selectedSection?.name || 'Menu section';
    const title =
      kind === 'spec'
        ? `${dishDraft.name || 'Dish'} spec sheet`
        : `${dishDraft.name || 'Dish'} recipe costing`;
    const html =
      kind === 'spec'
        ? buildDishSpecReportHtml({
            client: reportClient,
            menuRecord: reportMenuRecord,
            dish: dishDraft,
            sectionName,
            preparedBy: 'Jason Wardill / The Final Check'
          })
        : buildRecipeCostingReportHtml({
            client: reportClient,
            menuRecord: reportMenuRecord,
            dish: dishDraft,
            sectionName,
            preparedBy: 'Jason Wardill / The Final Check'
          });

    try {
      setIsDishSharing(true);
      const share = await runWithActivity(
        {
          kicker: kind === 'spec' ? 'Dish spec' : 'Recipe costing',
          title: kind === 'spec' ? 'Creating dish spec link' : 'Creating recipe costing link',
          detail: 'Publishing a public link for this dish-level document.'
        },
        () =>
          kind === 'spec'
            ? createDishSpecShare(`dish-spec:${project.id || 'draft'}:${dishDraft.id}`, title, html)
            : createRecipeCostingShare(
                `recipe-costing:${project.id || 'draft'}:${dishDraft.id}`,
                title,
                html
              ),
        700
      );

      setDishShareUrl(share.url);
      try {
        await navigator.clipboard.writeText(share.url);
        setMessage(`${kind === 'spec' ? 'Dish spec' : 'Recipe costing'} link created and copied.`);
      } catch {
        setMessage(`${kind === 'spec' ? 'Dish spec' : 'Recipe costing'} link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the dish share link.');
    } finally {
      setIsDishSharing(false);
    }
  }

  async function copyDishShareLink() {
    if (!dishShareUrl) return;

    try {
      await navigator.clipboard.writeText(dishShareUrl);
      setMessage('Dish share link copied to clipboard.');
    } catch {
      setMessage('Copy failed. You can still copy the dish link manually.');
    }
  }

  function deleteDish(dishId: string) {
    if (!selectedSection || !window.confirm('Delete this dish?')) return;

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSection.id
          ? { ...section, dishes: section.dishes.filter((dish) => dish.id !== dishId) }
          : section
      )
    }));
  }

  function updateDishInline(
    sectionId: string,
    dishId: string,
    field: keyof MenuDish,
    value: number
  ) {
    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              dishes: section.dishes.map((dish) =>
                dish.id === dishId ? syncDishLinkedRecords({ ...dish, [field]: value }) : dish
              )
            }
          : section
      )
    }));
  }

  useEffect(() => {
    if (!queryDishId) return;

    const matchedSection = project.sections.find((section) =>
      section.dishes.some((dish) => dish.id === queryDishId)
    );
    if (!matchedSection) return;

    const matchedDish = matchedSection.dishes.find((dish) => dish.id === queryDishId);
    if (!matchedDish) return;

    const requestedTab: DishEditorTab =
      queryDishTab === 'recipe' || queryDishTab === 'spec' || queryDishTab === 'allergens' || queryDishTab === 'images'
        ? queryDishTab
        : 'overview';
    const nextKey = `${project.id || 'draft'}:${queryDishId}:${requestedTab}`;
    if (openedLinkedDishRef.current === nextKey) return;
    openedLinkedDishRef.current = nextKey;

    setProject((current) =>
      current.selectedSectionId === matchedSection.id
        ? current
        : { ...current, selectedSectionId: matchedSection.id }
    );
    setEditingDishId(matchedDish.id);
    setDishEditorTab(requestedTab);
    setDishDraft(normalizeDish(JSON.parse(JSON.stringify(matchedDish)) as MenuDish));
  }, [project.id, project.sections, queryDishId, queryDishTab]);

  async function handleSaveProject() {
    try {
      setSaving(true);
      await runWithActivity(
        {
          kicker: 'Refining menu',
          title: 'Saving profit engine',
          detail: 'Storing the latest menu margins and refreshing the saved project list.'
        },
        async () => {
          const saved = await saveMenuProject(project);
          setProject({
            ...normalizeMenuProject(saved.data),
            id: saved.id,
            clientId: saved.client_id ?? saved.data.clientId ?? null,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at
          });
          setMessage('Menu saved.');
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save project.');
    } finally {
      setSaving(false);
    }
  }

  function newProject() {
    const activeClientId = queryClientId || null;
    clearDraft(MENU_BUILDER_DRAFT_KEY);
    setProject(normalizeMenuProject(createDefaultMenu(activeClientId)));
    setMessage('New menu started.');
  }

  function exportPdf() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building menu PDF',
        detail: 'Formatting the menu profit engine into a clean client-ready report.'
      },
      async () => {
        openPdfDocument(
          `${safe(project.menuName || 'Menu Builder Report')} report`,
          reportHtml
        );
      },
      700
    );
  }

  async function handleShareReport() {
    try {
      setIsSharing(true);
      setShareUrl('');
      const share = await runWithActivity(
        {
          kicker: 'Opening pass',
          title: 'Creating share link',
          detail: 'Publishing a public link for this menu profit engine report.'
        },
        () => createMenuShare(project),
        900
      );
      setShareUrl(share.url);

      try {
        await navigator.clipboard.writeText(share.url);
        setMessage('Menu share link created and copied to clipboard.');
      } catch {
        setMessage(`Menu share link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  function loadFromJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((content) => {
        const parsed = JSON.parse(content) as MenuProjectState;
        setProject({
          ...normalizeMenuProject(parsed),
          clientId: parsed.clientId ?? queryClientId ?? null
        });
        setMessage('Menu JSON loaded.');
      })
      .catch(() => setMessage('Could not read the selected JSON file.'));

    event.target.value = '';
  }

  return (
    <div className="page-stack menu-page">
      <PageIntro
        eyebrow="Menu Profit Engine"
        title="Turn dish costing into weekly profit recovery"
        description="Quantify dish-level profit, expose weak margins, and show where pricing, cost, or portion correction can recover cash each week."
        actions={
          <>
            <button className="button button-secondary" onClick={newProject}>
              New menu
            </button>
            <button
              className="button button-primary"
              disabled={saving}
              onClick={handleSaveProject}
            >
              {saving ? 'Saving...' : 'Save profit engine'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={handleShareReport}>
              {isSharing ? 'Creating link...' : 'Create share link'}
            </button>
            <label className="button button-secondary inline-file-button">
              Load JSON
              <input accept="application/json" hidden type="file" onChange={loadFromJson} />
            </label>
          </>
        }
      />

      <section className="panel share-link-panel">
        <div className="panel-body stack gap-12">
          <div className="record-header-message">
            <span className="soft-pill">{message}</span>
            {shareUrl ? <span className="soft-pill">Share link ready</span> : null}
          </div>
          {shareUrl ? (
            <div className="share-link-row">
              <input className="input" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setMessage('Menu share link copied to clipboard.');
                  } catch {
                    setMessage('Copy failed. You can still copy the link manually.');
                  }
                }}
                type="button"
              >
                Copy link
              </button>
              <a className="button button-primary" href={shareUrl} rel="noreferrer" target="_blank">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Weighted actual GP"
          value={fmtPercent(weightedGp)}
          hint="Across all dishes by weekly sales volume"
        />
        <StatCard
          label="Weekly menu revenue"
          value={fmtCurrency(totalRevenue)}
          hint="Sell price × weekly volume"
        />
        <StatCard
          label="Weekly menu profit"
          value={fmtCurrency(totalProfit)}
          hint="Commercial contribution view"
        />
        <StatCard
          label="Menu is losing"
          value={fmtCurrency(menuSummary.totalOpportunity)}
          hint={`${menuSummary.belowTargetCount} dishes are below target GP`}
        />
      </section>

      <MenuBuilderWorkspaceSection
        availableClientSites={availableClientSites}
        clients={clients}
        menuSummary={menuSummary}
        onAddSection={addSection}
        onClientSelection={handleClientSelection}
        onClientSiteSelection={handleClientSiteSelection}
        onDeleteDish={deleteDish}
        onDeleteSection={deleteSection}
        onOpenDishEditor={openDishEditor}
        onRenameSection={renameSection}
        onSectionNameDraftChange={setSectionNameDraft}
        onUpdateDishInline={updateDishInline}
        onUpdateProject={updateProject}
        project={project}
        riskDishCount={riskDishCount}
        sectionNameDraft={sectionNameDraft}
        selectedSection={selectedSection}
        selectedSectionSummary={selectedSectionSummary}
        strongDishCount={strongDishCount}
        watchDishCount={watchDishCount}
        weightedGp={weightedGp}
      />

      <MenuDishEditorModal
        dishDraft={dishDraft}
        dishEditorTab={dishEditorTab}
        dishShareUrl={dishShareUrl}
        editingDishId={editingDishId}
        isDishSharing={isDishSharing}
        onAddDishImages={addDishImages}
        onAddIngredient={addIngredient}
        onClose={closeDishEditor}
        onCopyDishShareLink={copyDishShareLink}
        onCreateDishReportShare={(kind) => {
          void createDishReportShare(kind);
        }}
        onExportDishReport={exportDishReport}
        onRemoveDishImage={removeDishImage}
        onRemoveIngredient={removeIngredient}
        onSaveDish={saveDish}
        onSetDishEditorTab={setDishEditorTab}
        onSetPrimaryDishImage={setPrimaryDishImage}
        onToggleDietaryTag={toggleDietaryTag}
        onUpdateDish={updateDish}
        onUpdateIngredient={updateIngredient}
        onUpdateRecipeCosting={updateRecipeCosting}
        onUpdateSpecSheet={updateSpecSheet}
        open={Boolean(dishDraft)}
      />

      <ControlPanelModal
        bodyRef={controlDrawerBodyRef}
        onClose={() => setControlModalOpen(false)}
        open={controlModalOpen}
        title="Menu Profit Controls"
      >
        <MenuBuilderControlsPanel
          completion={completion}
          dishCount={allDishes.length}
          insights={insights}
          riskDishCount={riskDishCount}
          sectionCount={project.sections.length}
          strongDishCount={strongDishCount}
          totalOpportunity={menuSummary.totalOpportunity}
          totalProfit={totalProfit}
          totalRevenue={totalRevenue}
          watchDishCount={watchDishCount}
          weightedGp={weightedGp}
        />
      </ControlPanelModal>

      <div className="page-floating-controls">
        <button className="button button-primary control-dock-button" onClick={() => setControlModalOpen(true)}>
          Menu Controls
        </button>
      </div>

    </div>
  );
}
