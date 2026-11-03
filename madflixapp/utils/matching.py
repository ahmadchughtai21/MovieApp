from madflixapp.models import MovieLog, TasteMatch, Watchlist


def _rating_map(user):
    return {
        log.tmdb_id: float(log.rating)
        for log in MovieLog.objects.filter(user=user, rating__isnull=False)
    }


def _title_set(user):
    logged = set(MovieLog.objects.filter(user=user).values_list('tmdb_id', flat=True))
    saved = set(Watchlist.objects.filter(user=user).values_list('tmdb_id', flat=True))
    return logged | saved


def calculate_taste_match(user_a, user_b):
    ratings_a = _rating_map(user_a)
    ratings_b = _rating_map(user_b)

    common_titles = set(ratings_a) & set(ratings_b)
    if common_titles:
        total_diff = sum(
            abs(ratings_a[tmdb_id] - ratings_b[tmdb_id])
            for tmdb_id in common_titles
        )
        rating_score = 100 - (total_diff / len(common_titles) * 20)
    else:
        rating_score = 50

    set_a = _title_set(user_a)
    set_b = _title_set(user_b)
    union = set_a | set_b
    jaccard_score = (len(set_a & set_b) / len(union) * 100) if union else 50

    score = int(round((rating_score * 0.6) + (jaccard_score * 0.4)))
    score = max(0, min(100, score))

    match, _ = TasteMatch.objects.update_or_create(
        user_a=user_a,
        user_b=user_b,
        defaults={'match_percentage': score},
    )
    return match
