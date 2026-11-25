from django.core.paginator import Paginator
from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from productos.models import Producto
from .models import Proveedor, EntradaProducto
from .serializers import ProveedorSerializer, EntradaProductoSerializer


def paginar_proveedores(queryset, pagina):
    """
    Función para estructurar y devolver una respuesta paginada de los proveedores.
    Divide el queryset en bloques de 5 elementos por página.
    """
    page = Paginator(queryset, 5).get_page(pagina)
    return Response({
        'pagina_actual': page.number, 'total_paginas': page.paginator.num_pages,
        'total_registros': page.paginator.count,
        'resultados': ProveedorSerializer(page.object_list, many=True).data
    })

@api_view(['GET', 'POST'])
def proveedores_api(request):
    """
    Endpoint para gestionar el listado y creación de proveedores:
    - GET: Lista proveedores con paginación y filtros opcionales por nombre y estado de actividad.
    - POST: Permite registrar un nuevo proveedor (requiere autenticación de administrador y permisos específicos).
    """
    if request.method == 'GET':
        proveedores = Proveedor.objects.order_by('id')
        nombre = request.query_params.get('nombre')
        activo = request.query_params.get('activo')
        if nombre:
            proveedores = proveedores.filter(nombre__icontains=nombre)
        if activo is not None:
            proveedores = proveedores.filter(activo=activo.lower() in ['true', '1'])
        return paginar_proveedores(proveedores, request.query_params.get('page', 1))
    
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if not request.user.has_perm('proveedores.add_proveedor'):
        return Response({'detail': 'No tiene permisos para agregar un proveedor.'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = ProveedorSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def proveedor_detalle_api(request, id):
    """
    Endpoint para gestionar operaciones sobre un proveedor específico mediante su ID:
    - GET: Consulta la información detallada del proveedor.
    - PUT / PATCH: Actualiza total o parcialmente al proveedor (requiere permisos de modificación).
    - DELETE: Elimina al proveedor controlando restricciones de integridad (ProtectedError).
    """
    try:
        proveedor = Proveedor.objects.get(id=id)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado.'}, status=404)
    if request.method == 'GET':
        return Response(ProveedorSerializer(proveedor).data)
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method in ['PUT', 'PATCH']:

        if not request.user.has_perm('proveedores.change_proveedor'):
            return Response({'detail': 'No tiene permisos para modificar un proveedor.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ProveedorSerializer(proveedor, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if not request.user.has_perm('proveedores.delete_proveedor'):
        return Response({'detail': 'No tiene permisos para eliminar un proveedor.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        proveedor.delete()
    except ProtectedError:
                return Response({'error': 'No puede eliminar un proveedor con productos o entradas.'}, status=status.HTTP_409_CONFLICT)
    return Response(status=204)

@api_view(['GET', 'POST'])
def entradas_api(request):
    """
    Endpoint exclusivo para administradores que gestiona las entradas de productos:
    - GET: Lista todas las entradas de inventario optimizando las consultas con select_related.
    - POST: Registra una nueva entrada de forma atómica, actualizando automáticamente el stock del producto.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'GET':
        entradas = EntradaProducto.objects.select_related('proveedor', 'producto').order_by('-id')
        # Proyecto 2: filtros opcionales por proveedor y producto
        for parametro in ['proveedor', 'producto']:
            valor = request.query_params.get(parametro)
            if valor:
                if not valor.isdigit():
                    return Response({parametro: 'Debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)
                entradas = entradas.filter(**{f'{parametro}_id': valor})
        return Response(EntradaProductoSerializer(entradas, many=True).data)

    # Proyecto 2: la creación de entradas exige el permiso específico del modelo
    if not request.user.has_perm('proveedores.add_entradaproducto'):
        return Response({'detail': 'No tiene permisos para registrar entradas.'}, status=status.HTTP_403_FORBIDDEN)

    # Transacción atómica para asegurar la consistencia entre la entrada y el reabastecimiento del inventario
    with transaction.atomic():
        serializer = EntradaProductoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        entrada = serializer.save()
        return Response(EntradaProductoSerializer(entrada).data, status=201)
    

@api_view(['GET'])
def entrada_detalle_api(request, id):
    """
    Endpoint exclusivo para administradores que permite consultar 
    la información detallada de una entrada de producto en específico por su ID.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        entrada = EntradaProducto.objects.get(id=id)
    except EntradaProducto.DoesNotExist:
        return Response({'error': 'Entrada no encontrada.'}, status=404)
    return Response(EntradaProductoSerializer(entrada).data)