import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';

/**
 * Interface para definir a estrutura de um filme/série
 */
export interface Movie {
  id: number;
  title: string;
  original_title?: string;
  name?: string; // Para séries
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string; // Para séries
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: Genre[];
  popularity: number;
  adult: boolean;
  video?: boolean;
  original_language: string;
  media_type?: 'movie' | 'tv';
  available_platforms?: Platform[];
  dataAdicionado?: number; // Timestamp quando foi adicionado aos favoritos
}

/**
 * Interface para definir a estrutura de um género
 */
export interface Genre {
  id: number;
  name: string;
}

/**
 * Interface para definir plataformas disponíveis
 */
export interface Platform {
  id: string;
  name: string;
  logo: string;
  type: 'streaming' | 'television';
  url?: string;
}

/**
 * Interface para resposta da API TMDb
 */
export interface TMDbResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

/**
 * Interface para resposta de géneros da API TMDb
 */
export interface GenresResponse {
  genres: Genre[];
}

/**
 * Serviço responsável por gerir dados de filmes e séries
 * Integra com a API TMDb e sistema de armazenamento local
 */
@Injectable({
  providedIn: 'root',
})
export class FilmesService {
  /** Chave da API TMDb */
  private readonly API_KEY = 'bd3a2c678b6edf1907304db435661f3a';

  /** URL base da API TMDb */
  private readonly BASE_URL = 'https://api.themoviedb.org/3';

  /** URL base para imagens */
  private readonly IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

  /** Chave para armazenamento de favoritos */
  private readonly FAVORITES_KEY = 'snipe_favorites';

  /** Subject para notificar mudanças nos favoritos */
  private favoritosSubject = new BehaviorSubject<Movie[]>([]);

  /** Observable público dos favoritos */
  public favoritos$ = this.favoritosSubject.asObservable();
  /** Cache de géneros */
  private genresCache: Genre[] = [];

  /** Cache para requisições da API com TTL de 10 minutos */
  private requestCache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos em ms

  /**
   * Construtor do serviço de filmes
   * @param http - Cliente HTTP
   * @param storage - Serviço de armazenamento
   */
  constructor(private http: HttpClient, private storage: Storage) {
    this.initStorage();
    this.loadGenres();
  }
  /**
   * Inicializa o armazenamento
   */
  private async initStorage(): Promise<void> {
    await this.storage.create();
    this.loadFavorites();
  }

  /**
   * Verifica se existe cache válido para uma chave
   */
  private isCacheValid(key: string): boolean {
    const cached = this.requestCache.get(key);
    return cached ? cached.expiry > Date.now() : false;
  }

  /**
   * Obtém dados do cache
   */
  private getCachedData(key: string): any {
    const cached = this.requestCache.get(key);
    return cached?.data;
  }

