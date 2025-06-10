import { Injectable } from '@angular/core';
import { FilmesService } from './filmes.service';
import { Observable, map, of, forkJoin, from, switchMap } from 'rxjs';
import { Movie } from '../services/filmes.service';

@Injectable({
  providedIn: 'root',
})
export class RecommendationsService {
  constructor(private filmesService: FilmesService) {}

  getRecommendationsBasedOnFavorites(): Observable<Movie[]> {
    console.log('Iniciando busca de recomendações...');
    // Get favorites asynchronously
    return from(this.filmesService.getFavorites()).pipe(
      switchMap((favorites: Movie[]) => {
        console.log('Favoritos carregados:', favorites);
        if (!favorites || favorites.length === 0) {
          console.log('Sem favoritos para gerar recomendações');
          return of([]); // Return empty array if no favorites
        }

        // Extract unique genres from favorites
        const genres = this.extractGenres(favorites);
        console.log('Géneros únicos extraídos:', genres);

        // For each genre, search similar movies
        const genreRequests = genres.map((genreId: number) => {
          console.log('Buscando filmes para género:', genreId);
          return this.filmesService.searchByGenre(genreId, 'all', 1);
        });

        // Combine all results
        return forkJoin(genreRequests).pipe(
          map((responses: any[]) => {
            console.log('Respostas recebidas:', responses);
            // Combine all movies into a single list
            const allMovies = responses.reduce(
              (acc: Movie[], response: any) => {
                return acc.concat(response.results || []);
              },
              []
            );
            console.log('Total de filmes encontrados:', allMovies.length);

            // Filter duplicates and movies that are already favorites
            const uniqueMovies = this.filterDuplicatesAndFavorites(
              allMovies,
              favorites
            );
            console.log('Filmes únicos após filtro:', uniqueMovies.length);

            // Sort by rating and limit to 10 movies
            const recommendations = this.sortByRating(uniqueMovies).slice(
              0,
              10
            );
            console.log('Recomendações finais:', recommendations);
            return recommendations;
          })
        );
      })
    );
  }

  private extractGenres(favorites: Movie[]): number[] {
    const genresSet = new Set<number>();
    favorites.forEach((movie: Movie) => {
      movie.genre_ids?.forEach((genreId: number) => {
        genresSet.add(genreId);
      });
    });
    return Array.from(genresSet);
  }

  private filterDuplicatesAndFavorites(
    movies: Movie[],
    favorites: Movie[]
  ): Movie[] {
    const favoriteIds = new Set(favorites.map((f: Movie) => f.id));
    const uniqueMovies = new Map<number, Movie>();

    movies.forEach((movie: Movie) => {
      if (!favoriteIds.has(movie.id) && !uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    });

    return Array.from(uniqueMovies.values());
  }

  private sortByRating(movies: Movie[]): Movie[] {
    return movies.sort(
      (a: Movie, b: Movie) => (b.vote_average || 0) - (a.vote_average || 0)
    );
  }
}
