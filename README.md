You can checkout the website here:- [tenflix.online](https://tenflix.online)

# Django Movie and TV Show Browsing Platform

This project is a Django-based web application that allows users to browse and watch movies and TV shows by fetching data from the TMDB API. The platform includes features like trending movies and shows, search functionality, genre-based browsing, and an embedded video player for movies and TV shows.

## Features

- **Home Page**: Displays trending movies and shows, popular movies, upcoming movies, and top-rated shows.
- **Movies Page**: Allows users to browse movies currently playing, popular movies, and upcoming releases.
- **TV Shows Page**: Allows users to browse airing today, on-the-air shows, popular shows, and top-rated shows.
- **Search**: Users can search for specific movies or TV shows.
- **Movie/TV Show Player**: Embedded video player for movies and TV shows, with additional information about the movie or episode.
- **Genre Browsing**: Browse movies and TV shows by specific genres.

## API Integration

The application interacts with the [TMDB API](https://www.themoviedb.org/documentation/api) to fetch data for movies, TV shows, and genres. 

## Setup Instructions

### Prerequisites

- Python 3.x
- Django
- Requests library

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/your-repository.git
    cd your-repository
    ```

2. **Install dependencies**:
    Make sure you have Django and requests installed. You can install them using pip:
    ```bash
    pip install django requests
    ```


3. **Run migrations**:
    Apply the migrations to set up the database:
    ```bash
    python manage.py migrate
    ```

4. **Run the server**:
    Start the Django development server:
    ```bash
    python manage.py runserver
    ```

5. **Access the application**:
    Open your browser and go to `http://127.0.0.1:8000` to view the application.

## Project Structure

- **home.html**: The main page with sections for trending movies, popular movies, upcoming movies, airing today, on-the-air, and top-rated shows.
- **movies.html**: The movies page, displaying now playing, popular, and upcoming movies.
- **shows.html**: The TV shows page, displaying airing today, on-the-air, popular, and top-rated shows.
- **moviesearchresult.html**: Displays the results of a movie search query.
- **showsearchresult.html**: Displays the results of a TV show search query.
- **movieplayer.html**: The movie player page, with embedded video and movie details.
- **showplayer.html**: The TV show player page, with embedded video, episode details, and similar shows.
- **moviesgenre.html**: Displays movies of a specific genre.
- **showsgenre.html**: Displays TV shows of a specific genre.

## API Endpoints Used

- **Trending Movies This Week**: `https://api.themoviedb.org/3/trending/movie/week`
- **Popular Movies**: `https://api.themoviedb.org/3/movie/popular`
- **Upcoming Movies**: `https://api.themoviedb.org/3/movie/upcoming`
- **Airing Today Shows**: `https://api.themoviedb.org/3/tv/airing_today`
- **On The Air Shows**: `https://api.themoviedb.org/3/tv/on_the_air`
- **Trending TV Shows This Week**: `https://api.themoviedb.org/3/trending/tv/week`
- **Top-Rated Shows**: `https://api.themoviedb.org/3/tv/top_rated`
- **Movie Search**: `https://api.themoviedb.org/3/search/movie`
- **TV Show Search**: `https://api.themoviedb.org/3/search/tv`
- **Movie Details**: `https://api.themoviedb.org/3/movie/{id}`
- **TV Show Details**: `https://api.themoviedb.org/3/tv/{id}`
- **Similar Movies**: `https://api.themoviedb.org/3/movie/{id}/similar`
- **Similar TV Shows**: `https://api.themoviedb.org/3/tv/{id}/similar`
- **Movies by Genre**: `https://api.themoviedb.org/3/discover/movie?with_genres={id}`
- **TV Shows by Genre**: `https://api.themoviedb.org/3/discover/tv?with_genres={id}`


## Acknowledgements

- [TMDB API](https://www.themoviedb.org/documentation/api) for providing the movie and TV show data.
- [VidSrc](https://vidsrc.cc/) for the embedded video player.


## Screenshots

![Screenshot_31-8-2024_15031_tenflix online](https://github.com/user-attachments/assets/23877bdf-7463-4cde-b883-dc805a09bab8)
![Screenshot_31-8-2024_1516_tenflix online](https://github.com/user-attachments/assets/b79c62f9-d679-4274-8e9a-9c0f94e4ccfa)
![Screenshot_31-8-2024_15346_tenflix online](https://github.com/user-attachments/assets/2f8b9e87-71b5-4e24-b64c-04144cf040f3)

