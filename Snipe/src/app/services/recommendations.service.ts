import { Injectable } from '@angular/core';
import { FilmesService } from './filmes.service';
import { Observable, map, of, forkJoin, from, switchMap, combineLatest } from 'rxjs';
import { Movie } from '../services/filmes.service';

interface GenreWeight {
  id: number;
  weight: number;
}

interface RecommendationScore {
  movie: Movie;
  score: number;
  factors: {
    genreMatch: number;
    rating: number;
    popularity: number;
    recency: number;
    similarity: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RecommendationsService {
  private readonly MIN_RATING = 6.0; // Mínimo de avaliação para recomendações
  private readonly MIN_VOTE_COUNT = 100; // Mínimo de votos para confiabilidade
  private readonly RECOMMENDATION_LIMIT = 15; // Limite de recomendações

  constructor(private filmesService: FilmesService) {}

  /**
   * Obtém recomendações baseadas nos favoritos do utilizador
   * Algoritmo avançado que considera múltiplos fatores
   */
  getRecommendationsBasedOnFavorites(): Observable<Movie[]> {
    console.log('🎯 Iniciando algoritmo avançado de recomendações...');
    
    return from(this.filmesService.getFavorites()).pipe(
      switchMap((favorites: Movie[]) => {
        if (!favorites || favorites.length === 0) {
          console.log('❌ Sem favoritos, retornando filmes populares');
          return this.getFallbackRecommendations();
        }

        console.log(`📊 Analisando ${favorites.length} favoritos...`);
        
        // Análise dos padrões dos favoritos
        const analysis = this.analyzeFavorites(favorites);
        console.log('🔍 Análise dos favoritos:', analysis);

        // Buscar candidatos baseados nos gêneros preferidos
        const genreRequests = analysis.topGenres.map((genreWeight: GenreWeight) => {
          // Buscar múltiplas páginas para gêneros mais importantes
          const pages = genreWeight.weight > 0.3 ? [1, 2] : [1];
          
          return combineLatest(
            pages.map(page => 
              this.filmesService.searchByGenre(genreWeight.id, 'all', page)
            )
          ).pipe(
            map(responses => ({
              genreId: genreWeight.id,
              weight: genreWeight.weight,
              movies: responses.reduce((acc: Movie[], response: any) => 
                acc.concat(response.results || []), [])
            }))
          );
        });

        return forkJoin(genreRequests).pipe(
          map((genreResults: any[]) => {
            // Combinar todos os candidatos
            const allCandidates = genreResults.reduce((acc: Movie[], result) => {
              return acc.concat(result.movies || []);
            }, []);

            console.log(`🎬 Encontrados ${allCandidates.length} candidatos`);

            // Filtrar e pontuar candidatos
            const scoredMovies = this.scoreMovies(allCandidates, favorites, analysis);
            console.log(`⭐ ${scoredMovies.length} filmes pontuados`);

            // Diversificar recomendações
            const diversifiedMovies = this.diversifyRecommendations(scoredMovies, analysis);
            
            const finalRecommendations = diversifiedMovies
              .slice(0, this.RECOMMENDATION_LIMIT)
              .map(item => item.movie);

            console.log(`✅ ${finalRecommendations.length} recomendações finais geradas`);
            this.logRecommendationInsights(diversifiedMovies.slice(0, 5));

            return finalRecommendations;
          })
        );
      })
    );
  }

  /**
   * Analisa os padrões dos filmes favoritos
   */
  private analyzeFavorites(favorites: Movie[]) {
    const genreFrequency = new Map<number, number>();
    const ratings: number[] = [];
    const years: number[] = [];
    let totalPopularity = 0;

    favorites.forEach(movie => {
      // Contabilizar gêneros
      movie.genre_ids?.forEach(genreId => {
        genreFrequency.set(genreId, (genreFrequency.get(genreId) || 0) + 1);
      });

      // Coletar estatísticas
      if (movie.vote_average) ratings.push(movie.vote_average);
      if (movie.popularity) totalPopularity += movie.popularity;

      // Extrair ano
      const releaseDate = movie.release_date || movie.first_air_date;
      if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        if (!isNaN(year)) years.push(year);
      }
    });

    // Calcular gêneros mais importantes com pesos
    const totalMovies = favorites.length;
    const topGenres: GenreWeight[] = Array.from(genreFrequency.entries())
      .map(([id, count]) => ({
        id,
        weight: count / totalMovies
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6); // Top 6 gêneros

    return {
      topGenres,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 7.0,
      avgPopularity: totalPopularity / favorites.length,
      recentYearPreference: years.length ? Math.max(...years) : new Date().getFullYear(),
      totalFavorites: totalMovies
    };
  }

  /**
   * Pontua filmes candidatos baseado em múltiplos fatores
   */
  private scoreMovies(
    candidates: Movie[], 
    favorites: Movie[], 
    analysis: any
  ): RecommendationScore[] {
    const favoriteIds = new Set(favorites.map(f => f.id));
    const uniqueCandidates = this.removeDuplicates(candidates, favoriteIds);

    return uniqueCandidates
      .filter(movie => this.isEligibleForRecommendation(movie))
      .map(movie => {
        const factors = this.calculateScoreFactors(movie, analysis);
        const totalScore = this.calculateTotalScore(factors);

        return {
          movie,
          score: totalScore,
          factors
        };
      })
      .sort((a, b) => b.score - a.score);
  }
  /**
   * Verifica se um filme é elegível para recomendação
   */
  private isEligibleForRecommendation(movie: Movie): boolean {
    return (
      (movie.vote_average || 0) >= this.MIN_RATING &&
      (movie.vote_count || 0) >= this.MIN_VOTE_COUNT &&
      !!movie.poster_path && // Deve ter poster
      !!(movie.title || movie.name) // Deve ter título
    );
  }

  /**
   * Calcula fatores individuais de pontuação
   */
  private calculateScoreFactors(movie: Movie, analysis: any) {
    const genreMatch = this.calculateGenreMatch(movie, analysis.topGenres);
    const rating = Math.min((movie.vote_average || 0) / 10, 1);
    const popularity = Math.min((movie.popularity || 0) / 1000, 1);
    const recency = this.calculateRecencyScore(movie, analysis.recentYearPreference);
    const similarity = this.calculateSimilarityBonus(movie, analysis);

    return { genreMatch, rating, popularity, recency, similarity };
  }

  /**
   * Calcula correspondência de gênero com peso
   */
  private calculateGenreMatch(movie: Movie, topGenres: GenreWeight[]): number {
    if (!movie.genre_ids || movie.genre_ids.length === 0) return 0;

    let totalWeight = 0;
    movie.genre_ids.forEach(genreId => {
      const genreWeight = topGenres.find(g => g.id === genreId);
      if (genreWeight) {
        totalWeight += genreWeight.weight;
      }
    });

    return Math.min(totalWeight, 1);
  }

  /**
   * Calcula pontuação de recência
   */
  private calculateRecencyScore(movie: Movie, preferredYear: number): number {
    const releaseDate = movie.release_date || movie.first_air_date;
    if (!releaseDate) return 0.5;

    const movieYear = new Date(releaseDate).getFullYear();
    const yearDiff = Math.abs(movieYear - preferredYear);
    
    // Favorece filmes mais próximos do ano preferido
    return Math.max(0, 1 - (yearDiff / 20));
  }

  /**
   * Calcula bônus de similaridade
   */
  private calculateSimilarityBonus(movie: Movie, analysis: any): number {
    let bonus = 0;

    // Bônus por rating similar
    if (movie.vote_average) {
      const ratingDiff = Math.abs(movie.vote_average - analysis.avgRating);
      bonus += Math.max(0, 1 - (ratingDiff / 5)) * 0.3;
    }

    // Bônus por popularidade similar
    if (movie.popularity) {
      const popDiff = Math.abs(movie.popularity - analysis.avgPopularity);
      bonus += Math.max(0, 1 - (popDiff / analysis.avgPopularity)) * 0.2;
    }

    return Math.min(bonus, 0.5);
  }

  /**
   * Calcula pontuação total ponderada
   */
  private calculateTotalScore(factors: any): number {
    return (
      factors.genreMatch * 0.35 +      // 35% - Correspondência de gênero
      factors.rating * 0.25 +          // 25% - Qualidade do filme
      factors.popularity * 0.15 +      // 15% - Popularidade
      factors.recency * 0.15 +         // 15% - Recência
      factors.similarity * 0.10        // 10% - Similaridade
    );
  }

  /**
   * Diversifica recomendações para evitar monotonia
   */
  private diversifyRecommendations(
    scoredMovies: RecommendationScore[], 
    analysis: any
  ): RecommendationScore[] {
    const diversified: RecommendationScore[] = [];
    const usedGenres = new Set<number>();
    const mediaTypeCounts = { movie: 0, tv: 0 };

    // Primeiro passe: melhores pontuações
    scoredMovies.slice(0, 8).forEach(item => {
      diversified.push(item);
      item.movie.genre_ids?.forEach(id => usedGenres.add(id));
      
      const mediaType = item.movie.title ? 'movie' : 'tv';
      mediaTypeCounts[mediaType]++;
    });

    // Segundo passe: diversificação
    const remaining = scoredMovies.slice(8);
    for (const item of remaining) {
      if (diversified.length >= this.RECOMMENDATION_LIMIT) break;

      // Verificar diversidade de gênero
      const hasNewGenre = item.movie.genre_ids?.some(id => !usedGenres.has(id));
      const mediaType = item.movie.title ? 'movie' : 'tv';
      const needsMediaBalance = Math.abs(mediaTypeCounts.movie - mediaTypeCounts.tv) > 3;

      if (hasNewGenre || needsMediaBalance) {
        diversified.push(item);
        item.movie.genre_ids?.forEach(id => usedGenres.add(id));
        mediaTypeCounts[mediaType]++;
      }
    }

    return diversified;
  }

  /**
   * Remove duplicatas e favoritos já existentes
   */
  private removeDuplicates(movies: Movie[], favoriteIds: Set<number>): Movie[] {
    const unique = new Map<number, Movie>();
    
    movies.forEach(movie => {
      if (!favoriteIds.has(movie.id) && !unique.has(movie.id)) {
        unique.set(movie.id, movie);
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Recomendações de fallback quando não há favoritos
   */
  private getFallbackRecommendations(): Observable<Movie[]> {
    return combineLatest([
      this.filmesService.getPopularMovies(1),
      this.filmesService.getPopularTVShows(1)
    ]).pipe(
      map(([movies, tvShows]) => {
        const combined = [
          ...(movies.results || []).slice(0, 8),
          ...(tvShows.results || []).slice(0, 7)
        ];
        
        return combined
          .filter(movie => (movie.vote_average || 0) >= this.MIN_RATING)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
          .slice(0, this.RECOMMENDATION_LIMIT);
      })
    );
  }

  /**
   * Log insights das recomendações para debug
   */
  private logRecommendationInsights(topRecommendations: RecommendationScore[]) {
    console.log('🏆 Top 5 Recomendações:');
    topRecommendations.forEach((rec, index) => {
      const movie = rec.movie;
      console.log(`${index + 1}. ${movie.title || movie.name} (${rec.score.toFixed(3)})`);
      console.log(`   Fatores: Gênero(${rec.factors.genreMatch.toFixed(2)}) Rating(${rec.factors.rating.toFixed(2)}) Pop(${rec.factors.popularity.toFixed(2)})`);
    });
  }
}
