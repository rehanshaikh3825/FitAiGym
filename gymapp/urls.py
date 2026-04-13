from django.urls import path
from . import views, chat
from .views_auth import login_view, logout_view, register_view

urlpatterns = [
    path('', views.home, name='home'),
    path('features/', views.features, name='features'),
    path('exercise-predictor/', views.exercise_predictor, name='exercise_predictor'),
    path('diet-predictor/', views.diet_predictor, name='diet_predictor'),
    path('pricing/', views.pricing, name='pricing'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('shop/', views.shop, name='shop'),
    path('shop/add/', views.add_product, name='add_product'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('register/', register_view, name='register'),
    # Silence Chrome DevTools probe 404s
    path('.well-known/appspecific/com.chrome.devtools.json', views.chrome_devtools_probe, name='chrome_devtools_probe'),
    # API endpoints
    path('api/exercise-recommendations/', views.api_exercise_recommendations, name='api_exercise_recommendations'),
    path('api/diet-recommendations/', views.api_diet_recommendations, name='api_diet_recommendations'),
    path('api/place-order/', views.place_order, name='place_order'),
    path('api/chat/', chat.chat_api, name='chat_api'),
]

