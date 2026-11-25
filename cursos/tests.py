from django.test import TestCase
from rest_framework.test import APIClient
from datetime import date, timedelta, time
from clientes.models import Cliente
from .models import Curso, InscripcionCurso
from .serializers import CursoSerializer, InscripcionCursoSerializer

class PruebasCursos(TestCase):
    """
    Conjunto de pruebas unitarias y de integración para validar el comportamiento
    de los modelos, serializadores y endpoints del módulo de Cursos e Inscripciones.
    """
    def setUp(self):
        """
        Configuración inicial ejecutada antes de cada prueba individual:
        - Instancia un cliente de pruebas de la API (APIClient).
        - Crea un cliente de prueba en la base de datos.
        - Crea un curso programado base para ser utilizado en las validaciones de cupos y precios.
        """
        self.api = APIClient()
        self.cliente = Cliente.objects.create(cedula='123456', nombre='Ana', email='ana@example.com')
        self.curso = Curso.objects.create(nombre='Maquillaje', descripcion='Basico', fecha=date.today()+timedelta(days=30), hora=time(10,0), duracion_horas=2, precio=10000, cupo_maximo=1, modalidad='VIRTUAL', estado='PROGRAMADO')

    def test_listar_cursos(self):
        """
        Prueba que el endpoint de listado de cursos responda correctamente con un código HTTP 200 (OK).
        """
        self.assertEqual(self.api.get('/api/cursos/').status_code, 200)

    def test_precio_cero(self):
        """
        Prueba la validación del serializador de cursos:
        Verifica que rechace actualizar o asignar un precio menor o igual a cero.
        """
        serializer = CursoSerializer(self.curso, data={'precio': 0}, partial=True)
        self.assertFalse(serializer.is_valid())

    def test_cupo_cero(self):
        """
        Prueba la validación del serializador de cursos:
        Verifica que rechace establecer un cupo máximo menor o igual a cero.
        """
        serializer = CursoSerializer(self.curso, data={'cupo_maximo': 0}, partial=True)
        self.assertFalse(serializer.is_valid())

    def test_inscripcion_valida(self):
        """
        Prueba que una inscripción cumpla con todas las reglas y se guarde exitosamente
        cuando hay cupos disponibles y el cliente está activo.
        """
        serializer = InscripcionCursoSerializer(data={'cliente': self.cliente.pk, 'curso': self.curso.pk, 'estado': 'inscrita'})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.assertEqual(InscripcionCurso.objects.count(), 1)

    def test_curso_sin_cupo(self):
        """
        Prueba el control de capacidad del curso:
        Verifica que el serializador rechace la inscripción de un nuevo cliente
        si el curso ya alcanzó su límite máximo de cupos ocupados.
        """
        InscripcionCurso.objects.create(cliente=self.cliente, curso=self.curso)
        otro = Cliente.objects.create(cedula='654321', nombre='Luis', email='luis@example.com')
        serializer = InscripcionCursoSerializer(data={'cliente': otro.pk, 'curso': self.curso.pk})
        self.assertFalse(serializer.is_valid())

    def test_cliente_inactivo_no_se_inscribe(self):
        """
        Prueba la regla de negocio que exige estado activo:
        Verifica que un cliente inactivo no pueda ser inscrito en ningún curso.
        """
        self.cliente.activo = False
        self.cliente.save()
        serializer = InscripcionCursoSerializer(data={'cliente': self.cliente.pk, 'curso': self.curso.pk})
        self.assertFalse(serializer.is_valid())


    def test_patch_no_reactiva_inscripcion_en_curso_lleno(self):
        """PATCH no puede reactivar una inscripción si el curso ya no tiene cupo."""
        InscripcionCurso.objects.create(cliente=self.cliente, curso=self.curso)  # ocupa el único cupo
        otro = Cliente.objects.create(cedula='654321', nombre='Luis', email='luis@example.com')
        cancelada = InscripcionCurso.objects.create(cliente=otro, curso=self.curso, estado='cancelada')
        serializer = InscripcionCursoSerializer(cancelada, data={'estado': 'inscrita'}, partial=True)
        self.assertFalse(serializer.is_valid())