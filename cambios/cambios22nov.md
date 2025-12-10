Ayudame a realizar los siguienets cmabios:

1. en la paina de survey : http://localhost:3000/dashboard/survey?childId=68d1af5315d0e9b1cc189544, en el ta de hsotorial del noño, la pregunta: 5. ¿Tuviste alguna complicación durante el parto? cuando le piquen que si, que se abra un input text para poner cual fue, asegurata de que en mognodb se gaurdae tmabien la respuesta!

2. en la pregunta 9: Su hijo/a: del dtab de desarrollo y salud, si selecciona el de "usa chupon", preguntar si planea dejarlo, si o no. igual aseguratde. que se guarde en mongodb., igual en la pregunta de Tiene o ha tenido problemas médicos o del desarrollo, si lo seleccion que pregunte cual.

3. asegurat de que los numeros de las preguntas lleven un orden en el tab de rutina y habitos.

4. en la pregunta de 2. ¿Tu hijo(a) practica alguna actividad física, estimulación temprana o deporte?, aparte de poner la activudad, que tambuen tengan que poner por cuanto tiempo, entonces habra que poner , aparte del input de laa ctividad, cuuanto tiempo duro la actividad en minutos!, y un mas para que pueda darle enter el suer y agregar mas, en cada ativudad, poner la atchita como la tienes paar elimianrlos en caso de , recuerda guardrlos correctamnete en mongodb

5. asegurarte de que se vea bien la vista de resmen visual de los ultimos "x" dias,el garfico que se vea todo bien en la vista mobile!, no se alcnza. aver todo

 6. quitame el bootn de registrar evento del sidebar de bitacora de lado del user!, no hace nada!

 7. ayudame a que en la pagain de http://localhost:3000/dashboard/calendar de lado del admin. cuando se va a la tab de estadisticas, y vea la grafica de tendencias del mes, si el niño que esta seleccinaod no tiene plan activo, no debrian de aparecer las lineas de dormir ideal y despetar ideal, esas lineas solo salen del plan!

 8. ayudame a correjir el bug del boton de dormir/siesta/despertar nocturno ela pagain de dashbaord de lado de user!, ese bton es muy importante que lo corrijamos, dejame te expclio como funciona:, RANGOS HORARIOS (3 opciones)
DORMIR

Rango: 6:00 PM - 6:00 AM

SIESTA

Rango: 8:00 AM - 5:00 PM

DESPERTAR NOCTURNO

Rango: 10:00 PM - 6:00 AM (dentro del período de dormir)


LÓGICA DEL BOTÓN:

Si hora actual está entre 6:00 PM - 6:00 AM → Mostrar botón "DORMIR"
Si hora actual está entre 8:00 AM - 5:00 PM → Mostrar botón "SIESTA"
Si hora actual está entre 10:00 PM - 6:00 AM Y ya registró "dormir" → Mostrar botón "DESPERTAR NOCTURNO"

Nota: El "Despertar nocturno" solo aparece si ya hay un registro de "Dormir" activo, sino solo muestra "Dormir" durante la noche.
¿Así funciona mejor para tu app?, pongamolso asi , que sea mmuy seamesley!, muy sencilo, no te la compliques, es algo muy sencillo!!!, ese botn rapido no deberia mostar modal, solo es para registra en tiempo real los eventos!!, si es necesario confirgirar la zona hoaria en el dropdwn de mi cuenat en el navabr en comnfigriacion  en Configuración de Cuenta
 de lado del user, para que el suer pueda conofgurar la zona horaria, en este caso el defualt es america/monterrey, ok?

 

 