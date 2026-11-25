from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def obtener_perfil(usuario):
    """
    Determina el nombre del perfil que verá el frontend.
    El perfil es informativo: la autorización real se sigue validando en cada
    endpoint con is_staff y has_perm.
    """
    if usuario.is_superuser:
        return 'Superusuario'
    grupo = usuario.groups.order_by('name').first()
    if grupo:
        return grupo.name
    if usuario.is_staff:
        return 'Personal'
    return 'Externo'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuario_actual_api(request):
    """
    GET /api/auth/me/
    Devuelve los datos del usuario autenticado por token, su perfil y la lista
    de permisos efectivos (propios + de grupos). El frontend la usa para mostrar
    la identificación en la barra superior y adaptar las acciones visibles.
    Sin token válido responde 401.
    """
    usuario = request.user
    return Response({
        'id': usuario.id,
        'username': usuario.username,
        'nombre': usuario.get_full_name() or usuario.username,
        'email': usuario.email,
        'is_staff': usuario.is_staff,
        'is_superuser': usuario.is_superuser,
        'perfil': obtener_perfil(usuario),
        'grupos': list(usuario.groups.values_list('name', flat=True)),
        'permisos': sorted(usuario.get_all_permissions()),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cerrar_sesion_api(request):
    """
    POST /api/auth/logout/
    Revoca el token en el servidor eliminándolo de la tabla authtoken_token.
    Después de esta llamada, el mismo token responde 401 en cualquier endpoint.
    Un nuevo login genera un token diferente.
    """
    Token.objects.filter(user=request.user).delete()
    return Response({'detail': 'Sesión cerrada y token revocado.'}, status=status.HTTP_200_OK)
