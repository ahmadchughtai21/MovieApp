from django.shortcuts import render
import requests
import os


tmdb_api_key = "094fb2bd51d27c7e737e0111053401dd"

movies_genres = [
    {
        "id": 28,
        "name": "Action"
    },
    {
        "id": 12,
        "name": "Adventure"
    },
    {
        "id": 16,
        "name": "Animation"
    },
    {
        "id": 35,
        "name": "Comedy"
    },
    {
        "id": 80,
        "name": "Crime"
    },
    {
        "id": 99,
        "name": "Documentary"
    },
    {
        "id": 18,
        "name": "Drama"
    },
    {
        "id": 10751,
        "name": "Family"
    },
    {
        "id": 14,
        "name": "Fantasy"
    },
    {
        "id": 36,
        "name": "History"
    },
    {
        "id": 27,
        "name": "Horror"
    },
    {
        "id": 10402,
        "name": "Music"
    },
    {
        "id": 9648,
        "name": "Mystery"
    },
    {
        "id": 10749,
        "name": "Romance"
    },
    {
        "id": 878,
        "name": "Science Fiction"
    },
    {
        "id": 10770,
        "name": "TV Movie"
    },
    {
        "id": 53,
        "name": "Thriller"
    },
    {
        "id": 10752,
        "name": "War"
    },
    {
        "id": 37,
        "name": "Western"
    }
]

shows_genres = [
    {
            "id": 10759,
            "name": "Action & Adventure"
        },
        {
            "id": 16,
            "name": "Animation"
        },
        {
            "id": 35,
            "name": "Comedy"
        },
        {
            "id": 80,
            "name": "Crime"
        },
        {
            "id": 99,
            "name": "Documentary"
        },
        {
            "id": 18,
            "name": "Drama"
        },
        {
            "id": 10751,
            "name": "Family"
        },
        {
            "id": 10762,
            "name": "Kids"
        },
        {
            "id": 9648,
            "name": "Mystery"
        },
        {
            "id": 10763,
            "name": "News"
        },
        {
            "id": 10764,
            "name": "Reality"
        },
        {
            "id": 10765,
            "name": "Sci-Fi & Fantasy"
        },
        {
            "id": 10766,
            "name": "Soap"
        },
        {
            "id": 10767,
            "name": "Talk"
        },
        {
            "id": 10768,
            "name": "War & Politics"
        },
        {
            "id": 37,
            "name": "Western"
        }
]


# Create your views here.

def home(request):
    data={
        'm_trending_this_week': '',
        'popular': '',
        'upcoming': '',
        'm_top_rated': '',
        'airing_today': '',
        'on_the_air': '',
        's_trending_this_week': '',
        'top_rated': '',
        'movie_genres': '',
        'show_genres': '',
    }
    m_trending_this_week = f"https://api.themoviedb.org/3/trending/movie/week?api_key={tmdb_api_key}"
    popular = f"https://api.themoviedb.org/3/movie/popular?api_key={tmdb_api_key}"
    upcoming = f"https://api.themoviedb.org/3/movie/upcoming?api_key={tmdb_api_key}"
    m_top_rated = f"https://api.themoviedb.org/3/movie/top_rated?api_key={tmdb_api_key}"
    airing_today = f"https://api.themoviedb.org/3/tv/airing_today?api_key={tmdb_api_key}"
    on_the_air = f"https://api.themoviedb.org/3/tv/on_the_air?api_key={tmdb_api_key}"
    s_trending_this_week = f"https://api.themoviedb.org/3/trending/tv/week?api_key={tmdb_api_key}"
    top_rated = f"https://api.themoviedb.org/3/tv/top_rated?api_key={tmdb_api_key}"
    movie_genres = f"https://api.themoviedb.org/3/genre/movie/list?api_key={tmdb_api_key}"
    show_genres = f"https://api.themoviedb.org/3/genre/tv/list?api_key={tmdb_api_key}"
    response_m_trending_this_week = requests.get(m_trending_this_week)
    response_popular = requests.get(popular)
    response_upcoming = requests.get(upcoming)
    response_m_top_rated = requests.get(m_top_rated)
    response_airing_today = requests.get(airing_today)
    response_on_the_air = requests.get(on_the_air)
    response_s_trending_this_week = requests.get(s_trending_this_week)
    response_top_rated = requests.get(top_rated)
    response_movie_genres = requests.get(movie_genres)
    response_show_genres = requests.get(show_genres)
    data['m_trending_this_week'] = response_m_trending_this_week.json()
    data['popular'] = response_popular.json()
    data['upcoming'] = response_upcoming.json()
    data['m_top_rated'] = response_m_top_rated.json()
    data['airing_today'] = response_airing_today.json()
    data['on_the_air'] = response_on_the_air.json()
    data['s_trending_this_week'] = response_s_trending_this_week.json()
    data['top_rated'] = response_top_rated.json()
    data['movie_genres'] = response_movie_genres.json()
    data['show_genres'] = response_show_genres.json()
    return render(request, "home.html", data)

