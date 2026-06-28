import React, { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeDollarSign,
  BookOpen,
  Crown,
  History,
  Home,
  LogOut,
  Menu,
  Package,
  Pencil,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  HashRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

type PurchaseUnit = 'g' | 'kg' | 'ml' | 'l' | 'un';
type YieldUnit = 'un' | 'fatia' | 'pote' | 'kg';
type PlanType = 'free' | 'premium';
type EntityType = 'ingredient' | 'recipe' | 'pricing' | 'simulation' | 'settings' | 'plan';

type AppUser = {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  password: string;
};

type Ingredient = {
  id: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
  purchasePrice: number;
  supplier: string;
  notes: string;
  unitCost: number;
  createdAt: string;
};

type RecipeItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  unitUsed: PurchaseUnit;
  unitCostSnapshot: number;
  totalCost: number;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  yieldQuantity: number;
  yieldUnit: YieldUnit;
  preparationNotes: string;
  totalIngredientCost: number;
  items: RecipeItem[];
  createdAt: string;
};

type PricingRule = {
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  lossPercent: number;
  marginPercent: number;
};

type PricingSnapshot = PricingRule & {
  id: string;
  recipeId: string;
  recipeName: string;
  ingredientCost: number;
  suggestedSalePrice: number;
  expectedProfit: number;
  createdAt: string;
};

type ProfitSimulation = {
  id: string;
  recipeId: string;
  recipeName: string;
  salePrice: number;
  quantitySold: number;
  unitCost: number;
  grossRevenue: number;
  totalCost: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  createdAt: string;
};

type ActivityLog = {
  id: string;
  entityType: EntityType;
  action: 'created' | 'updated';
  description: string;
  createdAt: string;
};

type AppSettings = {
  currency: string;
  defaultWeightUnit: 'g' | 'kg';
  defaultVolumeUnit: 'ml' | 'l';
  notificationsEnabled: boolean;
};

type AppState = {
  plan: PlanType;
  ingredients: Ingredient[];
  recipes: Recipe[];
  pricingRule: PricingRule;
  pricingSnapshots: PricingSnapshot[];
  simulations: ProfitSimulation[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
};

const USERS_KEY = 'dda_users';
const SESSION_KEY = 'dda_session_email';
const SUPABASE_READY = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);

const number = (value: string) => Number(value.replace(',', '.')) || 0;

function toBaseUnit(quantity: number, unit: PurchaseUnit) {
  if (unit === 'kg') return quantity * 1000;
  if (unit === 'l') return quantity * 1000;
  return quantity;
}

function convertToIngredientBase(quantity: number, unit: PurchaseUnit) {
  return toBaseUnit(quantity, unit);
}

function calcUnitCost(purchasePrice: number, purchaseQuantity: number, purchaseUnit: PurchaseUnit) {
  const baseQuantity = toBaseUnit(purchaseQuantity, purchaseUnit);
  return baseQuantity > 0 ? purchasePrice / baseQuantity : 0;
}

function createDefaultState(): AppState {
  const seedIngredients: Ingredient[] = [
    {
      id: uid(),
      name: 'Açúcar refinado',
      category: 'Açúcar',
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      purchasePrice: 6.9,
      supplier: 'Mercado local',
      notes: 'Pacote padrão de 1kg',
      unitCost: calcUnitCost(6.9, 1, 'kg'),
      createdAt: now(),
    },
    {
      id: uid(),
      name: 'Chocolate 50%',
      category: 'Chocolate',
      purchaseQuantity: 1,
      purchaseUnit: 'kg',
      purchasePrice: 29.9,
      supplier: 'Atacadão dos doces',
      notes: 'Uso em brownies e brigadeiros',
      unitCost: calcUnitCost(29.9, 1, 'kg'),
      createdAt: now(),
    },
    {
      id: uid(),
      name: 'Leite condensado',
      category: 'Laticínios',
      purchaseQuantity: 1,
      purchaseUnit: 'un',
      purchasePrice: 7.5,
      supplier: 'Distribuidora doce',
      notes: 'Lata/unidade',
      unitCost: calcUnitCost(7.5, 1, 'un'),
      createdAt: now(),
    },
  ];

  const brownieItems: RecipeItem[] = [
    {
      id: uid(),
      ingredientId: seedIngredients[0].id,
      ingredientName: seedIngredients[0].name,
      quantityUsed: 180,
      unitUsed: 'g',
      unitCostSnapshot: seedIngredients[0].unitCost,
      totalCost: 180 * seedIngredients[0].unitCost,
    },
    {
      id: uid(),
      ingredientId: seedIngredients[1].id,
      ingredientName: seedIngredients[1].name,
      quantityUsed: 250,
      unitUsed: 'g',
      unitCostSnapshot: seedIngredients[1].unitCost,
      totalCost: 250 * seedIngredients[1].unitCost,
    },
    {
      id: uid(),
      ingredientId: seedIngredients[2].id,
      ingredientName: seedIngredients[2].name,
      quantityUsed: 2,
      unitUsed: 'un',
      unitCostSnapshot: seedIngredients[2].unitCost,
      totalCost: 2 * seedIngredients[2].unitCost,
    },
  ];

  const seedRecipe: Recipe = {
    id: uid(),
    name: 'Brownie premium',
    category: 'Brownie',
    yieldQuantity: 12,
    yieldUnit: 'un',
    preparationNotes: 'Receita exemplo para você testar o fluxo completo.',
    totalIngredientCost: brownieItems.reduce((sum, item) => sum + item.totalCost, 0),
    items: brownieItems,
    createdAt: now(),
  };

  return {
    plan: 'free',
    ingredients: seedIngredients,
    recipes: [seedRecipe],
    pricingRule: {
      laborCost: 5,
      overheadCost: 2,
      packagingCost: 1.5,
      lossPercent: 5,
      marginPercent: 40,
    },
    pricingSnapshots: [],
    simulations: [],
    activityLogs: [
      {
        id: uid(),
        entityType: 'recipe',
        action: 'created',
        description: 'Receita de exemplo criada para testes.',
        createdAt: now(),
      },
    ],
    settings: {
      currency: 'BRL',
      defaultWeightUnit: 'g',
      defaultVolumeUnit: 'ml',
      notificationsEnabled: true,
    },
  };
}

