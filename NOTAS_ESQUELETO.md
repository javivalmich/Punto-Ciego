# Esqueleto y pesos del personaje 3D

Notas técnicas del esqueleto de 10 huesos y el GPU skinning del personaje, para quien retome
este trabajo más adelante. El pipeline que genera el modelo (`generar_modelo.py` y las
herramientas de pintado de pesos) vive en `fuentes/`, que **no se sube al repositorio**
(`.gitignore`) porque incluye el modelo 3D original y otro material pesado. Este documento
sí se sube, precisamente para que la explicación no se pierda con esos archivos.

## Formato

- `assets/personaje.bin`: magia `PJZ2`, 16 bytes/vértice (posición i16×3, zona u8, 2 índices
  de hueso u8 + un peso de mezcla u8 + relleno u8, normal+AO u8×4).
- 10 huesos: `Hips, Head, LeftArm, LeftForeArm, RightArm, RightForeArm, LeftUpLeg, LeftLeg,
  RightUpLeg, RightLeg` (nombres al estilo Mixamo, aunque hoy solo se anima a mano).
- Deformación por cuaterniones duales (evita el colapso "papel de regalo" de la mezcla lineal
  de matrices en giros grandes).
- Los colores por zona se calculan sobre la posición **en reposo** de cada vértice (no cambian
  al posar): esto sigue funcionando igual con el esqueleto.

## Pendiente: el brazo levantado no es viable con este modelo

Se intentó (y se aparcó) una pose de "puño en alto" para las escenas de victoria/felicidad.
Conclusión, comprobada a fondo, no solo con marcadores automáticos sino mirando el modelo
directamente: **con la malla actual, ningún reparto de pesos va a producir un brazo levantado
que se reconozca como tal.** No es un bug de pesos — es que el brazo, tal como está esculpido,
no tiene una forma propia y separada del torso.

**Cómo se comprobó:** se aisló visualmente en la herramienta de pintado de pesos (pintando de
blanco solo los vértices cuyo hueso principal es `RightArm`/`RightForeArm` y de negro todo lo
demás) para ver la forma real de "el brazo" sin la distracción de los colores del look. En
reposo, esa mancha blanca no es una manga: es una cuña ancha y plana que ocupa buena parte de lo
que a simple vista se lee como pecho/hombro, fundida con el torso — el personaje está esculpido
tan compacto que no hay una superficie de brazo distinta de la del cuerpo, ni siquiera un hueco o
un pliegue que las separe. Al rotar el hueso `RightArm`, esa mancha **sí se mueve** (no está
atascada dentro del cuerpo — se comprobó comparando reposo y pose "feliz" desde el mismo ángulo,
con el mismo aislado en blanco/negro: la mancha cambia claramente de sitio), pero como su forma
en reposo ya era la de "un trozo de torso", moverla produce un trozo de torso desplazado, no un
brazo con manga y puño reconocibles. Las capturas de esa comparación (reposo vs "feliz", mismo
ángulo, aislado en blanco y negro) se generaron con la herramienta de pintado de pesos —
reprodúcelas con: cargar `fuentes/pintor_pesos/`, modo "Mover", vista "Hueso por color", y en la
consola del navegador pintar a blanco los vértices con `BI0===4||BI0===5` (ver el snippet en el
historial de esta sesión de trabajo si hace falta el código exacto).

**Qué se probó para arreglarlo (y por qué no basta con pesos):**
- El arreglo de costuras (duplicados con pesos distintos) — real y necesario, pero no crea forma
  donde no la hay.
- La limpieza de "islas" (vértices sueltos que discrepan de sus vecinos) — igual: solo reparte
  mejor el peso que ya existe.
- Que la capucha ceda al brazo en el remate del hombro — ayuda a que la costura no se abra, pero
  el brazo debajo sigue siendo la misma cuña plana.

No hay ninguna regla de pesos que pueda inventar una manga que no está en la malla. La única
salida real es **de modelado, no de pesos**: volver a esculpir (o generar) el modelo con los
brazos como geometría separada y reconocible — con un hueco de verdad entre brazo y torso —
usando como referencia una pose en T o en A (brazos estirados hacia los lados) en el momento de
pintar/capturar la malla original, que es como se suele modelar y pesar un personaje pensado
para animarse. Eso da una superficie de brazo distinta de la del torso, con la que sí se podría
levantar el puño.

**Estado actual:** las poses "feliz" (`saludo`) y "saltando" transmiten energía por postura de
cuerpo entero (brazos a los lados, un giro de cadera, piernas algo flexionadas) en vez de por
gesto de brazo. Girar solo la cadera (`Hips`, el hueso raíz) es seguro por construcción: un giro
del hueso raíz mueve todo el cuerpo en bloque sin estirar ninguna costura, se comprobó
específicamente para esto.

