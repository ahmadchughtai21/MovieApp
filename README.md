## 🔗 View Live

Experience Madflix in action at: [madflix.ahmadchughtai.me](https://madflix.ahmadchughtai.me)

# 🎬 Madflix - Full Stack Movie & TV Show Platform

A comprehensive movie and TV show platform built with Django (backend) and React (frontend), featuring a modern UI design and seamless integration with TMDB API.

## 🌟 Features

### Backend (Django)
- 🎬 Complete movie and TV show database integration with TMDB API
- 🔍 Advanced search functionality across movies and TV shows
- 📚 Genre-based content organization
- 🎯 Detailed movie/show information with cast, crew, and ratings
- 📺 Season and episode management for TV shows
- 🌐 RESTful API endpoints
- 📱 Responsive web interface
- ⚡ Fast and efficient data caching

### Frontend (React)
- 🎨 Modern, intuitive user interface
- 🔍 Intuitive search with real-time results
- 📺 Video player for movies and TV shows
- 📚 Browse by genres, trending, popular, and top-rated content
- ⭐ Content ratings and detailed information
- 🎯 Responsive design for all screen sizes

## 🏗️ Architecture

```
MovieApp-React/
├── 🖥️  Django Backend
│   ├── madflix/              # Main Django project
│   ├── madflixapp/           # Core application
│   │   ├── api_views.py      # API endpoints
│   │   ├── api_urls.py       # API routing
│   │   ├── models.py         # Data models
│   │   └── serializers.py    # API serializers
│   ├── templates/            # Web templates
│   ├── static/               # Static files
│   └── requirements.txt      # Python dependencies
│
└── 🌐 React Frontend
    └── frontend/
        ├── src/              # React components and logic
        ├── public/           # Static assets
        └── package.json      # Frontend dependencies
```

## 📚 API Integration

The application interacts with the [TMDB API](https://www.themoviedb.org/documentation/api) to fetch comprehensive data for:
- Movies (now playing, popular, upcoming, top-rated)
- TV Shows (airing today, on-air, popular, top-rated)
- Genre-based categorization
- Search functionality
- Detailed movie/show information
- Cast and crew details
- Similar content recommendations

## 🎨 Design System

The platform features a clean, modern interface with:
- Intuitive navigation and user flow
- Responsive layouts for mobile and desktop
- Consistent styling and visual hierarchy
- Optimized performance for media-rich content

## ✨ Key Highlights

- **Trending Content**: Real-time trending movies and TV shows
- **Advanced Search**: Multi-field search with instant results
- **Genre Exploration**: Browse content by specific genres and categories
- **Detailed Views**: Comprehensive information including ratings, cast, crew, and recommendations
- **Media Playback**: Integrated video player for seamless viewing experience


## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing comprehensive movie and TV show data
- [Django](https://www.djangoproject.com/) for the robust backend framework
- [React](https://react.dev/) for the modern frontend library
- [Vite](https://vitejs.dev/) for fast frontend development and building

---
*Built with ❤️ by Ahmad Chughtai*
