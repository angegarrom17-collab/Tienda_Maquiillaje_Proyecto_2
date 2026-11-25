from django.contrib import admin
from .models import EntradaProducto, Proveedor

admin.site.register(Proveedor)

@admin.register(EntradaProducto)
class EntradaProductoAdmin(admin.ModelAdmin):
    """
    Configuración personalizada del panel de administración para el modelo EntradaProducto.
    Define las columnas visibles en la vista de lista del admin (ID, proveedor, producto, cantidad y fecha).
    """
    list_display = ['id', 'proveedor', 'producto', 'cantidad', 'fecha']