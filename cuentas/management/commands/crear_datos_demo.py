from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand
from django.db import transaction

# Modelos de negocio que administra la API
MODELOS = {
    'clientes': ['cliente'],
    'productos': ['categoria', 'producto'],
    'cursos': ['curso', 'inscripcioncurso'],
    'proveedores': ['proveedor', 'entradaproducto'],
    'facturas': ['factura', 'detallefactura'],
}

# Contraseña FICTICIA de los usuarios de prueba (solo para desarrollo / demostración)
CLAVE_DEMO = 'Demo2026!'


def permisos(acciones, extra=()):
    """Devuelve los permisos de las acciones indicadas para todos los modelos del sistema."""
    codigos = [f'{accion}_{modelo}' for modelos in MODELOS.values() for modelo in modelos for accion in acciones]
    codigos += list(extra)
    return Permission.objects.filter(
        content_type__app_label__in=MODELOS.keys(), codename__in=codigos
    )


class Command(BaseCommand):
    """
    Crea los tres perfiles del sistema (grupos con permisos) y usuarios de prueba ficticios.
    Con --datos también carga datos de ejemplo para demostrar los cinco módulos.

    Uso:
        python manage.py crear_datos_demo
        python manage.py crear_datos_demo --datos
    """
    help = 'Crea perfiles (Administrador, Operador, Consulta), usuarios de prueba y datos opcionales.'

    def add_arguments(self, parser):
        parser.add_argument('--datos', action='store_true', help='Carga también datos de ejemplo de negocio.')

    @transaction.atomic
    def handle(self, *args, **opciones):
        self.crear_perfiles()
        if opciones['datos']:
            self.crear_datos()
        self.stdout.write(self.style.SUCCESS('Listo.'))

    # ------------------------------------------------------------------
    def crear_perfiles(self):
        administrador, _ = Group.objects.get_or_create(name='Administrador')
        administrador.permissions.set(permisos(['view', 'add', 'change', 'delete']))

        operador, _ = Group.objects.get_or_create(name='Operador')
        operador.permissions.set(permisos(['view', 'add', 'change'], extra=['delete_detallefactura']))

        consulta, _ = Group.objects.get_or_create(name='Consulta')
        consulta.permissions.set(permisos(['view']))

        usuarios = [
            ('admin_demo', administrador, True, 'Ana', 'Administradora'),
            ('operador_demo', operador, True, 'Óscar', 'Operador'),
            ('consulta_demo', consulta, True, 'Carla', 'Consulta'),
            ('externo_demo', None, False, 'Esteban', 'Externo'),
        ]
        for username, grupo, staff, nombre, apellido in usuarios:
            usuario, creado = User.objects.get_or_create(username=username)
            usuario.is_staff = staff
            usuario.first_name = nombre
            usuario.last_name = apellido
            usuario.set_password(CLAVE_DEMO)
            usuario.save()
            usuario.groups.clear()
            if grupo:
                usuario.groups.add(grupo)
            estado = 'creado' if creado else 'actualizado'
            self.stdout.write(f'  Usuario {username} ({grupo.name if grupo else "sin grupo, no staff"}) {estado}')
        self.stdout.write(f'  Contraseña de prueba para todos: {CLAVE_DEMO}')

    # ------------------------------------------------------------------
    def crear_datos(self):
        from clientes.models import Cliente
        from cursos.models import Curso, InscripcionCurso
        from facturas.models import DetalleFactura, Factura
        from productos.models import Categoria, Producto
        from proveedores.models import EntradaProducto, Proveedor

        if Producto.objects.exists() or Cliente.objects.exists():
            self.stdout.write(self.style.WARNING('  Ya existen datos de negocio; no se cargan datos de ejemplo.'))
            return

        categorias = {
            nombre: Categoria.objects.create(nombre=nombre, descripcion=desc)
            for nombre, desc in [
                ('Labiales', 'Labiales y brillos'),
                ('Bases', 'Bases y correctores'),
                ('Sombras', 'Paletas y sombras de ojos'),
                ('Cuidado facial', 'Limpiadores, sérums e hidratantes'),
            ]
        }

        proveedores = [
            Proveedor.objects.create(nombre='Distribuidora Belleza CR', telefono='22223333',
                                     correo='ventas@bellezacr.test', direccion='San José, Barrio Escalante, 100 m norte'),
            Proveedor.objects.create(nombre='Cosméticos del Pacífico', telefono='26610000',
                                     correo='pedidos@cospacifico.test', direccion='Puntarenas centro, frente al parque'),
            Proveedor.objects.create(nombre='Importadora Glam', telefono='24401234',
                                     correo='info@glam.test', direccion='Alajuela, zona industrial, bodega 4'),
        ]

        def vence(meses):
            return date.today() + timedelta(days=meses * 30 + 90)

        datos_productos = [
            ('Labial mate rojo', 'Labiales', 0, '6500', 25, 5, 12),
            ('Brillo labial nude', 'Labiales', 0, '4800', 3, 5, 12),
            ('Base líquida tono medio', 'Bases', 1, '14500', 12, 4, 24),
            ('Corrector alta cobertura', 'Bases', 1, '8900', 2, 4, 24),
            ('Paleta de sombras 12 tonos', 'Sombras', 2, '18900', 8, 3, 36),
            ('Sombra individual dorada', 'Sombras', 2, '3500', 30, 5, 36),
            ('Sérum de vitamina C', 'Cuidado facial', 0, '16500', 10, 3, 12),
            ('Gel limpiador facial', 'Cuidado facial', 2, '7200', 4, 5, 24),
        ]
        productos = []
        for nombre, cat, prov, precio, stock, minimo, vig in datos_productos:
            productos.append(Producto.objects.create(
                nombre=nombre, categoria=categorias[cat], proveedor=proveedores[prov],
                precio=Decimal(precio), stock=stock, stock_minimo=minimo,
                vigencia_meses=vig, fecha_vencimiento=vence(vig),
            ))

        clientes = [
            Cliente.objects.create(cedula=ced, nombre=nom, email=mail, telefono=tel, direccion=dir_, activo=act)
            for ced, nom, mail, tel, dir_, act in [
                ('101110111', 'María Fernández', 'maria.fernandez@correo.test', '88881111', 'Esparza', True),
                ('202220222', 'José Rodríguez', 'jose.rodriguez@correo.test', '88882222', 'Puntarenas', True),
                ('303330333', 'Laura Jiménez', 'laura.jimenez@correo.test', '88883333', 'Barranca', True),
                ('404440444', 'Daniela Mora', 'daniela.mora@correo.test', '88884444', 'El Roble', True),
                ('505550555', 'Andrés Vargas', 'andres.vargas@correo.test', '88885555', 'Chacarita', True),
                ('606660666', 'Sofía Castro', 'sofia.castro@correo.test', '88886666', 'Miramar', True),
                ('707770777', 'Pablo Solano', 'pablo.solano@correo.test', '88887777', 'Orotina', False),
            ]
        ]

        hoy = date.today()
        cursos = [
            Curso.objects.create(nombre='Maquillaje social básico', descripcion='Técnicas de maquillaje para el día a día.',
                                 fecha=hoy + timedelta(days=15), hora=time(9, 0), duracion_horas=4,
                                 precio=Decimal('25000'), cupo_maximo=10, modalidad='PRESENCIAL'),
            Curso.objects.create(nombre='Cuidado de la piel', descripcion='Rutinas de cuidado facial según tipo de piel.',
                                 fecha=hoy + timedelta(days=25), hora=time(18, 0), duracion_horas=2,
                                 precio=Decimal('15000'), cupo_maximo=20, modalidad='VIRTUAL'),
            Curso.objects.create(nombre='Delineado profesional', descripcion='Delineados gráficos y clásicos.',
                                 fecha=hoy + timedelta(days=40), hora=time(14, 0), duracion_horas=3,
                                 precio=Decimal('20000'), cupo_maximo=2, modalidad='PRESENCIAL'),
            Curso.objects.create(nombre='Automaquillaje para eventos', descripcion='Curso ya impartido.',
                                 fecha=hoy - timedelta(days=30), hora=time(10, 0), duracion_horas=4,
                                 precio=Decimal('30000'), cupo_maximo=12, modalidad='PRESENCIAL', estado='FINALIZADO'),
        ]

        InscripcionCurso.objects.create(cliente=clientes[0], curso=cursos[0])
        InscripcionCurso.objects.create(cliente=clientes[1], curso=cursos[0])
        InscripcionCurso.objects.create(cliente=clientes[2], curso=cursos[1])
        InscripcionCurso.objects.create(cliente=clientes[0], curso=cursos[2])
        InscripcionCurso.objects.create(cliente=clientes[3], curso=cursos[2])  # curso lleno (cupo 2)

        EntradaProducto.objects.create(proveedor=proveedores[0], producto=productos[0], cantidad=10)
        EntradaProducto.objects.create(proveedor=proveedores[1], producto=productos[2], cantidad=5)

        factura1 = Factura.objects.create(cliente=clientes[0])
        DetalleFactura(factura=factura1, producto=productos[0], cantidad=2).save()
        DetalleFactura(factura=factura1, curso=cursos[0], cantidad=1).save()
        factura1.refresh_from_db()
        factura1.estado = 'PAGADA'
        factura1.save(update_fields=['estado'])

        factura2 = Factura.objects.create(cliente=clientes[1])
        DetalleFactura(factura=factura2, producto=productos[4], cantidad=1).save()

        Factura.objects.create(cliente=clientes[4])  # pendiente sin detalles

        self.stdout.write('  Datos de ejemplo cargados: 4 categorías, 3 proveedores, 8 productos, '
                          '7 clientes, 4 cursos, 5 inscripciones, 2 entradas, 3 facturas.')
