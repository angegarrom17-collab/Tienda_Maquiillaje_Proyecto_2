from django.urls import path
from . import views

# Rutas de sesión usadas por el frontend React (Proyecto 2)
urlpatterns = [
    path('me/', views.usuario_actual_api, name='usuario_actual'),
    path('logout/', views.cerrar_sesion_api, name='cerrar_sesion'),
]
