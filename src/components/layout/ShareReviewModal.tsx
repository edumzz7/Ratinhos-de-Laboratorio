import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Instagram, Star, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { usePersonalMovies } from '../../hooks/usePersonalMovies';
import { useSeries } from '../../hooks/useSeries';
import { generateImagePath } from '../../lib/imageUtils';

interface ShareReviewModalProps {
  currentUserId: string;
  currentDisplayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SharedItem {
  id: string;
  type: 'movie' | 'series';
  titulo: string;
  capa_url: string | null;
  rating: number | null;
  review: string | null;
  created_at: string;
}

export default function ShareReviewModal({
  currentUserId,
  currentDisplayName,
  open,
  onOpenChange,
}: ShareReviewModalProps) {
  const { moviesQuery } = usePersonalMovies(currentUserId);
  const { seriesQuery } = useSeries(currentUserId);

  const movies = moviesQuery.data || [];
  const series = seriesQuery.data || [];
  
  // Apenas filmes assistidos
  const watchedMovies: SharedItem[] = movies
    .filter((m) => m.status === 'watched')
    .map((m) => ({
      id: m.id,
      type: 'movie',
      titulo: m.titulo,
      capa_url: m.capa_url,
      rating: m.rating ?? m.avaliacao ?? null,
      review: m.review ?? null,
      created_at: m.created_at,
    }));

  // Apenas séries assistidas
  const watchedSeries: SharedItem[] = series
    .filter((s) => s.status === 'watched')
    .map((s) => ({
      id: s.id,
      type: 'series',
      titulo: s.titulo,
      capa_url: s.capa_url,
      rating: s.rating ?? s.avaliacao ?? null,
      review: s.review ?? null,
      created_at: s.created_at,
    }));

  const combinedItems = [...watchedMovies, ...watchedSeries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const [selectedKey, setSelectedKey] = useState<string>(''); // Formato: type-id (ex: "movie-123")
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const postRefPhoto = useRef<HTMLDivElement>(null);
  const postRefDark = useRef<HTMLDivElement>(null);

  const selectedItem = combinedItems.find(item => `${item.type}-${item.id}` === selectedKey);

  // Rewrite TMDB image URLs to go through our proxy (same-origin, no CORS issues)
  const getProxiedImageUrl = (item: SharedItem | undefined) => {
    if (!item) return null;
    const rawUrl = generateImagePath(item.titulo, item.capa_url);
    if (!rawUrl) return null;
    // Rewrite https://image.tmdb.org/t/p/
    if (rawUrl.includes('image.tmdb.org/t/p/')) {
      return rawUrl.replace('https://image.tmdb.org/t/p/', '/tmdb-img/');
    }
    return rawUrl;
  };

  const coverImageUrl = selectedItem ? getProxiedImageUrl(selectedItem) : null;

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(() => {
        setSelectedKey('');
        setGeneratedImages([]);
        setCurrentImageIndex(0);
        setIsGenerating(false);
      }, 300);
    }
  };

