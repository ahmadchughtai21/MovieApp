from django.contrib import admin
from django.urls import path,include
from . import views

urlpatterns = [

    path("", views.home, name="home"),
    path("movies", views.movies, name="movies"),
    path("moviesearchresult", views.moviesearchresult, name="moviesearchresult"),
    path("shows", views.shows, name="shows"),
    path("showsearchresult", views.showsearchresult, name="showsearchresult"),
    path("movieplayer", views.movieplayer, name="movieplayer"),
    path("showplayer", views.showplayer, name="showplayer"),
    path("moviesgenre", views.moviesgenre, name="moviesgenre"),
    path("showsgenre", views.showsgenre, name="showsgenre"),

]