  /**
   * Armazena dados no cache
   */
  private setCacheData(key: string, data: any): void {
    this.requestCache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Limpa cache expirado
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (value.expiry <= now) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Pesquisa filmes e séries
   * @param query - Termo de pesquisa
   * @param page - Página da pesquisa (padrão: 1)
   * @returns Observable com resultados da pesquisa
   */
  searchMovies(query: string, page: number = 1): Observable<TMDbResponse> {
    const url = `${this.BASE_URL}/search/multi`;
    const params = {
      api_key: this.API_KEY,
      query: encodeURIComponent(query),
      page: page.toString(),
      language: 'pt-PT',
      include_adult: 'false',
    };

    return this.http.get<TMDbResponse>(url, { params }).pipe(
      map((response) => this.processMoviesResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtém filmes populares
   * @param page - Página (padrão: 1)
   * @returns Observable com filmes populares
   */
  getPopularMovies(page: number = 1): Observable<TMDbResponse> {
    const url = `${this.BASE_URL}/movie/popular`;
    const params = {
      api_key: this.API_KEY,
      page: page.toString(),
      language: 'pt-PT',
    };

    return this.http.get<TMDbResponse>(url, { params }).pipe(
      map((response) => this.processMoviesResponse(response)),
      catchError(this.handleError)
    );
  }
  /**
   * Obtém séries populares (excluindo Talk Shows)
   * @param page - Página (padrão: 1)
   * @returns Observable com séries populares
   */
  getPopularTVShows(page: number = 1): Observable<TMDbResponse> {
    const url = `${this.BASE_URL}/tv/popular`;
    const params = {
      api_key: this.API_KEY,
      page: page.toString(),
      language: 'pt-PT',
      without_genres: '10767', // Exclui Talk Shows (ID 10767 no TMDb)
    };

    return this.http.get<TMDbResponse>(url, { params }).pipe(
      map((response) => this.processMoviesResponse(response)),
      catchError(this.handleError)
    );
  }
  /**
   * Obtém filmes por gênero
   * @param genreId ID do gênero
   * @param mediaType Tipo de mídia (movie, tv, all)
   * @param page Número da página
   */
  searchByGenre(
    genreId: number,
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    page: number = 1
  ): Observable<any> {
    // Limpar cache expirado periodicamente
    this.cleanExpiredCache();

    const cacheKey = `genre_${genreId}_${mediaType}_${page}`;
    
    // Verificar cache
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Cache hit para gênero ${genreId}`);
      return of(this.getCachedData(cacheKey));
    }

    const params = {
      api_key: this.API_KEY,
      language: 'pt-PT',
      with_genres: genreId.toString(),
      page: page.toString(),
      include_adult: false,
      'sort_by': 'vote_average.desc', // Prioriza filmes melhor avaliados
      'vote_count.gte': '100', // Mínimo de votos para confiabilidade
    };

    if (mediaType === 'all') {
      // Buscar filmes e séries em paralelo e combinar resultados
      return forkJoin([
        this.http.get<any>(`${this.BASE_URL}/discover/movie`, { params }),
        this.http.get<any>(`${this.BASE_URL}/discover/tv`, { params }),
      ]).pipe(
        map(([movieResponse, tvResponse]) => {
          const combinedResults = [
            ...(movieResponse.results || []).map((movie: any) => ({ ...movie, media_type: 'movie' })),
            ...(tvResponse.results || []).map((tv: any) => ({ ...tv, media_type: 'tv' })),
          ];
          
          const response = {
            ...movieResponse,
            results: combinedResults,
          };

          // Armazenar no cache
          this.setCacheData(cacheKey, response);
          console.log(`💾 Dados em cache para gênero ${genreId}`);
          
          return response;
        }),
        catchError(this.handleError)
      );
    }

    // Se for específico para filme ou série
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    return this.http
      .get(`${this.BASE_URL}/discover/${endpoint}`, { params })
      .pipe(
        map((response: any) => {
          // Adicionar media_type se não existir
          if (response.results) {
            response.results = response.results.map((item: any) => ({
              ...item,
              media_type: item.media_type || mediaType
            }));
          }

          // Armazenar no cache
          this.setCacheData(cacheKey, response);
          console.log(`💾 Dados em cache para gênero ${genreId} (${mediaType})`);
          
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Carrega lista de géneros
   */
  private loadGenres(): void {
    const movieGenresUrl = `${this.BASE_URL}/genre/movie/list`;
    const tvGenresUrl = `${this.BASE_URL}/genre/tv/list`;
    const params = { api_key: this.API_KEY, language: 'pt-PT' };

    // Carrega géneros de filmes e séries
    Promise.all([
      this.http.get<GenresResponse>(movieGenresUrl, { params }).toPromise(),
      this.http.get<GenresResponse>(tvGenresUrl, { params }).toPromise(),
    ])
      .then(([movieGenres, tvGenres]) => {
        const allGenres = [
          ...(movieGenres?.genres || []),
          ...(tvGenres?.genres || []),
        ];
        // Remove duplicatas
        this.genresCache = allGenres.filter(
          (genre, index, self) =>
            index === self.findIndex((g) => g.id === genre.id)
        );
      })
      .catch((error) => {
        console.error('Erro ao carregar géneros:', error);
      });
  }

  /**
   * Obtém lista de géneros
   * @returns Array de géneros
   */
  getGenres(): Genre[] {
    return this.genresCache;
  }

  /**
   * Processa resposta da API TMDb
   * @param response - Resposta da API
   * @returns Resposta processada
   */
  private processMoviesResponse(response: TMDbResponse): TMDbResponse {
    response.results = response.results.map((movie) => ({
      ...movie,
      title: movie.title || movie.name || '',
      media_type: movie.media_type || (movie.title ? 'movie' : 'tv'),
    }));
    return response;
  }

  /**
   * Constrói URL completa da imagem
   * @param path - Caminho da imagem
   * @param size - Tamanho da imagem (padrão: 'w500')
   * @returns URL completa da imagem
   */
  getImageUrl(path: string, size: string = 'w500'): string {
    if (!path) return 'assets/icon/no-image.png';
    return `${this.IMAGE_BASE_URL}/${size}${path}`;
  }

  /**
   * Adiciona filme aos favoritos
   * @param movie - Filme a adicionar
   */
  async addToFavorites(movie: Movie): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const movieWithDate = { ...movie, dataAdicionado: Date.now() };

      if (!favorites.find((f) => f.id === movie.id)) {
        favorites.push(movieWithDate);
        await this.storage.set(this.FAVORITES_KEY, favorites);
        this.favoritosSubject.next(favorites);
      }
    } catch (error) {
      console.error('Erro ao adicionar aos favoritos:', error);
      throw error;
    }
  }

  /**
   * Remove filme dos favoritos
   * @param movieId - ID do filme
   */
  async removeFromFavorites(movieId: number): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter((f) => f.id !== movieId);
      await this.storage.set(this.FAVORITES_KEY, updatedFavorites);
      this.favoritosSubject.next(updatedFavorites);
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      throw error;
    }
  }

  /**
   * Verifica se filme está nos favoritos
   * @param movieId - ID do filme
   * @returns True se estiver nos favoritos
   */
  async isFavorite(movieId: number): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((f) => f.id === movieId);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      return false;
    }
  }

  /**
   * Obtém lista de favoritos
   * @returns Promise com array de favoritos
   */
  async getFavorites(): Promise<Movie[]> {
    try {
      const favorites = (await this.storage.get(this.FAVORITES_KEY)) || [];
      return favorites;
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      return [];
    }
  }

  /**
   * Carrega favoritos e atualiza o subject
   */
  private async loadFavorites(): Promise<void> {
    const favorites = await this.getFavorites();
    this.favoritosSubject.next(favorites);
  }

  /**
   * Ordena lista de filmes
   * @param movies - Lista de filmes
   * @param sortBy - Critério de ordenação
   * @returns Lista ordenada
   */
  sortMovies(movies: Movie[], sortBy: string): Movie[] {
    const sorted = [...movies];

    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) =>
          (a.title || '').localeCompare(b.title || '')
        );
      case 'date':
        return sorted.sort((a, b) => {
          const dateA = new Date(
            a.release_date || a.first_air_date || ''
          ).getTime();
          const dateB = new Date(
            b.release_date || b.first_air_date || ''
          ).getTime();
          return dateB - dateA;
        });
      case 'rating':
        return sorted.sort((a, b) => b.vote_average - a.vote_average);
      case 'popularity':
        return sorted.sort((a, b) => b.popularity - a.popularity);
      case 'dateAdded':
        return sorted.sort(
          (a, b) => (b.dataAdicionado || 0) - (a.dataAdicionado || 0)
        );
      default:
        return sorted;
    }
  }

  /**
   * Filtra filmes por tipo
   * @param movies - Lista de filmes
   * @param type - Tipo ('all', 'movie', 'tv')
   * @returns Lista filtrada
   */
  filterMoviesByType(movies: Movie[], type: string): Movie[] {
    if (type === 'all') return movies;
    return movies.filter((movie) => movie.media_type === type);
  }

  /**
   * Determina o tipo de mídia baseado nos dados disponíveis
   * @param movie - Objeto Movie
   * @returns Tipo de mídia ('movie', 'tv', ou 'unknown')
   */
  getMediaTypeFromMovie(movie: Movie): string {
    // Prioriza media_type se disponível
    if (movie.media_type === 'movie' || movie.media_type === 'tv') {
      return movie.media_type;
    }

    // Fallback baseado na presença de campos específicos
    if (movie.title && !movie.name) return 'movie';
    if (movie.name && !movie.title) return 'tv';
    if (movie.first_air_date) return 'tv';
    if (movie.release_date) return 'movie';

    return 'unknown';
  }

  /**
   * Obtém o texto formatado do tipo de mídia em português
   * @param movie - Objeto Movie
   * @returns Texto em português
   */
  getMediaTypeLabel(movie: Movie): string {
    const mediaType = this.getMediaTypeFromMovie(movie);
    switch (mediaType) {
      case 'movie':
        return 'Filme';
      case 'tv':
        return 'Série';
      default:
        return 'Conteúdo';
    }
  }

  /**
   * Trata erros da API
   * @param error - Erro HTTP
   * @returns Observable com erro tratado
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro desconhecido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Chave da API inválida';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado';
          break;
        case 429:
          errorMessage = 'Muitas requisições. Tente novamente mais tarde';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          break;
        default:
          errorMessage = `Erro: ${error.status} - ${error.message}`;
      }
    }

    console.error('Erro na API TMDb:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
