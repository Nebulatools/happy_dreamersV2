// Esquemas de validación centralizados para la encuesta
// Fácil mantenimiento y modificación de reglas

import type { StepValidation, ValidationErrors } from '../types/survey.types'

export const familyInfoValidation: StepValidation = {
  fields: {
    'papa.nombre': {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    'papa.edad': {
      required: true,
      custom: (value) => {
        const num = parseInt(value)
        if (isNaN(num) || num < 18 || num > 100) {
          return 'Ingresa una edad válida (18-100)'
        }
        return true
      }
    },
    'papa.ocupacion': {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    'papa.direccion': {
      required: true,
      minLength: 5,
      maxLength: 200
    },
    'papa.email': {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    'mama.nombre': {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    'mama.ocupacion': {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    'mama.telefono': {
      required: true,
      pattern: /^[\d\s()+\-]+$/,
      minLength: 8
    },
    'mama.email': {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
  },
  customValidation: (data: any) => {
    const errors: ValidationErrors = {}
    
    if (data?.papa?.tieneAlergias && !data.papa.alergias) {
      errors.papa = {
        ...(errors.papa as any),
        alergias: 'Describe las alergias de papá'
      }
    }
    
    if (data?.mama?.tieneAlergias && !data.mama.alergias) {
      errors.mama = {
        ...(errors.mama as any),
        alergias: 'Describe las alergias de mamá'
      }
    }

    const mismaDireccion = data?.mama?.mismaDireccionPapa
    if (!mismaDireccion) {
      if (!data?.mama?.direccion || data.mama.direccion.trim().length < 5) {
        errors.mama = {
          ...(errors.mama as any),
          direccion: 'La dirección de mamá es obligatoria'
        }
      }
      if (!data?.mama?.ciudad || data.mama.ciudad.trim().length < 2) {
        errors.mama = {
          ...(errors.mama as any),
          ciudad: 'La ciudad de mamá es obligatoria'
        }
      }
    }
    
    return errors
  }
}

export const familyDynamicsValidation: StepValidation = {
  fields: {
    // telefonoSeguimiento y emailObservaciones se toman de información familiar
    // No se requieren aquí porque ya se validaron en el paso 1
    'quienAtiende': {
      required: true,
      minLength: 2
    }
  }
}

export const childHistoryValidation: StepValidation = {
  fields: {
    'nombreHijo': {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    'fechaNacimiento': {
      required: true
    },
    'pesoHijo': {
      required: true
    }
  },
  customValidation: (data: any) => {
    const errors: ValidationErrors = {}
    
    if (data?.problemasNacer && !data.problemasNacerDetalle) {
      errors.problemasNacerDetalle = 'Describe el problema que presentó al nacer'
    }

    if (data?.complicacionesParto && !data.complicacionesPartoDescripcion) {
      errors.complicacionesPartoDescripcion = 'Describe la complicación durante el parto'
    }
    
    return errors
  }
}

export const healthDevValidation: StepValidation = {
  fields: {
    // Los campos de desarrollo son opcionales
    // Los campos de checkboxes (problemasHijo) no requieren validación especial
  }
}

export const physicalActivityValidation: StepValidation = {
  fields: {
    // Todos los campos de actividad física son opcionales según el formulario
  }
}

export const routineHabitsValidation: StepValidation = {
  fields: {
    'diaTipico': {
      required: true,
      minLength: 20
    },
    'quienCuida': {
      required: true,
      minLength: 2
    },
    'rutinaDormir': {
      required: true,
      minLength: 10
    },
    'horaDormir': {
      required: true
    },
    'dondeDuerme': {
      required: true
    },
    'objetivoPadres': {
      required: true,
      minLength: 20
    }
  }
}

// Mapa de validaciones por paso
export const stepValidations: Record<number, StepValidation> = {
  1: familyInfoValidation,
  2: familyDynamicsValidation,
  3: childHistoryValidation,
  4: healthDevValidation,
  5: physicalActivityValidation,
  6: routineHabitsValidation
}
