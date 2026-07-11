import { useDeferredValue, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  Copy,
  Flag,
  Gauge,
  Lock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ExternalLink,
  Trophy,
  Users,
} from 'lucide-react';
import {
  addGroupAdmin,
  createGroup,
  listGroupsForUser,
  listGroupGoalProgress,
  listGroupScores,
  resetLocalDatabase,
} from '../../lib/appData';
import { getTvDetails, searchSeries, type TMDBSeries } from '../../lib/tmdb';
import type {
  CreateGroupInput,
  Group,
  GroupGoalType,
  GroupTheme,
  GroupMode,
  GroupPrivacy,
  GroupEntryPermission,
  RankedUser,
} from '../../types/app';

interface GroupsScreenProps {
  currentUserId: string;
  users: RankedUser[];
}

const inputClass = 'w-full rounded-xl border border-[#292929] bg-black/30 px-3 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-gold/70';
const labelClass = 'text-[10px] uppercase tracking-[0.2em] text-brand-text-muted';

const emptyForm = {
  name: '',
  description: '',
  privacy: 'private' as GroupPrivacy,
  entry_permission: 'approval' as GroupEntryPermission,
  mode: 'casual' as GroupMode,
  max_members: '10',
  allow_rewatch: false,
  rewatch_policy: 'invalid' as 'valid' | 'invalid' | 'partial',
  daily_limit: '',
  review_required: false,
  goal_type: '' as GroupGoalType | '',
  goal_target_id: '',
  goal_target_label: '',
  goal_season: '1',
  goal_count: '',
  goal_deadline: '',
  theme: 'none' as GroupTheme,
};

function formatGoal(group: Group) {
  const goal = group.goals[0];
  if (!goal) return 'Nenhuma meta definida';
  if (goal.type === 'watch_movies') return `Assistir ${goal.target_count} filmes`;
  if (goal.type === 'finish_season') return `Finalizar temporada ${goal.season_number || 1} de ${goal.target_label || goal.target_id || 'serie selecionada'}`;
  return `Finalizar ${goal.target_label || goal.target_id || 'serie selecionada'}`;
}

function groupThemeLabel(theme: GroupTheme) {
  return {
    oscar: 'Oscar',
    halloween: 'Halloween',
    christmas: 'Natal',
    marathon: 'Maratona',
    none: 'N/I',
  }[theme];
}

