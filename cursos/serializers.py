from rest_framework import serializers
from .models import Curso, InscripcionCurso


class CursoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Curso.
    Gestiona la serialización de los cursos y valida reglas de negocio 
    como precios positivos, cupos mínimos válidos y control de capacidad frente a inscripciones existentes.
    """

    # Proyecto 2: inscripciones activas (calculado en la vista, solo lectura)
    inscritos = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Curso
        fields = '__all__'
        read_only_fields = []


    def validate(self, data):
        """
        Validaciones generales para los datos del curso:
        - Asegura que el precio, el cupo máximo y la duración en horas sean estrictamente mayores a cero.
        - Verifica en caso de actualización que el nuevo cupo máximo no sea menor a la cantidad de clientes ya inscritos.
        """
        precio = data.get('precio')
        cupo = data.get('cupo_maximo')
        duracion = data.get('duracion_horas')

        if precio is not None and precio <= 0:
            raise serializers.ValidationError({
                'precio': 'El precio debe ser mayor que cero.'
            })

        if cupo is not None and cupo <= 0:
            raise serializers.ValidationError({
                'cupo_maximo': 'El cupo debe ser mayor que cero.'
            })

        if duracion is not None and duracion <= 0:
            raise serializers.ValidationError({
                'duracion_horas': 'La duración debe ser mayor que cero.'
            })

        # Control de capacidad: evita reducir el cupo por debajo de los inscritos actuales
        if self.instance and cupo is not None:
            inscritos = self.instance.inscripciones.filter(
                estado='inscrita'
            ).count()

            if cupo < inscritos:
                raise serializers.ValidationError({
                    'cupo_maximo': 'No puede ser menor que las inscripciones actuales.'
                })

        return data


class InscripcionCursoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo InscripcionCurso.
    Valida las reglas de negocio para inscribir clientes a cursos,
    verificando el estado del curso, la actividad del cliente, la disponibilidad de cupos y evitando duplicados.
    """

    # Proyecto 2: nombres relacionados para mostrar en el frontend (solo lectura)
    nombre_cliente = serializers.CharField(source='cliente.nombre', read_only=True)
    cedula_cliente = serializers.CharField(source='cliente.cedula', read_only=True)
    nombre_curso = serializers.CharField(source='curso.nombre', read_only=True)

    class Meta:
        model = InscripcionCurso
        fields = '__all__'

    def validate(self, data):
        """
        Validaciones para el proceso de inscripción:
        - Confirma que el curso se encuentre en estado programado.
        - Verifica que el cliente esté activo en el sistema.
        - Comprueba que existan cupos disponibles antes de permitir la inscripción.
        - Previene registros duplicados del mismo cliente en un mismo curso.
        """
        curso = data.get('curso', getattr(self.instance, 'curso', None))
        cliente = data.get('cliente', getattr(self.instance, 'cliente', None))
        estado = data.get('estado', getattr(self.instance, 'estado', 'inscrita'))

        if curso is None or cliente is None:
            return data

        if estado == 'inscrita':
            if curso.estado != 'PROGRAMADO':
                raise serializers.ValidationError(
                    'Solo se permiten inscripciones en cursos programados.'
                )

            if not cliente.activo:
                raise serializers.ValidationError(
                    'El cliente debe estar activo.'
                )

            # Conteo de cupos ocupados actualmente en el curso
            inscritos = InscripcionCurso.objects.filter(
                curso=curso,
                estado='inscrita'
            )

            if self.instance:
                inscritos = inscritos.exclude(pk=self.instance.pk)

            if inscritos.count() >= curso.cupo_maximo:
                raise serializers.ValidationError(
                    'El curso no tiene cupos disponibles.'
                )

        # Validación de unicidad: evita que un cliente se inscriba dos veces al mismo curso
        duplicado = InscripcionCurso.objects.filter(
            curso=curso,
            cliente=cliente
        )

        if self.instance:
            duplicado = duplicado.exclude(pk=self.instance.pk)

        if duplicado.exists():
            raise serializers.ValidationError(
                'El cliente ya tiene una inscripción en este curso.'
            )

        return data