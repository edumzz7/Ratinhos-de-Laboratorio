import type { PersonalMovie, SeriesEntry, RankedUser, UserOscarPrediction, ActivityEntry } from '../types/app';
import type React from 'react';
import { GiBull, GiTigerHead, GiCigar, GiSawedOffShotgun, GiAssassinPocket } from 'react-icons/gi';
import { PiEyesFill } from 'react-icons/pi';
import { MdOutlineTimeline } from 'react-icons/md';
import { FcDvdLogo } from 'react-icons/fc';
import { FaGlassCheers, FaUserShield } from 'react-icons/fa';
import { TbAbc } from 'react-icons/tb';
import { FaChildReaching } from 'react-icons/fa6';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | React.ElementType; // Lucide icon name or React Component
  secret: boolean;
  level: 1 | 2 | 3;
  check: (
    movies: PersonalMovie[],
    series: SeriesEntry[],
    users: RankedUser[],
    userId: string,
    predictions: UserOscarPrediction[],
    favoritesCount: number,
    favoritedByCount: number,
    activities: ActivityEntry[]
  ) => boolean;
}

const MOVIE_DIRECTORS: Record<string, string> = {
  // Nolan
  'oppenheimer': 'Christopher Nolan',
  'interstellar': 'Christopher Nolan',
  'interestelar': 'Christopher Nolan',
  'inception': 'Christopher Nolan',
  'a origem': 'Christopher Nolan',
  'the dark knight': 'Christopher Nolan',
  'o cavaleiro das trevas': 'Christopher Nolan',
  'memento': 'Christopher Nolan',
  'amnesia': 'Christopher Nolan',
  'dunkirk': 'Christopher Nolan',
  'tenet': 'Christopher Nolan',
  'the prestige': 'Christopher Nolan',
  'o grande truque': 'Christopher Nolan',
  'batman begins': 'Christopher Nolan',
  'o cavaleiro das trevas ressurge': 'Christopher Nolan',
  'the dark knight rises': 'Christopher Nolan',
  'insomnia': 'Christopher Nolan',
  'following': 'Christopher Nolan',

  // Tarantino
  'pulp fiction': 'Quentin Tarantino',
  'kill bill': 'Quentin Tarantino',
  'kill bill vol. 1': 'Quentin Tarantino',
  'kill bill vol. 2': 'Quentin Tarantino',
  'inglourious basterds': 'Quentin Tarantino',
  'bastardos inglorios': 'Quentin Tarantino',
  'bastardos inglórios': 'Quentin Tarantino',
  'django unchained': 'Quentin Tarantino',
  'django livre': 'Quentin Tarantino',
  'reservoir dogs': 'Quentin Tarantino',
  'caes de aluguel': 'Quentin Tarantino',
  'cães de aluguel': 'Quentin Tarantino',
  'once upon a time in hollywood': 'Quentin Tarantino',
  'era uma vez em hollywood': 'Quentin Tarantino',
  'the hateful eight': 'Quentin Tarantino',
  'os oito odiados': 'Quentin Tarantino',
  'jackie brown': 'Quentin Tarantino',
  'prova de morte': 'Quentin Tarantino',
  'death proof': 'Quentin Tarantino',

  // Scorsese
  'taxi driver': 'Martin Scorsese',
  'goodfellas': 'Martin Scorsese',
  'bons companheiros': 'Martin Scorsese',
  'os bons companheiros': 'Martin Scorsese',
  'the wolf of wall street': 'Martin Scorsese',
  'o lobo de wall street': 'Martin Scorsese',
  'shutter island': 'Martin Scorsese',
  'ilha do medo': 'Martin Scorsese',
  'the departed': 'Martin Scorsese',
  'os infiltrados': 'Martin Scorsese',
  'casino': 'Martin Scorsese',
  'cassino': 'Martin Scorsese',
  'raging bull': 'Martin Scorsese',
  'touro indomavel': 'Martin Scorsese',
  'touro indomável': 'Martin Scorsese',
  'killers of the flower moon': 'Martin Scorsese',
  'assassinos da lua das flores': 'Martin Scorsese',
  'o irlandês': 'Martin Scorsese',
  'the irishman': 'Martin Scorsese',
  'cabo do medo': 'Martin Scorsese',
  'hugo': 'Martin Scorsese',
  'a invenção de hugo cabret': 'Martin Scorsese',

  // Spielberg
  'jurassic park': 'Steven Spielberg',
  'schindler list': 'Steven Spielberg',
  'a lista de schindler': 'Steven Spielberg',
  'schindler\'s list': 'Steven Spielberg',
  'jaws': 'Steven Spielberg',
  'tubarao': 'Steven Spielberg',
  'tubarão': 'Steven Spielberg',
  'saving private ryan': 'Steven Spielberg',
  'o resgate do soldado ryan': 'Steven Spielberg',
  'catch me if you can': 'Steven Spielberg',
  'prenda-me se for capaz': 'Steven Spielberg',
  'e.t. the extra-terrestrial': 'Steven Spielberg',
  'e.t. o extraterrestre': 'Steven Spielberg',
  'raiders of the lost ark': 'Steven Spielberg',
  'cacadores da arca perdida': 'Steven Spielberg',
  'caçadores da arca perdida': 'Steven Spielberg',
  'contatos imediatos do terceiro grau': 'Steven Spielberg',
  'jogador número 1': 'Steven Spielberg',
  'ready player one': 'Steven Spielberg',
  'minority report': 'Steven Spielberg',
  'a.i. inteligência artificial': 'Steven Spielberg',
  'a.i. artificial intelligence': 'Steven Spielberg',
  'o terminal': 'Steven Spielberg',
  'cavalo de guerra': 'Steven Spielberg',
  'lincoln': 'Steven Spielberg',

  // Guillermo del Toro
  'o labirinto do fauno': 'Guillermo del Toro',
  'pan\'s labyrinth': 'Guillermo del Toro',
  'a forma da água': 'Guillermo del Toro',
  'the shape of water': 'Guillermo del Toro',
  'hellboy': 'Guillermo del Toro',
  'hellboy ii': 'Guillermo del Toro',
  'hellboy 2': 'Guillermo del Toro',
  'círculo de fogo': 'Guillermo del Toro',
  'pacific rim': 'Guillermo del Toro',
  'pinóquio': 'Guillermo del Toro',
  'pinocchio': 'Guillermo del Toro',
  'colina escarlate': 'Guillermo del Toro',
  'crimson peak': 'Guillermo del Toro',
  'blade ii': 'Guillermo del Toro',
  'blade 2': 'Guillermo del Toro',
  'a espinha do diabo': 'Guillermo del Toro',
  'el espinazo del diablo': 'Guillermo del Toro',
  'cronos': 'Guillermo del Toro',
};