  const generateImage = async () => {
    if (!postRefPhoto.current || !postRefDark.current || !selectedItem) return;
    setIsGenerating(true);
    setGeneratedImages([]);
    setCurrentImageIndex(0);

    try {
      // Wait briefly for the proxy image to load in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));

      const opts = { scale: 2, useCORS: true, backgroundColor: '#0f0f0f' };

      const canvasPhoto = await html2canvas(postRefPhoto.current, opts);
      const dataUrlPhoto = canvasPhoto.toDataURL('image/png');

      const canvasDark = await html2canvas(postRefDark.current, { ...opts, backgroundColor: '#0a0f1e' });
      const dataUrlDark = canvasDark.toDataURL('image/png');

      setGeneratedImages([dataUrlPhoto, dataUrlDark]);
    } catch (error) {
      console.error('Falha ao gerar imagem', error);
      alert('Houve um erro ao gerar a imagem: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImages.length === 0 || !selectedItem) return;
    const link = document.createElement('a');
    link.href = generatedImages[currentImageIndex];
    const styleName = currentImageIndex === 0 ? 'foto' : 'escuro';
    link.download = `review-${selectedItem.titulo.toLowerCase().replace(/\s+/g, '-')}-${styleName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (generatedImages.length === 0 || !selectedItem) return;
    
    try {
      const response = await fetch(generatedImages[currentImageIndex]);
      const blob = await response.blob();
      const styleName = currentImageIndex === 0 ? 'foto' : 'escuro';
      const file = new File([blob], `review-${selectedItem.titulo.toLowerCase().replace(/\s+/g, '-')}-${styleName}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Resenha Cinerats',
          text: `Confira minha resenha de ${selectedItem.titulo} no CineRats!`,
        });
      } else {
        alert("Compartilhamento direto com o Instagram não suportado no seu navegador/dispositivo atual. Por favor, baixe a imagem e poste manualmente.");
      }
    } catch (error) {
      console.error('Error sharing', error);
    }
  };

  const renderStars = (rating?: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center justify-center gap-1 mt-2" style={{ color: '#D4AF37' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={40}
            color="#D4AF37"
            fill={i < Math.floor(rating) ? "#D4AF37" : "transparent"}
            style={{ opacity: i < Math.floor(rating) ? 1 : 0.3 }}
          />
        ))}
        {rating % 1 !== 0 && (
          <Star size={40} color="#D4AF37" fill="#D4AF37" className="absolute" style={{ opacity: 0.5, clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }} />
        )}
      </div>
    );
  };

  const truncateReview = (text: string) => {
    const MAX_CHARS = 220;
    if (text.length <= MAX_CHARS) return text;
    return text.substring(0, MAX_CHARS).trim() + '...';
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <Dialog.Title className="flex items-center gap-2 text-lg text-brand-gold tracking-widest uppercase mb-4">
            <Instagram size={20} /> Postar no Instagram
          </Dialog.Title>

          {generatedImages.length === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-2">
                  Selecione um título avaliado (Filme ou Série)
                </label>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-3 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                >
                  <option value="">-- Escolha um item --</option>
                  {combinedItems.map((item) => {
                    const tag = item.type === 'movie' ? 'Filme' : 'Série';
                    return (
                      <option key={`${item.type}-${item.id}`} value={`${item.type}-${item.id}`}>
                        [{tag}] {item.titulo} {item.rating ? `(${item.rating} ⭐)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedItem && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={generateImage}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded-lg disabled:opacity-50 hover:bg-brand-gold/90 transition"
                  >
                    {isGenerating ? 'Gerando...' : 'Gerar Imagem'}
                  </button>
                </div>
              )}
            </div>
          )}

          {generatedImages.length > 0 && (
            <div className="flex flex-col items-center gap-6 mt-4">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">Preview da Imagem</p>
              
              <div className="flex items-center gap-3 w-full justify-center">
                {generatedImages.length > 1 && (
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? generatedImages.length - 1 : prev - 1))}
                    className="p-3 bg-[#151515] border border-[#222] hover:border-brand-gold/40 hover:text-brand-gold rounded-full text-white transition shrink-0 flex items-center justify-center w-10 h-10 active:scale-95"
                    title="Versão anterior"
                  >
                    &#8592;
                  </button>
                )}
                
                <div className="relative w-[270px] h-[480px] rounded-lg overflow-hidden border border-brand-gold/30 shadow-2xl flex items-center justify-center bg-black">
                  <img src={generatedImages[currentImageIndex]} alt="Preview" className="w-full h-full object-contain" />
                </div>

                {generatedImages.length > 1 && (
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === generatedImages.length - 1 ? 0 : prev + 1))}
                    className="p-3 bg-[#151515] border border-[#222] hover:border-brand-gold/40 hover:text-brand-gold rounded-full text-white transition shrink-0 flex items-center justify-center w-10 h-10 active:scale-95"
                    title="Próxima versão"
                  >
                    &#8594;
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 justify-center w-full">
                {generatedImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${idx === currentImageIndex ? 'bg-brand-gold w-4' : 'bg-[#444]'}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 w-full mt-2">
                <button
                  onClick={() => { setGeneratedImages([]); setCurrentImageIndex(0); }}
                  className="flex-1 px-4 py-3 border border-[#333] text-brand-text hover:border-brand-gold/40 rounded-lg text-xs uppercase tracking-[0.14em] transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 border border-[#333] text-brand-text rounded-lg text-xs uppercase font-bold tracking-[0.14em] hover:bg-white/20 transition"
                >
                  <Download size={16} /> Baixar
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-gold text-brand-bg rounded-lg text-xs uppercase font-bold tracking-[0.14em] hover:bg-brand-gold/90 transition"
                >
                  <Instagram size={16} /> Postar
                </button>
              </div>
            </div>
          )}

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 hover:text-brand-gold outline-none">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>

        {/* COMPONENTE OCULTO PARA RENDERIZAÇÃO (1080x1920) */}
        {selectedItem && (
          <div className="fixed top-0 pointer-events-none flex" style={{ left: '-9999px', zIndex: -9999 }}>
            
            {/* VARIANTE 1: Fundo com a Foto */}
            <div
              ref={postRefPhoto}
              className="relative flex flex-col items-center overflow-hidden"
              style={{ width: '1080px', height: '1920px', backgroundColor: '#0f0f0f' }}
            >
              {/* Background Decorativo e Fundo */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: 0.2,
                  backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              
              {/* Container Principal */}
              <div className="z-10 flex flex-col w-full h-full p-24">
                {/* HEADER (Logo) */}
                <div className="w-full flex justify-center mb-16" style={{ opacity: 0.8 }}>
                  <div 
                    className="text-3xl tracking-[0.3em] font-light uppercase pb-4 px-12"
                    style={{ color: '#D4AF37', borderBottom: '2px solid rgba(212, 175, 55, 0.3)' }}
                  >
                    CineRats
                  </div>
                </div>

                {/* MEIO (Capa e Título) */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div 
                    className="w-[600px] h-[900px] rounded-xl overflow-hidden mb-16 relative flex items-center justify-center"
                    style={{ 
                       backgroundColor: '#1a1a1a', 
                       boxShadow: '0 0 80px rgba(212, 175, 55, 0.15)',
                       border: '4px solid rgba(212, 175, 55, 0.4)'
                    }}
                  >
                    {coverImageUrl ? (
                      <img 
                        src={coverImageUrl} 
                        alt="Capa" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl font-light uppercase tracking-widest" style={{ color: '#666666' }}>
                        Sem Capa
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-6xl font-light text-center px-12 leading-tight uppercase tracking-wider mb-8" style={{ color: '#ffffff' }}>
                    {selectedItem.titulo}
                  </h2>
                  
                  {renderStars(selectedItem.rating)}
                </div>

                {/* TEXTO (Resenha) */}
                <div className="h-[350px] w-full flex items-center justify-center px-16">
                  {selectedItem.review ? (
                    <p className="text-4xl text-center font-light leading-[1.6] italic" style={{ color: '#d1d5db' }}>
                      "{truncateReview(selectedItem.review)}"
                    </p>
                  ) : (
                    <div className="text-3xl uppercase tracking-widest font-light" style={{ color: '#6b7280' }}>
                      {selectedItem.type === 'movie' ? 'Avaliado no CineRats' : 'Avaliada no CineRats'}
                    </div>
                  )}
                </div>

                {/* RODAPÉ (Usuário) */}
                <div className="w-full flex justify-between items-end pt-12 mt-8" style={{ borderTop: '1px solid #333333' }}>
                  <div className="flex flex-col">
                    <span className="text-2xl uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(212, 175, 55, 0.7)' }}>
                      {selectedItem.type === 'movie' ? 'Filme' : 'Série'} • Resenha por
                    </span>
                    <span className="text-4xl font-medium tracking-wide" style={{ color: '#ffffff' }}>
                      {currentDisplayName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VARIANTE 2: Fundo Azul Escuro */}
            <div
              ref={postRefDark}
              className="relative flex flex-col items-center overflow-hidden"
              style={{ width: '1080px', height: '1920px', backgroundColor: '#0a0f1e' }}
            >
              <div className="z-10 flex flex-col w-full h-full p-24">
                <div className="w-full flex justify-center mb-16" style={{ opacity: 0.8 }}>
                  <div 
                    className="text-3xl tracking-[0.3em] font-light uppercase pb-4 px-12"
                    style={{ color: '#D4AF37', borderBottom: '2px solid rgba(212, 175, 55, 0.3)' }}
                  >
                    CineRats
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div 
                    className="w-[600px] h-[900px] rounded-xl overflow-hidden mb-16 relative flex items-center justify-center"
                    style={{ 
                       backgroundColor: '#1a1a1a', 
                       boxShadow: '0 0 80px rgba(212, 175, 55, 0.15)',
                       border: '4px solid rgba(212, 175, 55, 0.4)'
                    }}
                  >
                    {coverImageUrl ? (
                      <img 
                        src={coverImageUrl} 
                        alt="Capa" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl font-light uppercase tracking-widest" style={{ color: '#666666' }}>
                        Sem Capa
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-6xl font-light text-center px-12 leading-tight uppercase tracking-wider mb-8" style={{ color: '#ffffff' }}>
                    {selectedItem.titulo}
                  </h2>
                  
                  {renderStars(selectedItem.rating)}
                </div>

                <div className="h-[350px] w-full flex items-center justify-center px-16">
                  {selectedItem.review ? (
                    <p className="text-4xl text-center font-light leading-[1.6] italic" style={{ color: '#d1d5db' }}>
                      "{truncateReview(selectedItem.review)}"
                    </p>
                  ) : (
                    <div className="text-3xl uppercase tracking-widest font-light" style={{ color: '#6b7280' }}>
                      {selectedItem.type === 'movie' ? 'Avaliado no CineRats' : 'Avaliada no CineRats'}
                    </div>
                  )}
                </div>

                <div className="w-full flex justify-between items-end pt-12 mt-8" style={{ borderTop: '1px solid #333333' }}>
                  <div className="flex flex-col">
                    <span className="text-2xl uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(212, 175, 55, 0.7)' }}>
                      {selectedItem.type === 'movie' ? 'Filme' : 'Série'} • Resenha por
                    </span>
                    <span className="text-4xl font-medium tracking-wide" style={{ color: '#ffffff' }}>
                      {currentDisplayName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
