from django.core.paginator import Paginator
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Cliente
from .serializers import ClienteSerializer


def respuesta_paginada(queryset, serializer_class, page_number):
    """
    Función para estructurar y devolver una respuesta paginada de la API.
    Divide el queryset en bloques de 5 elementos por página.
    """
    paginator = Paginator(queryset, 5)
    page = paginator.get_page(page_number)
    serializer = serializer_class(page.object_list, many=True)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': serializer.data
    })

@api_view(['GET', 'POST'])
def clientes_api(request):
    """
    Endpoint para gestionar el listado y creación de clientes:
    - GET: Permite listar clientes con paginación, filtrado por estado (activo) y búsqueda por nombre o cédula.
    - POST: Permite crear un nuevo cliente (requiere autenticación de administrador y permisos específicos).
    """
    if request.method == 'GET':
        clientes = Cliente.objects.order_by('id')
        activo = request.query_params.get('activo')
        buscar = request.query_params.get('buscar')

        # Filtrado opcional por estado de actividad (true/false)
        if activo is not None:
            if activo.lower() not in ['true', 'false']:
                return Response(
                    {'activo': 'Utilice true o false.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            clientes = clientes.filter(activo=activo.lower() == 'true')

        # Filtrado por coincidencia en nombre o cédula
        if buscar:
            clientes = clientes.filter(
                nombre__icontains=buscar
            ) | clientes.filter(
                cedula__icontains=buscar
            )

        return respuesta_paginada(
            clientes, ClienteSerializer,
            request.query_params.get('page', 1)
        )

    # Validaciones de seguridad y permisos
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)
    
    if not request.user.has_perm('clientes.add_cliente'):
        return Response({'detail': 'No tiene permisos para agregar clientes.'}, status=status.HTTP_403_FORBIDDEN)

    # Validación y guardado del nuevo cliente
    serializer = ClienteSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def cliente_detalle_api(request, pk):
    """
    Endpoint para gestionar operaciones sobre un cliente específico mediante su ID (pk):
    - GET: Consulta la información detallada del cliente.
    - PUT / PATCH: Actualiza total o parcialmente los datos del cliente (requiere permisos de modificación).
    - DELETE: Elimina al cliente del sistema (requiere permisos de eliminación).
    """
    try:
        cliente = Cliente.objects.get(pk=pk)
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    # La consulta (GET) es pública o abierta sin restricciones administrativas estrictas
    if request.method == 'GET':
        return Response(ClienteSerializer(cliente).data)

    # Verificación de autenticación general para métodos de modificación y eliminación
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)


    if request.method in ['PUT', 'PATCH']:
        if not request.user.has_perm('clientes.change_cliente'):
            return Response({'detail': 'No tiene permisos para modificar clientes.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ClienteSerializer(
            cliente, data=request.data,
            partial=(request.method == 'PATCH')
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    if not request.user.has_perm('clientes.delete_cliente'):
        return Response({'detail': 'No tiene permisos para eliminar clientes.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        cliente.delete()
    except ProtectedError:
        return Response(
            {'error': 'No se puede eliminar un cliente con facturas o inscripciones.'},
            status=status.HTTP_409_CONFLICT
        )
    return Response(status=status.HTTP_204_NO_CONTENT)