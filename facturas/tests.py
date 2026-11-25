from django.test import TestCase
from rest_framework.test import APIClient
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from clientes.models import Cliente
from productos.models import Categoria, Producto
from .models import Factura, DetalleFactura
from django.contrib.auth.models import User,Permission

class PruebasFacturas(TestCase):
    """
    Conjunto de pruebas unitarias y de integración para validar el comportamiento
    de los modelos, validaciones a nivel de base de datos/clean() y endpoints de la API 
    del módulo de Facturas y Detalles de Factura.
    """
    def setUp(self):
        """
        Configuración inicial ejecutada antes de cada prueba individual:
        - Instancia un cliente de pruebas de la API (APIClient).
        - Crea un superusuario autenticado para simular peticiones con privilegios administrativos.
        - Crea registros base en la base de datos: un cliente, una categoría, un producto con stock 
          y una factura inicial en estado 'PENDIENTE'.
        """
        self.api = APIClient()
        self.usuario = User.objects.create_superuser(username='tienda_belleza_user',password='Belleza2026!')
        self.api.force_authenticate(user=self.usuario)
        self.cliente = Cliente.objects.create(cedula='123456', nombre='Ana', email='ana@example.com')
        categoria = Categoria.objects.create(nombre='Sombras')
        self.producto = Producto.objects.create(nombre='Sombra', categoria=categoria, precio=3000, stock=10, fecha_vencimiento=date.today()+timedelta(days=500))
        self.factura = Factura.objects.create(cliente=self.cliente, estado='PENDIENTE')

    def test_crear_factura(self):
        """
        Prueba que la factura base se cree correctamente con el estado 'PENDIENTE' 
        y aumente el conteo de registros en la base de datos.
        """
        self.assertEqual(Factura.objects.count(), 1)
        self.assertEqual(self.factura.estado, 'PENDIENTE')

    def test_listar_facturas(self):
        """
        Prueba que el endpoint de listado de facturas responda correctamente 
        con un código HTTP 200 (OK) bajo autenticación de administrador.
        """
        self.assertEqual(self.api.get('/api/facturas/').status_code, 200)

    def test_detalle_sin_producto_ni_curso(self):
        """
        Prueba la validación de integridad del detalle de factura:
        Verifica que se lance una ValidationError si se intenta guardar un detalle 
        que no especifica ni un producto ni un curso asociado.
        """
        detalle = DetalleFactura(factura=self.factura, cantidad=1, precio_unitario=1, subtotal=1)
        with self.assertRaises(ValidationError):
            detalle.clean()

    def test_detalle_cantidad_cero(self):
        """
        Prueba la regla de cantidades en el detalle:
        Verifica que se rechace mediante ValidationError un detalle de factura 
        cuya cantidad sea igual a cero.
        """
        detalle = DetalleFactura(factura=self.factura, producto=self.producto, cantidad=0, precio_unitario=3000, subtotal=0)
        with self.assertRaises(ValidationError):
            detalle.clean()

    def test_factura_cancelada_no_admite_detalle(self):
        """
        Prueba la restricción de estado de la factura principal:
        Verifica que no se puedan agregar nuevos detalles a una factura 
        si esta se encuentra en estado 'CANCELADA'.
        """
        self.factura.estado = 'CANCELADA'
        self.factura.save()
        detalle = DetalleFactura(factura=self.factura, producto=self.producto, cantidad=1, precio_unitario=3000, subtotal=3000)
        with self.assertRaises(ValidationError):
            detalle.clean()

    def test_stock_insuficiente(self):
        """
        Prueba el control de inventario en las ventas:
        Verifica que se lance una ValidationError si se intenta facturar una cantidad 
        de producto que excede el stock actualmente disponible.
        """
        detalle = DetalleFactura(factura=self.factura, producto=self.producto, cantidad=20, precio_unitario=3000, subtotal=60000)
        with self.assertRaises(ValidationError):
            detalle.clean()

    def test_factura_pagada_no_admite_detalle(self):
        """No se pueden agregar detalles a una factura PAGADA (respuesta 400 y stock intacto)."""
        self.factura.estado = 'PAGADA'
        self.factura.save()
        respuesta = self.api.post(
            f'/api/facturas/{self.factura.id}/detalles/',
            {'producto': self.producto.id, 'cantidad': 1},
            format='json'
        )
        self.assertEqual(respuesta.status_code, 400)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 10)


    def test_usuario_solo_lectura_lista_pero_no_crea_facturas(self):
        """Con permiso view_factura puede listar (200), pero no crear (403)."""
        lector = User.objects.create_user(username='lector', password='x', is_staff=True)
        lector.user_permissions.add(Permission.objects.get(codename='view_factura'))
        api = APIClient()
        api.force_authenticate(user=lector)
        self.assertEqual(api.get('/api/facturas/').status_code, 200)
        self.assertEqual(
            api.post('/api/facturas/', {'cliente': self.cliente.id}, format='json').status_code, 403
        )