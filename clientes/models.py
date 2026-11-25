from django.db import models

class Cliente(models.Model):
    """
    Modelo que representa a los clientes en el sistema de la tienda de belleza.
    Almacena información de identificación, contacto y datos personales del cliente.
    """
    id = models.BigAutoField(primary_key=True)
    cedula = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    activo = models.BooleanField(default=True)
    

    def __str__(self):
        return self.nombre