const FAMILY_MOVIES = new Set<string>([
  'toy story', 'toy story 2', 'toy story 3', 'toy story 4', 'procurando nemo', 'finding nemo',
  'shrek', 'shrek 2', 'shrek 3', 'o rei leão', 'the lion king', 'frozen', 'frozen 2',
  'monstros s.a.', 'monsters inc', 'divertida mente', 'inside out', 'divertidamente', 'coco',
  'viva a vida é uma festa', 'viva: a vida é uma festa', 'carros', 'cars', 'carros 2', 'carros 3',
  'ratatouille', 'os incríveis', 'the incredibles', 'up altas aventuras', 'up: altas aventuras',
  'up', 'moana', 'kung fu panda', 'como treinar o seu dragão', 'how to train your dragon',
  'madagascar', 'a viagem de chihiro', 'spirited away', 'meu vizinho totoro', 'my neighbor totoro',
  'harry potter', 'esqueceram de mim', 'home alone', 'matilda', 'lilo e stitch', 'lilo & stitch',
  'minions', 'meu malvado favorito', 'despicable me', 'a era do gelo', 'ice age', 'aladdin',
  'pinóquio', 'pinocchio', 'cinderela', 'cinderella', 'a bela e a fera', 'beauty and the beast', 'wall-e'
]);

