// Esquemas de validación centralizados para la encuesta
// Fácil mantenimiento y modificación de reglas

import type { StepValidation } from '../types/survey.types'

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
    'mama.ciudad': {
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
  }
}

export const familyDynamicsValidation: StepValidation = {
  fields: {
    'hijosInfo': {
      required: true,
      minLength: 5
    },
    'telefonoSeguimiento': {
      required: true,
      pattern: /^[\d\s()+\-]+$/,
      minLength: 8
    },
    'emailObservaciones': {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
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