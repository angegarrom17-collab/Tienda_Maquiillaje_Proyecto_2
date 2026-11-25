from django.urls import path
from . import views

# Definición de las rutas URL para la API REST del módulo de cursos e inscripciones
urlpatterns = [
    path('', views.cursos_api, name='cursos'),
    path('estadisticas/', views.estadisticas_cursos_api, name='estadisticas_cursos'),
    path('<int:id>/', views.curso_detalle_api, name='curso_detalle'),
    path('<int:id>/inscripciones/', views.inscripciones_curso_api, name='inscripciones_curso'),
    path('inscripciones/<int:id>/', views.inscripcion_detalle_api, name='inscripcion_detalle'),
]