const COMEDY_MOVIES = new Set<string>([
  'shrek', 'shrek 2', 'shrek 3', 'se beber, não case', 'the hangover', 'superbad',
  'superbad é hoje', 'o auto da compadecida', 'as branquelas', 'white chicks', 'meninas malvadas',
  'mean girls', 'click', 'gente grande', 'grown ups', 'gente grande 2', 'deadpool', 'deadpool 2',
  'minions', 'meu malvado favorito', 'despicable me', 'toy story', 'ratatouille', 'a máscara',
  'the mask', 'o mentiroso', 'liar liar', 'todo mundo em pânico', 'scary movie', 'com amor, simon',
  'de volta para o futuro', 'back to the future', 'zombieland', 'zumbilândia', 'debi e loide',
  'dumb and dumber', 'ted', 'borat', 'vizinhos', 'neighbors'
]);

const HORROR_SERIES = new Set<string>([
  'stranger things', 'supernatural', 'the walking dead', 'american horror story',
  'a maldição da residência hill', 'the haunting of hill house', 'missa da meia-noite',
  'midnight mass', 'penny dreadful', 'ash vs evil dead', 'hannibal', 'yellowjackets',
  'lovecraft country', 'scream', 'chucky', 'evil', 'doce lar', 'sweet home', 'outcast',
  'them', 'scream queens'
]);

const MOVIE_LANGUAGES: Record<string, string> = {
  'o fabuloso destino de amélie poulin': 'fr', 'amélie': 'fr', 'os intocáveis': 'fr',
  'intouchables': 'fr', 'la haine': 'fr', 'o ódio': 'fr', 'retrato de uma jovem em chamas': 'fr',
  'portrait of a lady on fire': 'fr', 'anatomia de uma queda': 'fr', 'anatomy of a fall': 'fr',
  'o labirinto do fauno': 'es', "pan's labyrinth": 'es', 'relatos selvagens': 'es',
  'wild tales': 'es', 'a sociedade da neve': 'es', 'society of the snow': 'es', 'roma': 'es',
  'dor e glória': 'es', 'pain and glory': 'es', 'tudo sobre minha mãe': 'es', 'all about my mother': 'es',
  'o auto da compadecida': 'pt', 'cidade de deus': 'pt', 'city of god': 'pt', 'central do brasil': 'pt',
  'central station': 'pt', 'bacurau': 'pt', 'tropa de elite': 'pt', 'elite squad': 'pt',
  'que horas ela volta': 'pt', 'hoje eu quero voltar sozinho': 'pt', 'carandiru': 'pt',
  'minha mãe é uma peça': 'pt', 'a viagem de chihiro': 'ja', 'spirited away': 'ja',
  'meu vizinho totoro': 'ja', 'my neighbor totoro': 'ja', 'parasita': 'ko', 'parasite': 'ko',
  'oldboy': 'ko', 'godzilla minus one': 'ja', 'o menino e a garça': 'ja', 'the boy and the heron': 'ja',
  'a vida é bela': 'it', 'life is beautiful': 'it', 'cinema paradiso': 'it', 'la dolce vita': 'it',
  'a vida dos outros': 'de', 'das leben der anderen': 'de', 'nada de novo no front': 'de',
  'all quiet on the western front': 'de', 'o barco': 'de', 'das boot': 'de', 'corra lola corra': 'de',
  'run lola run': 'de'
};

const MOVIE_GENRES: Record<string, string> = {
  // Action
  'tropa de elite': 'action', 'die hard': 'action', 'mad max': 'action',
  // Adventure
  'indiana jones': 'adventure', 'jurassic park': 'adventure', 'círculo de fogo': 'adventure',
  // Animation
  'toy story': 'animation', 'procurando nemo': 'animation', 'a viagem de chihiro': 'animation',
  // Comedy
  'se beber, não case': 'comedy', 'superbad': 'comedy', 'o auto da compadecida': 'comedy',
  // Crime
  'cidade de deus': 'crime', 'bons companheiros': 'crime', 'pulp fiction': 'crime',
  // Documentary
  'o dilema das redes': 'documentary', 'senna': 'documentary', 'free solo': 'documentary',
  // Drama
  'a lista de schindler': 'drama', 'os intocáveis': 'drama', 'central do brasil': 'drama',
  // Family
  'frozen': 'family', 'esqueceram de mim': 'family', 'matilda': 'family',
  // Horror
  'o iluminado': 'horror', 'invocação do mal': 'horror', 'hereditário': 'horror',
  // Mystery
  'ilha do medo': 'mystery', 'amnésia': 'mystery', 'garota exemplar': 'mystery',
  // Romance
  'como se fosse a primeira vez': 'romance', 'diário de uma paixão': 'romance', 'orgulho e preconceito': 'romance',
  // Sci-Fi
  'interestelar': 'sci-fi', 'interstellar': 'sci-fi', 'oppenheimer': 'sci-fi', 'a origem': 'sci-fi',
  // Thriller
  'os infiltrados': 'thriller', 'taxi driver': 'thriller', 'psicose': 'thriller',
  // War
  'o resgate do soldado ryan': 'war', 'bastardos inglórios': 'war', 'nada de novo no front': 'war',
  // Western
  'django livre': 'western', 'por um punhado de dólares': 'western', 'os oito odiados': 'western'
};