function loadUsers(): AppUser[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function stateKey(email: string) {
  return `dda_state_${email.toLowerCase()}`;
}

function loadState(email: string): AppState {
  const saved = localStorage.getItem(stateKey(email));
  if (!saved) {
    const initial = createDefaultState();
    localStorage.setItem(stateKey(email), JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(saved);
}

function saveState(email: string, state: AppState) {
  localStorage.setItem(stateKey(email), JSON.stringify(state));
}

function createLog(entityType: EntityType, action: 'created' | 'updated', description: string): ActivityLog {
  return { id: uid(), entityType, action, description, createdAt: now() };
}

function calcPricing(recipe: Recipe | undefined, rule: PricingRule) {
  const ingredientCost = recipe?.totalIngredientCost || 0;
  const base = ingredientCost + rule.laborCost + rule.overheadCost + rule.packagingCost;
  const withLoss = base * (1 + rule.lossPercent / 100);
  const suggested = rule.marginPercent >= 100 ? 0 : withLoss / (1 - rule.marginPercent / 100);
  const profit = suggested - withLoss;
  return { ingredientCost, withLoss, suggested, profit };
}

function recomputeRecipe(recipe: Recipe, ingredients: Ingredient[]) {
  const items = recipe.items.map((item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    const unitCostSnapshot = ingredient?.unitCost ?? item.unitCostSnapshot;
    const ingredientName = ingredient?.name ?? item.ingredientName;
    const totalCost = convertToIngredientBase(item.quantityUsed, item.unitUsed) * unitCostSnapshot;
    return {
      ...item,
      ingredientName,
      unitCostSnapshot,
      totalCost,
    };
  });

  return {
    ...recipe,
    items,
    totalIngredientCost: items.reduce((sum, item) => sum + item.totalCost, 0),
  };
}

type AppShellProps = {
  user: AppUser;
  state: AppState;
  onLogout: () => void;
  updateState: (updater: (current: AppState) => AppState) => void;
  updateUser: (updater: (current: AppUser) => AppUser) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="metric-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function AppLayout({ user, state, onLogout, updateState, updateUser }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    ['/', 'Dashboard', Home],
    ['/ingredientes', 'Ingredientes', Package],
    ['/receitas', 'Receitas', BookOpen],
    ['/precificacao', 'Precificação', BadgeDollarSign],
    ['/simulador', 'Simulador', TrendingUp],
    ['/historico', 'Histórico', History],
    ['/premium', 'Premium', Crown],
    ['/configuracoes', 'Configurações', Settings],
  ] as const;
  const footerItems = navItems.slice(1, 5);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div>
            <p className="eyebrow">Dai de Açúcar</p>
            <h1>Gestão doce</h1>
          </div>
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="profile-chip">
          <div className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.fullName}</strong>
            <span>{user.businessName || 'Sua confeitaria'}</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-box">
            <span className={`status-dot ${SUPABASE_READY ? 'ok' : ''}`} />
            <div>
              <strong>{SUPABASE_READY ? 'Supabase configurado' : 'Modo demonstração ativo'}</strong>
              <small>{SUPABASE_READY ? 'Pronto para produção na Vercel.' : 'Teste completo local com LocalStorage.'}</small>
            </div>
          </div>
          <button className="ghost danger" onClick={onLogout}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)}>
            <Menu size={18} />
          </button>
          <div>
            <p className="eyebrow">App PWA pronto para Vercel</p>
            <h2>{user.businessName || 'Minha confeitaria'}</h2>
          </div>
          <div className="topbar-actions">
            <div className="plan-pill">
              <Sparkles size={14} /> Plano {state.plan === 'premium' ? 'Premium' : 'Free'}
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<DashboardPage user={user} state={state} />} />
          <Route path="/ingredientes" element={<IngredientsPage state={state} updateState={updateState} />} />
          <Route path="/receitas" element={<RecipesPage state={state} updateState={updateState} />} />
          <Route path="/precificacao" element={<PricingPage state={state} updateState={updateState} />} />
          <Route path="/simulador" element={<SimulatorPage state={state} updateState={updateState} />} />
          <Route path="/historico" element={<HistoryPage state={state} />} />
          <Route path="/premium" element={<PremiumPage state={state} updateState={updateState} />} />
          <Route path="/configuracoes" element={<SettingsPage user={user} state={state} updateState={updateState} updateUser={updateUser} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <nav className="mobile-footer-shortcuts">
          {footerItems.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `footer-shortcut ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}

function DashboardPage({ user, state }: { user: AppUser; state: AppState }) {
  const latestPricing = state.pricingSnapshots[0];
  const latestSimulation = state.simulations[0];
  return (
    <section className="page-grid">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Olá, {user.fullName.split(' ')[0]} 👋</p>
          <h3>Seu centro de controle de custos e lucro</h3>
          <p>
            Aqui você cadastra ingredientes, monta receitas, calcula preço ideal e testa cenários de lucro sem depender de planilhas.
          </p>
        </div>
        <div className="hero-badges">
          <span>Supabase + Vercel</span>
          <span>PWA instalável</span>
          <span>Modo demo para testes</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard title="Ingredientes" value={String(state.ingredients.length)} hint="base de custos cadastrada" />
        <MetricCard title="Receitas" value={String(state.recipes.length)} hint="fichas técnicas criadas" />
        <MetricCard title="Última precificação" value={latestPricing ? currency(latestPricing.suggestedSalePrice) : '—'} hint="preço sugerido mais recente" />
        <MetricCard title="Último lucro estimado" value={latestSimulation ? currency(latestSimulation.estimatedProfit) : '—'} hint="simulação mais recente" />
      </div>

      <div className="two-columns dashboard-summary-grid">
        <div className="card desktop-quick-shortcuts">
          <div className="card-head">
            <h4>Atalhos rápidos</h4>
          </div>
          <div className="quick-links">
            <NavLink to="/ingredientes" className="quick-link">Cadastrar ingrediente</NavLink>
            <NavLink to="/receitas" className="quick-link">Cadastrar receita</NavLink>
            <NavLink to="/precificacao" className="quick-link">Precificar receita</NavLink>
            <NavLink to="/simulador" className="quick-link">Simular lucro</NavLink>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h4>Status do projeto</h4>
          </div>
          <ul className="timeline compact">
            <li>✅ Frontend concluído</li>
            <li>✅ Estrutura pronta para Supabase</li>
            <li>✅ Controle de plano free/premium</li>
            <li>✅ Precificação e simulador funcionando</li>
            <li>✅ Histórico e configurações</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h4>Atividades recentes</h4>
        </div>
        <ul className="timeline">
          {state.activityLogs.slice(0, 6).map((log) => (
            <li key={log.id}>
              <strong>{log.description}</strong>
              <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function IngredientsPage({ state, updateState }: { state: AppState; updateState: AppShellProps['updateState'] }) {
  const emptyForm = {
    id: '',
    name: '',
    category: '',
    purchaseQuantity: '1',
    purchaseUnit: 'kg' as PurchaseUnit,
    purchasePrice: '',
    supplier: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const editingIngredientId = form.id;

  function resetForm() {
    setForm(emptyForm);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ingredient: Ingredient = {
      id: editingIngredientId || uid(),
      name: form.name,
      category: form.category,
      purchaseQuantity: number(form.purchaseQuantity),
      purchaseUnit: form.purchaseUnit,
      purchasePrice: number(form.purchasePrice),
      supplier: form.supplier,
      notes: form.notes,
      unitCost: calcUnitCost(number(form.purchasePrice), number(form.purchaseQuantity), form.purchaseUnit),
      createdAt: editingIngredientId ? state.ingredients.find((entry) => entry.id === editingIngredientId)?.createdAt || now() : now(),
    };

    updateState((current) => {
      const ingredients = editingIngredientId
        ? current.ingredients.map((entry) => (entry.id === editingIngredientId ? ingredient : entry))
        : [ingredient, ...current.ingredients];
      const recipes = current.recipes.map((recipe) => recomputeRecipe(recipe, ingredients));
      return {
        ...current,
        ingredients,
        recipes,
        activityLogs: [
          createLog('ingredient', editingIngredientId ? 'updated' : 'created', `Ingrediente ${ingredient.name} ${editingIngredientId ? 'atualizado' : 'cadastrado'}.`),
          ...current.activityLogs,
        ],
      };
    });

    resetForm();
  }

  function startEdit(ingredient: Ingredient) {
    setForm({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      purchaseQuantity: String(ingredient.purchaseQuantity),
      purchaseUnit: ingredient.purchaseUnit,
      purchasePrice: String(ingredient.purchasePrice),
      supplier: ingredient.supplier,
      notes: ingredient.notes,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeIngredient(ingredient: Ingredient) {
    const isUsed = state.recipes.some((recipe) => recipe.items.some((item) => item.ingredientId === ingredient.id));
    if (isUsed) {
      window.alert('Esse ingrediente está em uma receita cadastrada. Edite ou exclua a receita antes de remover o ingrediente.');
      return;
    }
    const confirmed = window.confirm(`Deseja excluir o ingrediente ${ingredient.name}?`);
    if (!confirmed) return;
    updateState((current) => ({
      ...current,
      ingredients: current.ingredients.filter((entry) => entry.id !== ingredient.id),
      activityLogs: [createLog('ingredient', 'updated', `Ingrediente ${ingredient.name} excluído.`), ...current.activityLogs],
    }));
    if (editingIngredientId === ingredient.id) resetForm();
  }

  return (
    <section className="page-grid two-columns-layout">
      <div className="card">
        <div className="card-head">
          <h4>{editingIngredientId ? 'Editar ingrediente' : 'Novo ingrediente'}</h4>
          {editingIngredientId && <button className="ghost small-button" type="button" onClick={resetForm}>Cancelar edição</button>}
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Categoria"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></Field>
          <Field label="Quantidade comprada"><input type="number" step="0.001" value={form.purchaseQuantity} onChange={(e) => setForm({ ...form, purchaseQuantity: e.target.value })} required /></Field>
          <Field label="Unidade">
            <select value={form.purchaseUnit} onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value as PurchaseUnit })}>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="un">un</option>
            </select>
          </Field>
          <Field label="Preço pago"><input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} required /></Field>
          <Field label="Fornecedor"><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
          <Field label="Observações"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} /></Field>
          <button className="primary" type="submit">{editingIngredientId ? 'Salvar alterações' : 'Salvar ingrediente'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h4>Ingredientes cadastrados</h4>
          <span>{state.ingredients.length} itens</span>
        </div>
        <div className="stack-list">
          {state.ingredients.map((ingredient) => (
            <article key={ingredient.id} className="list-card">
              <div>
                <strong>{ingredient.name}</strong>
                <p>{ingredient.category} • {ingredient.supplier || 'Sem fornecedor'}</p>
              </div>
              <div className="aligned-right">
                <strong>{currency(ingredient.purchasePrice)}</strong>
                <small>
                  custo unitário: {currency(ingredient.unitCost)} / {ingredient.purchaseUnit === 'kg' ? 'g' : ingredient.purchaseUnit === 'l' ? 'ml' : ingredient.purchaseUnit}
                </small>
                <div className="row-actions">
                  <button className="ghost small-button" type="button" onClick={() => startEdit(ingredient)}><Pencil size={14} /> Editar</button>
                  <button className="ghost small-button danger-text" type="button" onClick={() => removeIngredient(ingredient)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecipesPage({ state, updateState }: { state: AppState; updateState: AppShellProps['updateState'] }) {
  const emptyForm = { id: '', name: '', category: '', yieldQuantity: '1', yieldUnit: 'un' as YieldUnit, preparationNotes: '' };
  const [form, setForm] = useState(emptyForm);
  const [itemDraft, setItemDraft] = useState({ ingredientId: '', quantityUsed: '1', unitUsed: 'g' as PurchaseUnit });
  const [items, setItems] = useState<RecipeItem[]>([]);
  const editingRecipeId = form.id;

  function resetForm() {
    setForm(emptyForm);
    setItems([]);
    setItemDraft({ ingredientId: '', quantityUsed: '1', unitUsed: 'g' });
  }

  function addItem() {
    const ingredient = state.ingredients.find((entry) => entry.id === itemDraft.ingredientId);
    if (!ingredient) return;
    const quantity = number(itemDraft.quantityUsed);
    const ingredientQty = convertToIngredientBase(quantity, itemDraft.unitUsed);
    const totalCost = ingredientQty * ingredient.unitCost;
    setItems((current) => [
      ...current,
      {
        id: uid(),
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantityUsed: quantity,
        unitUsed: itemDraft.unitUsed,
        unitCostSnapshot: ingredient.unitCost,
        totalCost,
      },
    ]);
    setItemDraft({ ingredientId: '', quantityUsed: '1', unitUsed: 'g' });
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function startEdit(recipe: Recipe) {
    setForm({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      yieldQuantity: String(recipe.yieldQuantity),
      yieldUnit: recipe.yieldUnit,
      preparationNotes: recipe.preparationNotes,
    });
    setItems(recipe.items.map((item) => ({ ...item })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeRecipe(recipe: Recipe) {
    const confirmed = window.confirm(`Deseja excluir a receita ${recipe.name}?`);
    if (!confirmed) return;
    updateState((current) => ({
      ...current,
      recipes: current.recipes.filter((entry) => entry.id !== recipe.id),
      pricingSnapshots: current.pricingSnapshots.filter((entry) => entry.recipeId !== recipe.id),
      simulations: current.simulations.filter((entry) => entry.recipeId !== recipe.id),
      activityLogs: [createLog('recipe', 'updated', `Receita ${recipe.name} excluída.`), ...current.activityLogs],
    }));
    if (editingRecipeId === recipe.id) resetForm();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    const recipe: Recipe = {
      id: editingRecipeId || uid(),
      name: form.name,
      category: form.category,
      yieldQuantity: number(form.yieldQuantity),
      yieldUnit: form.yieldUnit,
      preparationNotes: form.preparationNotes,
      totalIngredientCost: items.reduce((sum, item) => sum + item.totalCost, 0),
      items,
      createdAt: editingRecipeId ? state.recipes.find((entry) => entry.id === editingRecipeId)?.createdAt || now() : now(),
    };

    updateState((current) => ({
      ...current,
      recipes: editingRecipeId ? current.recipes.map((entry) => (entry.id === editingRecipeId ? recipe : entry)) : [recipe, ...current.recipes],
      pricingSnapshots: current.pricingSnapshots.map((entry) => (entry.recipeId === recipe.id ? { ...entry, recipeName: recipe.name, ingredientCost: recipe.totalIngredientCost } : entry)),
      simulations: current.simulations.map((entry) => (entry.recipeId === recipe.id ? { ...entry, recipeName: recipe.name } : entry)),
      activityLogs: [
        createLog('recipe', editingRecipeId ? 'updated' : 'created', `Receita ${recipe.name} ${editingRecipeId ? 'atualizada' : 'cadastrada'}.`),
        ...current.activityLogs,
      ],
    }));

    resetForm();
  }

  return (
    <section className="page-grid two-columns-layout">
      <div className="card">
        <div className="card-head">
          <h4>{editingRecipeId ? 'Editar receita' : 'Nova receita'}</h4>
          {editingRecipeId && <button className="ghost small-button" type="button" onClick={resetForm}>Cancelar edição</button>}
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Nome da receita"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Categoria"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></Field>
          <Field label="Rendimento"><input type="number" step="0.001" value={form.yieldQuantity} onChange={(e) => setForm({ ...form, yieldQuantity: e.target.value })} required /></Field>
          <Field label="Unidade do rendimento">
            <select value={form.yieldUnit} onChange={(e) => setForm({ ...form, yieldUnit: e.target.value as YieldUnit })}>
              <option value="un">unidade</option>
              <option value="fatia">fatia</option>
              <option value="pote">pote</option>
              <option value="kg">kg</option>
            </select>
          </Field>
          <Field label="Modo de preparo"><textarea rows={4} value={form.preparationNotes} onChange={(e) => setForm({ ...form, preparationNotes: e.target.value })} /></Field>

          <div className="sub-card">
            <h5>Ingredientes da receita</h5>
            <div className="inline-grid">
              <Field label="Ingrediente">
                <select value={itemDraft.ingredientId} onChange={(e) => setItemDraft({ ...itemDraft, ingredientId: e.target.value })}>
                  <option value="">Selecione</option>
                  {state.ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
                </select>
              </Field>
              <Field label="Quantidade usada"><input type="number" step="0.001" value={itemDraft.quantityUsed} onChange={(e) => setItemDraft({ ...itemDraft, quantityUsed: e.target.value })} /></Field>
              <Field label="Unidade">
                <select value={itemDraft.unitUsed} onChange={(e) => setItemDraft({ ...itemDraft, unitUsed: e.target.value as PurchaseUnit })}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="un">un</option>
                </select>
              </Field>
            </div>
            <button type="button" className="secondary" onClick={addItem}>Adicionar ingrediente</button>
            <div className="mini-table">
              {items.map((item) => (
                <div key={item.id} className="mini-row">
                  <span>{item.ingredientName}</span>
                  <span>{item.quantityUsed} {item.unitUsed}</span>
                  <div className="mini-row-actions">
                    <strong>{currency(item.totalCost)}</strong>
                    <button className="ghost small-button danger-text" type="button" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {!items.length && <p className="muted">Adicione ingredientes para montar a ficha técnica.</p>}
            </div>
          </div>
          <button className="primary" type="submit">{editingRecipeId ? 'Salvar alterações' : 'Salvar receita'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h4>Receitas cadastradas</h4>
        </div>
        <div className="stack-list">
          {state.recipes.map((recipe) => (
            <article key={recipe.id} className="list-card details-card">
              <div>
                <strong>{recipe.name}</strong>
                <p>{recipe.category} • rendimento {recipe.yieldQuantity} {recipe.yieldUnit}</p>
                <small>{recipe.items.length} ingredientes</small>
              </div>
              <div className="aligned-right">
                <strong>{currency(recipe.totalIngredientCost)}</strong>
                <small>custo dos ingredientes</small>
                <div className="row-actions">
                  <button className="ghost small-button" type="button" onClick={() => startEdit(recipe)}><Pencil size={14} /> Editar</button>
                  <button className="ghost small-button danger-text" type="button" onClick={() => removeRecipe(recipe)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPage({ state, updateState }: { state: AppState; updateState: AppShellProps['updateState'] }) {
  const [recipeId, setRecipeId] = useState(state.recipes[0]?.id || '');
  const [rule, setRule] = useState<PricingRule>(state.pricingRule);

  useEffect(() => setRule(state.pricingRule), [state.pricingRule]);
  const recipe = state.recipes.find((entry) => entry.id === recipeId) || state.recipes[0];
  const result = useMemo(() => calcPricing(recipe, rule), [recipe, rule]);

  function savePricing() {
    if (!recipe) return;
    const snapshot: PricingSnapshot = {
      id: uid(),
      recipeId: recipe.id,
      recipeName: recipe.name,
      ingredientCost: result.ingredientCost,
      suggestedSalePrice: result.suggested,
      expectedProfit: result.profit,
      createdAt: now(),
      ...rule,
    };
    updateState((current) => ({
      ...current,
      pricingRule: rule,
      pricingSnapshots: [snapshot, ...current.pricingSnapshots],
      activityLogs: [createLog('pricing', 'created', `Precificação salva para ${recipe.name}.`), ...current.activityLogs],
    }));
  }

  return (
    <section className="page-grid two-columns-layout">
      <div className="card">
        <div className="card-head">
          <h4>Precificação</h4>
        </div>
        <div className="form-grid">
          <Field label="Receita">
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {state.recipes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </Field>
          <Field label="Mão de obra"><input type="number" step="0.01" value={rule.laborCost} onChange={(e) => setRule({ ...rule, laborCost: number(e.target.value) })} /></Field>
          <Field label="Custos indiretos"><input type="number" step="0.01" value={rule.overheadCost} onChange={(e) => setRule({ ...rule, overheadCost: number(e.target.value) })} /></Field>
          <Field label="Embalagem"><input type="number" step="0.01" value={rule.packagingCost} onChange={(e) => setRule({ ...rule, packagingCost: number(e.target.value) })} /></Field>
          <Field label="Perdas (%)"><input type="number" step="0.01" value={rule.lossPercent} onChange={(e) => setRule({ ...rule, lossPercent: number(e.target.value) })} /></Field>
          <Field label="Margem desejada (%)"><input type="number" step="0.01" value={rule.marginPercent} onChange={(e) => setRule({ ...rule, marginPercent: number(e.target.value) })} /></Field>
        </div>
        <button className="primary" onClick={savePricing}>Salvar precificação</button>
      </div>

      <div className="card emphasis">
        <div className="card-head">
          <h4>Resultado</h4>
        </div>
        <div className="result-grid">
          <div><span>Custo ingredientes</span><strong>{currency(result.ingredientCost)}</strong></div>
          <div><span>Total com perdas</span><strong>{currency(result.withLoss)}</strong></div>
          <div><span>Preço sugerido</span><strong>{currency(result.suggested)}</strong></div>
          <div><span>Lucro estimado</span><strong>{currency(result.profit)}</strong></div>
        </div>
        <p className="muted">Fórmula: (ingredientes + mão de obra + indiretos + embalagem + perdas) aplicado sobre a margem desejada.</p>
      </div>
    </section>
  );
}

function SimulatorPage({ state, updateState }: { state: AppState; updateState: AppShellProps['updateState'] }) {
  const firstRecipe = state.recipes[0];
  const [recipeId, setRecipeId] = useState(firstRecipe?.id || '');
  const recipe = state.recipes.find((entry) => entry.id === recipeId) || firstRecipe;
  const latestPricing = state.pricingSnapshots.find((entry) => entry.recipeId === recipe?.id);
  const unitCost = latestPricing ? latestPricing.suggestedSalePrice - latestPricing.expectedProfit : (recipe?.totalIngredientCost || 0) + state.pricingRule.laborCost + state.pricingRule.overheadCost + state.pricingRule.packagingCost;
  const [salePrice, setSalePrice] = useState(latestPricing?.suggestedSalePrice || 0);
  const [quantitySold, setQuantitySold] = useState(50);

  useEffect(() => {
    setSalePrice(latestPricing?.suggestedSalePrice || 0);
  }, [latestPricing?.suggestedSalePrice, recipeId]);

  const grossRevenue = salePrice * quantitySold;
  const totalCost = unitCost * quantitySold;
  const estimatedProfit = grossRevenue - totalCost;
  const profitMarginPercent = grossRevenue > 0 ? (estimatedProfit / grossRevenue) * 100 : 0;

  function saveSimulation() {
    if (!recipe) return;
    const simulation: ProfitSimulation = {
      id: uid(),
      recipeId: recipe.id,
      recipeName: recipe.name,
      salePrice,
      quantitySold,
      unitCost,
      grossRevenue,
      totalCost,
      estimatedProfit,
      profitMarginPercent,
      createdAt: now(),
    };

    updateState((current) => ({
      ...current,
      simulations: [simulation, ...current.simulations],
      activityLogs: [createLog('simulation', 'created', `Simulação salva para ${recipe.name}.`), ...current.activityLogs],
    }));
  }

  return (
    <section className="page-grid two-columns-layout">
      <div className="card">
        <div className="card-head">
          <h4>Simulador de lucro</h4>
        </div>
        <div className="form-grid">
          <Field label="Receita">
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {state.recipes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </Field>
          <Field label="Preço de venda"><input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(number(e.target.value))} /></Field>
          <Field label="Quantidade vendida no mês"><input type="number" value={quantitySold} onChange={(e) => setQuantitySold(Number(e.target.value) || 0)} /></Field>
          <Field label="Custo unitário base"><input type="number" step="0.01" value={unitCost} readOnly /></Field>
        </div>
        <button className="primary" onClick={saveSimulation}>Salvar simulação</button>
      </div>

      <div className="card emphasis">
        <div className="card-head">
          <h4>Cenário calculado</h4>
        </div>
        <div className="result-grid">
          <div><span>Receita bruta</span><strong>{currency(grossRevenue)}</strong></div>
          <div><span>Custo total</span><strong>{currency(totalCost)}</strong></div>
          <div><span>Lucro estimado</span><strong>{currency(estimatedProfit)}</strong></div>
          <div><span>Margem real</span><strong>{profitMarginPercent.toFixed(1)}%</strong></div>
        </div>
      </div>
    </section>
  );
}

function HistoryPage({ state }: { state: AppState }) {
  return (
    <section className="page-grid">
      <div className="card">
        <div className="card-head">
          <h4>Histórico geral</h4>
          <span>{state.activityLogs.length} eventos</span>
        </div>
        <ul className="timeline full">
          {state.activityLogs.map((log) => (
            <li key={log.id}>
              <div>
                <strong>{log.description}</strong>
                <span>{log.entityType}</span>
              </div>
              <small>{new Date(log.createdAt).toLocaleString('pt-BR')}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PremiumPage({ state, updateState }: { state: AppState; updateState: AppShellProps['updateState'] }) {
  const premium = state.plan === 'premium';
  return (
    <section className="page-grid">
      <div className="hero-card premium-card">
        <div>
          <p className="eyebrow">Plano premium</p>
          <h3>{premium ? 'Seu plano premium está ativo' : 'Desbloqueie recursos avançados'}</h3>
          <p>Use esta tela para validar o fluxo de controle de plano. No deploy real, podemos integrar com um gateway de pagamento.</p>
        </div>
        <button className="primary" onClick={() => updateState((current) => ({
          ...current,
          plan: current.plan === 'premium' ? 'free' : 'premium',
          activityLogs: [createLog('plan', 'updated', `Plano alterado para ${current.plan === 'premium' ? 'free' : 'premium'}.`), ...current.activityLogs],
        }))}>
          {premium ? 'Voltar para Free' : 'Ativar Premium demo'}
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h4>Recursos previstos</h4>
        </div>
        <div className="quick-links">
          <div className="quick-link static">Mais receitas e ingredientes</div>
          <div className="quick-link static">Relatórios exportáveis</div>
          <div className="quick-link static">Histórico avançado</div>
          <div className="quick-link static">Cálculos salvos por período</div>
        </div>
      </div>
    </section>
  );
}

function SettingsPage({ user, state, updateState, updateUser }: { user: AppUser; state: AppState; updateState: AppShellProps['updateState']; updateUser: AppShellProps['updateUser'] }) {
  const [profile, setProfile] = useState({ fullName: user.fullName, businessName: user.businessName });
  const [settings, setSettings] = useState(state.settings);
  const [pricingRule, setPricingRule] = useState(state.pricingRule);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateUser((current) => ({ ...current, fullName: profile.fullName, businessName: profile.businessName }));
    updateState((current) => ({
      ...current,
      settings,
      pricingRule,
      activityLogs: [createLog('settings', 'updated', 'Configurações gerais atualizadas.'), ...current.activityLogs],
    }));
  }

  return (
    <section className="page-grid">
      <div className="card">
        <div className="card-head">
          <h4>Configurações</h4>
        </div>
        <form className="form-grid three-columns" onSubmit={handleSave}>
          <Field label="Nome"><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></Field>
          <Field label="Confeitaria"><input value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} /></Field>
          <Field label="Moeda"><input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></Field>
          <Field label="Unidade peso padrão">
            <select value={settings.defaultWeightUnit} onChange={(e) => setSettings({ ...settings, defaultWeightUnit: e.target.value as 'g' | 'kg' })}>
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </Field>
          <Field label="Unidade volume padrão">
            <select value={settings.defaultVolumeUnit} onChange={(e) => setSettings({ ...settings, defaultVolumeUnit: e.target.value as 'ml' | 'l' })}>
              <option value="ml">ml</option>
              <option value="l">l</option>
            </select>
          </Field>
          <Field label="Perdas padrão (%)"><input type="number" step="0.01" value={pricingRule.lossPercent} onChange={(e) => setPricingRule({ ...pricingRule, lossPercent: number(e.target.value) })} /></Field>
          <Field label="Margem padrão (%)"><input type="number" step="0.01" value={pricingRule.marginPercent} onChange={(e) => setPricingRule({ ...pricingRule, marginPercent: number(e.target.value) })} /></Field>
          <Field label="Mão de obra padrão"><input type="number" step="0.01" value={pricingRule.laborCost} onChange={(e) => setPricingRule({ ...pricingRule, laborCost: number(e.target.value) })} /></Field>
          <Field label="Custos indiretos padrão"><input type="number" step="0.01" value={pricingRule.overheadCost} onChange={(e) => setPricingRule({ ...pricingRule, overheadCost: number(e.target.value) })} /></Field>
          <Field label="Embalagem padrão"><input type="number" step="0.01" value={pricingRule.packagingCost} onChange={(e) => setPricingRule({ ...pricingRule, packagingCost: number(e.target.value) })} /></Field>
          <button className="primary" type="submit">Salvar configurações</button>
        </form>
      </div>
    </section>
  );
}

function AuthScreen({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (user: AppUser) => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', businessName: '', email: '', password: '' });
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const users = loadUsers();

    if (mode === 'register') {
      if (users.some((entry) => entry.email.toLowerCase() === form.email.toLowerCase())) {
        setError('Já existe uma conta com esse e-mail.');
        return;
      }
      const user: AppUser = { id: uid(), fullName: form.fullName, businessName: form.businessName, email: form.email, password: form.password };
      saveUsers([user, ...users]);
      saveState(user.email, createDefaultState());
      localStorage.setItem(SESSION_KEY, user.email);
      onAuth(user);
      return;
    }

    const found = users.find((entry) => entry.email.toLowerCase() === form.email.toLowerCase() && entry.password === form.password);
    if (!found) {
      setError('E-mail ou senha inválidos.');
      return;
    }
    localStorage.setItem(SESSION_KEY, found.email);
    onAuth(found);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Dai de Açúcar • gestão de receitas</p>
        <h2>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
        <p className="auth-copy">App demo funcional para testar fluxo, telas e navegação antes do deploy final na Vercel.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <Field label="Nome completo"><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
              <Field label="Nome da confeitaria"><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required /></Field>
            </>
          )}
          <Field label="E-mail"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Senha"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          {error && <div className="error-box">{error}</div>}
          <button className="primary" type="submit">{mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="ghost center" onClick={() => navigate(mode === 'login' ? '/cadastro' : '/login')}>
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
}

function InternalRouter() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return;
    const found = loadUsers().find((entry) => entry.email.toLowerCase() === session.toLowerCase());
    if (found) {
      setUser(found);
      setState(loadState(found.email));
    }
  }, []);

  function handleAuth(nextUser: AppUser) {
    setUser(nextUser);
    setState(loadState(nextUser.email));
  }

  function updateState(updater: (current: AppState) => AppState) {
    setState((current) => {
      if (!current || !user) return current;
      const next = updater(current);
      saveState(user.email, next);
      return next;
    });
  }

  function updateUser(updater: (current: AppUser) => AppUser) {
    setUser((current) => {
      if (!current) return current;
      const next = updater(current);
      const users = loadUsers().map((entry) => (entry.id === current.id ? next : entry));
      saveUsers(users);
      if (state) saveState(next.email, state);
      localStorage.setItem(SESSION_KEY, next.email);
      return next;
    });
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setState(null);
  }

  if (!user || !state) {
    return (
      <Routes>
        <Route path="/login" element={<AuthScreen mode="login" onAuth={handleAuth} />} />
        <Route path="/cadastro" element={<AuthScreen mode="register" onAuth={handleAuth} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <AppLayout user={user} state={state} onLogout={logout} updateState={updateState} updateUser={updateUser} />;
}

export default function App() {
  return (
    <HashRouter>
      <InternalRouter />
    </HashRouter>
  );
}
