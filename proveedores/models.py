from django.db import models, transaction
from django.db.models import F

class Proveedor(models.Model):
    """
    Modelo que representa a los proveedores encargados de abastecer los productos de la tienda.
    Almacena datos de contacto, ubicación y nombre.
    """
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=120)
    telefono = models.CharField(max_length=8)
    correo = models.EmailField(unique=True)
    direccion = models.CharField(max_length=200)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class EntradaProducto(models.Model):
    """
    Modelo que registra las entradas o reabastecimientos de productos suministrados por los proveedores.
    Controla de forma atómica y automática el incremento del stock en el inventario.
    """

    id = models.AutoField(primary_key=True)
    # Proveedor que abastece los productos (protegido contra eliminación si tiene entradas asociadas)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='entradas')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='entradas')
    cantidad = models.PositiveIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Entrada {self.id} - {self.producto}"

    def save(self, *args, **kwargs):
        """
        Método save sobreescrito con control de transacciones atómicas:
        - Si es una entrada nueva, incrementa automáticamente el stock actual del producto.
        - Si se modifica una entrada existente, calcula la diferencia para ajustar correctamente el inventario.
        """
        with transaction.atomic():
            if self.pk:
                # Si se edita, calcula la diferencia respecto a la cantidad anterior para actualizar el stock
                old_instance = EntradaProducto.objects.get(pk=self.pk)
                diferencia = self.cantidad - old_instance.cantidad
                if diferencia != 0:
                    self.producto.__class__.objects.filter(pk=self.producto_id).update(stock=F('stock') + diferencia)
            else:
                # Si es una nueva entrada, suma la cantidad completa al stock del producto
                self.producto.__class__.objects.filter(pk=self.producto_id).update(stock=F('stock') + self.cantidad)
            
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Método delete sobreescrito de forma atómica:
        - Revierte la operación restando la cantidad ingresada del stock actual del producto al eliminar el registro.
        """
        with transaction.atomic():
            self.producto.__class__.objects.filter(pk=self.producto_id).update(stock=F('stock') - self.cantidad)
            super().delete(*args, **kwargs)