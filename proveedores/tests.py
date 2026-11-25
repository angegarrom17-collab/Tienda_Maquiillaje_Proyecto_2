from django.test import TestCase
from rest_framework.test import APIClient
from datetime import date, timedelta
from productos.models import Categoria, Producto
from .models import Proveedor, EntradaProducto
from .serializers import ProveedorSerializer, EntradaProductoSerializer

class PruebasProveedores(TestCase):
    """
    Conjunto de pruebas unitarias y de integración para validar el comportamiento
    de los modelos, serializadores y endpoints del módulo de Proveedores y Entradas de Productos.
    """
    def setUp(self):
        """
        Configuración inicial ejecutada antes de cada prueba individual:
        - Instancia un cliente de pruebas de la API (APIClient).
        - Crea un proveedor base activo con datos de contacto válidos.
        - Crea una categoría y un producto asociado a dicho proveedor para probar las entradas de inventario.
        """
        self.api = APIClient()
        self.proveedor = Proveedor.objects.create(nombre='Distribuidora', telefono='88887777', correo='proveedor@example.com', direccion='San Jose Costa Rica')
        categoria = Categoria.objects.create(nombre='Bases')
        self.producto = Producto.objects.create(nombre='Base liquida', categoria=categoria, precio=8000, stock=5, fecha_vencimiento=date.today()+timedelta(days=500), proveedor=self.proveedor)

    def test_listar_proveedores(self):
        """
        Prueba que el endpoint de listado de proveedores responda correctamente con un código HTTP 200 (OK).
        """
        self.assertEqual(self.api.get('/api/proveedores/').status_code, 200)

    def test_telefono_invalido(self):
        """
        Prueba la validación de formato del teléfono en el serializador:
        Verifica que rechace actualizar un teléfono que no cumpla con la longitud exacta de 8 dígitos.
        """
        serializer = ProveedorSerializer(self.proveedor, data={'telefono': '123'}, partial=True)
        self.assertFalse(serializer.is_valid())

    def test_nombre_corto(self):
        """
        Prueba la validación de longitud del nombre del proveedor:
        Verifica que el serializador rechace nombres que posean menos de 3 caracteres.
        """
        serializer = ProveedorSerializer(self.proveedor, data={'nombre': 'A'}, partial=True)
        self.assertFalse(serializer.is_valid())

    def test_entrada_aumenta_stock(self):
        """
        Prueba la lógica de negocio del modelo EntradaProducto:
        Verifica que al registrar una entrada de mercancía, el stock actual del producto 
        se incremente de manera automática y correcta en la base de datos.
        """
        EntradaProducto.objects.create(proveedor=self.proveedor, producto=self.producto, cantidad=3)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 8)

    def test_entrada_cantidad_cero(self):
        """
        Prueba la validación de cantidades en las entradas:
        Verifica que el serializador rechace registros de entrada con cantidades iguales o menores a cero.
        """
        serializer = EntradaProductoSerializer(data={'proveedor': self.proveedor.pk, 'producto': self.producto.pk, 'cantidad': 0})
        self.assertFalse(serializer.is_valid())

    def test_proveedor_inactivo_no_recibe_entrada(self):
        """
        Prueba la regla de operatividad del proveedor:
        Verifica que el serializador invalide la creación de una entrada de productos 
        si el proveedor asociado se encuentra inactivo.
        """
        self.proveedor.activo = False
        self.proveedor.save()
        serializer = EntradaProductoSerializer(data={'proveedor': self.proveedor.pk, 'producto': self.producto.pk, 'cantidad': 2})
        self.assertFalse(serializer.is_valid())