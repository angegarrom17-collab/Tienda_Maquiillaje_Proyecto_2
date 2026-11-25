from django.apps import AppConfig


class CuentasConfig(AppConfig):
    """
    Aplicación de apoyo agregada en el Proyecto 2.
    Expone la información de la sesión (usuario, perfil y permisos) y el cierre
    de sesión con revocación del token, necesarios para el frontend React.
    No define modelos propios: usa auth.User, auth.Group y authtoken.Token.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cuentas'