## Bug de fondo ya arreglado: costuras con pesos distintos entre copias

**Síntoma:** al girar un hueso más de unos pocos grados, la tela se rasgaba (agujeros y
triángulos oscuros) justo en las costuras de color — el cuello, las axilas, la cadera, las
correas de la mochila. Pintar pesos a mano ahí no lo arreglaba: se podían pintar 700+ vértices
sin que el número de vértices problemáticos bajara.

**Causa:** la malla se corta por zona de color (cada triángulo debe tener un único color), así
que en cada frontera de zona hay vértices **duplicados**: dos o más copias en la misma
posición de reposo, una por cada zona que se toca ahí. El cálculo automático de pesos (distancia
geodésica sobre la malla, hueso más cercano) trata cada copia como un vértice normal de su propia
"isla" de malla — no comparte ninguna arista con su gemela — así que puede darle un hueso
principal distinto a cada copia. Al posar, cada copia se mueve con su propio hueso y la tela se
abre exactamente en la costura, por bien que se pinte a un lado, porque pintar un lado nunca
toca a la copia del otro lado.

Se verificó con un script de diagnóstico (agrupar vértices por posición de reposo y comparar
los pesos entre copias del mismo grupo): de ~1780 grupos de vértices duplicados, el 80% tenía
pesos distintos entre copias, y en 840 de ellos el hueso principal era directamente distinto
(no solo el reparto de la mezcla).

Además de los duplicados exactos, la franja de malla refinada junto al corte de zona deja
vértices de zonas distintas **casi** coincidentes pero no exactamente iguales (por ejemplo las
correas de la mochila contra la sudadera), que se rasgaban igual sin ser duplicados perfectos.

**Arreglo** (en el paso final de cálculo de pesos, antes de quedarse solo con los 2 huesos de
más peso por vértice):

1. Agrupar los vértices por **componentes conexas** de "vecino de otra zona a menos de 1 mm en
   reposo" (en la práctica, duplicados exactos —distancia 0—: se probó primero con 8 mm y
   arreglaba más costuras a la vez, pero también unía cosas que NO debían unirse — ver el
   apartado de abajo, "capucha tirando del hombro").
2. Promediar el vector de pesos completo (los 10 huesos, no solo los 2 finales) entre todas las
   copias de cada grupo, y asignar ese mismo promedio a todas ellas.
3. Repetir esta unificación **después** de aplicar los retoques pintados a mano, para que si solo
   se pintó un lado de una costura, el otro lado herede el arreglo automáticamente.

Con esto, todas las copias de una misma costura quedan con **exactamente** el mismo peso, así
que se mueven juntas al posar y la costura no se abre.

**Si se vuelve a tocar el generador del modelo**, este es el punto fácil de romper sin darse
cuenta: cualquier cambio que toque el cálculo de pesos (una nueva regla por zona, otro suavizado,
otro recorte de huesos) debe aplicarse **antes** de esta unificación de costuras, o repetirla
después. Si se cambia el número de triángulos objetivo o las zonas (`zonas.bin`), hay que volver
a comprobar que los grupos de costura se siguen formando bien.

## Segundo bug, relacionado: vértices "isla" sueltos de la mayoría de sus vecinos

Con las costuras ya arregladas, el hombro seguía roto en las poses con el brazo levantado del
todo (el "puño en alto" de la pose feliz): la manga se veía aplastada contra el cuerpo, como
cartón arrugado, en vez de seguir al brazo. No era un hueco (0 costuras abiertas), así que hacía
falta OTRA comprobación: `fuentes/herramientas/_check_colapso.py` compara, para cada triángulo,
el área en reposo contra el área ya posado — con la manga rota, algunos triángulos del hombro se
estiraban más de 100 veces su tamaño en reposo (filtrando los triángulos ya minúsculos de
fábrica, que dan cocientes falsos al dividir por casi cero).

**Causa:** unos pocos vértices sueltos (26 en el primer diagnóstico, todos en el remate del
hombro) tenían Head como hueso principal mientras TODOS sus vecinos de malla tenían el brazo. No
es una costura — están dentro de una zona continua (la sudadera), sin corte — sino un resto del
suavizado por Laplaciano: con solo 8 pasadas no basta cuando el vértice de partida tenía casi el
100% del peso en Head. El triángulo que une ese vértice (que casi no se mueve al levantar el
brazo) con sus vecinos (que sí giran con él) se estira una barbaridad.

**Arreglo — "limpieza de islas":** si el hueso principal de un vértice no coincide con la
mayoría de sus vecinos de malla (más del 50%), adopta el peso medio de esos vecinos. Se hace en
una pasada SÍNCRONA (calcula todas las correcciones sobre una única foto del estado actual y las
aplica juntas al final de cada vuelta; una versión que corrige uno a uno y vota sobre el
resultado a medio corregir oscila sin converger nunca en un puñado de vértices). Se repite hasta
que no cambia nada o hasta un tope de vueltas.

