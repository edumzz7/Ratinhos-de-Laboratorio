import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  Crown,
  Flag,
  Gauge,
  Link as LinkIcon,
  Lock,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';
import {
  approveGroupMember,
  getGroupPageData,
  rejectGroupMember,
  requestGroupEntry,
  suggestGroupMovie,
  advanceGroupMovieGoal,
  updateGroupScoringRules,
} from '../../lib/appData';
import { searchMovies, type TMDBMovie } from '../../lib/tmdb';
import type { Group, GroupGoal, GroupMember, GroupPageData, RankedUser } from '../../types/app';

interface GroupPageProps {
  groupId: string;
  currentUserId: string;
  users: RankedUser[];
  onBack: () => void;
}

const labelClass = 'text-[10px] uppercase tracking-[0.2em] text-brand-text-muted';

function getUserName(users: RankedUser[], userId: string) {
  return users.find((user) => user.id === userId)?.username || 'usuario removido';
}

function entryLabel(group: Group) {
  if (group.entry_permission === 'open') return 'Entrada livre';
  if (group.entry_permission === 'approval') return 'Solicita entrada';
  return 'Somente por convite';
}

function goalLabel(goal: GroupGoal) {
  if (goal.type === 'watch_movies') return `Assistir ${goal.target_count || 0} filmes sugeridos pelos integrantes`;
  if (goal.type === 'finish_season') return `Finalizar temporada ${goal.season_number || 1} de ${goal.target_label || goal.target_id || 'serie'}`;
  return `Finalizar ${goal.target_label || goal.target_id || 'serie'}`;
}

function statusLabel(member: GroupMember) {
  if (member.status === 'active') return 'Ativo';
  if (member.status === 'pending') return 'Aguardando aprovacao';
  return 'Convidado';
}

function GroupHeader({ group, onBack }: { group: Group; onBack: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const url = `${window.location.origin}/group/${group.id}`;

  const copyLink = async () => {
    await navigator.clipboard?.writeText(url);
    setMessage('Link copiado.');
    window.setTimeout(() => setMessage(null), 1800);
  };

  return (
    <div className="space-y-5 border-b border-white/10 pb-7">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-text-muted hover:text-brand-gold">
        <ArrowLeft size={15} /> Voltar para grupos
      </button>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-brand-gold-alt">
            <span>{group.mode === 'competitive' ? 'Competitivo' : 'Casual'}</span>
            <span className="text-white/20">/</span>
            <span>{group.theme === 'none' ? 'N/I' : group.theme}</span>
            <span className="text-white/20">/</span>
            <span className="inline-flex items-center gap-1">{group.privacy === 'private' ? <Lock size={12} /> : <Users size={12} />}{group.privacy === 'private' ? 'Privado' : 'Publico'}</span>
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-light tracking-wide break-words">{group.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-brand-text-muted">{group.description || 'Este grupo ainda nao tem descricao.'}</p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-2 rounded-xl border border-brand-gold/40 px-4 py-2.5 text-xs uppercase tracking-wider text-brand-gold hover:bg-brand-gold/10"><LinkIcon size={14} /> Compartilhar grupo</button>
          {message ? <span className="text-xs text-brand-gold"><Check size={13} className="inline mr-1" />{message}</span> : null}
          <span className="font-mono text-[10px] text-brand-text-muted break-all">/group/{group.id}</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ group, members }: { group: Group; members: GroupMember[] }) {
  const activeCount = members.filter((member) => member.status === 'active').length;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-white/10 p-4"><p className={labelClass}>Entrada</p><p className="mt-2">{entryLabel(group)}</p></div>
      <div className="rounded-2xl border border-white/10 p-4"><p className={labelClass}>Participantes</p><p className="mt-2">{activeCount}/{group.max_members}</p></div>
      <div className="rounded-2xl border border-white/10 p-4"><p className={labelClass}>Checks diarios</p><p className="mt-2">{group.scoring_rules.daily_limit || 'Sem limite'}{group.scoring_rules.daily_limit ? ' por pessoa' : ''}</p></div>
      <div className="rounded-2xl border border-white/10 p-4"><p className={labelClass}>Resenha</p><p className="mt-2">{group.scoring_rules.review_required ? 'Obrigatoria' : 'Opcional'}</p></div>
    </div>
  );
}

