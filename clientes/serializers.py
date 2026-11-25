from rest_framework import serializers
from .models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Cliente.
    Incluyendo validacion  para el campo de cédula.
    """
    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_cedula(self, value):
        """
        Valida que la cédula del cliente sea válida:
        - Elimina espacios en blanco innecesarios al inicio y final.
        - Verifica que cumpla con una longitud mínima de caracteres.
        """
        cedula_limpia = value.strip()
        if len(cedula_limpia) < 5:
            raise serializers.ValidationError('La cédula debe tener una longitud válida.')
        return cedula_limpia

 