export const ACHIEVEMENTS: Achievement[] = [
  // FILMES
  {
    id: 'first_movie',
    name: 'Primeira Impressão',
    description: 'Assistiu ao seu primeiro filme.',
    icon: 'Film',
    secret: false,
    level: 1,
    check: (movies) => movies.filter((m) => m.status === 'watched').length >= 1,
  },
  {
    id: 'cinephile',
    name: 'Cinéfilo',
    description: 'Assistiu a 30 filmes.',
    icon: 'Clapperboard',
    secret: false,
    level: 2,
    check: (movies) => movies.filter((m) => m.status === 'watched').length >= 30,
  },
  {
    id: 'marathon',
    name: 'Maratonou',
    description: 'Assistiu a 10 filmes em uma janela de 7 dias.',
    icon: 'Zap',
    secret: false,
    level: 2,
    check: (movies) => {
      const times = movies
        .filter((m) => m.status === 'watched')
        .map((m) => new Date(m.created_at).getTime())
        .sort((a, b) => a - b);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return times.some((t, idx) => {
        if (idx + 9 >= times.length) return false;
        return times[idx + 9] - t <= sevenDaysMs;
      });
    },
  },
  {
    id: 'director',
    name: 'Diretor de Cinema',
    description: 'Assistiu a 50 filmes.',
    icon: 'Video',
    secret: false,
    level: 3,
    check: (movies) => movies.filter((m) => m.status === 'watched').length >= 50,
  },
  {
    id: 'curious',
    name: 'Curioso',
    description: 'Adicionou 15 filmes à watchlist.',
    icon: PiEyesFill,
    secret: false,
    level: 1,
    check: (movies) => movies.filter((m) => m.status === 'watchlist').length >= 15,
  },
  {
    id: 'haja_tempo',
    name: 'Haja Tempo...',
    description: 'Adicionou 30 filmes à watchlist.',
    icon: 'Bookmark',
    secret: false,
    level: 2,
    check: (movies) => movies.filter((m) => m.status === 'watchlist').length >= 30,
  },

  // DIRETORES (NV1 e NV2)
  {
    id: 'tarantino_1',
    name: 'Inglório',
    description: 'Assistiu a 3 filmes do Tarantino.',
    icon: GiSawedOffShotgun,
    secret: false,
    level: 1,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Quentin Tarantino'
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'del_toro_1',
    name: 'Olé!',
    description: 'Assistiu a 3 filmes do Guillermo del Toro.',
    icon: GiBull,
    secret: false,
    level: 1,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Guillermo del Toro'
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'del_toro_2',
    name: 'Forma Aquática',
    description: 'Assistiu a 5 filmes do Guillermo del Toro.',
    icon: 'Droplets',
    secret: false,
    level: 2,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Guillermo del Toro'
      ).length;
      return count >= 5;
    },
  },
  {
    id: 'nolan_1',
    name: 'Não Linear',
    description: 'Assistiu a 3 filmes do Nolan.',
    icon: MdOutlineTimeline,
    secret: false,
    level: 1,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Christopher Nolan'
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'nolan_2',
    name: 'Tempo Relativo',
    description: 'Assistiu a 5 filmes do Christopher Nolan.',
    icon: 'Infinity',
    secret: false,
    level: 2,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Christopher Nolan'
      ).length;
      return count >= 5;
    },
  },
  {
    id: 'spielberg_1',
    name: 'Blockbuster Clássico',
    description: 'Assistiu a 3 filmes do Spielberg.',
    icon: FcDvdLogo,
    secret: false,
    level: 1,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Steven Spielberg'
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'spielberg_2',
    name: 'Aventureiro',
    description: 'Assistiu a 5 filmes do Steven Spielberg.',
    icon: 'Compass',
    secret: false,
    level: 2,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Steven Spielberg'
      ).length;
      return count >= 5;
    },
  },
  {
    id: 'scorsese_1',
    name: 'Godfella',
    description: 'Assistiu a 3 filmes do Scorsese.',
    icon: FaGlassCheers,
    secret: false,
    level: 1,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Martin Scorsese'
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'scorsese_2',
    name: 'Acende o charuto',
    description: 'Assistiu a 5 filmes do Martin Scorsese.',
    icon: GiCigar,
    secret: false,
    level: 2,
    check: (movies) => {
      const count = movies.filter(
        (m) => m.status === 'watched' && MOVIE_DIRECTORS[m.titulo.toLowerCase().trim()] === 'Martin Scorsese'
      ).length;
      return count >= 5;
    },
  },

  // INFANTIL & COMÉDIA
  {
    id: 'infantil_1',
    name: 'Sessão da Tarde',
    description: 'Assistiu ou tem na watchlist 5 filmes infantis.',
    icon: FaChildReaching,
    secret: false,
    level: 1,
    check: (movies) => movies.filter((m) => FAMILY_MOVIES.has(m.titulo.toLowerCase().trim())).length >= 5,
  },
  {
    id: 'infantil_2',
    name: 'Peter Pan',
    description: 'Assistiu ou tem na watchlist 10 filmes infantis.',
    icon: 'Baby',
    secret: false,
    level: 2,
    check: (movies) => movies.filter((m) => FAMILY_MOVIES.has(m.titulo.toLowerCase().trim())).length >= 10,
  },
  {
    id: 'comedy_1',
    name: 'Risadola',
    description: 'Assistiu ou tem na watchlist 10 filmes de comédia.',
    icon: 'Laugh',
    secret: false,
    level: 1,
    check: (movies) => movies.filter((m) => COMEDY_MOVIES.has(m.titulo.toLowerCase().trim())).length >= 10,
  },
  {
    id: 'amargo',
    name: 'Amargo',
    description: 'Deu nota 2 ou menos para 3 filmes de comédia.',
    icon: 'Frown',
    secret: false,
    level: 1,
    check: (movies) => {
      const comedyRated = movies.filter(
        (m) => COMEDY_MOVIES.has(m.titulo.toLowerCase().trim()) &&
          (m.rating ?? m.avaliacao ?? 0) > 0 &&
          (m.rating ?? m.avaliacao ?? 0) <= 2
      );
      return comedyRated.length >= 3;
    },
  },
  {
    id: 'watchlist_25',
    name: 'Vamos Marcar de Ver',
    description: 'Tem 25+ itens na watchlist.',
    icon: 'Calendar',
    secret: false,
    level: 2,
    check: (movies, series) => {
      const mWatch = movies.filter((m) => m.status === 'watchlist').length;
      const sWatch = series.filter((s) => s.status === 'watchlist').length;
      return mWatch + sWatch >= 25;
    },
  },

  // SÉRIES
  {
    id: 'first_series',
    name: 'Pontapé Inicial',
    description: 'Acompanhando ou assistiu a 1 série.',
    icon: 'Tv',
    secret: false,
    level: 1,
    check: (_, series) => series.length >= 1,
  },
  {
    id: 'dedicated_series',
    name: 'Dedicado',
    description: 'Acompanhando ou assistiu a 5 séries.',
    icon: 'Play',
    secret: false,
    level: 2,
    check: (_, series) => series.length >= 5,
  },
  {
    id: 'no_social_life',
    name: 'Sem Vida Social',
    description: 'Concluiu 20 séries.',
    icon: 'Hourglass',
    secret: false,
    level: 3,
    check: (_, series) => series.filter((s) => s.status === 'watched').length >= 20,
  },

  // AVALIAÇÕES
  {
    id: 'critic_15',
    name: 'Crítico',
    description: 'Avaliou 15 filmes ou séries.',
    icon: 'Award',
    secret: false,
    level: 1,
    check: (movies, series) => {
      const mCount = movies.filter((m) => (m.rating ?? m.avaliacao ?? 0) > 0).length;
      const sCount = series.filter((s) => (s.rating ?? s.avaliacao ?? 0) > 0).length;
      return mCount + sCount >= 15;
    },
  },
  {
    id: 'critic_30',
    name: 'Crítico Profissional',
    description: 'Avaliou 30 filmes ou séries.',
    icon: 'Trophy',
    secret: false,
    level: 2,
    check: (movies, series) => {
      const mCount = movies.filter((m) => (m.rating ?? m.avaliacao ?? 0) > 0).length;
      const sCount = series.filter((s) => (s.rating ?? s.avaliacao ?? 0) > 0).length;
      return mCount + sCount >= 30;
    },
  },
  {
    id: 'critic_50',
    name: 'Jurado de Cannes',
    description: 'Avaliou 50 filmes ou séries.',
    icon: 'Medal',
    secret: false,
    level: 3,
    check: (movies, series) => {
      const mCount = movies.filter((m) => (m.rating ?? m.avaliacao ?? 0) > 0).length;
      const sCount = series.filter((s) => (s.rating ?? s.avaliacao ?? 0) > 0).length;
      return mCount + sCount >= 50;
    },
  },

  // RESENHAS
  {
    id: 'review_abc',
    name: 'ABC',
    description: 'Escreveu sua primeira resenha.',
    icon: TbAbc,
    secret: false,
    level: 1,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.review && m.review.trim().length > 0).length;
      const sCount = series.filter((s) => s.review && s.review.trim().length > 0).length;
      return mCount + sCount >= 1;
    },
  },
  {
    id: 'review_5',
    name: 'Eita que resenha',
    description: 'Escreveu 5 resenhas.',
    icon: 'MessageSquare',
    secret: false,
    level: 2,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.review && m.review.trim().length > 0).length;
      const sCount = series.filter((s) => s.review && s.review.trim().length > 0).length;
      return mCount + sCount >= 5;
    },
  },
  {
    id: 'review_10',
    name: 'Colunista da Folha',
    description: 'Escreveu 10 resenhas.',
    icon: 'FileText',
    secret: false,
    level: 3,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.review && m.review.trim().length > 0).length;
      const sCount = series.filter((s) => s.review && s.review.trim().length > 0).length;
      return mCount + sCount >= 10;
    },
  },
  {
    id: 'review_20',
    name: 'Redator de ENEM',
    description: 'Escreveu 20 resenhas.',
    icon: 'Scroll',
    secret: false,
    level: 3,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.review && m.review.trim().length > 0).length;
      const sCount = series.filter((s) => s.review && s.review.trim().length > 0).length;
      return mCount + sCount >= 20;
    },
  },

  // OSCAR
  {
    id: 'oscar_bet',
    name: 'Vai de BET',
    description: 'Palpitou em 1 categoria do Oscar.',
    icon: 'Dices',
    secret: false,
    level: 1,
    check: (_movies, _series, _users, _userId, predictions) => predictions.length >= 1,
  },
  {
    id: 'oscar_tigrinho',
    name: 'Tigrinho',
    description: 'Palpitou em todas as 5 categorias do Oscar.',
    icon: GiTigerHead,
    secret: false,
    level: 2,
    check: (_movies, _series, _users, _userId, predictions) => predictions.length >= 5,
  },

  // SECRETAS
  {
    id: 'hater',
    name: 'Hater',
    description: 'Avaliou 10 filmes ou séries com nota 1.0.',
    icon: 'ThumbsDown',
    secret: true,
    level: 3,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.status === 'watched' && (m.rating === 1 || m.avaliacao === 1)).length;
      const sCount = series.filter((s) => (s.rating === 1 || s.avaliacao === 1)).length;
      return mCount + sCount >= 10;
    },
  },
  {
    id: 'coracao_mole',
    name: 'Coração Mole',
    description: 'Avaliou 20 filmes ou séries com nota 5.0.',
    icon: 'Heart',
    secret: true,
    level: 3,
    check: (movies, series) => {
      const mCount = movies.filter((m) => m.status === 'watched' && (m.rating === 5 || m.avaliacao === 5)).length;
      const sCount = series.filter((s) => (s.rating === 5 || s.avaliacao === 5)).length;
      return mCount + sCount >= 20;
    },
  },
  {
    id: 'director_fan',
    name: 'Fã',
    description: 'Assistiu a 5 filmes do mesmo diretor.',
    icon: 'UserCheck',
    secret: true,
    level: 3,
    check: (movies) => {
      const directorCount: Record<string, number> = {};
      movies
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          const normTitle = m.titulo.toLowerCase().trim();
          const director = MOVIE_DIRECTORS[normTitle];
          if (director) {
            directorCount[director] = (directorCount[director] || 0) + 1;
          }
        });
      return Object.values(directorCount).some((count) => count >= 5);
    },
  },
  {
    id: 'founder',
    name: 'Fundador',
    description: 'Você é um dos 10 primeiros usuários cadastrados!',
    icon: 'Rocket',
    secret: true,
    level: 3,
    check: (_, __, users, userId) => {
      if (users.length === 0) return false;
      const sorted = [...users].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const top10Ids = sorted.slice(0, 10).map((u) => u.id);
      return top10Ids.includes(userId);
    },
  },
  {
    id: 'je_parlo_mucho',
    name: 'Je parlo mucho',
    description: 'Assistiu a 3 filmes de idiomas diferentes, além do inglês',
    icon: 'Languages',
    secret: false,
    level: 3,
    check: (movies) => {
      const languages = new Set<string>();
      movies
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          const lang = MOVIE_LANGUAGES[m.titulo.toLowerCase().trim()];
          if (lang && lang !== 'en') {
            languages.add(lang);
          }
        });
      return languages.size >= 3;
    },
  },
  {
    id: 'poliglota',
    name: 'Poliglota',
    description: 'Assistiu a 5 filmes de idiomas diferentes (inglês não conta).',
    icon: 'Globe',
    secret: true,
    level: 3,
    check: (movies) => {
      const languages = new Set<string>();
      movies
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          const lang = MOVIE_LANGUAGES[m.titulo.toLowerCase().trim()];
          if (lang && lang !== 'en') {
            languages.add(lang);
          }
        });
      return languages.size >= 5;
    },
  },
  {
    id: 'universal',
    name: 'Universal',
    description: 'Assistiu a 7 filmes de idiomas diferentes (inglês não conta).',
    icon: 'Sparkles',
    secret: true,
    level: 3,
    check: (movies) => {
      const languages = new Set<string>();
      movies
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          const lang = MOVIE_LANGUAGES[m.titulo.toLowerCase().trim()];
          if (lang && lang !== 'en') {
            languages.add(lang);
          }
        });
      return languages.size >= 7;
    },
  },
  {
    id: 'serial_killer',
    name: 'Assassino em SÉRIE',
    description: 'Terminou 5 séries de terror.',
    icon: GiAssassinPocket,
    secret: true,
    level: 3,
    check: (_, series) => {
      const finishedHorror = series.filter(
        (s) => s.status === 'watched' && HORROR_SERIES.has(s.titulo.toLowerCase().trim())
      );
      return finishedHorror.length >= 5;
    },
  },
  {
    id: 'vereador',
    name: 'Vereador',
    description: 'Adicionou 10 pessoas aos amigos.',
    icon: 'Users',
    secret: true,
    level: 3,
    check: (_1, _2, _3, _4, _5, favoritesCount) => favoritesCount >= 10,
  },
  {
    id: 'eleito',
    name: 'Eleito',
    description: 'Foi adicionado por 10 pessoas aos amigos.',
    icon: 'Crown',
    secret: true,
    level: 3,
    check: (_1, _2, _3, _4, _5, _6, favoritedByCount) => favoritedByCount >= 10,
  },
  {
    id: 'ecletico',
    name: 'Eclético',
    description: 'Viu filmes de 12 gêneros diferentes.',
    icon: 'Shuffle',
    secret: true,
    level: 3,
    check: (movies) => {
      const genres = new Set<string>();
      movies
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          const genre = MOVIE_GENRES[m.titulo.toLowerCase().trim()];
          if (genre) {
            genres.add(genre);
          }
        });
      return genres.size >= 12;
    },
  },
  {
    id: 'influente',
    name: 'Influente',
    description: '5 filmes indicados foram vistos pelos usuários que receberam.',
    icon: 'HeartHandshake',
    secret: true,
    level: 3,
    check: (_1, _2, _3, _4, _5, _6, _7, activities) => {
      const recoWatchedCount = activities.filter(
        (act) => act.message.includes('foi assistido') && act.mcoins_delta > 0
      ).length;
      return recoWatchedCount >= 5;
    },
  },
  {
    id: 'fiel_escudeiro',
    name: 'Fiel Escudeiro',
    description: 'Adicionou novos itens em 15 dias diferentes.',
    icon: FaUserShield,
    secret: false,
    level: 3,
    check: (movies, series) => {
      const dates = new Set<string>();
      movies.forEach((m) => {
        if (m.created_at) dates.add(m.created_at.slice(0, 10));
      });
      series.forEach((s) => {
        if (s.created_at) dates.add(s.created_at.slice(0, 10));
      });
      return dates.size >= 15;
    },
  },
];