function GoalSection({ data, users, currentUserId, onSuggest, onAdvance }: { data: GroupPageData; users: RankedUser[]; currentUserId: string; onSuggest: (movie: TMDBMovie) => void; onAdvance: (count: number) => void }) {
  if (data.group.goals.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#333] p-6 text-sm text-brand-text-muted">Nenhuma meta foi definida para este grupo.</div>;
  }

  return (
    <div className="space-y-3">
      {data.group.goals.map((goal) => (
        <div key={goal.id} className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.04] p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex gap-3"><Flag size={17} className="mt-0.5 text-brand-gold" /><div><p className="font-light">{goalLabel(goal)}</p><p className="mt-1 text-xs text-brand-text-muted">{goal.target_id ? `TMDB: ${goal.target_id}` : 'Meta livre'}</p></div></div>
            {goal.deadline ? <span className="inline-flex items-center gap-1 text-xs text-brand-text-muted"><CalendarDays size={13} /> {goal.deadline}</span> : <span className="text-xs text-brand-text-muted">Sem deadline</span>}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {data.members.filter((member) => member.status === 'active').map((member) => {
              const progress = data.goal_progress.find((item) => item.goal_id === goal.id && item.user_id === member.user_id);
              return <div key={`${goal.id}-${member.user_id}`} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs"><span>{getUserName(users, member.user_id)}</span><span className={progress?.completed ? 'text-brand-gold' : 'text-brand-text-muted'}>{progress?.current || 0}/{progress?.target || 1}{progress?.completed ? ' concluida' : ''}</span></div>;
            })}
          </div>
          {goal.type === 'watch_movies' && !goal.completed_at && data.movie_suggestions.filter((item) => item.goal_id === goal.id).length ? <div className="mt-4 border-t border-white/10 pt-3"><p className={labelClass}>Filmes sugeridos</p><div className="mt-2 flex flex-wrap gap-2">{data.movie_suggestions.filter((item) => item.goal_id === goal.id).map((item) => <span key={item.id} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs">{item.media_title} <span className="text-brand-text-muted">por @{getUserName(users, item.suggested_by)}</span></span>)}</div></div> : null}
        </div>
      ))}
      <MovieSuggestionBox data={data} currentUserId={currentUserId} onSuggest={onSuggest} onAdvance={onAdvance} />
    </div>
  );
}

function MovieSuggestionBox({ data, currentUserId, onSuggest, onAdvance }: { data: GroupPageData; currentUserId: string; onSuggest: (movie: TMDBMovie) => void; onAdvance: (count: number) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const activeGoal = data.group.goals.find((goal) => goal.type === 'watch_movies' && !goal.completed_at);
  if (!activeGoal || !data.current_membership || data.current_membership.status !== 'active') return null;
  const isAdmin = data.group.admin_ids.includes(currentUserId);
  const allComplete = data.members.filter((member) => member.status === 'active').every((member) => data.goal_progress.some((progress) => progress.goal_id === activeGoal.id && progress.user_id === member.user_id && progress.completed));
  return <div className="rounded-2xl border border-white/10 p-4"><p className={labelClass}>Sugerir filme para esta meta</p><div className="mt-2 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-[#292929] bg-black/30 px-3 py-2.5 text-sm outline-none" value={query} onChange={async (event) => { const value = event.target.value; setQuery(value); setResults(value.trim().length >= 2 ? await searchMovies(value) : []); }} placeholder="Buscar filme no TMDB" /></div>{results.length ? <div className="mt-2 space-y-1">{results.slice(0, 5).map((movie) => <button type="button" key={movie.id} onClick={() => { onSuggest(movie); setQuery(''); setResults([]); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-gold/10">{movie.title}</button>)}</div> : null}{isAdmin && allComplete ? <div className="mt-4 flex items-center gap-2"><input id="next-goal-count" className="w-24 rounded-xl border border-[#292929] bg-black/30 px-3 py-2 text-sm" type="number" min="1" defaultValue={activeGoal.target_count || 1} /><button type="button" onClick={() => onAdvance(Number((document.getElementById('next-goal-count') as HTMLInputElement).value))} className="rounded-xl bg-brand-gold px-3 py-2 text-xs font-medium uppercase text-black">Criar meta 2</button></div> : null}</div>;
}

function MembersSection({ data, users, currentUserId, onApprove, onReject }: {
  data: GroupPageData;
  users: RankedUser[];
  currentUserId: string;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}) {
  const isAdmin = data.group.admin_ids.includes(currentUserId);
  const scoreMap = useMemo(() => new Map(data.scores.map((score) => [score.user_id, score])), [data.scores]);
  const firstGoal = data.group.goals[0];

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4"><div className="flex items-center gap-2"><Users size={17} className="text-brand-gold" /><h2 className="text-sm uppercase tracking-[0.2em]">Participantes</h2></div><span className="text-xs text-brand-text-muted">{data.members.length} registros</span></div>
      <div className="divide-y divide-white/5">
        {data.members.map((member) => {
          const score = scoreMap.get(member.user_id);
          const progress = firstGoal ? data.goal_progress.find((item) => item.goal_id === firstGoal.id && item.user_id === member.user_id) : null;
          const isOwner = data.group.owner_id === member.user_id;
          return (
            <div key={member.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-4">
              <div className="flex items-center gap-3 min-w-0"><div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold/30 text-brand-gold">{isOwner ? <Crown size={15} /> : <UserCheck size={15} />}</div><div className="min-w-0"><p className="truncate text-sm">@{getUserName(users, member.user_id)} {isOwner ? <span className="ml-1 text-[10px] uppercase tracking-wider text-brand-gold">dono</span> : member.role === 'admin' ? <span className="ml-1 text-[10px] uppercase tracking-wider text-brand-gold-alt">admin</span> : null}</p><p className="mt-1 text-xs text-brand-text-muted">{statusLabel(member)}</p></div></div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-brand-text-muted"><span>{score?.points || 0} pts</span><span>{score?.checks || 0} checks</span>{firstGoal ? <span>Meta: {progress?.current || 0}/{progress?.target || 1}</span> : null}{isAdmin && member.status === 'pending' ? <><button type="button" onClick={() => onApprove(member.user_id)} className="inline-flex items-center gap-1 rounded-lg border border-brand-gold/40 px-2.5 py-1.5 text-brand-gold hover:bg-brand-gold/10"><Check size={13} /> Aceitar</button><button type="button" onClick={() => onReject(member.user_id)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-red-300 hover:bg-red-500/10"><UserX size={13} /> Recusar</button></> : null}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupPage({ groupId, currentUserId, users, onBack }: GroupPageProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const pageQuery = useQuery({ queryKey: ['group-page', groupId], queryFn: () => getGroupPageData(groupId) });
  const requestMutation = useMutation({
    mutationFn: () => requestGroupEntry(groupId),
    onSuccess: (status) => {
      setMessage(status === 'active' ? 'Voce entrou no grupo.' : 'Solicitacao enviada para os administradores.');
      void queryClient.invalidateQueries({ queryKey: ['group-page', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel solicitar entrada.'),
  });
  const memberMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'approve' | 'reject' }) => action === 'approve' ? approveGroupMember(groupId, userId) : rejectGroupMember(groupId, userId),
    onSuccess: (_data, variables) => {
      setMessage(variables.action === 'approve' ? 'Participante aceito.' : 'Solicitacao recusada.');
      void queryClient.invalidateQueries({ queryKey: ['group-page', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel atualizar a solicitacao.'),
  });
  const suggestMutation = useMutation({ mutationFn: (movie: TMDBMovie) => suggestGroupMovie(groupId, String(movie.id), movie.title, movie.poster_path), onSuccess: () => { setMessage('Filme sugerido para o grupo.'); void queryClient.invalidateQueries({ queryKey: ['group-page', groupId] }); }, onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel sugerir o filme.') });
  const advanceMutation = useMutation({ mutationFn: (count: number) => advanceGroupMovieGoal(groupId, count), onSuccess: () => { setMessage('Meta atualizada.'); void queryClient.invalidateQueries({ queryKey: ['group-page', groupId] }); }, onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel criar a proxima meta.') });
  const scoringMutation = useMutation({ mutationFn: (policy: 'valid' | 'invalid' | 'partial') => updateGroupScoringRules(groupId, { rewatch_policy: policy, allow_rewatch: policy !== 'invalid' }), onSuccess: () => { setMessage('Regra de rewatch atualizada.'); void queryClient.invalidateQueries({ queryKey: ['group-page', groupId] }); }, onError: (cause) => setMessage(cause instanceof Error ? cause.message : 'Nao foi possivel atualizar a regra.') });

  if (pageQuery.isLoading) return <div className="py-20 text-center text-brand-text-muted">Carregando grupo...</div>;
  if (pageQuery.isError || !pageQuery.data) return <div className="space-y-5 py-10"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-brand-gold"><ArrowLeft size={15} /> Voltar</button><div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{pageQuery.error instanceof Error ? pageQuery.error.message : 'Grupo nao encontrado.'}</div></div>;

  const data = pageQuery.data;
  const membership = data.current_membership;
  const isAdmin = data.group.admin_ids.includes(currentUserId);
  const canRequest = !membership && data.members.filter((member) => member.status === 'active').length < data.group.max_members;

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <GroupHeader group={data.group} onBack={onBack} />
      {message ? <div className="flex items-center gap-2 rounded-xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm text-brand-gold"><Check size={15} /> {message}</div> : null}
      {canRequest ? <button type="button" onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-black disabled:opacity-50"><UserPlus size={15} /> {data.group.entry_permission === 'open' ? 'Entrar no grupo' : 'Solicitar entrada'}</button> : null}
      {membership?.status === 'pending' ? <div className="rounded-xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm text-brand-gold">Sua solicitacao esta aguardando aprovacao de um administrador.</div> : null}
      {membership?.status === 'active' ? <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-200">Voce participa deste grupo.</div> : null}
      {!membership && !canRequest ? <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">Este grupo esta cheio.</div> : null}

      <SummaryCards group={data.group} members={data.members} />
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="space-y-3"><div className="flex items-center gap-2 text-brand-gold"><Flag size={17} /><h2 className="text-sm uppercase tracking-[0.2em]">Metas do grupo</h2></div><GoalSection data={data} users={users} currentUserId={currentUserId} onSuggest={(movie) => suggestMutation.mutate(movie)} onAdvance={(count) => advanceMutation.mutate(count)} /></section>
        <section className="space-y-3"><div className="flex items-center gap-2 text-brand-gold"><Gauge size={17} /><h2 className="text-sm uppercase tracking-[0.2em]">Configuracao</h2></div><div className="rounded-2xl border border-white/10 p-5 space-y-4 text-sm"><div className="flex justify-between items-center gap-4"><span className="text-brand-text-muted">Rewatch</span>{isAdmin ? <select className="rounded-lg border border-white/10 bg-black px-2 py-1 text-xs" value={data.group.scoring_rules.rewatch_policy || (data.group.scoring_rules.allow_rewatch ? 'valid' : 'invalid')} onChange={(event) => scoringMutation.mutate(event.target.value as 'valid' | 'invalid' | 'partial')}><option value="invalid">Invalido</option><option value="valid">Valido</option><option value="partial">Parcial (50%)</option></select> : <span>{data.group.scoring_rules.rewatch_policy || (data.group.scoring_rules.allow_rewatch ? 'Valido' : 'Invalido')}</span>}</div><div className="flex justify-between gap-4"><span className="text-brand-text-muted">Administradores</span><span className="text-right">{data.group.admin_ids.map((id) => `@${getUserName(users, id)}`).join(', ')}</span></div><div className="flex justify-between gap-4"><span className="text-brand-text-muted">Convite</span><button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/group/${data.group.id}`)} className="inline-flex items-center gap-1 text-brand-gold"><Copy size={13} /> Copiar URL</button></div></div></section>
      </div>
      <MembersSection data={data} users={users} currentUserId={currentUserId} onApprove={(userId) => memberMutation.mutate({ userId, action: 'approve' })} onReject={(userId) => memberMutation.mutate({ userId, action: 'reject' })} />
      {isAdmin && data.members.some((member) => member.status === 'pending') ? <p className="text-xs text-brand-text-muted">Os pedidos pendentes tambem aparecem na Atividade e levam diretamente para esta pagina.</p> : null}
    </div>
  );
}
