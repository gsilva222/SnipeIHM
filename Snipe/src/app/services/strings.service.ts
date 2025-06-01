import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

/**
 * Interface para definir a estrutura das strings da aplicação
 */
export interface AppStrings {
  app: {
    title: string;
    description: string;
  };
  navigation: {
    home: string;
    results: string;
    favorites: string;
  };
  home: {
    title: string;
    search_placeholder: string;
    genre_label: string;
    genre_all: string;
    search_button: string;
    loading: string;
  };
  results: {
    title: string;
    no_results: string;
    sort_by: string;
    sort_relevance: string;
    sort_date: string;
    sort_genre: string;
    loading: string;
  };
  favorites: {
    title: string;
    empty_message: string;
    add_message: string;
    remove_favorite: string;
  };
  movie_card: {
    add_favorite: string;
    remove_favorite: string;
    watch_later: string;
    release_date: string;
    rating: string;
    genre: string;
    available_on: string;
  };
  genres: {
    [key: string]: string;
  };
  errors: {
    network_error: string;
    api_error: string;
    storage_error: string;
    generic_error: string;
  };
  actions: {
    retry: string;
    cancel: string;
    confirm: string;
    close: string;
  };
}

/**
 * Serviço responsável por gerir as strings da aplicação
 * Carrega as strings de ficheiros JSON e fornece acesso centralizado aos textos
 */
@Injectable({
  providedIn: 'root',
})
export class StringsService {
  /** Subject para notificar mudanças nas strings */
  private stringsSubject = new BehaviorSubject<AppStrings | null>(null);

  /** Observable público das strings */
  public strings$ = this.stringsSubject.asObservable();

  /** Strings atualmente carregadas */
  private currentStrings: AppStrings | null = null;

  /**
   * Construtor do serviço de strings
   * @param http - Cliente HTTP para carregar ficheiros JSON
   */
  constructor(private http: HttpClient) {
    this.loadStrings();
  }

  /**
   * Carrega as strings do ficheiro JSON
   * Por defeito carrega o ficheiro português
   * @param language - Código do idioma (por defeito 'pt')
   */
  private async loadStrings(language: string = 'pt'): Promise<void> {
    try {
      const strings = await this.http
        .get<AppStrings>(`assets/i18n/${language}.json`)
        .toPromise();
      this.currentStrings = strings!;
      this.stringsSubject.next(strings!);
    } catch (error) {
      console.error('Erro ao carregar strings:', error);
      // Em caso de erro, usar strings por defeito
      this.loadDefaultStrings();
    }
  }

  /**
   * Carrega strings por defeito em caso de erro no carregamento
   */
  private loadDefaultStrings(): void {
    const defaultStrings: AppStrings = {
      app: { title: 'Snipe', description: 'App de filmes' },
      navigation: {
        home: 'Início',
        results: 'Resultados',
        favorites: 'Favoritos',
      },
      home: {
        title: 'Pesquisar',
        search_placeholder: 'Digite...',
        genre_label: 'Género',
        genre_all: 'Todos',
        search_button: 'Pesquisar',
        loading: 'A carregar...',
      },
      results: {
        title: 'Resultados',
        no_results: 'Sem resultados',
        sort_by: 'Ordenar por:',
        sort_relevance: 'Relevância',
        sort_date: 'Data',
        sort_genre: 'Género',
        loading: 'A carregar...',
      },
      favorites: {
        title: 'Favoritos',
        empty_message: 'Sem favoritos',
        add_message: 'Adicione filmes',
        remove_favorite: 'Remover',
      },
      movie_card: {
        add_favorite: 'Adicionar',
        remove_favorite: 'Remover',
        watch_later: 'Ver depois',
        release_date: 'Data',
        rating: 'Classificação',
        genre: 'Género',
        available_on: 'Disponível em',
      },
      genres: {},
      errors: {
        network_error: 'Erro de rede',
        api_error: 'Erro API',
        storage_error: 'Erro de armazenamento',
        generic_error: 'Erro',
      },
      actions: {
        retry: 'Repetir',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        close: 'Fechar',
      },
    };

    this.currentStrings = defaultStrings;
    this.stringsSubject.next(defaultStrings);
  }

  /**
   * Obtém uma string específica usando notação de pontos
   * @param key - Chave da string (ex: 'home.title')
   * @returns A string correspondente ou a própria chave se não encontrada
   */
  getString(key: string): string {
    if (!this.currentStrings) {
      return key;
    }

    const keys = key.split('.');
    let value: any = this.currentStrings;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Retorna a chave se não encontrar
      }
    }

    return typeof value === 'string' ? value : key;
  }
  /**
   * Alias para getString() - mantém compatibilidade com templates existentes
   * @param key - Chave da string (ex: 'home.title')
   * @returns A string correspondente ou a própria chave se não encontrada
   */
  get(key: string): string {
    return this.getString(key);
  }

  /**
   * Obtém todas as strings atuais
   * @returns Objeto com todas as strings ou null se não carregadas
   */
  getAllStrings(): AppStrings | null {
    return this.currentStrings;
  }

  /**
   * Muda o idioma da aplicação
   * @param language - Código do novo idioma
   */
  async changeLanguage(language: string): Promise<void> {
    await this.loadStrings(language);
  }
}
