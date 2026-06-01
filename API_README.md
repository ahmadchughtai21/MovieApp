# 🎬 MadFlix API Documentation

A comprehensive Django REST API for movies and TV shows data, built on top of The Movie Database (TMDB) API.

## 🚀 Quick Start

### Server Setup
1. **Activate Virtual Environment:**
   ```bash
   source testvenv/bin/activate
   ```

2. **Install Dependencies (if needed):**
   ```bash
   pip install djangorestframework django-cors-headers
   ```

3. **Run Migrations (if needed):**
   ```bash
   python manage.py migrate
   ```

4. **Start Server:**
   ```bash
   python manage.py runserver
   ```

5. **Access API:**
   - **API Base URL:** `http://localhost:8000/api/`
   - **API Documentation:** `http://localhost:8000/api-docs/`
   - **JSON Endpoints List:** `http://localhost:8000/api/`

## 📋 API Features

### ✅ Complete Functionality
- **Movies:** Trending, Popular, Top Rated, Upcoming, Now Playing
- **TV Shows:** Trending, Popular, Top Rated, Airing Today, On The Air
- **Search:** Movies, TV Shows, Multi-search across all content
- **Details:** Complete movie/show information with streaming URLs
- **Genres:** Complete genre listings and filtering
- **Navigation:** Episode navigation for TV shows
- **Streaming:** Video URLs for both movies and TV shows
- **Pagination:** All list endpoints support pagination
- **CORS:** Enabled for frontend development

### 🎯 Key Advantages
- **Organized Structure:** Endpoints grouped by functionality
- **Consistent Response Format:** All endpoints return JSON
- **Error Handling:** Proper error responses with details
- **No Authentication Required:** All endpoints are public
- **Frontend Ready:** CORS enabled for React/Vue/Angular apps

## 🔗 API Endpoints Reference

### 🏠 Home & General
- `GET /api/` - List all available endpoints
- `GET /api/home/` - Get homepage data (trending, popular, etc.)

### 🎬 Movies
- `GET /api/movies/` - All movie categories
- `GET /api/movies/trending/?time_window=week` - Trending movies
- `GET /api/movies/popular/?page=1` - Popular movies
- `GET /api/movies/top-rated/?page=1` - Top rated movies
- `GET /api/movies/upcoming/?page=1` - Upcoming movies
- `GET /api/movies/now-playing/?page=1` - Now playing movies
- `GET /api/movies/search/?query=avengers&page=1` - Search movies
- `GET /api/movies/{movie_id}/` - Movie details + streaming URL
- `GET /api/movies/genre/?genre_id=28&page=1` - Movies by genre

### 📺 TV Shows
- `GET /api/shows/` - All TV show categories
- `GET /api/shows/trending/?time_window=week` - Trending shows
- `GET /api/shows/popular/?page=1` - Popular shows
- `GET /api/shows/top-rated/?page=1` - Top rated shows
- `GET /api/shows/airing-today/?page=1` - Airing today
- `GET /api/shows/on-the-air/?page=1` - On the air
- `GET /api/shows/search/?query=friends&page=1` - Search shows
- `GET /api/shows/{show_id}/?season=1&episode=1` - Show details + streaming URL
- `GET /api/shows/genre/?genre_id=18&page=1` - Shows by genre
- `GET /api/shows/{show_id}/season/{season_number}/` - Season details
- `GET /api/shows/{show_id}/season/{season_number}/episode/{episode_number}/` - Episode details

### 🏷️ Genres
- `GET /api/genres/` - All genres (movies + shows)
- `GET /api/genres/movies/` - Movie genres only
- `GET /api/genres/shows/` - TV show genres only

### 🔧 Utility
- `GET /api/search/?query=marvel&page=1` - Multi-search (movies, shows, people)
- `GET /api/config/` - TMDB configuration (image URLs, etc.)

## 🎯 Frontend Usage Examples

### React/JavaScript Examples

