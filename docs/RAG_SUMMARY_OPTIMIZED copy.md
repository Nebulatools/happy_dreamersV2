{
  "metadata": {
    "source": "Happy Dreamers Sleep and Behavior",
    "version": "2.0",
    "description": "Horarios objetivo optimizados con información completa de transiciones y señales de sueño",
    "lastUpdated": "2024"
  },
  
  "sleepCues": {
    "description": "Señales universales de que el bebé/niño está cansado y listo para dormir",
    "signs": [
      "Tallarse los ojos",
      "Bostezar",
      "Actividad lenta",
      "Estar 'ido' o mirar a la nada",
      "Quejas/necio"
    ],
    "importance": "Observar estas señales es crucial - guiarse por el bebé, no solo por el reloj"
  },

  "generalRules": {
    "timeIntervals": "Todos los horarios DEBEN estar en intervalos de 15 min: :00, :15, :30, :45",
    "progressiveAdjustments": "Nunca saltar más de 30 min entre planes",
    "tolerance": "Usar eventos reales para validar adaptación del bebé",
    "flexibility": "Horarios son guías, no reglas rígidas",
    "priority": "Señales del bebé > Horarios objetivo",
    "earlyRising": "Despertar antes de 6:00am se considera muy temprano"
  },

  "schedules": [
    {
      "ageMonths": "0-3",
      "ageLabel": "Recién Nacido",
      "characteristics": {
        "totalSleep": "14-17 horas/día",
        "napsCount": "4-6 siestas",
        "napDuration": "30-120 min",
        "schedule": "Flexible basado en señales del bebé",
        "nightFeedings": "2-4 (normal y esperado)",
        "development": "Sueño total necesario más alto, aún no hay ritmo circadiano establecido"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "9-11 horas con interrupciones",
        "naps": [
          {
            "napNumber": 1,
            "time": "08:30",
            "duration": "60-90 min"
          },
          {
            "napNumber": 2,
            "time": "11:00",
            "duration": "60-90 min"
          },
          {
            "napNumber": 3,
            "time": "13:30",
            "duration": "60-90 min"
          },
          {
            "napNumber": 4,
            "time": "16:00",
            "duration": "30-60 min"
          }
        ],
        "totalNapTime": "6-7 horas",
        "awakeWindows": "45-90 min",
        "nightFeedings": "2-4 normales"
      },
      "notes": "Horario flexible, seguir señales del bebé. No se puede 'exigir' un horario a esta edad",
      "tips": [
        "Priorizar alimentación a demanda",
        "Dormir cuando el bebé duerme",
        "Las tomas nocturnas son completamente normales",
        "No preocuparse por 'malos hábitos' a esta edad"
      ]
    },
    
    {
      "ageMonths": "3-6",
      "ageLabel": "3-6 Meses",
      "characteristics": {
        "totalSleep": "12-15 horas/día",
        "napsCount": "3-4 siestas más organizadas",
        "schedule": "Sueño nocturno comienza a consolidarse",
        "nightFeedings": "1-2",
        "development": "Ritmo circadiano empieza a establecerse"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "10-12 horas con 1-2 tomas",
        "naps": [
          {
            "napNumber": 1,
            "time": "08:30",
            "duration": "60-90 min"
          },
          {
            "napNumber": 2,
            "time": "11:30",
            "duration": "60-90 min"
          },
          {
            "napNumber": 3,
            "time": "14:00",
            "duration": "60-90 min"
          },
          {
            "napNumber": 4,
            "time": "17:00",
            "duration": "30 min",
            "optional": true
          }
        ],
        "totalNapTime": "4-5 horas",
        "awakeWindows": "1.5-2 horas",
        "nightFeedings": "1-2"
      },
      "notes": "Sueño nocturno se está consolidando. Siesta 4 es opcional",
      "tips": [
        "Empezar a establecer rutina de sueño consistente",
        "Cuarto oscuro ayuda mucho a esta edad",
        "Las ventanas de sueño se van alargando gradualmente"
      ]
    },

    {
      "ageMonths": 6,
      "ageLabel": "6 Meses",
      "characteristics": {
        "totalSleep": "14 horas/día (11 noche + 3 día)",
        "napsCount": "3 siestas (2 largas + 1 corta)",
        "schedule": "Sueño nocturno consolidado",
        "development": "A partir de esta edad se puede 'exigir' un horario (no rígido, pero sí con pauta consistente)"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "11 horas",
        "naps": [
          {
            "napNumber": 1,
            "time": "08:30",
            "duration": "90 min",
            "type": "larga"
          },
          {
            "napNumber": 2,
            "time": "12:00",
            "duration": "90-120 min",
            "type": "larga"
          },
          {
            "napNumber": 3,
            "time": "16:00",
            "duration": "45-60 min",
            "type": "corta"
          }
        ],
        "totalNapTime": "3-4 horas",
        "awakeWindows": ["1.5-2 hrs", "2 hrs", "2.5 hrs", "3 hrs"]
      },
      "notes": "Hora de despertar por la mañana debe ser fija o siempre la misma",
      "tips": [
        "La hora fija más importante es la hora de DESPERTAR, no la de dormir",
        "Rutina consistente para dormir",
        "Mantener ventanas de sueño apropiadas"
      ]
    },

    {
      "ageMonths": 9,
      "ageLabel": "9 Meses",
      "characteristics": {
        "totalSleep": "14 horas/día (11 noche + 3 día)",
        "napsCount": "2 siestas",
        "schedule": "Transición de 3→2 siestas",
        "development": "Tiempo despierto se alarga, tercera siesta desaparece"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "11 horas",
        "naps": [
          {
            "napNumber": 1,
            "time": "09:30",
            "duration": "90 min"
          },
          {
            "napNumber": 2,
            "time": "14:00",
            "duration": "90-120 min"
          }
        ],
        "totalNapTime": "3-3.5 horas",
        "awakeWindows": ["2.5-3 hrs", "3 hrs", "4 hrs"]
      },
      "transition": {
        "from": "3 siestas",
        "to": "2 siestas",
        "typicalAge": "7-9 meses (más común 8-9 meses)",
        "method": "Empujar cada periodo despierto 20 mins cada uno o dos días hasta llegar al tiempo despierto adecuado",
        "duration": "Varía según el niño",
        "emergencyOption": "Si ventana de tarde queda muy larga por siestas cortas: dormir más temprano O tercera siesta opcional"
      },
      "notes": "La tercer siesta desaparece. Las ventanas despierto se alargan significativamente",
      "tips": [
        "Ser paciente con la transición",
        "Observar señales de cansancio",
        "Está bien ajustar bedtime temporalmente si es necesario"
      ]
    },

    {
      "ageMonths": "13-15",
      "ageLabel": "13-15 Meses",
      "characteristics": {
        "totalSleep": "13.5 horas/día (11 noche + 2.5 día)",
        "napsCount": "2 siestas (1 corta + 1 larga)",
        "schedule": "Ventanas despierto aumentan",
        "development": "Primera siesta se acorta, segunda se mantiene larga"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "11 horas",
        "naps": [
          {
            "napNumber": 1,
            "time": "10:00",
            "duration": "45-60 min",
            "type": "corta",
            "important": "Despertar a los 60 min para asegurar siesta 2"
          },
          {
            "napNumber": 2,
            "time": "14:15",
            "duration": "90 min",
            "type": "larga",
            "important": "Esta es la siesta MÁS importante"
          }
        ],
        "totalNapTime": "2-2.5 horas",
        "awakeWindows": ["3 hrs", "3.5 hrs", "4 hrs"]
      },
      "criticalRule": "DESPERTAR de siesta 1 para asegurar que haga la siesta 2",
      "notes": "Muchos niños tienden a alargar la primera siesta y no querer hacer la segunda. Por eso es MUY importante despertarlos de la primera siesta",
      "tips": [
        "No dejar que duerma más de 60 min en siesta 1",
        "La siesta 2 (de la tarde) es la más importante",
        "Si solo va a hacer una siesta, que sea la de la tarde"
      ]
    },

    {
      "ageMonths": "15-18",
      "ageLabel": "15-18 Meses",
      "characteristics": {
        "totalSleep": "13 horas/día (11 noche + 2 día)",
        "napsCount": "1 siesta única",
        "schedule": "Transición a 1 siesta",
        "development": "Ventanas despierto muy largas. Etapa donde 2 siestas es mucho, pero 1 es poco"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:00",
        "nightSleepDuration": "11 horas",
        "naps": [
          {
            "napNumber": 1,
            "time": "13:00",
            "duration": "120-150 min",
            "maxDuration": "150 min (2.5 hrs)"
          }
        ],
        "totalNapTime": "2-2.5 horas",
        "awakeWindows": ["6 hrs", "4.5 hrs"]
      },
      "transition": {
        "from": "2 siestas",
        "to": "1 siesta",
        "typicalAge": "13-18 meses (más común 15-18 meses, algunos después)",
        "duration": "7-10 días usualmente",
        "method": "Empujar siesta de mañana 20 mins cada uno o dos días hasta llegar a hora deseada",
        "maxAfternoonWindow": "4.5 hrs",
        "napCutoffRule": "NO dejar dormir cuando falten menos de 3 horas para bedtime",
        "emergencyOptions": [
          "Segunda siesta corta durante transición",
          "Bedtime más temprano durante transición"
        ],
        "readinessSigns": [
          "Duerme 10-11 horas de sueño ininterrumpido por la noche",
          "Consistentemente tarda más y más tiempo en dormirse en siesta de mañana",
          "Siestas de mañana cada vez más cortas O duerme mucho por la mañana y rechaza siesta tarde",
          "Estos cambios suceden por 10-14 días consecutivos"
        ]
      },
      "notes": "Transición gradual empujando siesta 20 min cada 1-2 días. A partir de que comienzas la transición, la primera siesta ahora será la larga",
      "criticalRules": [
        "Ventana de tarde NO debe ser más larga de 4.5 hrs",
        "No siestas si faltan menos de 3 hrs para bedtime",
        "Durante transición: segunda siesta opcional o bedtime más temprano",
        "Dejar dormir lo que quiera en la siesta única (max 2.5 hrs)"
      ],
      "tips": [
        "Esta es una transición difícil - ser muy paciente",
        "La transición tarda 7-10 días usualmente",
        "Puede necesitar segunda siesta algunos días durante transición",
        "Observar señales de sobrecansancio"
      ]
    },

    {
      "ageMonths": "30+",
      "ageLabel": "2.5 Años en Adelante",
      "characteristics": {
        "totalSleep": "12 horas/día (10.5 noche + 1.5 día)",
        "napsCount": "1 siesta única más corta",
        "schedule": "Ventanas despierto muy largas",
        "development": "Promedio de siesta disminuye, sueño nocturno también disminuye levemente"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "20:30",
        "nightSleepDuration": "10.5 horas",
        "naps": [
          {
            "napNumber": 1,
            "time": "13:00",
            "duration": "90-120 min",
            "maxDuration": "180 min (3 hrs)"
          }
        ],
        "totalNapTime": "1.5-2 horas",
        "awakeWindows": ["6-6.5 hrs", "5-5.5 hrs"]
      },
      "notes": "A los 2 años puede haber regresión de sueño que se confunda con dejar la siesta - esto NO es cierto. La mayoría de niños siguen necesitando siesta",
      "warnings": [
        "NO confundir regresión de 2 años con necesidad de eliminar siesta",
        "La mayoría TODAVÍA necesita siesta a esta edad"
      ],
      "tips": [
        "Mantener siesta consistente",
        "Si rechaza siesta, puede ser fase temporal",
        "Observar comportamiento tarde/noche para confirmar necesidad de siesta"
      ]
    },

    {
      "ageMonths": "36-60",
      "ageLabel": "3-5 Años (Sin Siesta)",
      "characteristics": {
        "totalSleep": "11-12 horas/día (solo nocturno)",
        "napsCount": "0 (tiempo tranquilo en su lugar)",
        "schedule": "Ajustar según horario escolar",
        "development": "Transición de siesta a tiempo tranquilo. Sueño nocturno aumenta"
      },
      "targetSchedule": {
        "wakeTime": "07:00",
        "bedtime": "19:30",
        "nightSleepDuration": "11-12 horas",
        "naps": [],
        "quietTime": {
          "time": "13:00-14:00",
          "description": "Tiempo tranquilo en lugar de siesta - en su cuarto, actividades tranquilas"
        }
      },
      "transitionAge": "3-4 años típicamente",
      "criticalRule": "Calcular bedtime según hora despertar escolar: wakeTime - 11 hrs",
      "calculationExample": {
        "scenario": "Niño de 5 años debe despertar a las 6:30am para ir a clases",
        "calculation": "6:30am - 11 hrs = 19:30pm bedtime",
        "result": "Debe estar dormido a las 7:30pm"
      },
      "notes": "Una vez que entre al kínder, horario de dormir es establecido por hora de despertar para escuela",
      "warningSignsLatebedtime": [
        "Batallas para despertarlo por la mañana",
        "Se queda dormido en el camino en el carro",
        "Se queda dormido en 2 minutos en la noche",
        "Está muy necio a la hora de cenar"
      ],
      "tips": [
        "Tiempo tranquilo es importante incluso sin siesta",
        "Ajustar bedtime según hora de despertar escolar",
        "A los 4 años: 11.5-12 horas de sueño",
        "A los 5 años: 11 horas de sueño",
        "Mantener rutina de sueño consistente"
      ]
    }
  ],

  "napCoachingGuidelines": {
    "description": "Guía para entrenar siestas (Nap Training)",
    "considerations": [
      "Programar siestas según edad y ventanas despierto",
      "Observar, respetar y seguir ventanas de sueño del bebé",
      "Siesta debe tener rutina parecida a la noche pero más breve",
      "Usar misma posición/método que en la noche",
      "TEN MUCHA PACIENCIA Y SÉ MUUUUY CONSISTENTE"
    ],
    "emergencyPlan": {
      "when": "Si a las 2-3pm el bebé no ha dormido buenas siestas",
      "action": "Necesita dormir a como de lugar",
      "methods": ["carro", "swing", "carriola"],
      "warning": "Ten cuidado de NO hacer el hábito que estamos tratando de eliminar (ej: pecho, arrullo)"
    },
    "latestWakeTime": "Despierto a más tardar 3:30pm",
    "scenarios": [
      {
        "situation": "Estuviste 1 hora tratando y NO durmió",
        "action": "Sal del cuarto, espera 1 min, entra y haz despertar dramático. Pon atención a ventanas - probablemente pedirá dormir antes de bedtime habitual"
      },
      {
        "situation": "Solo durmió 45 min (mínimo para una siesta)",
        "ifWokeHappy": "Entra y haz despertar dramático",
        "ifWokeCranky": "Trata de alargar siesta por 45 min más. Si no logras que duerma, sal y haz despertar dramático"
      },
      {
        "situation": "Durmió menos de 45 min",
        "action": "Trata de alargar siesta por 60 min más. Si no logras que duerma, sal y haz despertar dramático. Pon atención a ventanas"
      },
      {
        "situation": "NO durmió o ha dormido muy poco y ya son las 2-3pm",
        "action": "¡PLAN DE EMERGENCIA!"
      }
    ]
  },

  "sleepRegressions": {
    "description": "Regresiones comunes del sueño y cómo manejarlas",
    "types": [
      {
        "type": "Emocional",
        "triggers": [
          "Entrar al kínder/guardería",
          "Nacimiento de hermanito",
          "Separación de mamá/papá"
        ],
        "handling": [
          "Ser paciente",
          "Respetar y mantener horarios de sueño",
          "Responder - regresar de posiciones hasta donde se sienta cómodo",
          "Agregar apapacho extra o canción extra en rutina",
          "Tiempo de calidad durante el día"
        ],
        "duration": "Hasta que se adapte al cambio",
        "retraining": "Una vez adaptado, hacer entrenamiento para regresar a rutina habitual"
      },
      {
        "type": "Motricidad",
        "triggers": [
          "Picos de crecimiento",
          "Hitos motores: rodar, gatear, caminar"
        ],
        "timing": "Casi siempre aparecen ANTES de que la nueva habilidad aparezca",
        "handling": "Mismo manejo que regresiones emocionales",
        "duration": "Temporal, usualmente días a 1-2 semanas"
      },
      {
        "type": "Socio-ambiental",
        "triggers": [
          "Cambio de casa/ciudad",
          "Miedos y pesadillas (después de 2.5 años)",
          "Contenido de películas/pláticas con amigos"
        ],
        "handling": {
          "general": "Mismo manejo que otras regresiones",
          "miedos": {
            "note": "Miedos son APRENDIDOS, no aparecen antes de 2.5 años",
            "differentiation": "Pesadillas = mal sueño donde al llegar mamá/papá se calma",
            "doNOT": [
              "Reforzar miedos (repelente de monstruos, etc)",
              "Burlarse o decir 'no pasa nada'",
              "Llevarlo a tu cama"
            ],
            "DO": [
              "Darle oportunidad de hablar (sin forzar)",
              "Objeto de seguridad (peluche)",
              "Luz nocturna (amarilla o roja)",
              "Puerta un poco abierta",
              "Cuidar contenido que consume",
              "Tiempo de calidad durante día"
            ],
            "whenToWorry": "Si miedo daña calidad de vida o sueño, o es más que pasajero → evaluación psicológica"
          }
        }
      }
    ],
    "universalGuidelines": [
      "Ser paciente - llantos tienen causa real",
      "Respetar y mantener horarios - niño sobrecansado tiene mayor dificultad",
      "Responder - regresar de posiciones según necesidad",
      "Agregar apapacho/canción extra en rutina si necesario",
      "Tiempo de calidad durante el día",
      "Una vez superada regresión: reentrenar para volver a rutina habitual"
    ]
  },

  "illness": {
    "description": "Manejo del sueño durante enfermedades",
    "principles": [
      "SIEMPRE responder cuando está enfermo",
      "Evitar devolver lo que ya se quitó (ej: si ya no duerme con pecho, no devolver pecho)",
      "Sistema inmunológico trabaja durante el sueño",
      "Balancear: responder necesidades vs no crear nuevos hábitos"
    ],
    "scheduleAdjustments": {
      "general": "Probablemente necesite dormir más y ventanas serán más cortas",
      "withMultipleNaps": "No dejar dormir más de 2 hrs en una siesta (riesgo de que no haga más siestas). Despertar a 2 hrs y observar",
      "withOneNap": "Puede dormir más de lo usual, estar abierto a siesta extra y/o dormir más temprano",
      "emergency": "Estar abiertos a siesta extra cada 2-3 días si es necesario"
    },
    "nightResponse": {
      "speed": "Responder INMEDIATAMENTE",
      "balance": "Estar ahí pero no exceder ayuda. Muchas veces con tenerte al lado es suficiente vs llevarlo a tu cama",
      "consistency": "Si puedes mantener hora de dormir consistente, mejor para retomar después",
      "pediatrician": "Preguntar qué hacer para aminorar malestar y ayudarlo a dormir"
    },
    "severityLevels": [
      {
        "level": "Leve (solo un poco de temperatura)",
        "approach": "Entrar y salir a revisar, mejor que dormir en el cuarto"
      },
      {
        "level": "Moderada (vómito, necesita supervisión)",
        "approach": "Poner colchón al lado de cuna/cama, dormir junto (NO en la misma cama)"
      },
      {
        "level": "Severa (muy constipado, no puede respirar)",
        "approach": "Entrar apenas despierte, sacar de cuna, hacer limpieza/dar medicina, quedarse en brazos hasta que se calme, regresar a cuna lo más despierto posible"
      }
    ],
    "nightEnvironment": [
      "Mantener estimulación y luces lo más bajas posibles",
      "Usar luz roja, amarilla o naranja si es necesario",
      "Si hay que bañar por temperatura/vómito: bañarse juntos a oscuras para no despertar más"
    ],
    "recovery": {
      "retraining": "Una vez recuperado, retomar rutinas, hábitos y horarios lo más pronto posible",
      "duration": "Puede necesitar mini-entrenamiento de 3 días O entrenamiento completo, dependiendo de cuánto refuerzo intermitente hubo"
    }
  },

  "travel": {
    "description": "Manejo del sueño durante viajes y vacaciones",
    "preparation": [
      "Llegar descansado - priorizar buen sueño semana previa",
      "Asemejar lugar a casa: almohada, funda, white noise, peluche, cuento favorito",
      "Preparar trayecto: coordinar siestas con traslados",
      "Planear actividades para trayecto"
    ],
    "flightTiming": {
      "recommendation": "Mejor salir MUY TEMPRANO que llegar MUY TARDE",
      "reason": "Si despierta temprano, puede compensar con siesta extra. Llegar tarde es más difícil de compensar",
      "benefit": "Llegar temprano da tiempo a conocer cuarto nuevo y hacer rutina tranquila"
    },
    "atDestination": [
      "Estar muy atenta a cambios - guiarte por bebé, no por reloj",
      "Dar tiempo de explorar lugar nuevo",
      "Alargar rutina primer día (cuento extra, canción extra, más abrazos)",
      "Regresar de posiciones si es necesario primeras 1-3 noches, luego avanzar de regreso",
      "Mantener MISMO cuarto y MISMA cama durante todo viaje",
      "PROHIBIDO dormir en cama de papás hasta 4+ años"
    ],
    "sleepNeeds": "Puede necesitar dormir más (mayor actividad, estimulación, cambio alimentación)",
    "flexibility": "Estar abierta a: siesta extra, dormir más temprano, siesta más larga",
    "timeZoneChange": {
      "preparation": "Preparar con 1 semana anticipación",
      "method": "Recorrer 10-15 mins cada 1-2 noches hasta llegar al horario del lugar nuevo",
      "direction": "Depende si vas hacia delante o atrás",
      "alternative": "Si no puedes preparar: levantarlo a su hora habitual en el lugar que esté (ej: 7am casa = 7am viaje)"
    },
    "enjoyment": "¡DISFRUTA! Prepárate, sé flexible, ve con la corriente",
    "return": "Retomar rutina lo más pronto posible al regresar"
  },

  "timeChanges": {
    "winter": {
      "when": "Octubre (horario de invierno)",
      "change": "Reloj se atrasa 1 hora - amanece más temprano",
      "strategies": {
        "naps": "Súper importantes - niño descansado se adapta mejor",
        "blackoutCurtains": "CRÍTICAS - no empezar día antes de 6am",
        "activities": "Actividades al aire libre en mañana (10 min bebés, 45 min niños). Tranquilas antes de dormir (no pantallas)",
        "followNewSchedule": "Hacer TODO según nuevo horario incluyendo comidas"
      },
      "options": [
        {
          "option": 1,
          "name": "No hacer nada",
          "for": "Niños 2+ años fáciles de adaptar",
          "method": "Domingo seguir nuevo horario y esperar que se ajuste"
        },
        {
          "option": 2,
          "name": "Ajuste gradual",
          "for": "Niños menores 2 años O mayores 2 años a quienes les cuestan cambios",
          "method": "Varios días antes: mover siesta, comida y bedtime 15 min más tarde cada 2 días hasta llegar a horario nuevo"
        }
      ],
      "adjustmentTime": "Hasta 1 semana"
    },
    "summer": {
      "when": "Marzo/Abril (horario de verano)",
      "change": "Reloj se adelanta 1 hora - anochece más tarde",
      "strategies": {
        "naps": "Súper importantes",
        "blackoutCurtains": "CRÍTICAS - ayudan a dormir con luz del día",
        "flexibility": "Ser flexible, observar ventanas de sueño",
        "activities": "Al aire libre en mañana. Tranquilas antes de dormir"
      },
      "options": [
        {
          "option": 1,
          "name": "Para madrugadores",
          "method": "¡Perfecto! Continuar con horario habitual en nuevo horario"
        },
        {
          "option": 2,
          "name": "Para los que despiertan ~7:30am",
          "method": "Recorrer hora de despertar 15-20 min más temprano cada 2-3 días. Ajustar TODO el horario (comidas, siestas, bedtime). Día del cambio: despertar a 7:30am y continuar con horario nuevo"
        }
      ],
      "adjustmentTime": "Hasta 1 semana"
    }
  },

  "cribToBed": {
    "description": "Transición de cuna a cama",
    "recommendedAge": "2.5 años mínimo, preferible 3 años",
    "aapGuideline": "Cuando barandal de cuna le llega por debajo del pecho estando parado",
    "reasoning": [
      "A 2.5-3 años tiene capacidad de comprender reglas de quedarse en cama",
      "Tiene control de impulsos para permanecer en ella",
      "Mientras más grande, más seguro"
    ],
    "doNOT": "NO hacer esta transición esperando solucionar un problema de sueño - raramente lo soluciona",
    "tips": [
      {
        "tip": 1,
        "title": "No empalmar cambios",
        "detail": "Especialmente NO con llegada de hermanito. Evitar en 2+ meses cualquier otro cambio grande"
      },
      {
        "tip": 2,
        "title": "Platicar y preparar",
        "detail": "Explicar cambio, hacerlo emocionante, mencionar 'cama de grande' continuamente, estar preparada para preguntas"
      },
      {
        "tip": 3,
        "title": "Hacerlo especial",
        "detail": "Llevarlo a escoger sábanas, peluche, decoración, incluso la cama. Considerar barandales o cama toddler para seguridad"
      },
      {
        "tip": 4,
        "title": "Reglas de la cama",
        "detail": "Platicar sobre reglas de quedarse en cama. En cuna había límites físicos, ahora necesitan límites verbales"
      },
      {
        "tip": 5,
        "title": "Puertas para bebés",
        "detail": "Restringir movilidad si se despierta a media noche"
      },
      {
        "tip": 6,
        "title": "Baño",
        "detail": "Puede necesitar ayuda para ir. Si va solo: bañito entrenador en recamara O luz tenue (amarilla/roja/naranja) en baño"
      },
      {
        "tip": 7,
        "title": "Reentrenar si necesario",
        "detail": "Si se baja mucho de cama, considera rehacer entrenamiento. Es gran cambio, medirá límites. Ser paciente y consistente. Puede tomar varias semanas"
      },
      {
        "tip": 8,
        "title": "Reloj de sueño (Ok to Wake)",
        "detail": "Funciona como semáforo: rojo = quedarse en cama, verde = puede levantarse. Marca recomendada: Hatch Baby"
      },
      {
        "tip": 9,
        "title": "Mantener cuna un tiempo",
        "detail": "Algunos niños disfrutan tener opción. Que ellos escojan puede ser empoderador. Si trata de trepar a cuna después de pasar a cama = aún no está listo"
      }
    ]
  },

  "teething": {
    "description": "Manejo del sueño durante dentición",
    "myth": "La dentición afecta MUCHO MENOS el sueño de lo que papás creen",
    "reality": [
      "Si niño sabe dormirse solo: pequeños despertares (molares pueden ser más molestos)",
      "Si niño NO sabe dormirse solo Y está sobrecansado: despertares se notarán mucho más"
    ],
    "guidelines": [
      {
        "rule": 1,
        "title": "Mantener buen descanso",
        "detail": "MUY importante que hijo esté bien descansado"
      },
      {
        "rule": 2,
        "title": "Comparar comportamiento",
        "detail": "Comparar día vs noche. Si en día está bien y noche irritado = probablemente NO son dientes. Si irritable todo el día = puede ser diente/molar"
      },
      {
        "rule": 3,
        "title": "Medicación",
        "detail": "Hablar con pediatra sobre Paracetamol u otro medicamento para aminorar molestias"
      }
    ]
  },

  "progressivePlanAdjustment": {
    "description": "Reglas para ajuste progresivo de horarios",
    "plans": {
      "plan0": {
        "name": "Plan Inicial",
        "base": "100% datos reales del niño",
        "adjustment": "Solo redondeo a intervalos de 15 min",
        "goal": "Establecer punto de partida realista"
      },
      "plan1Plus": {
        "name": "Planes Subsecuentes",
        "base": "Plan anterior + eventos nuevos",
        "adjustment": "Avanzar progresivamente hacia horarios objetivo",
        "steps": "Máximo 15-30 min por vez",
        "goal": "Alcanzar horarios objetivo gradualmente"
      }
    },
    "example": {
      "realData": "Bedtime 20:44",
      "plan0": "Bedtime 20:30 (redondeo + primer ajuste -14 min)",
      "plan1": "Bedtime 20:15 (ajuste -15 min)",
      "plan2": "Bedtime 20:00 (meta alcanzada ✅)"
    }
  }
}