def movies(request):
    data={
        'now_playing': '',
        'popular': '',
        'upcoming': '',

    }
    now_playing = f"https://api.themoviedb.org/3/movie/now_playing?api_key={tmdb_api_key}"
    popular = f"https://api.themoviedb.org/3/movie/popular?api_key={tmdb_api_key}"
    upcoming = f"https://api.themoviedb.org/3/movie/upcoming?api_key={tmdb_api_key}"
    response_now_playing = requests.get(now_playing)
    response_popular = requests.get(popular)
    response_upcoming = requests.get(upcoming)
    data['now_playing'] = response_now_playing.json()
    data['popular'] = response_popular.json()
    data['upcoming'] = response_upcoming.json()
    return render(request, "movies.html", data)

def moviesearchresult(request):
    if request.method == 'POST':
        search_query = request.POST.get('search_query')
        url = f"https://api.themoviedb.org/3/search/movie?api_key={tmdb_api_key}&query={search_query}"
        response = requests.get(url)
        data = response.json()
        return render(request, "moviesearchresult.html", {'data': data})

    return render(request, "moviesearchresult.html")

def movieplayer(request):
    data={
        'vid_url': '',
        'mov_details': '',
        'similar_movies': '',
    }
    if request.method == 'GET':
        id = request.GET.get('id')
        data['vid_url'] = f"https://vidsrc-embed.ru/embed/movie/{id}"
        url=f"https://api.themoviedb.org/3/movie/{id}?api_key={tmdb_api_key}"
        url_similar_movies = f"https://api.themoviedb.org/3/movie/{id}/similar?api_key={tmdb_api_key}"
        response = requests.get(url)
        response_similar_movies = requests.get(url_similar_movies)
        data['mov_details'] = response.json()
        data['similar_movies'] = response_similar_movies.json()
        return render(request, "movieplayer.html", data)

    return render(request, "movieplayer.html", data)

def shows(request):
    data={
        'airing_today': '',
        'on_the_air': '',
        'popular': '',
        'top_rated': '',
    }
    airing_today = f"https://api.themoviedb.org/3/tv/airing_today?api_key={tmdb_api_key}"
    on_the_air = f"https://api.themoviedb.org/3/tv/on_the_air?api_key={tmdb_api_key}"
    popular = f"https://api.themoviedb.org/3/tv/popular?api_key={tmdb_api_key}"
    top_rated = f"https://api.themoviedb.org/3/tv/top_rated?api_key={tmdb_api_key}"
    response_airing_today = requests.get(airing_today)
    response_popular = requests.get(popular)
    response_on_the_air = requests.get(on_the_air)
    response_top_rated = requests.get(top_rated)
    data['airing_today'] = response_airing_today.json()
    data['popular'] = response_popular.json()
    data['on_the_air'] = response_on_the_air.json()
    data['top_rated'] = response_top_rated.json()

    return render(request, "shows.html",data)

def showsearchresult(request):
    if request.method == 'POST':
        search_query = request.POST.get('search_query')
        url = f"https://api.themoviedb.org/3/search/tv?api_key={tmdb_api_key}&query={search_query}"
        response = requests.get(url)
        data = response.json()
        return render(request, "showsearchresult.html", {'data': data})

    return render(request, "showsearchresult.html")







from django.shortcuts import render
import requests