#### 1. **Fetch Homepage Data:**
```javascript
const fetchHomepageData = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/home/');
    const data = await response.json();

    console.log('Movies:', data.movies);
    console.log('Shows:', data.shows);
    console.log('Genres:', data.genres);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### 2. **Search Movies:**
```javascript
const searchMovies = async (query, page = 1) => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/movies/search/?query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await response.json();

    return data.results; // Array of movies
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};
```

#### 3. **Get Movie Details with Streaming:**
```javascript
const getMovieDetails = async (movieId) => {
  try {
    const response = await fetch(`http://localhost:8000/api/movies/${movieId}/`);
    const data = await response.json();

    console.log('Movie Details:', data.movie_details);
    console.log('Streaming URL:', data.streaming_url);
    console.log('Similar Movies:', data.similar_movies);
    console.log('Cast & Crew:', data.credits);

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### 4. **Get TV Show Episode with Navigation:**
```javascript
const getShowEpisode = async (showId, season = 1, episode = 1) => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/shows/${showId}/?season=${season}&episode=${episode}`
    );
    const data = await response.json();

    console.log('Show Details:', data.show_details);
    console.log('Episode Details:', data.episode_details);
    console.log('Streaming URL:', data.streaming_url);
    console.log('Next Episode:', data.navigation_info?.next_episode);
    console.log('Previous Episode:', data.navigation_info?.prev_episode);
    console.log('All Seasons:', data.seasons_data);

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### 5. **Get Movies by Genre with Pagination:**
```javascript
const getMoviesByGenre = async (genreId, page = 1) => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/movies/genre/?genre_id=${genreId}&page=${page}`
    );
    const data = await response.json();

    console.log('Genre Info:', data.genre_info);
    console.log('Movies:', data.results);
    console.log('Total Pages:', data.total_pages);

    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const MovieList = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/movies/popular/');
        const data = await response.json();
        setMovies(data.results);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularMovies();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="movie-grid">
      {movies.map(movie => (
        <div key={movie.id} className="movie-card">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
          />
          <h3>{movie.title}</h3>
          <p>{movie.overview}</p>
          <p>Rating: {movie.vote_average}/10</p>
        </div>
      ))}
    </div>
  );
};

export default MovieList;
```

## 🎨 Common Genre IDs

### Movies:
- **28** - Action
- **35** - Comedy
- **18** - Drama
- **27** - Horror
- **878** - Science Fiction
- **53** - Thriller
- **10749** - Romance
- **16** - Animation
- **14** - Fantasy
- **80** - Crime

### TV Shows:
- **10759** - Action & Adventure
- **35** - Comedy
- **18** - Drama
- **80** - Crime
- **10765** - Sci-Fi & Fantasy
- **9648** - Mystery
- **10751** - Family
- **16** - Animation
- **99** - Documentary
- **10762** - Kids

## 📱 Response Format

All endpoints return JSON in this format:

### Success Response:
```json
{
  "results": [...],
  "page": 1,
  "total_pages": 100,
  "total_results": 2000
}
```

### Error Response:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

### Movie/Show Details Response:
```json
{
  "movie_details": {...},
  "similar_movies": {...},
  "credits": {...},
  "videos": {...},
  "streaming_url": "https://vidapi.xyz/embedmulti/movie/123"
}
```

## 🔧 Configuration & Settings

### CORS Configuration
- **Allowed Origins:** Localhost (3000, 8000), Production domains
- **Allowed Headers:** Standard headers + custom headers
- **Credentials:** Enabled for development

### Pagination
- **Default Page Size:** 20 items per page
- **Page Parameter:** `?page=1`
- **Response includes:** `page`, `total_pages`, `total_results`

### Rate Limiting
- Currently no rate limiting implemented
- TMDB API limits apply (check TMDB documentation)

## 🛠️ Development Notes

### File Structure:
```
madflixapp/
├── api_views.py        # All API endpoint logic
├── api_urls.py         # API URL routing
├── serializers.py      # Input validation
├── views.py            # Original template views (unchanged)
└── urls.py             # Original URLs + API docs
```

### Key Features:
- **Separate API Logic:** API views are completely separate from template views
- **Unchanged Original:** All existing template-based pages work as before
- **Proper Error Handling:** Try-catch blocks with meaningful error messages
- **Validation:** Input validation using DRF serializers
- **Documentation:** Built-in API documentation page

### Adding New Endpoints:
1. Add view function in `api_views.py`
2. Add URL pattern in `api_urls.py`
3. Update documentation in `api_docs.html`
4. Test the endpoint

## 🚀 Production Deployment

### Environment Variables:
```bash
# Add to production settings
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
]
CORS_ALLOW_ALL_ORIGINS = False  # Set to False in production
```

### Security Considerations:
- Set proper CORS origins for production
- Consider rate limiting for production use
- Monitor TMDB API usage limits
- Use environment variables for sensitive data

---

## 🎯 Quick Test Commands

Test the API quickly with these curl commands:

```bash
# Get all endpoints
curl http://localhost:8000/api/

# Get homepage data
curl http://localhost:8000/api/home/

# Search movies
curl "http://localhost:8000/api/movies/search/?query=avengers"

# Get movie details
curl http://localhost:8000/api/movies/550/

# Get show with episode
curl "http://localhost:8000/api/shows/1399/?season=1&episode=1"

# Get genres
curl http://localhost:8000/api/genres/
```

---

**🎬 Happy Coding! Your MadFlix API is ready for frontend development!**
