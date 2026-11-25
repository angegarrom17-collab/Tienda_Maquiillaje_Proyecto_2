from django.test import TestCase
from rest_framework.test import APIClient
from datetime import date, timedelta
from .models import Categoria, Producto
from .serializers import CategoriaSerializer, ProductoSerializer

class PruebasProductos(TestCase):
    """
    Conjunto de pruebas unitarias y de integración para validar el comportamiento
    de los modelos, serializadores y endpoints de la API REST del módulo de Productos y Categorías.
    """
    def setUp(self):
        """
        Configuración inicial ejecutada antes de cada prueba individual:
        - Instancia un cliente de pruebas de la API (APIClient).
        - Crea una categoría base en la base de datos.
        - Define un diccionario de datos válidos para un producto, calculando una fecha de vencimiento segura a futuro.
        """
        self.api = APIClient()
        self.categoria = Categoria.objects.create(nombre='Labiales')
        self.datos = {'nombre': 'Labial rojo', 'categoria': self.categoria.pk, 'precio': '5000.00', 'stock': 10, 'stock_minimo': 2, 'vigencia_meses': 12, 'fecha_vencimiento': str(date.today()+timedelta(days=500))}

    def test_producto_valido(self):
        """
        Prueba que un producto con datos correctos pase las validaciones del serializador,
        pueda ser guardado exitosamente y aumente el conteo de productos en la base de datos.
        """
        serializer = ProductoSerializer(data=self.datos)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.assertEqual(Producto.objects.count(), 1)

    def test_precio_negativo(self):
        """
        Prueba la validación de precios:
        Verifica que el serializador rechace un producto si se le asigna un precio negativo.
        """
        serializer = ProductoSerializer(data={**self.datos, 'precio': '-1.00'})
        self.assertFalse(serializer.is_valid())

    def test_nombre_corto(self):
        """
        Prueba la validación de longitud del nombre:
        Verifica que el serializador invalide el registro si el nombre del producto tiene menos de 2 caracteres.
        """
        serializer = ProductoSerializer(data={**self.datos, 'nombre': 'A'})
        self.assertFalse(serializer.is_valid())

    def test_vencimiento_insuficiente(self):
        """
        Prueba la regla de negocio de vigencia mínima:
        Verifica que el serializador rechace el producto si su fecha de vencimiento
        ocurre demasiado pronto (incumpliendo el plazo mínimo exigido por los meses de vigencia).
        """
        serializer = ProductoSerializer(data={**self.datos, 'fecha_vencimiento': str(date.today()+timedelta(days=10))})
        self.assertFalse(serializer.is_valid())

    def test_categoria_nombre_corto(self):
        """
        Prueba la validación del serializador de categorías:
        Verifica que rechace nombres de categoría con una longitud menor a 2 caracteres.
        """
        self.assertFalse(CategoriaSerializer(data={'nombre': 'A'}).is_valid())

    def test_listar_productos(self):
        """
        Prueba que el endpoint de listado de productos responda correctamente con un código HTTP 200 (OK).
        """
        self.assertEqual(self.api.get('/api/productos/').status_code, 200)


    def test_filtro_no_numerico_da_400(self):
        """Un filtro con texto en lugar de número responde 400 y no un error 500."""
        self.assertEqual(self.api.get('/api/productos/?categoria=abc').status_code, 400)
        self.assertEqual(self.api.get('/api/productos/?proveedor=abc').status_code, 400)