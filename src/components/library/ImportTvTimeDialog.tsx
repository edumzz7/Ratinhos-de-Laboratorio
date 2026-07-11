import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Loader2, Upload, X } from 'lucide-react';
import { usePersonalMoviesQuery } from '../../hooks/usePersonalMovies';
import { useSeriesQuery } from '../../hooks/useSeries';
import { useTvTimeImport } from '../../hooks/useTvTimeImport';
import { readTvTimeImportFile, type TVTimeImportReport } from '../../lib/tvTimeImport';

interface ImportTvTimeDialogProps {
  userId: string;
}

export default function ImportTvTimeDialog({ userId }: ImportTvTimeDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moviesQuery = usePersonalMoviesQuery(userId);
  const seriesQuery = useSeriesQuery(userId);
  const importMutation = useTvTimeImport(userId);
  const [open, setOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<TVTimeImportReport | null>(null);

  const resetState = () => {
    setSelectedFileName('');
    setSubmitError(null);
    setReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setSubmitError('Selecione o arquivo CSV ou ZIP exportado do TV Time.');
      return;
    }

    setSubmitError(null);
    setReport(null);

    try {
      const input = await readTvTimeImportFile(file);
      const result = await importMutation.mutateAsync({
        csvInputs: input.csvInputs,
        existingMovies: moviesQuery.data ?? [],
        existingSeries: seriesQuery.data ?? [],
      });
      setReport({
        ...result,
        parseWarnings: Array.from(new Set([...input.warnings, ...result.parseWarnings])),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao importar o arquivo do TV Time.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border border-[#222] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-brand-gold-alt transition-colors hover:border-brand-gold hover:text-brand-gold">
          <Download size={14} />
          Importar TV Time
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-xl border border-[#222] bg-brand-bg p-6 shadow-lg">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-lg font-light tracking-wider text-brand-gold">
              IMPORTAR TV TIME
            </Dialog.Title>
            <Dialog.Description className="text-sm font-light leading-relaxed text-brand-text-muted">
              Envie o ZIP completo ou o arquivo <span className="text-brand-text">tracking-prod-records-v2.csv</span>.
              No ZIP, o sistema combina o historico principal com registros auxiliares de episodios para importar
              filmes, series e animes com mais fidelidade.
            </Dialog.Description>
          </div>

          <div className="rounded-xl border border-dashed border-[#333] bg-[#0a0f1e] p-5">
            <label
              htmlFor="tv-time-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2a] text-brand-gold-alt">
                <Upload size={20} />
              </span>
              <span className="text-sm font-light text-brand-text">
                {selectedFileName || 'Selecionar arquivo .zip ou .csv'}
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-brand-text-muted">
                Historico recomendado: tracking-prod-records-v2.csv
              </span>
            </label>
            <input
              id="tv-time-file"
              ref={fileInputRef}
              type="file"
              accept=".zip,.csv,application/zip,application/x-zip-compressed,text/csv"
              className="hidden"
              onChange={(event) => {
                setSelectedFileName(event.target.files?.[0]?.name ?? '');
                setSubmitError(null);
                setReport(null);
              }}
            />
          </div>

          <div className="rounded-xl border border-[#222] bg-[#111] p-4 text-xs font-light leading-relaxed text-brand-text-muted">
            Filmes usam o historico de filmes; series e animes usam episodios, temporadas e progresso. No ZIP completo,
            episodios de fontes auxiliares sao combinados sem duplicar progresso. Importacoes entram como retroativas,
            sem pontuacao automatica.
          </div>

          {submitError ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
              {submitError}
            </div>
          ) : null}

          {report ? (
            <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4 text-sm text-brand-text">
              <p className="font-light text-brand-gold">
                Importacao concluida.
              </p>
              <p>
                {report.moviesImported} filme(s) importado(s), {report.seriesImported} serie(s) importada(s),
                {` ${report.alreadyRegistered}`} item(ns) ja estava(m) na sua lista e
                {` ${report.duplicatesInImport}`} registro(s) duplicado(s) no ZIP foi(ram) ignorado(s).
              </p>
              {report.seriesRepaired > 0 ? (
                <p>{report.seriesRepaired} serie(s) existente(s) reparada(s) com dados do TMDB.</p>
              ) : null}
              {report.parseWarnings.length > 0 ? (
                <details className="text-xs text-brand-text-muted">
                  <summary className="cursor-pointer text-brand-gold-alt">
                    {report.parseWarnings.length} aviso(s) de leitura
                  </summary>
                  <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-y-auto pl-4 pr-2">
                    {report.parseWarnings.slice(0, 20).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  {report.parseWarnings.length > 20 ? (
                    <p className="mt-2">Mostrando os primeiros 20 avisos.</p>
                  ) : null}
                </details>
              ) : null}
                    {report.skippedTitles.length > 0 ? (
                <details className="text-xs text-brand-text-muted">
                  <summary className="cursor-pointer text-brand-gold-alt">
                    Ver os primeiros itens nao importados
                  </summary>
                  <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-y-auto pl-4 pr-2">
                    {report.skippedTitles.slice(0, 20).map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                  {report.skippedTitles.length > 20 ? (
                    <p className="mt-2">Mostrando 20 de {report.skippedTitles.length} titulos.</p>
                  ) : null}
                </details>
              ) : null}
              {report.unresolvedTitles.length > 0 ? (
                <details className="text-xs text-amber-300/80">
                  <summary className="cursor-pointer text-amber-400">
                    ⚠ {report.unresolvedTitles.length} titulo(s) nao encontrado(s) no TMDB
                  </summary>
                  <p className="mt-1 text-brand-text-muted">
                    Esses itens nao foram importados porque nao foi possivel encontrar uma correspondencia
                    no TMDB. Sem um ID valido, eles ficariam sem capa e sem pagina de detalhes.
                  </p>
                  <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-y-auto pl-4 pr-2">
                    {report.unresolvedTitles.slice(0, 30).map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                  {report.unresolvedTitles.length > 30 ? (
                    <p className="mt-2">Mostrando 30 de {report.unresolvedTitles.length} titulos.</p>
                  ) : null}
                </details>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-xs uppercase tracking-wider text-brand-text-muted transition-colors hover:text-brand-text"
              >
                Fechar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleImport}
              disabled={importMutation.isPending || moviesQuery.isLoading || seriesQuery.isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-brand-gold px-5 py-2 text-xs font-medium uppercase tracking-widest text-brand-bg transition-all hover:bg-opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Importar
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:text-brand-gold hover:opacity-100">
              <X size={16} />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
