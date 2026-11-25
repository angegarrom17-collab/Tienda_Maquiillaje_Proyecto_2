from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum


class Factura(models.Model):
    """
    Modelo que representa una factura emitida a un cliente.
    Controla el estado general de la transacción y el monto total a pagar.
    """
    id = models.BigAutoField(primary_key=True)

    ESTADO = [
        ('PENDIENTE', 'Pendiente'),
        ('PAGADA', 'Pagada'),
        ('CANCELADA', 'Cancelada'),
    ]

    # Cliente al que se le emite la factura (protegido contra eliminación si tiene facturas)
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='facturas'
    )

    fecha = models.DateTimeField(auto_now_add=True)

    # Monto total calculado de la factura
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO,
        default='PENDIENTE'
    )

    def __str__(self):
        return f"Factura {self.id}"


class DetalleFactura(models.Model):
    """
    Modelo que representa el detalle factura de manera individual dentro de una factura.
    Puede asociarse a un producto o a un curso.
    """
    id = models.BigAutoField(primary_key=True)

    # Factura principal a la que pertenece este detalle (se elimina en cascada si se borra la factura)
    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='detalles'
    )


    producto = models.ForeignKey(
        'productos.Producto',
        on_delete=models.PROTECT,
        blank=True,
        null=True
    )

    curso = models.ForeignKey(
        'cursos.Curso',
        on_delete=models.PROTECT,
        blank=True,
        null=True
    )

    cantidad = models.PositiveIntegerField(default=1)

    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    # Subtotal calculado (precio unitario * cantidad)
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    def __str__(self):
        return f"Detalle {self.id} - Factura {self.factura.id}"

    
    def clean(self):
        """
        Validaciones de negocio previas a guardar el detalle:
        - Exige seleccionar producto O curso, pero nunca ambos ni ninguno.
        - Valida cantidades positivas y que la factura no esté cancelada.
        - Verifica stock disponible para productos.
        - Valida que el cliente esté previamente inscrito en el curso y no se le facture dos veces.
        """
        if bool(self.producto_id) == bool(self.curso_id):
            raise ValidationError('Seleccione un producto o un curso, no ambos.')
        if self.cantidad < 1:
            raise ValidationError('La cantidad debe ser mayor que cero.')
        if self.factura_id and self.factura.estado != 'PENDIENTE':
            raise ValidationError('Solo se pueden agregar detalles a facturas pendientes.')
        # Validaciones específicas si es un Producto
        if self.producto_id:
            if not self.producto.activo or self.producto.stock < self.cantidad:
                raise ValidationError('Producto inactivo o stock insuficiente.')

        # Validaciones específicas si es un Curso
        if self.curso_id:
            if self.cantidad != 1 or self.curso.estado != 'PROGRAMADO':
                raise ValidationError('El curso debe estar programado y la cantidad debe ser 1.')
            if self.factura_id:
                from cursos.models import InscripcionCurso
                if not InscripcionCurso.objects.filter(
                    cliente_id=self.factura.cliente_id, curso_id=self.curso_id,
                    estado='inscrita'
                ).exists():
                    raise ValidationError('El cliente debe estar inscrito en el curso.')
                if DetalleFactura.objects.filter(
                    factura__cliente_id=self.factura.cliente_id, curso_id=self.curso_id
                ).exclude(factura__estado='CANCELADA').exclude(pk=self.pk).exists():
                    raise ValidationError('Este curso ya fue facturado al cliente.')

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Método save sobreescrito con control de transacciones atómicas y bloqueo de filas:
        - Impide la edición de detalles ya creados para proteger el inventario.
        - Descuenta el stock de productos de forma segura.
        - Calcula el subtotal y recalcula automáticamente el total de la factura.
        """
        # Los detalles existentes no se editan: evita duplicar movimientos de inventario.
        if self.pk:
            raise ValidationError('No se pueden editar detalles existentes. Elimine y cree otro.')

        factura = Factura.objects.select_for_update().get(pk=self.factura_id)
        if factura.estado != 'PENDIENTE':
            raise ValidationError('Solo se pueden agregar detalles a facturas pendientes.')
        self.full_clean(exclude=['precio_unitario', 'subtotal'])

        # Procesamiento de inventario y precios si es un producto
        if self.producto_id:
            from productos.models import Producto
            producto = Producto.objects.select_for_update().get(pk=self.producto_id)
            if not producto.activo or producto.stock < self.cantidad:
                raise ValidationError('Producto inactivo o stock insuficiente.')
            self.precio_unitario = producto.precio
            producto.stock -= self.cantidad
            producto.save(update_fields=['stock'])
        else:
            # Asignación de precio si es un curso
            from cursos.models import Curso
            curso = Curso.objects.get(pk=self.curso_id)
            self.precio_unitario = curso.precio

        # Cálculo de montos y actualización de la factura principal
        self.subtotal = (self.precio_unitario * self.cantidad).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
        factura.total = (factura.total + self.subtotal).quantize(Decimal('0.01'))
        factura.save(update_fields=['total'])

    @transaction.atomic
    def delete(self, *args, **kwargs):
        """
        Método delete sobreescrito de forma atómica:
        - Permite eliminar detalles solo si la factura se encuentra en estado pendiente.
        - Restaura automáticamente el stock del producto al inventario.
        - Recalcula el total general de la factura.
        """
        factura = Factura.objects.select_for_update().get(pk=self.factura_id)
        if factura.estado != 'PENDIENTE':
            raise ValidationError('No se pueden eliminar detalles de facturas cerradas.')

        # Reversión del stock en inventario si involucraba un producto
        if self.producto_id:
            from productos.models import Producto
            producto = Producto.objects.select_for_update().get(pk=self.producto_id)
            producto.stock += self.cantidad
            producto.save(update_fields=['stock'])
        resultado = super().delete(*args, **kwargs)

        # Recálculo del total de la factura tras la eliminación
        total = factura.detalles.aggregate(total=Sum('subtotal'))['total']
        factura.total = total if total is not None else Decimal('0.00')
        factura.save(update_fields=['total'])
        return resultado