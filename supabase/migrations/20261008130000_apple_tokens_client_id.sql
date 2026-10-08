-- Punto Ciego y Punto Falso: guardar con qué client_id se emitió cada token de Apple, para revocarlo con el correcto.
-- Hay dos apps nativas (es.puntostudio.puntociego y es.puntostudio.puntofalso) y cada token solo se revoca con el client_id con el que se canjeó.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede ejecutar más de una vez.
-- Las filas anteriores quedan con client_id nulo: eliminar-cuenta usa para ellas el de siempre según `origen`.
alter table public.apple_tokens add column if not exists client_id text;
