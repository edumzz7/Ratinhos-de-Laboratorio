import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, Loader2, Search, Shuffle, Users, X } from 'lucide-react';
import clsx from 'clsx';
import { completeCineMatch, completeWatchParty, createCineMatch, createWatchParty, listCollaborations } from '../../lib/appData';
import { searchMovies, searchSeries, type TMDBMovie, type TMDBSeries } from '../../lib/tmdb';
import type { AppUser, CollaborationMediaType } from '../../types/app';

interface CineMatchModalProps {
  currentUserId: string;
  users: AppUser[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const inputClass = 'w-full rounded-xl border border-[#292929] bg-black/30 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-gold/70';

export default function CineMatchModal({ currentUserId, users, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CineMatchModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (value: boolean) => { setUncontrolledOpen(value); controlledOnOpenChange?.(value); };
  const [tab, setTab] = useState<'cine' | 'party'>('cine');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<CollaborationMediaType>('movie');
  const [media, setMedia] = useState<TMDBMovie | TMDBSeries | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<TMDBMovie | TMDBSeries>>([]);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [endDate, setEndDate] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collaborations, setCollaborations] = useState<Awaited<ReturnType<typeof listCollaborations>> | null>(null);
  const options = users.filter((user) => user.id !== currentUserId);
  useEffect(() => { if (open) void listCollaborations(currentUserId).then(setCollaborations); }, [open, currentUserId]);

  const search = async (value: string, type = mediaType) => {
    setQuery(value);
    if (value.trim().length < 2) return setResults([]);
    setResults(type === 'movie' ? await searchMovies(value) : await searchSeries(value));
  };
  const selectMediaType = (type: CollaborationMediaType) => { setMediaType(type); setMedia(null); setQuery(''); setResults([]); };
  const selectMedia = (item: TMDBMovie | TMDBSeries) => { setMedia(item); setQuery('title' in item ? item.title : item.name); setResults([]); };
  const toggleFriend = (id: string) => setSelectedFriends((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const saveCine = async () => {
    if (!media) return setMessage('Selecione um filme ou serie.');
    setSaving(true);
    try { await createCineMatch(currentUserId, selectedFriends, mediaType, String(media.id), 'title' in media ? media.title : media.name); setMessage('Cine-Match criado e amigos notificados.'); setCollaborations(await listCollaborations(currentUserId)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nao foi possivel criar o Cine-Match.'); } finally { setSaving(false); }
  };
  const saveParty = async () => {
    if (!media && !query.trim()) return setMessage('Informe o filme ou serie da Watchparty.');
    setSaving(true);
    try { await createWatchParty({ owner_id: currentUserId, participant_ids: Array.from(new Set([currentUserId, ...selectedFriends])), name, theme: theme || null, media_type: mediaType, media_id: media ? String(media.id) : null, media_title: media ? ('title' in media ? media.title : media.name) : query, end_date: new Date(endDate).toISOString(), privacy, linked_series_id: mediaType === 'series' && media ? String(media.id) : null, linked_series_title: mediaType === 'series' && media ? ('title' in media ? media.title : media.name) : null, series_goal: mediaType === 'series' && media ? `Concluir ${'title' in media ? media.title : media.name}` : null, series_goal_deadline: mediaType === 'series' ? new Date(endDate).toISOString() : null }); setMessage('Watchparty criada e participantes notificados.'); setCollaborations(await listCollaborations(currentUserId)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nao foi possivel criar a Watchparty.'); } finally { setSaving(false); }
  };

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    {controlledOpen === undefined ? <Dialog.Trigger asChild><button className="inline-flex items-center gap-2 rounded-lg border border-brand-gold/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-brand-gold"><Shuffle size={14} /> Cine-Match</button></Dialog.Trigger> : null}
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#222] bg-brand-bg p-6 shadow-lg">
      <Dialog.Title className="text-lg uppercase tracking-widest text-brand-gold">Cine Match</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm text-brand-text-muted">Crie uma sessão presencial ou uma sprint online.</Dialog.Description>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTab('cine')} className={clsx('rounded-lg border px-3 py-2 text-xs uppercase tracking-wider', tab === 'cine' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-white/10 text-brand-text-muted')}>Cine-Match</button><button type="button" onClick={() => setTab('party')} className={clsx('rounded-lg border px-3 py-2 text-xs uppercase tracking-wider', tab === 'party' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-white/10 text-brand-text-muted')}>Watchparty</button></div>
      <div className="mt-5 space-y-4">
        {tab === 'party' ? <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da Watchparty" /> : null}
        <div><p className="mb-2 text-[10px] uppercase tracking-widest text-brand-text-muted"><Users size={12} className="mr-1 inline" /> Participantes</p><div className="flex flex-wrap gap-2">{options.map((user) => <button type="button" key={user.id} onClick={() => toggleFriend(user.id)} className={clsx('rounded-lg border px-3 py-2 text-xs', selectedFriends.includes(user.id) ? 'border-brand-gold text-brand-gold' : 'border-white/10 text-brand-text-muted')}>{selectedFriends.includes(user.id) ? <Check size={12} className="mr-1 inline" /> : null}@{user.username}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><select className={inputClass} value={mediaType} onChange={(event) => selectMediaType(event.target.value as CollaborationMediaType)}><option value="movie">Filme</option><option value="series">Serie</option></select>{tab === 'party' ? <select className={inputClass} value={theme} onChange={(event) => setTheme(event.target.value)}><option value="">Tema manual</option><option>Oscar</option><option>Halloween</option><option>Natal</option><option>Maratona</option></select> : null}</div>
        <div className="relative"><Search size={15} className="absolute left-3 top-3 text-brand-text-muted" /><input className={`${inputClass} pl-9`} value={query} onChange={(event) => void search(event.target.value)} placeholder={tab === 'party' && theme ? 'Opcional: escolher mídia manualmente' : 'Buscar filme ou serie no TMDB'} />{results.length ? <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-[#0b0b0b] p-1">{results.slice(0, 6).map((item) => <button type="button" key={item.id} onClick={() => selectMedia(item)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-gold/10">{'title' in item ? item.title : item.name}</button>)}</div> : null}</div>
        {tab === 'party' ? <><input className={inputClass} type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} /><select className={inputClass} value={privacy} onChange={(event) => setPrivacy(event.target.value as 'private' | 'public')}><option value="private">Privada</option><option value="public">Publica</option></select></> : null}
        {collaborations ? <div className="space-y-2 border-t border-white/10 pt-4"><p className="text-[10px] uppercase tracking-widest text-brand-text-muted">Suas sessoes</p>{[...collaborations.cineMatches.map((item) => ({ ...item, kind: 'cine' as const })), ...collaborations.watchParties.map((item) => ({ ...item, kind: 'party' as const }))].slice(-5).reverse().map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs"><span className="min-w-0 truncate">{item.kind === 'party' ? item.name : item.media_title} <span className="text-brand-text-muted">({item.status === 'active' ? 'ativa' : item.status === 'completed' ? 'concluida' : 'falhou'})</span></span>{item.status === 'active' ? <button type="button" onClick={async () => { if (item.kind === 'cine') await completeCineMatch(item.id); else await completeWatchParty(item.id); setCollaborations(await listCollaborations(currentUserId)); setMessage('Sessao concluida.'); }} className="shrink-0 text-brand-gold">Concluir</button> : null}</div>)}</div> : null}
        {message ? <p className="rounded-lg border border-brand-gold/20 bg-brand-gold/5 px-3 py-2 text-sm text-brand-gold">{message}</p> : null}
        <button type="button" disabled={saving} onClick={() => void (tab === 'cine' ? saveCine() : saveParty())} className="w-full rounded-xl bg-brand-gold px-4 py-3 text-xs font-medium uppercase tracking-widest text-black disabled:opacity-50">{saving ? <Loader2 size={14} className="mx-auto animate-spin" /> : tab === 'cine' ? 'Criar Cine-Match' : 'Criar Watchparty'}</button>
      </div><Dialog.Close asChild><button className="absolute right-4 top-4 opacity-70 hover:text-brand-gold"><X size={16} /></button></Dialog.Close>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
