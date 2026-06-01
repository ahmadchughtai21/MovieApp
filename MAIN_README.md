# 🎬 Madflix - Full Stack Movie & TV Show Platform

A comprehensive movie and TV show platform built with Django (backend) and React Native (mobile app), featuring a modern dark frosted glass UI design.

## 🌟 Features

### Backend (Django)
- 🎬 Complete movie and TV show database integration with TMDB API
- 🔍 Advanced search functionality across movies and TV shows
- 📚 Genre-based content organization
- 🎯 Detailed movie/show information with cast, crew, and ratings
- 📺 Season and episode management for TV shows
- 🌐 RESTful API endpoints for mobile app integration
- 📱 Responsive web interface
- ⚡ Fast and efficient data caching

### Mobile App (React Native)
- 📱 Native mobile experience for iOS and Android
- 🎨 Modern dark frosted glass UI design
- 🔍 Intuitive search with suggestions and filters
- 📺 Video player with custom controls
- 📚 Browse by genres, trending, popular, and top-rated content
- ⭐ Content ratings and detailed information
- 🎯 Responsive design for all screen sizes
- 🌙 Dark theme optimized for movie watching

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
└── 📱 React Native Mobile App
    └── frontend/react-native-app/
        ├── src/
        │   ├── components/   # Reusable UI components
        │   ├── screens/      # App screens
        │   ├── navigation/   # Navigation setup
        │   ├── services/     # API integration
        │   └── constants/    # App configuration
        ├── assets/           # Images, fonts, icons
        └── package.json      # Dependencies
```

## 🚀 Quick Start

### 1. Backend Setup (Django)

```bash
# Navigate to project root
cd MovieApp-React

# Create virtual environment
python -m venv testvenv
source testvenv/bin/activate  # On Windows: testvenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

The Django server will be available at `http://localhost:8000`

### 2. Mobile App Setup (React Native)

```bash
# Navigate to React Native app
cd frontend/react-native-app

# Run setup script
chmod +x setup.sh
./setup.sh

# Or manual setup:
npm install
npm install -g @expo/cli

# Update API URL in src/constants/index.js
# Change BASE_URL to your Django server URL

# Start development server
npm start
```

## 📚 API Documentation

The Django backend provides a comprehensive API for the mobile app:

### Base URL
```
http://localhost:8000/api/
```

### Key Endpoints

#### Movies
- `GET /movies/` - Get all movies
- `GET /movies/trending/` - Trending movies
- `GET /movies/popular/` - Popular movies
- `GET /movies/top-rated/` - Top rated movies
- `GET /movies/upcoming/` - Upcoming movies
- `GET /movies/{id}/` - Movie details
- `GET /movies/search/?query=` - Search movies

#### TV Shows
- `GET /shows/` - Get all TV shows
- `GET /shows/trending/` - Trending shows
- `GET /shows/popular/` - Popular shows
- `GET /shows/top-rated/` - Top rated shows
- `GET /shows/{id}/` - Show details
- `GET /shows/{id}/season/{season}/` - Season details

#### Search & Discovery
- `GET /search/?query=` - Multi-search (movies & shows)
- `GET /genres/` - All genres
- `GET /movies/genre/?genre_id=` - Movies by genre
- `GET /shows/genre/?genre_id=` - Shows by genre

## 🎨 Design System

### Mobile App UI Components

#### Glass Container
Modern frosted glass effect using expo-blur:
```javascript
<GlassContainer intensity={90} borderRadius={16}>
  <Text>Content with frosted glass background</Text>
</GlassContainer>
```

#### Movie Cards
Responsive cards with ratings and genre information:
```javascript
<MovieCard
  movie={movieData}
  size="medium"
  onPress={handlePress}
  showRating={true}
/>
```

#### Hero Cards
Featured content with gradient overlays and action buttons:
```javascript
<HeroCard
  movie={featuredMovie}
  onPress={handleDetails}
  onPlayPress={handlePlay}
/>
```

### Color Palette
```javascript
const COLORS = {
  primary: '#1a1a1a',
  accent: '#ff6b6b',
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
}
```

## 🔧 Configuration

### Django Settings
Update `madflix/settings.py` for production:
- Set `DEBUG = False`
- Configure `ALLOWED_HOSTS`
- Set up database (PostgreSQL recommended)
- Configure static files serving

### React Native Configuration
Update `src/constants/index.js`:
```javascript
export const API_CONFIG = {
  BASE_URL: 'https://your-production-server.com/api',
  // ... other config
};
```

## 📱 Mobile App Features

### Screens
1. **Home Screen** - Featured content, trending movies/shows
2. **Movies Screen** - Browse movies by category and genre
3. **Shows Screen** - Browse TV shows with season information
4. **Search Screen** - Advanced search with filters and suggestions
5. **Detail Screen** - Comprehensive content information
6. **Player Screen** - Custom video player with controls
7. **Genre Screen** - Browse content by specific genres
8. **Profile Screen** - User preferences and app settings

### Navigation
- **Bottom Tab Navigation** - Easy access to main sections
- **Stack Navigation** - Smooth transitions between screens
- **Modal Presentation** - Video player and detail views

### Key Features
- **Responsive Design** - Adapts to all screen sizes
- **Offline Support** - Cached data for better performance
- **Search Functionality** - Real-time search with debouncing
- **Video Playback** - Custom video player with seek controls
- **Genre Filtering** - Browse content by specific genres

## 🛠️ Development

### Adding New Components
```bash
# Create new component
touch src/components/NewComponent.js

# Add to component exports
echo "export { default as NewComponent } from './NewComponent';" >> src/components/index.js
```

### API Integration
All API calls go through the `ApiService` class:
```javascript
// Add new API method
async getNewData() {
  try {
    const response = await this.client.get('/new-endpoint/');
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

## 📋 Testing

### Backend Testing
```bash
# Run Django tests
python manage.py test

# Test specific app
python manage.py test madflixapp
```

### Mobile App Testing
```bash
# Run on different platforms
npm run android  # Android emulator
npm run ios      # iOS simulator
npm run web      # Web browser

# Test on real device with Expo Go app
npm start  # Scan QR code with Expo Go
```

## 🚀 Deployment

### Django Deployment
1. **Railway/Heroku**: Configure `Procfile` and requirements
2. **VPS**: Use gunicorn + nginx setup
3. **Docker**: Container-based deployment

### React Native Deployment
1. **Expo Build Service**: `expo build:android` / `expo build:ios`
2. **EAS Build**: Modern Expo build service
3. **App Stores**: Submit to Google Play Store and Apple App Store

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie and TV show data
- [Expo](https://expo.dev/) for React Native development tools
- [Django](https://www.djangoproject.com/) for the robust backend framework
- [React Native Paper](https://reactnativepaper.com/) for UI components

## 📞 Support

For support, please:
1. Check the documentation
2. Search existing [issues](https://github.com/ahmadchughtai21/MovieApp/issues)
3. Create a new issue if needed
4. Contact the development team

---

**Built with ❤️ by Ahmad Chughtai**
