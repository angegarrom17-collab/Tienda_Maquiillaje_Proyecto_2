from django.core.paginator import Paginator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from productos.models import Producto
from cursos.models import Curso, InscripcionCurso

from .models import Factura, DetalleFactura
from .serializers import FacturaSerializer, DetalleFacturaSerializer


def paginar_facturas(queryset, page_number):
    """
    Función para estructurar y devolver una respuesta paginada de las facturas.
    Divide el queryset en bloques de 5 elementos por página.
    """
    paginator = Paginator(queryset, 5)
    page = paginator.get_page(page_number)

    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': FacturaSerializer(page.object_list, many=True).data
    })


@api_view(['GET', 'POST'])
def facturas_api(request):
    """
    Endpoint para gestionar el listado y creación de facturas:
    - GET: Lista facturas con paginación y filtros opcionales por estado y cliente (requiere rol de administrador).
    - POST: Permite registrar una nueva factura (requiere autenticación y permisos específicos).
    """

    if not request.user.is_authenticated:
        return Response(
            {'detail': 'Autenticación requerida.'},
            status=401
        )

    if not request.user.is_staff:
        return Response(
            {'detail': 'Se requiere administrador.'},
            status=403
        )

    permiso = 'facturas.view_factura' if request.method == 'GET' else 'facturas.add_factura'
    if not request.user.has_perm(permiso):
        return Response({'detail': 'No tiene permisos para esta operación.'}, status=status.HTTP_403_FORBIDDEN)
    

    if request.method == 'GET':
        facturas = Factura.objects.select_related(
            'cliente'
        ).order_by('id')

        estado = request.query_params.get('estado')
        cliente = request.query_params.get('cliente')

        if estado:
            facturas = facturas.filter(estado=estado.upper())

        if cliente:
            if not cliente.isdigit():
                return Response({'cliente': 'Debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)
            facturas = facturas.filter(cliente_id=cliente)

        return paginar_facturas(
            facturas,
            request.query_params.get('page', 1)
        )

    # Preparación de datos iniciales para la nueva factura (total en cero y estado por defecto)
    data = request.data.copy()
    data['total'] = '0.00'
    if data.get('estado') not in ['PENDIENTE', 'PAGADA', 'CANCELADA']:
        data['estado'] = 'PENDIENTE'

    # Proyecto 2: la factura puede crearse junto con sus líneas ("detalles": [...]).
    # Todo ocurre en UNA transacción: si cualquier línea incumple una regla de negocio
    # (stock, inscripción, curso ya facturado...), no se guarda ni la factura ni ninguna línea.
    lineas = data.pop('detalles', None)
    if lineas is not None:
        if not isinstance(lineas, list) or len(lineas) == 0:
            return Response({'detalles': 'Agregue al menos un producto o curso.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.has_perm('facturas.add_detallefactura'):
            return Response({'detail': 'No tiene permisos para agregar detalles.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FacturaSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            factura = serializer.save()
            for numero, linea in enumerate(lineas or [], start=1):
                detalle = DetalleFacturaSerializer(data={**linea, 'factura': factura.id})
                if not detalle.is_valid():
                    raise ValidationError(
                        [f'Línea {numero}: {m}' for errores in detalle.errors.values() for m in (errores if isinstance(errores, list) else [errores])]
                    )
                # El modelo valida stock, inscripción y curso ya facturado; descuenta stock y suma el total
                detalle.save()
    except ValidationError as error:
        return Response({'error': error.messages}, status=status.HTTP_400_BAD_REQUEST)

    factura.refresh_from_db()
    return Response(FacturaSerializer(factura).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def factura_detalle_api(request, id):
    """
    Endpoint para gestionar operaciones sobre una factura específica mediante su ID:
    - GET: Consulta la información detallada de la factura.
    - PUT / PATCH: Modifica datos de la factura validando restricciones de estado y duplicados del cliente.
    - DELETE: Elimina la factura siempre y cuando esté pendiente y sin detalles asociados.
    """

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=401)

    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=403)

    try:
        factura = Factura.objects.get(id=id)
    except Factura.DoesNotExist:
        return Response({'error': 'Factura no encontrada.'}, status=404)

    if request.method == 'GET':
        if not request.user.has_perm('facturas.view_factura'):
            return Response({'detail': 'No tiene permisos para consultar facturas.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(FacturaSerializer(factura).data)

    if request.method in ['PUT', 'PATCH']:

        if not request.user.has_perm('facturas.change_factura'):
            return Response({'detail': 'No tiene permisos para modificar una factura.'}, status=status.HTTP_403_FORBIDDEN)

        if factura.estado == 'CANCELADA':
            return Response(
                {'error': 'No se pueden modificar facturas canceladas.'},
                status=400
            )

        data = request.data.copy()

        # Restricción: No se permite cambiar el cliente asociado a una factura existente
        if 'cliente' in data and str(data['cliente']) != str(factura.cliente_id):
            return Response(
                {'error': 'No puede cambiar el cliente de la factura.'},
                status=400
            )

        estado_nuevo = data.get('estado', factura.estado)

        # Regla de negocio: Impide cancelar la factura si todavía contiene detalles activos
        if estado_nuevo == 'CANCELADA' and factura.detalles.exists():
            return Response(
                {'error': 'Elimine los detalles antes de cancelar la factura.'},
                status=400
            )

        data['total'] = str(factura.total)

        serializer = FacturaSerializer(
            factura,
            data=data,
            partial=request.method == 'PATCH'
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    # Validaciones previas a la eliminación (DELETE): solo facturas pendientes y sin detalles
    if factura.estado != 'PENDIENTE' or factura.detalles.exists():
        return Response(
            {'error': 'Solo puede eliminar facturas pendientes sin detalles.'},
            status=400
        )

    if not request.user.has_perm('facturas.delete_factura'):
        return Response({'detail': 'No tiene permisos para eliminar una factura.'}, status=status.HTTP_403_FORBIDDEN)
    factura.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)



@api_view(['GET', 'POST'])
def detalles_factura_api(request, id):
    """
    Endpoint para gestionar los ítems (detalles) asociados a una factura específica:
    - GET: Lista todos los detalles (productos o cursos) de la factura con consultas optimizadas.
    - POST: Añade un nuevo detalle de manera atómica con bloqueos de fila, controlando stock y requisitos de inscripción a cursos.
    """

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=401)

    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=403)

    permiso = 'facturas.view_detallefactura' if request.method == 'GET' else 'facturas.add_detallefactura'
    if not request.user.has_perm(permiso):
        return Response({'detail': 'No tiene permisos para esta operación.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        factura = Factura.objects.get(id=id)
    except Factura.DoesNotExist:
        return Response({'error': 'Factura no encontrada.'}, status=404)

    if request.method == 'GET':
        detalles = factura.detalles.select_related(
            'producto', 'curso'
        ).order_by('id')

        return Response(
            DetalleFacturaSerializer(detalles, many=True).data
        )

    # Transacción atómica con bloqueo de filas para garantizar consistencia en inventario y ventas concurrentes
    with transaction.atomic():

        factura = Factura.objects.select_for_update().get(id=id)

        if factura.estado != 'PENDIENTE':
            return Response(
                {'error': 'Solo se pueden agregar detalles a facturas pendientes.'},
                status=400
            )

        data = request.data.copy()
        data['factura'] = factura.id

        serializer = DetalleFacturaSerializer(data=data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        producto = serializer.validated_data.get('producto')
        curso = serializer.validated_data.get('curso')
        cantidad = serializer.validated_data.get('cantidad', 1)

        # Validación de exclusividad: debe especificarse producto O curso, pero no ambos ni ninguno
        if bool(producto) == bool(curso):
            return Response(
                {'error': 'Seleccione un producto o un curso, no ambos.'},
                status=400
            )

        if producto:
            producto = Producto.objects.select_for_update().get(id=producto.id)

            if not producto.activo or producto.stock < cantidad:
                return Response(
                    {'error': 'Producto inactivo o stock insuficiente.'},
                    status=400
                )

            precio = producto.precio
        else:
            curso = Curso.objects.select_for_update().get(id=curso.id)

            if cantidad != 1 or curso.estado != 'PROGRAMADO':
                return Response(
                    {'error': 'Curso no disponible o cantidad incorrecta.'},
                    status=400
                )

            # Regla de negocio: El cliente debe estar inscrito y activo en el curso a facturar
            if not InscripcionCurso.objects.filter(
                curso=curso,
                cliente=factura.cliente,
                estado='inscrita'
            ).exists():
                return Response(
                    {'error': 'El cliente debe estar inscrito en el curso.'},
                    status=400
                )

            # Regla de negocio: Evita facturar el mismo curso dos veces al mismo cliente
            if DetalleFactura.objects.filter(
                factura__cliente=factura.cliente,
                curso=curso
            ).exclude(
                factura__estado='CANCELADA'
            ).exists():
                return Response(
                    {'error': 'Este curso ya está facturado para el cliente.'},
                    status=400
                )

            precio = curso.precio


        try:
            detalle = serializer.save()
        except ValidationError as error:
            return Response({'error': error.messages}, status=400)

        return Response(
            DetalleFacturaSerializer(detalle).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET', 'DELETE'])
def detalle_factura_api(request, id):
    """
    Endpoint para gestionar un detalle de factura en particular mediante su ID:
    - GET: Consulta la información detallada del ítem.
    - DELETE: Elimina de forma atómica el detalle de una factura pendiente, restaurando las condiciones asociadas.
    """

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=401)

    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=403)

    permiso = 'facturas.view_detallefactura' if request.method == 'GET' else 'facturas.delete_detallefactura'
    if not request.user.has_perm(permiso):
        return Response({'detail': 'No tiene permisos para esta operación.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        detalle = DetalleFactura.objects.get(id=id)
    except DetalleFactura.DoesNotExist:
        return Response({'error': 'Detalle no encontrado.'}, status=404)

    if request.method == 'GET':
        return Response(DetalleFacturaSerializer(detalle).data)

    # Transacción atómica para la eliminación segura del detalle
    with transaction.atomic():

        factura = Factura.objects.select_for_update().get(
            id=detalle.factura_id
        )

        if factura.estado != 'PENDIENTE':
            return Response(
                {'error': 'No puede eliminar detalles de una factura cerrada.'},
                status=400
            )

        try:
            detalle.delete()
        except ValidationError as error:
            return Response({'error': error.messages}, status=400)

        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def estadisticas_facturacion_api(request):
    """
    Endpoint analítico para administradores:
    Retorna métricas generales de facturación como la cantidad de facturas pendientes, pagadas y canceladas,
    los ingresos totales percibidos por facturas pagadas y la factura que cuenta con el mayor número de detalles.
    """

    if not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=401)

    if not request.user.is_staff:
        return Response({'detail': 'Se requiere administrador.'}, status=403)

    # Cálculo acumulado de los ingresos totales únicamente de facturas pagadas
    ingresos = Factura.objects.filter(
        estado='PAGADA'
    ).aggregate(total=Sum('total'))['total']

    # Consulta anotada para identificar la factura con mayor cantidad de detalles asociados
    mayor = Factura.objects.annotate(
        cantidad_detalles=Count('detalles')
    ).order_by('-cantidad_detalles', 'id').first()

    factura_mayor = None

    if mayor:
        factura_mayor = {
            'id': mayor.id,
            'cantidad_detalles': mayor.cantidad_detalles
        }

    return Response({
        'facturas_pendientes': Factura.objects.filter(
            estado='PENDIENTE'
        ).count(),
        'facturas_pagadas': Factura.objects.filter(
            estado='PAGADA'
        ).count(),
        'facturas_canceladas': Factura.objects.filter(
            estado='CANCELADA'
        ).count(),
        'ingresos_totales': ingresos if ingresos is not None else 0,
        'factura_mas_detalles': factura_mayor
    })