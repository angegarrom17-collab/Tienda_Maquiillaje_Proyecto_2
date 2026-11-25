from rest_framework import serializers
from .models import Proveedor, EntradaProducto

class ProveedorSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Proveedor.
    Gestiona la serialización de los proveedores e incluye validaciones 
    para asegurar la calidad de los datos de contacto, nombre, teléfono de 8 dígitos y dirección detallada.
    """
    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate_nombre(self, value):
        """
        Valida que el nombre del proveedor sea válido:
        - Remueve espacios en blanco sobrantes.
        - Exige una longitud mínima de 3 caracteres.
        """
        if len(value.strip()) < 3:
            raise serializers.ValidationError('El nombre debe tener al menos 3 caracteres.')
        return value.strip()

    def validate_telefono(self, value):
        """
        Valida el número telefónico de contacto:
        - Comprueba que tenga exactamente 8 dígitos numéricos.
        """
        if len(value) != 8 or not value.isdigit():
            raise serializers.ValidationError('El teléfono debe tener 8 números.')
        return value

    def validate_direccion(self, value):
        """
        Valida la dirección física del proveedor:
        - Exige una longitud mínima de 10 caracteres limpios para garantizar detalle suficiente.
        """
        if len(value.strip()) < 10:
            raise serializers.ValidationError('La dirección debe tener al menos 10 caracteres.')
        return value.strip()

class EntradaProductoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo EntradaProducto.
    Incorpora campos informativos de solo lectura para los nombres del proveedor y producto,
    y valida reglas de negocio críticas para las entradas de inventario.
    """
    
    # Campos calculados, relacionados de solo lectura para mostrar los nombres en las respuestas de la API
    
    nombre_proveedor = serializers.CharField(source='proveedor.nombre', read_only=True)
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = EntradaProducto
        fields = '__all__'
        read_only_fields = ['fecha']

    def validate(self, data):
        """
        Validaciones generales cruzadas para la entrada de productos al inventario:
        - Verifica que el proveedor seleccionado se encuentre activo.
        - Asegura que el producto a reabastecer pertenezca correctamente al proveedor indicado.
        - Controla que la cantidad de unidades que ingresan sea estrictamente mayor a cero.
        """
        proveedor = data.get('proveedor')
        producto = data.get('producto')
        cantidad = data.get('cantidad')
        if proveedor and not proveedor.activo:
            raise serializers.ValidationError('El proveedor debe estar activo.')
        if producto and proveedor and producto.proveedor_id != proveedor.id:
            raise serializers.ValidationError('El producto debe pertenecer al proveedor seleccionado.')
        if cantidad is not None and cantidad <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor que cero.')
        return data