export function getUnlockedAchievements(
  movies: PersonalMovie[],
  series: SeriesEntry[],
  users: RankedUser[],
  userId: string,
  predictions: UserOscarPrediction[],
  favoritesCount: number,
  favoritedByCount: number,
  activities: ActivityEntry[]
): Achievement[] {
  const unlocked = ACHIEVEMENTS.filter((ach) =>
    ach.check(movies, series, users, userId, predictions, favoritesCount, favoritedByCount, activities)
  );

  // Filter out lower tier achievements for directors and languages
  const idsToExclude = new Set<string>();

  if (unlocked.some((ach) => ach.id === 'del_toro_2')) idsToExclude.add('del_toro_1');
  if (unlocked.some((ach) => ach.id === 'nolan_2')) idsToExclude.add('nolan_1');
  if (unlocked.some((ach) => ach.id === 'spielberg_2')) idsToExclude.add('spielberg_1');
  if (unlocked.some((ach) => ach.id === 'scorsese_2')) idsToExclude.add('scorsese_1');

  if (unlocked.some((ach) => ach.id === 'universal')) {
    idsToExclude.add('poliglota');
    idsToExclude.add('je_parlo_mucho');
  } else if (unlocked.some((ach) => ach.id === 'poliglota')) {
    idsToExclude.add('je_parlo_mucho');
  }

  if (unlocked.some((ach) => ach.id === 'director')) {
    idsToExclude.add('cinephile');
    idsToExclude.add('first_movie');
  } else if (unlocked.some((ach) => ach.id === 'cinephile')) {
    idsToExclude.add('first_movie');
  }

  if (unlocked.some((ach) => ach.id === 'haja_tempo')) {
    idsToExclude.add('curious');
  }

  if (unlocked.some((ach) => ach.id === 'infantil_2')) {
    idsToExclude.add('infantil_1');
  }

  // Series exclusions
  if (unlocked.some((ach) => ach.id === 'no_social_life')) {
    idsToExclude.add('dedicated_series');
    idsToExclude.add('first_series');
  } else if (unlocked.some((ach) => ach.id === 'dedicated_series')) {
    idsToExclude.add('first_series');
  }

  // Critic exclusions
  if (unlocked.some((ach) => ach.id === 'critic_50')) {
    idsToExclude.add('critic_30');
    idsToExclude.add('critic_15');
  } else if (unlocked.some((ach) => ach.id === 'critic_30')) {
    idsToExclude.add('critic_15');
  }

  // Review exclusions
  if (unlocked.some((ach) => ach.id === 'review_20')) {
    idsToExclude.add('review_10');
    idsToExclude.add('review_5');
    idsToExclude.add('review_abc');
  } else if (unlocked.some((ach) => ach.id === 'review_10')) {
    idsToExclude.add('review_5');
    idsToExclude.add('review_abc');
  } else if (unlocked.some((ach) => ach.id === 'review_5')) {
    idsToExclude.add('review_abc');
  }

  return unlocked.filter((ach) => !idsToExclude.has(ach.id));
}