def showplayer(request):
    data = {
        'vid_url': '',
        'show_details': '',
        'ep_details': '',
        'similar_shows': '',
        'e': '',
        's': '',
        'seasons_data': [],
        'next_episode': None,
        'prev_episode': None,
    }

    if request.method == 'GET':
        id = request.GET.get('id')
        s = int(request.GET.get('s', '1'))
        e = int(request.GET.get('e', '1'))

        # Get show details
        url = f"https://api.themoviedb.org/3/tv/{id}?api_key={tmdb_api_key}"
        url2 = f"https://api.themoviedb.org/3/tv/{id}/season/{s}/episode/{e}?api_key={tmdb_api_key}"
        url_similar_shows = f"https://api.themoviedb.org/3/tv/{id}/similar?api_key={tmdb_api_key}"
        response = requests.get(url)
        response2 = requests.get(url2)
        response_similar_shows = requests.get(url_similar_shows)

        show_details = response.json()
        ep_details = response2.json()
        similar_shows = response_similar_shows.json()

        # Get detailed season information including episode counts
        seasons_data = []
        if 'seasons' in show_details:
            for season in show_details['seasons']:
                if season['air_date']:  # Only include seasons with air dates
                    season_url = f"https://api.themoviedb.org/3/tv/{id}/season/{season['season_number']}?api_key={tmdb_api_key}"
                    season_response = requests.get(season_url)
                    season_data = season_response.json()
                    seasons_data.append({
                        'season_number': season['season_number'],
                        'name': season['name'],
                        'episode_count': len(season_data.get('episodes', [])),
                        'air_date': season['air_date']
                    })

        # Calculate next and previous episode information
        current_season = None
        next_season = None
        prev_season = None

        # Find current, next and previous seasons
        for i, season in enumerate(seasons_data):
            if season['season_number'] == s:
                current_season = season
                if i > 0:
                    prev_season = seasons_data[i - 1]
                if i < len(seasons_data) - 1:
                    next_season = seasons_data[i + 1]
                break

        if current_season:
            # Calculate next episode
            if e < current_season['episode_count']:
                data['next_episode'] = {
                    'season': s,
                    'episode': e + 1
                }
            elif next_season:
                data['next_episode'] = {
                    'season': next_season['season_number'],
                    'episode': 1
                }

            # Calculate previous episode
            if e > 1:
                data['prev_episode'] = {
                    'season': s,
                    'episode': e - 1
                }
            elif prev_season:
                data['prev_episode'] = {
                    'season': prev_season['season_number'],
                    'episode': prev_season['episode_count']
                }

        data['show_details'] = show_details
        data['ep_details'] = ep_details
        data['similar_shows'] = similar_shows
        data['s'] = s
        data['e'] = e
        data['seasons_data'] = seasons_data
        data['vid_url'] = f"https://vidsrc-embed.ru/embed/tv?tmdb={id}&season={s}&episode={e}"

        return render(request, "showplayer.html", data)

    return render(request, "showplayer.html", data)






def moviesgenre(request):
    data ={
        'movies': '',
        'id': '',
        'page': '',
    }
    id = request.GET.get('id')
    page = request.GET.get('page')
    if request.method == 'GET':
        url = f"https://api.themoviedb.org/3/discover/movie?api_key={tmdb_api_key}&with_genres={id}&page={page}"
        response = requests.get(url)
        data['movies'] = response.json()
        data['id'] = id
        data['page'] = page
        genre = next((item['name'] for item in movies_genres if item['id'] == int(id)), None)
        data['genre'] = genre
        return render(request, "moviesgenre.html", data)
    return render(request, "moviesgenre.html", data)

def showsgenre(request):
    data={
        'shows': '',
        'id': '',
        'page': '',
        'genre': '',
    }
    id = request.GET.get('id')
    page = request.GET.get('page')
    url = f"https://api.themoviedb.org/3/discover/tv?api_key={tmdb_api_key}&with_genres={id}&page={page}"
    response = requests.get(url)
    data['shows'] = response.json()
    data['page'] = page
    data['id'] = id
    genre = next((item['name'] for item in shows_genres if item['id'] == int(id)), None)
    data['genre'] = genre
    return render(request, "showsgenre.html", data)

def api_documentation(request):
    """Render the API documentation page"""
    return render(request, "api_docs.html")

