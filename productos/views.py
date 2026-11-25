from django.core.paginator import Paginator
from django.db.models import Count
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Categoria, Producto
from .serializers import CategoriaSerializer, ProductoSerializer


def paginar_productos(queryset, page_number):
    """
    Función  para estructurar y devolver una respuesta paginada de los productos.
    Divide el queryset en bloques de 5 elementos por página.
    """
    paginator = Paginator(queryset, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': ProductoSerializer(page.object_list, many=True).data
    })


@api_view(['GET', 'POST'])
def productos_api(request):
    """
    Endpoint para gestionar el listado y creación de productos:
    - GET: Lista productos con paginación y filtros por proveedor, stock bajo, categoría, estado activo y búsqueda por nombre.
    - POST: Permite registrar un nuevo producto (requiere rol de administrador y permisos específicos).
    """
    if request.method == 'GET':
        productos = Producto.objects.select_related('categoria').order_by('id')

        
        categoria_id = request.query_params.get('categoria')
        activo = request.query_params.get('activo')
        search = request.query_params.get('search')
        proveedor = request.query_params.get('proveedor')
        stock_bajo = request.query_params.get('stock_bajo')

        if proveedor:
            if not proveedor.isdigit():
                return Response({'proveedor': 'Debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)
            productos = productos.filter(proveedor_id=proveedor)

        # Filtrado de productos cuyo stock se encuentre por debajo o igual al stock mínimo
        if stock_bajo == '1':
            from django.db.models import F
            productos = productos.filter(stock__lte=F('stock_minimo'))


        if categoria_id:
            if not categoria_id.isdigit():
                return Response({'categoria': 'Debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)
            productos = productos.filter(categoria_id=categoria_id)

        # Filtrado por estado de actividad
        if activo is not None:
            es_activo = activo.lower() in ['true', '1', 'yes']
            productos = productos.filter(activo=es_activo)

        # Búsqueda por coincidencia en el nombre del producto
        if search:
            productos = productos.filter(nombre__icontains=search)

        # Proyecto 2: ordenamiento desde el backend (?ordering=campo o -campo), con lista blanca
        ordering = request.query_params.get('ordering')
        if ordering:
            permitidos = ['id', 'nombre', 'precio', 'stock', 'fecha_vencimiento']
            if ordering.lstrip('-') not in permitidos:
                return Response(
                    {'ordering': f'Valor no permitido. Use: {", ".join(permitidos)} (con - para descendente).'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            productos = productos.order_by(ordering, 'id')

        return paginar_productos(productos, request.query_params.get('page', 1))

    
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if not request.user.has_perm('productos.add_producto'):
        return Response({'detail': 'No tiene permisos para agregar productos.'}, status=status.HTTP_403_FORBIDDEN)

    
    serializer = ProductoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def producto_detalle_api(request, id):
    """
    Endpoint para gestionar operaciones sobre un producto específico mediante su ID:
    - GET: Consulta la información detallada del producto.
    - PUT / PATCH: Actualiza total o parcialmente el producto (requiere permisos de modificación).
    - DELETE: Elimina el producto del inventario (requiere permisos de eliminación).
    """
    try:
        producto = Producto.objects.select_related('categoria').get(id=id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProductoSerializer(producto).data)

    
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ['PUT', 'PATCH']:
        if not request.user.has_perm('productos.change_producto'):
            return Response({'detail': 'No tiene permisos para modificar productos.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ProductoSerializer(
            producto, data=request.data,
            partial=(request.method == 'PATCH')
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.has_perm('productos.delete_producto'):
        return Response({'detail': 'No tiene permisos para eliminar productos.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        producto.delete()
    except ProtectedError:
        return Response(
            {'error': 'No se puede eliminar un producto con facturas o entradas de inventario.'},
            status=status.HTTP_409_CONFLICT
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def categorias_api(request):
    """
    Endpoint para gestionar el listado y creación de categorías:
    - GET: Lista todas las categorías.
    - POST: Permite registrar una nueva categoría (requiere permisos administrativos).
    """
    if request.method == 'GET':
        categorias = Categoria.objects.annotate(
            total_productos=Count('productos')
        ).order_by('nombre')
        return Response(CategoriaSerializer(categorias, many=True).data)

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if not request.user.has_perm('productos.add_categoria'):
        return Response({'detail': 'No tiene permisos para agregar categorias.'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = CategoriaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def categoria_detalle_api(request, id):
    """
    Endpoint para gestionar operaciones sobre una categoría específica mediante su ID:
    - GET: Consulta los detalles de la categoría.
    - PUT / PATCH: Modifica la categoría (requiere permisos de cambio).
    - DELETE: Elimina la categoría del sistema.
    """
    try:
        categoria = Categoria.objects.get(id=id)
    except Categoria.DoesNotExist:
        return Response({'error': 'Categoría no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CategoriaSerializer(categoria).data)

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ['PUT', 'PATCH']:

        if not request.user.has_perm('productos.change_categoria'):
            return Response({'detail': 'No tiene permisos para modificar categorias.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CategoriaSerializer(
            categoria, data=request.data,
            partial=(request.method == 'PATCH')
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.has_perm('productos.delete_categoria'):
        return Response({'detail': 'No tiene permisos para eliminar categorias.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        categoria.delete()
    except ProtectedError:
        return Response(
            {'error': 'No se puede eliminar una categoría con productos.'},
            status=status.HTTP_409_CONFLICT
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def estadisticas_productos_api(request):
    """
    Endpoint analítico para administradores:
    Retorna métricas generales como el total de categorías, la cantidad de productos activos e inactivos,
    y la categoría que cuenta con la mayor cantidad de productos asociados.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_staff:
        return Response({'detail': 'Se requiere rol de administrador.'}, status=status.HTTP_403_FORBIDDEN)

    # Consulta optimizada para encontrar la categoría con más productos
    mayor_cat = Categoria.objects.annotate(
        num_productos=Count('productos')
    ).order_by('-num_productos', 'nombre').first()

    categoria_mayor = None
    if mayor_cat:
        categoria_mayor = {
            'id': mayor_cat.id,
            'nombre': mayor_cat.nombre,
            'total_productos': mayor_cat.num_productos
        }

    return Response({
        'total_categorias': Categoria.objects.count(),
        'productos_activos': Producto.objects.filter(activo=True).count(),
        'productos_inactivos': Producto.objects.filter(activo=False).count(),
        'categoria_con_mas_productos': categoria_mayor
    })