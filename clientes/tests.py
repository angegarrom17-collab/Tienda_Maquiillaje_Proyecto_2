from django.test import TestCase
from rest_framework.test import APIClient
from .models import Cliente
from .serializers import ClienteSerializer
from django.contrib.auth.models import User, Permission

class PruebasClientes(TestCase):
    """
    Conjunto de pruebas unitarias y de integración para validar el comportamiento
    del modelo, serializador y los endpoints de la API REST del módulo de Clientes.
    """
    def setUp(self):
        """
        Configuración inicial ejecutada antes de cada prueba individual:
        - Instancia un cliente de pruebas de la API (APIClient).
        - Crea y autentica un superusuario para permitir peticiones protegidas.
        - Define un diccionario de datos base reutilizable en los tests.
        """
        self.api = APIClient()
        self.usuario = User.objects.create_superuser(username='tienda_belleza_user',password='Belleza2026!')
        self.api.force_authenticate(user=self.usuario)
        self.datos = {'cedula': '123456789', 'nombre': 'Ana Solis', 'email': 'ana@example.com'}

    def test_crear_cliente(self):
        """
        Prueba que la API permita crear un cliente exitosamente mediante una petición POST,
        verificando que devuelva un código HTTP 201 (Created) y que el registro exista en la base de datos.
        """
        respuesta = self.api.post('/api/clientes/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertTrue(Cliente.objects.filter(cedula='123456789').exists())

    def test_listar_clientes(self):
        """
        Prueba que el endpoint de listado responda correctamente con un código HTTP 200 (OK)
        cuando existen clientes registrados en el sistema.
        """
        Cliente.objects.create(**self.datos)
        self.assertEqual(self.api.get('/api/clientes/').status_code, 200)

    def test_cedula_corta(self):
        """
        Prueba la validación del serializador:
        Verifica que rechace la creación si la cédula ingresada no cumple con la longitud mínima requerida.
        """
        datos = {**self.datos, 'cedula': '123'}
        self.assertFalse(ClienteSerializer(data=datos).is_valid())

    def test_cedula_duplicada(self):
        """
        Prueba que el serializador invalide los datos si se intenta registrar
        un cliente con un número de cédula que ya se encuentra registrado en el sistema.
        """
        Cliente.objects.create(**self.datos)
        self.assertFalse(ClienteSerializer(data={**self.datos, 'email': 'otra@example.com'}).is_valid())

    def test_cliente_inexistente(self):
        """
        Prueba que al realizar una consulta por ID a un cliente que no existe,
        la API responda adecuadamente con un código HTTP 404 (Not Found).
        """
        self.assertEqual(self.api.get('/api/clientes/999999/').status_code, 404)


    def test_sin_token_da_401(self):
        """Sin autenticación, crear un cliente responde 401 (no 403)."""
        respuesta = APIClient().post('/api/clientes/', {}, format='json')
        self.assertEqual(respuesta.status_code, 401)

    def test_eliminar_cliente_con_facturas_da_409(self):
        """Un cliente con facturas no se borra: responde 409 en lugar de un error 500."""
        from facturas.models import Factura
        cliente = Cliente.objects.create(**self.datos)
        Factura.objects.create(cliente=cliente)
        self.assertEqual(self.api.delete(f'/api/clientes/{cliente.id}/').status_code, 409)





    def _api_con_permisos(self, username, permisos, staff=True):
        """Crea un usuario de prueba con solo los permisos indicados y devuelve un cliente API autenticado."""
        usuario = User.objects.create_user(username=username, password='x', is_staff=staff)
        usuario.user_permissions.add(*Permission.objects.filter(codename__in=permisos))
        api = APIClient()
        api.force_authenticate(user=usuario)
        return api

    def test_consulta_no_puede_crear_cliente_403(self):
        """Un usuario que solo tiene permiso de lectura recibe 403 al intentar crear un cliente."""
        api = self._api_con_permisos('consulta', ['view_cliente'])
        respuesta = api.post('/api/clientes/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(Cliente.objects.count(), 0)

    def test_operador_no_puede_eliminar_cliente_403(self):
        """Un usuario que puede ver, crear y editar, pero no eliminar, recibe 403 y el cliente se conserva."""
        cliente = Cliente.objects.create(**self.datos)
        api = self._api_con_permisos('operador', ['view_cliente', 'add_cliente', 'change_cliente'])
        respuesta = api.delete(f'/api/clientes/{cliente.id}/')
        self.assertEqual(respuesta.status_code, 403)
        self.assertTrue(Cliente.objects.filter(id=cliente.id).exists())

    def test_usuario_no_staff_recibe_403(self):
        """Un usuario autenticado que no es del personal recibe 403, aunque tenga el permiso."""
        api = self._api_con_permisos('externo', ['add_cliente'], staff=False)
        respuesta = api.post('/api/clientes/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 403)

    def test_paginacion_de_clientes(self):
        """Con 7 clientes y 5 por página, hay 2 páginas: la primera con 5 y la segunda con 2."""
        for i in range(7):
            Cliente.objects.create(cedula=f'10000{i}', nombre=f'Cliente {i}', email=f'c{i}@example.com')
        pagina1 = self.api.get('/api/clientes/?page=1').json()
        pagina2 = self.api.get('/api/clientes/?page=2').json()
        self.assertEqual(pagina1['total_registros'], 7)
        self.assertEqual(pagina1['total_paginas'], 2)
        self.assertEqual(len(pagina1['resultados']), 5)
        self.assertEqual(len(pagina2['resultados']), 2)

    def test_filtros_combinados_activo_y_buscar(self):
        """El filtro activo y la búsqueda por nombre se aplican a la vez."""
        Cliente.objects.create(cedula='200001', nombre='Ana Mora', email='ana1@example.com', activo=True)
        Cliente.objects.create(cedula='200002', nombre='Ana Rojas', email='ana2@example.com', activo=False)
        Cliente.objects.create(cedula='200003', nombre='Luis Mora', email='luis@example.com', activo=True)
        datos = self.api.get('/api/clientes/?activo=true&buscar=Ana').json()
        self.assertEqual(datos['total_registros'], 1)
        self.assertEqual(datos['resultados'][0]['cedula'], '200001')