Esta limpieza hay que aplicarla **tres veces**, porque cada paso posterior puede volver a
desordenar el resultado del anterior:
1. Sobre los pesos automáticos, antes de nada más.
2. Otra vez después de unificar costuras (la unificación de costuras puede tirar de un vértice
   hacia el lado equivocado — ver el caso de la capucha, justo abajo).
3. Una tercera vez al final del todo, después de aplicar `pesos.bin` (los retoques a mano) y de
   re-unificar costuras con esos retoques encima — si no se repite aquí, `malla_pesos_auto.bin`
   puede salir limpio en el diagnóstico y aun así el `.bin` final servido llevar el contagio,
   porque esta última pasada de costuras no tiene limpieza de islas detrás.

## Caso especial: la capucha tira del hombro hacia Head

Investigando el bug de arriba se encontró el porqué de que el radio de costuras a 8 mm causara
más problemas de los que arreglaba: en el remate del hombro, un vértice de sudadera (que debe
seguir al brazo) puede estar a menos de 8 mm de un vértice de capucha (que casi siempre debe
seguir a la cabeza, sin atenuar — la capucha nunca se atenúa contra los brazos, a diferencia de
la sudadera y el pantalón). Unificar ese par promedia "sigue al brazo" con "sigue a la cabeza" y
el resultado no sigue bien a ninguno de los dos. Por eso el radio de costuras se dejó en 1 mm
(duplicados casi exactos) en vez de 8 mm.

Como aun así hace falta cerrar ALGUNAS costuras capucha↔sudadera cerca del hombro (para que no
se abra un hueco de verdad), el generador hace un arreglo específico: los vértices de capucha
que están en la costura (a menos de 1 cm de un vértice de sudadera) Y además cerca de un hueso
de brazo (a menos de 15 cm) heredan directamente el peso de su vecino de sudadera, en vez de
partir del 100% Head por defecto de la capucha. Esto es distinto de la limpieza de islas: aquí
se sabe de antemano qué lado debe ganar (el brazo, nunca la cabeza, en el remate del hombro), así
que se fuerza directamente en vez de dejarlo a una votación de vecinos.

## Mochila y correas: un problema distinto, ya arreglado por otra vía

Las correas de la mochila seguían con roce después de arreglar las costuras. No era el mismo
bug: se comprobó que los vértices de la mochila están, de media, a 12 mm de su vecino de
sudadera más cercano (bastantes a más de 15 cm) — nunca fueron duplicados de un mismo corte,
es simplemente una pieza pegada encima cuyo cálculo geodésico propio salía más ruidoso que el
del torso.

**Arreglo:** cada vértice de la mochila hereda directamente el peso del vértice de sudadera más
cercano (el trozo de tela sobre el que la correa realmente se apoya), en vez de su propio
cálculo geodésico.

## Cómo verificar que no se ha roto

`fuentes/herramientas/diagnostico_costuras.py` (no se sube al repositorio, pero se genera cada
vez que se toca `generar_modelo.py`) agrupa los vértices por costura y compara los pesos entre
copias; con el arreglo puesto debe reportar **0 grupos con pesos distintos**, tanto en los pesos
automáticos como en los finales (con los retoques a mano aplicados).

La herramienta de pintado de pesos (`fuentes/pintor_pesos/`) tiene además un indicador
"costuras abiertas" en su modo de prueba de poses: carga una pose exigente y compara, para cada
grupo de costura, la distancia entre copias en reposo contra la distancia ya posado — si crece
más de 6 mm, cuenta como costura abierta. Debe marcar 0 en cualquier pose. (Ojo: el indicador
anterior, que contaba vértices con aristas "estiradas", no era fiable — podía subir aunque la
costura estuviera realmente arreglada, porque medía el estiramiento normal de la tela alrededor
de la costura, no la costura en sí.)

Ninguno de los dos indicadores anteriores detecta el bug de las "islas" (arriba): una costura
puede seguir con 0 huecos y aun así tener un triángulo que se aplasta o se estira una barbaridad
dentro de una misma zona. Para eso está `fuentes/herramientas/_check_colapso.py <pose>`: posa la
malla con la misma matemática que el juego (cuaterniones duales) y compara el área de cada
triángulo en reposo contra posado, ignorando los triángulos ya minúsculos de fábrica (si no, un
triángulo de área casi cero da cocientes absurdos al dividir). Un puñado de triángulos con
cociente alto es normal (arrugas propias de la tela al doblarse); lo que hay que mirar es si
hay una zona CONCENTRADA de cocientes altos en un sitio concreto — eso sí es un vértice roto — y,
sobre todo, mirar el render de verdad: el criterio final es si se ve bien, no el número.
