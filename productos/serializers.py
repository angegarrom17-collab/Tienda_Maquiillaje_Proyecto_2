from datetime import date, timedelta
from rest_framework import serializers
from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Categoria.
    Gestiona la serialización de las categorías de productos.
    """

    # Campo calculado de solo lectura para el conteo de productos
    total_productos = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Categoria
        fields = '__all__'

    def validate_nombre(self, value):
        """
        Valida que el nombre de la categoría sea válido:
        - Limpia espacios en blanco alrededor.
        - Exige una longitud mínima de 2 caracteres.
        """
        nombre_limpio = value.strip()
        if len(nombre_limpio) < 2:
            raise serializers.ValidationError('El nombre de la categoría debe tener al menos 2 caracteres.')
        return nombre_limpio


class ProductoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Producto.
    Incorpora el detalle anidado de la categoría y valida reglas de negocio 
    como precios positivos, stock no negativo, estado activo del proveedor y vigencias mínimas por fecha de vencimiento.
    """
   # Representación anidada de la categoría para consultas detalladas (solo lectura)
    categoria_detalle = CategoriaSerializer(source='categoria', read_only=True)
    # Proyecto 2: nombre del proveedor para mostrar la relación en el frontend (solo lectura)
    nombre_proveedor = serializers.CharField(source='proveedor.nombre', read_only=True, default=None)

    class Meta:
        model = Producto
        fields = '__all__'

    def validate_nombre(self, value):
        """
        Valida que el nombre comercial del producto tenga al menos 2 caracteres limpios.
        """
        nombre_limpio = value.strip()
        if len(nombre_limpio) < 2:
            raise serializers.ValidationError('El nombre del producto debe tener al menos 2 caracteres.')
        return nombre_limpio

    def validate_precio(self, value):
        """
        Valida que el precio del producto sea estrictamente mayor a cero.
        """
        if value <= 0:
            raise serializers.ValidationError('El precio debe ser mayor que cero.')
        return value

    def validate_stock(self, value):
        """
        Valida que el stock inicial o actual no posea valores negativos.
        """
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate(self, data):
        """
        Validaciones generales cruzadas para el producto:
        - Verifica que el proveedor asignado se encuentre activo.
        - Comprueba que el stock mínimo no sea negativo.
        - Calcula y valida que la fecha de vencimiento cumpla con el período mínimo 
          requerido de vigencia (calculado en base a los meses especificados).
        """
        proveedor = data.get("proveedor")
        if proveedor and not proveedor.activo:
            raise serializers.ValidationError({"proveedor": "El proveedor debe estar activo."})
        if data.get("stock_minimo", 0) < 0:
            raise serializers.ValidationError({"stock_minimo": "No puede ser negativo."})
        fecha_vencimiento = data.get('fecha_vencimiento')

        # Determina los meses de vigencia (por defecto 12 meses o toma el de la instancia en actualización)
        vigencia_meses = data.get('vigencia_meses')
        if vigencia_meses is None and self.instance:
            vigencia_meses = self.instance.vigencia_meses
        elif vigencia_meses is None:
            vigencia_meses = 12

        # Validación del plazo de vencimiento en base a la vigencia en meses
        dias_requeridos = vigencia_meses * 30
        fecha_minima_permitida = date.today() + timedelta(days=dias_requeridos)

        if fecha_vencimiento and fecha_vencimiento < fecha_minima_permitida:
            raise serializers.ValidationError({
                'fecha_vencimiento': f'La fecha de vencimiento debe tener al menos {vigencia_meses} meses de vigencia a partir de hoy.'
            })

        return data