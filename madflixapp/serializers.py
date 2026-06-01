from rest_framework import serializers

class GenreSerializer(serializers.Serializer):
    """Serializer for genre data"""
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)

class MovieSearchSerializer(serializers.Serializer):
    """Serializer for movie search input"""
    query = serializers.CharField(max_length=255)
    page = serializers.IntegerField(default=1, min_value=1)

class TVSearchSerializer(serializers.Serializer):
    """Serializer for TV show search input"""
    query = serializers.CharField(max_length=255)
    page = serializers.IntegerField(default=1, min_value=1)

class MoviePlayerSerializer(serializers.Serializer):
    """Serializer for movie player data"""
    id = serializers.IntegerField()

class ShowPlayerSerializer(serializers.Serializer):
    """Serializer for show player data"""
    id = serializers.IntegerField()
    season = serializers.IntegerField(default=1, min_value=1)
    episode = serializers.IntegerField(default=1, min_value=1)

class GenreDiscoverSerializer(serializers.Serializer):
    """Serializer for genre-based discovery"""
    genre_id = serializers.IntegerField()
    page = serializers.IntegerField(default=1, min_value=1)
