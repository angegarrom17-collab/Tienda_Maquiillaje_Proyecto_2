from datetime import date, timedelta

from django.contrib.auth.models import Permission, User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from django.test import TestCase

from productos.models import Categoria, Producto


class PruebasSesionFrontend(TestCase):
    """Pruebas de los endpoints agregados en el Proyecto 2 para el frontend React."""

    def setUp(self):
        self.usuario = User.objects.create_user(username='operador', password='x', is_staff=True)
        self.usuario.user_permissions.add(Permission.objects.get(codename='view_cliente'))
        self.token = Token.objects.create(user=self.usuario)
        self.api = APIClient()

    def test_me_sin_token_da_401(self):
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 401)

    def test_me_devuelve_perfil_y_permisos(self):
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        datos = self.api.get('/api/auth/me/').json()
        self.assertEqual(datos['username'], 'operador')
        self.assertIn('clientes.view_cliente', datos['permisos'])
        self.assertTrue(datos['is_staff'])

    def test_logout_revoca_el_token(self):
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.assertEqual(self.api.post('/api/auth/logout/').status_code, 200)
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())
        # El mismo token ya no sirve
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 401)

    def test_ordenamiento_de_productos(self):
        categoria = Categoria.objects.create(nombre='Bases')
        vence = date.today() + timedelta(days=500)
        for nombre, precio in [('B', 300), ('A', 100), ('C', 200)]:
            Producto.objects.create(nombre=nombre, categoria=categoria, precio=precio, fecha_vencimiento=vence)
        datos = self.api.get('/api/productos/?ordering=-precio').json()
        self.assertEqual([p['nombre'] for p in datos['resultados']], ['B', 'C', 'A'])
        self.assertEqual(self.api.get('/api/productos/?ordering=clave').status_code, 400)
