from django import forms
from django.contrib import admin
from .models import Factura, DetalleFactura


class FacturaForm(forms.ModelForm):
    """
    Formulario personalizado para la administración del modelo Factura.
    Incluye validaciones de negocio, como impedir la cancelación de facturas 
    que aún contengan detalles asociados en el sistema.
    """
    class Meta:
        model = Factura
        fields = '__all__'

    def clean(self):
        """
        Valida que no se pueda cambiar el estado de una factura a 'CANCELADA' 
        si esta todavía posee registros de detalle activos.
        """
        datos = super().clean()
        if (self.instance.pk and datos.get('estado') == 'CANCELADA'
                and self.instance.detalles.exists()):
            raise forms.ValidationError(
                'No se puede cancelar una factura que tiene detalles. '
                'Primero debe retirar sus detalles mediante la API.'
            )
        return datos


class DetalleFacturaForm(forms.ModelForm):
    """
    Formulario personalizado para la gestión de detalles de factura (productos o cursos).
    Restringe los campos editables e impide la modificación de detalles que ya han sido guardados previamente.
    """
    class Meta:
        model = DetalleFactura
        fields = ['producto', 'curso', 'cantidad']

    def clean(self):
        """
        Valida que un detalle de factura existente no pueda ser modificado una vez guardado,
        garantizando la integridad histórica de la transacción.
        """
        datos = super().clean()
        if self.instance.pk and self.has_changed():
            raise forms.ValidationError('No se pueden modificar detalles guardados.')
        return datos


class DetalleFacturaInline(admin.TabularInline):
    """
    Configuración de visualización en línea (Inline) de los detalles dentro de la vista de Factura.
    Permite ver y gestionar los productos o cursos asociados directamente en la misma interfaz de administración.
    """
    model = DetalleFactura
    form = DetalleFacturaForm
    extra = 1
    can_delete = False
    fields = ['producto', 'curso', 'cantidad', 'precio_unitario', 'subtotal']
    readonly_fields = ['precio_unitario', 'subtotal']
    verbose_name = 'Producto o curso de la factura'
    verbose_name_plural = 'Productos y cursos de la factura'

    def has_add_permission(self, request, obj=None):
        """
        Controla los permisos de adición en línea:
        Inhabilita la opción de agregar nuevos detalles si la factura principal se encuentra en estado 'CANCELADA'.
        """
        if obj and obj.estado != 'PENDIENTE':
            return False

        return super().has_add_permission(request, obj)


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    """
    Configuración del panel de administración para el modelo Factura.
    Define los campos mostrados en la lista, restringe campos de solo lectura dinámicamente 
    según si la factura es nueva o existente, e inhabilita la eliminación directa desde el panel.
    """
    form = FacturaForm
    list_display = ['id', 'cliente', 'fecha', 'estado', 'total']
    readonly_fields = ['fecha', 'total']
    inlines = [DetalleFacturaInline]

    def get_readonly_fields(self, request, obj=None):
        """
        Ajusta los campos de solo lectura: si la factura ya existe (obj), 
        bloquea también el campo 'cliente' para evitar cambios posteriores en la titularidad.
        """
        if obj:
            return ['cliente', 'fecha', 'total']
        return ['fecha', 'total']

    def has_delete_permission(self, request, obj=None):
        """
        Deshabilita la opción de eliminar facturas directamente desde el panel de administración 
        para preservar la trazabilidad contable.
        """
        return False


@admin.register(DetalleFactura)
class DetalleFacturaAdmin(admin.ModelAdmin):
    """
    Configuración del panel de administración para el modelo DetalleFactura de forma independiente.
    Establece todos sus campos clave como de solo lectura e inhabilita las acciones 
    de creación y eliminación directa para forzar su gestión a través del flujo de la API y de la Factura.
    """
    list_display = ['id', 'factura', 'producto', 'curso', 'cantidad',
                    'precio_unitario', 'subtotal']
    readonly_fields = ['factura', 'producto', 'curso', 'cantidad',
                       'precio_unitario', 'subtotal']

    def has_add_permission(self, request):
        """
        Impide la creación de detalles sueltos de factura directamente desde este listado.
        """
        return False

    def has_delete_permission(self, request, obj=None):
        """
        Impide la eliminación aislada de detalles de factura desde el panel.
        """
        return False