function GroupForm({
  currentUserId,
  onCancel,
  onCreated,
}: {
  currentUserId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [goalSearch, setGoalSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<TMDBSeries | null>(null);
  const deferredGoalSearch = useDeferredValue(goalSearch);
  const seriesSearchQuery = useQuery({
    queryKey: ['group-goal-series-search', deferredGoalSearch],
    queryFn: () => searchSeries(deferredGoalSearch),
    enabled: Boolean(form.goal_type && deferredGoalSearch.trim().length >= 2 && !selectedSeries),
    staleTime: 1000 * 60 * 5,
  });
  const seasonDetailsQuery = useQuery({
    queryKey: ['group-goal-series-details', selectedSeries?.id],
    queryFn: () => getTvDetails(selectedSeries!.id),
    enabled: form.goal_type === 'finish_season' && Boolean(selectedSeries?.id),
    staleTime: 1000 * 60 * 10,
  });
  const mutation = useMutation({
    mutationFn: () => {
      if ((form.goal_type === 'finish_series' || form.goal_type === 'finish_season') && !selectedSeries) {
        throw new Error('Selecione uma serie encontrada pelo TMDB para a meta.');
      }
      if (form.goal_type === 'finish_season' && !form.goal_season) {
        throw new Error('Selecione a temporada da meta.');
      }
      const goal = form.goal_type
        ? [{
            id: crypto.randomUUID(),
            type: form.goal_type,
            target_id: selectedSeries ? String(selectedSeries.id) : null,
            target_label: selectedSeries?.name || null,
            target_count: form.goal_type === 'watch_movies' ? Number(form.goal_count) : null,
            season_number: form.goal_type === 'finish_season' ? Number(form.goal_season) : null,
            deadline: form.goal_deadline || null,
          }]
        : [];

      const input: CreateGroupInput = {
        name: form.name,
        description: form.description,
        privacy: form.privacy,
        entry_permission: form.entry_permission,
        mode: form.mode,
        max_members: Number(form.max_members),
        scoring_rules: {
          allow_rewatch: form.allow_rewatch,
          rewatch_policy: form.rewatch_policy,
          daily_limit: form.daily_limit ? Number(form.daily_limit) : null,
          review_required: form.review_required,
        },
        owner_id: currentUserId,
        admin_ids: [currentUserId],
        goals: goal,
        theme: form.theme,
      };
      return createGroup(input);
    },
    onSuccess: () => {
      onCreated();
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : 'Nao foi possivel criar o grupo.');
    },
  });

  const update = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const handleGoalTypeChange = (value: GroupGoalType | '') => {
    update('goal_type', value);
    setGoalSearch('');
    setSelectedSeries(null);
    update('goal_target_id', '');
    update('goal_target_label', '');
    update('goal_season', '1');
  };

  const handleSelectSeries = (series: TMDBSeries) => {
    setSelectedSeries(series);
    setGoalSearch(series.name);
    update('goal_target_id', String(series.id));
    update('goal_target_label', series.name);
    update('goal_season', '1');
  };

  const clearSelectedSeries = () => {
    setSelectedSeries(null);
    setGoalSearch('');
    update('goal_target_id', '');
    update('goal_target_label', '');
  };

  return (
    <section className="rounded-3xl border border-brand-gold/25 bg-brand-gold/[0.04] p-5 sm:p-7 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold">Novo grupo</p>
          <h2 className="mt-2 text-2xl font-light tracking-wide">Crie a regra da disputa</h2>
        </div>
        <button type="button" onClick={onCancel} className="text-xs uppercase tracking-widest text-brand-text-muted hover:text-brand-text">Fechar</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <label className="space-y-2">
          <span className={labelClass}>Nome</span>
          <input className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Clube do Oscar" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Tema</span>
          <select className={inputClass} value={form.theme} onChange={(event) => update('theme', event.target.value as GroupTheme)}>
            <option value="none">N/I</option>
            <option value="oscar">Oscar</option>
            <option value="halloween">Halloween</option>
            <option value="christmas">Natal</option>
            <option value="marathon">Maratona</option>
          </select>
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className={labelClass}>Descricao</span>
          <textarea className={`${inputClass} min-h-24 resize-y`} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Qual e a proposta deste grupo?" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 border-t border-white/10 pt-5">
        <label className="space-y-2">
          <span className={labelClass}>Privacidade</span>
          <select className={inputClass} value={form.privacy} onChange={(event) => update('privacy', event.target.value as GroupPrivacy)}>
            <option value="private">Privado</option>
            <option value="public">Publico</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Entrada</span>
          <select className={inputClass} value={form.entry_permission} onChange={(event) => update('entry_permission', event.target.value as GroupEntryPermission)}>
            <option value="open">Entrada livre</option>
            <option value="approval">Solicita entrada</option>
            <option value="invite_only">Somente convite</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Modo</span>
          <select className={inputClass} value={form.mode} onChange={(event) => update('mode', event.target.value as GroupMode)}>
            <option value="casual">Casual</option>
            <option value="competitive">Competitivo</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Maximo de participantes</span>
          <input className={`${inputClass} h-11`} type="number" min="1" max="50" value={form.max_members} onChange={(event) => update('max_members', event.target.value)} />
        </label>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-brand-gold-alt"><Gauge size={16} /><span className={labelClass}>Regras de pontuacao</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Rewatch no grupo</span>
            <select className={`${inputClass} h-11`} value={form.rewatch_policy} onChange={(event) => update('rewatch_policy', event.target.value as typeof form.rewatch_policy)}>
              <option value="invalid">Invalido</option>
              <option value="valid">Valido</option>
              <option value="partial">Parcial (50%)</option>
            </select>
          </label>
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Limite de checks diarios</span>
            <input className={`${inputClass} h-11`} type="number" min="1" value={form.daily_limit} onChange={(event) => update('daily_limit', event.target.value)} placeholder="Sem limite" />
          </label>
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Resenha</span>
            <span className="flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border border-[#292929] px-3 text-sm cursor-pointer">
              <input type="checkbox" checked={form.review_required} onChange={(event) => update('review_required', event.target.checked)} />
              <span className="truncate">Exigir resenha</span>
            </span>
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-brand-text-muted">O limite vale por participante dentro deste grupo. Os checks continuam validos no ranking geral e nos outros grupos.</p>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-brand-gold-alt"><Flag size={16} /><span className={labelClass}>Meta inicial</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <select className={`${inputClass} h-11`} value={form.goal_type} onChange={(event) => handleGoalTypeChange(event.target.value as GroupGoalType | '')}>
            <option value="">Sem meta</option>
            <option value="finish_season">Finalizar temporada</option>
            <option value="finish_series">Finalizar serie</option>
            <option value="watch_movies">Assistir filmes</option>
          </select>
          {form.goal_type === 'watch_movies' ? (
            <input className={`${inputClass} h-11`} type="number" min="1" value={form.goal_count} onChange={(event) => update('goal_count', event.target.value)} placeholder="Quantidade" />
          ) : form.goal_type ? (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-brand-text-muted" />
              <input className={`${inputClass} h-11 pl-9 pr-9`} value={goalSearch} readOnly={Boolean(selectedSeries)} onChange={(event) => { setGoalSearch(event.target.value); setSelectedSeries(null); update('goal_target_id', ''); update('goal_target_label', ''); }} placeholder="Buscar serie no TMDB" />
              {selectedSeries ? <button type="button" onClick={clearSelectedSeries} className="absolute right-3 top-2.5 text-sm text-brand-text-muted hover:text-brand-text">x</button> : null}
              {!selectedSeries && seriesSearchQuery.isFetching ? <Loader2 size={15} className="absolute right-3 top-3 animate-spin text-brand-gold" /> : null}
              {!selectedSeries && goalSearch.trim().length >= 2 && seriesSearchQuery.data?.length ? (
                <div className="absolute left-0 right-0 top-12 z-20 max-h-56 overflow-y-auto rounded-xl border border-[#292929] bg-[#0a0f1e] shadow-2xl">
                  {seriesSearchQuery.data.slice(0, 6).map((series) => (
                    <button type="button" key={series.id} onClick={() => handleSelectSeries(series)} className="flex w-full items-center gap-3 border-b border-white/5 p-2 text-left hover:bg-white/5">
                      {series.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${series.poster_path}`} alt="" className="h-10 w-7 rounded object-cover" /> : <div className="h-10 w-7 rounded border border-white/10" />}
                      <span className="min-w-0"><strong className="block truncate text-sm font-normal">{series.name}</strong><small className="text-brand-text-muted">{series.first_air_date?.slice(0, 4) || 'N/D'} | TMDB {series.id}</small></span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : <div />}
          {form.goal_type === 'finish_season' && selectedSeries ? (
            <select className={`${inputClass} h-11`} value={form.goal_season} onChange={(event) => update('goal_season', event.target.value)} disabled={seasonDetailsQuery.isLoading}>
              {(seasonDetailsQuery.data?.seasons || []).filter((season) => season.season_number > 0).map((season) => <option key={season.season_number} value={season.season_number}>Temporada {season.season_number}</option>)}
            </select>
          ) : <div />}
          <label className="relative">
            <span className={`${labelClass} mb-2 block`}>Deadline</span>
            <CalendarDays size={15} className="absolute left-3 top-9 text-brand-text-muted" />
            <input className={`${inputClass} h-11 pl-9`} type="date" value={form.goal_deadline} onChange={(event) => update('goal_deadline', event.target.value)} />
          </label>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#333] px-4 py-2 text-xs uppercase tracking-widest text-brand-text-muted hover:text-brand-text">Cancelar</button>
        <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-2 text-xs font-medium uppercase tracking-widest text-black disabled:opacity-50">
          <Plus size={15} /> {mutation.isPending ? 'Salvando' : 'Criar grupo'}
        </button>
      </div>
    </section>
  );
}

function GroupCard({
  group,
  currentUserId,
  users,
  onAdminAdded,
}: {
  group: Group;
  currentUserId: string;
  users: RankedUser[];
  onAdminAdded: (groupId: string, userId: string) => void;
}) {
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [, setLocation] = useLocation();
  const isAdmin = group.admin_ids.includes(currentUserId);
  const availableAdmins = users.filter((user) => !group.admin_ids.includes(user.id));
  const adminNames = group.admin_ids.map((id) => users.find((user) => user.id === id)?.username || 'usuario removido');
  const scoresQuery = useQuery({
    queryKey: ['group-scores', group.id],
    queryFn: () => listGroupScores(group.id),
  });
  const goalProgressQuery = useQuery({
    queryKey: ['group-goal-progress', group.id],
    queryFn: () => listGroupGoalProgress(group.id),
  });
  const currentScore = scoresQuery.data?.find((score) => score.user_id === currentUserId);
  const firstGoal = group.goals[0];
  const currentGoalProgress = firstGoal
    ? goalProgressQuery.data?.find((item) => item.goal_id === firstGoal.id && item.user_id === currentUserId)
    : null;

  return (
    <article className="rounded-3xl border border-[#242424] bg-[#0a0f1e]/80 p-5 sm:p-6 space-y-5 transition hover:border-brand-gold/30">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-brand-gold-alt">
            <span>{group.mode === 'competitive' ? 'Competitivo' : 'Casual'}</span>
            <span className="text-white/20">/</span>
            <span>{groupThemeLabel(group.theme)}</span>
          </div>
          <h3 className="mt-2 text-2xl font-light tracking-wide truncate">{group.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-text-muted">{group.description || 'Sem descricao.'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand-text-muted shrink-0">
          {group.privacy === 'private' ? <Lock size={14} /> : <Users size={14} />}
          {group.privacy === 'private' ? 'Privado' : 'Publico'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 p-3"><p className={labelClass}>Entrada</p><p className="mt-2">{group.entry_permission === 'open' ? 'Livre' : group.entry_permission === 'approval' ? 'Com aprovacao' : 'Por convite'}</p></div>
        <div className="rounded-2xl border border-white/10 p-3"><p className={labelClass}>Meta</p><p className="mt-2">{formatGoal(group)}</p>{firstGoal ? <p className="mt-1 text-xs text-brand-gold-alt">Seu progresso: {currentGoalProgress?.current || 0}/{currentGoalProgress?.target || 1}</p> : null}</div>
        <div className="rounded-2xl border border-white/10 p-3"><p className={labelClass}>Regra</p><p className="mt-2">{group.scoring_rules.daily_limit ? `${group.scoring_rules.daily_limit} check/dia` : 'Sem limite'}{group.scoring_rules.review_required ? ' + resenha' : ''}</p></div>
        <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.04] p-3"><p className={labelClass}>Sua pontuacao</p><p className="mt-2 text-brand-gold">{currentScore?.points || 0} pts / {currentScore?.checks || 0} checks</p></div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-brand-text-muted">Limite: {group.max_members} participantes</span>
          <button type="button" onClick={() => setLocation(`/group/${group.id}`)} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-brand-gold hover:text-brand-text"><ExternalLink size={13} /> Abrir grupo</button>
        </div>
        <div className="flex items-center gap-2 text-sm"><Shield size={15} className="text-brand-gold-alt" /><span>Admins: {adminNames.join(', ')}</span></div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-brand-text-muted">
          <span className="font-mono tracking-wider">/group/{group.id}</span>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/group/${group.id}`)} className="inline-flex items-center gap-1 w-fit hover:text-brand-gold"><Copy size={13} /> Copiar link</button>
        </div>
        {isAdmin && availableAdmins.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:max-w-md">
            <select className={inputClass} value={selectedAdmin} onChange={(event) => setSelectedAdmin(event.target.value)}>
              <option value="">Adicionar admin...</option>
              {availableAdmins.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
            </select>
            <button type="button" disabled={!selectedAdmin} onClick={() => { onAdminAdded(group.id, selectedAdmin); setSelectedAdmin(''); }} className="rounded-xl border border-brand-gold/40 px-3 py-2 text-xs uppercase tracking-wider text-brand-gold disabled:opacity-40">Adicionar</button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function GroupsScreen({ currentUserId, users }: GroupsScreenProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const groupsQuery = useQuery({
    queryKey: ['groups', currentUserId],
    queryFn: () => listGroupsForUser(currentUserId),
  });
  const adminMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => addGroupAdmin(groupId, userId),
    onSuccess: () => {
      setMessage('Administrador adicionado.');
      void queryClient.invalidateQueries({ queryKey: ['groups', currentUserId] });
    },
    onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel adicionar o administrador.'),
  });

  const groups = groupsQuery.data || [];
  const handleReset = () => {
    if (!window.confirm('Isso apaga usuarios, filmes, series e grupos deste navegador. Continuar?')) return;
    resetLocalDatabase();
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 text-brand-gold"><Trophy size={18} /><span className="text-xs uppercase tracking-[0.25em]">Competicoes</span></div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-light tracking-wide">Grupos</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-text-muted">Crie espacos com regras proprias para acompanhar pontuacao, metas e entrada de participantes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-text-muted">{groups.length}/2 grupos no plano local</span>
          <button type="button" onClick={() => { setShowForm((value) => !value); setMessage(null); }} className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-black"><Plus size={16} /> Novo grupo</button>
        </div>
      </div>

      {showForm ? <GroupForm currentUserId={currentUserId} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); setMessage('Grupo criado.'); void queryClient.invalidateQueries({ queryKey: ['groups', currentUserId] }); }} /> : null}
      {message ? <div className="flex items-center gap-2 rounded-xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm text-brand-gold"><Check size={15} /> {message}</div> : null}

      {groupsQuery.isLoading ? <div className="py-16 text-center text-brand-text-muted">Carregando grupos...</div> : groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#333] p-10 text-center"><Users size={28} className="mx-auto text-brand-gold-alt" /><p className="mt-4 text-lg font-light">Voce ainda nao participa de nenhum grupo.</p><p className="mt-2 text-sm text-brand-text-muted">Comece criando o primeiro e defina as regras da disputa.</p></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{groups.map((group) => <GroupCard key={group.id} group={group} currentUserId={currentUserId} users={users} onAdminAdded={(groupId, userId) => adminMutation.mutate({ groupId, userId })} />)}</div>
      )}

      {import.meta.env.DEV ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-brand-text-muted">
          <div><p className="uppercase tracking-[0.18em]">Banco local de testes</p><p className="mt-1">Os dados ficam neste navegador e podem ser apagados a qualquer momento.</p></div>
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 w-fit rounded-xl border border-red-500/30 px-3 py-2 uppercase tracking-wider text-red-300 hover:bg-red-500/10"><RotateCcw size={14} /> Resetar dados locais</button>
        </div>
      ) : null}
    </div>
  );
}
