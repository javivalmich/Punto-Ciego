# Prueba del orden de pantallas al entrar (acceso -> portada) con el servidor que imita a Supabase.
# Uso: servir beta/ en http://localhost:8392/ y `node mocksb.js` en marcha; luego `python tests/acceso.py` (playwright y Edge).
# Comprueba: sin sesión sale la pantalla de entrar (nunca la portada), con sesión guardada sale la portada sin que parpadee
# la de entrar, registro nuevo, cerrar sesión, invitaciones ?c= sin sesión (registro y unión) y con sesión, y modo sin cuentas.
import time
from playwright.sync_api import sync_playwright
B='http://localhost:8392/?supa=http://localhost:9999&supakey=local'
fallos=[]
def ok(c,m):
    print(('OK   ' if c else 'FALLA ')+m)
    if not c: fallos.append(m)
# anota cada pantalla distinta que se pinta: 'carga' | 'acceso' | 'portada' | 'menu' | 'editor' | 'juego'
OBS="""()=>{window.__vistas=[];const f=()=>{const a=document.querySelector('#app');if(!a)return;
 const t=a.querySelector('[data-a=entrarCuenta],[data-a=crearCuenta]')?'acceso':a.querySelector('[data-a=jugar]')?'portada':a.querySelector('[role=status] .lema')?'carga':a.querySelector('#nom')?'editor':a.querySelector('[data-a=crear]')?'menu':a.innerText.trim()?'otra':'';
 const l=window.__vistas;if(t&&l[l.length-1]!==t)l.push(t)};
 new MutationObserver(f).observe(document.documentElement,{childList:true,subtree:true});f()}"""
def nuevo(br,url,estado=None):
    ctx=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True,storage_state=estado)
    p=ctx.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
    p.add_init_script("document.addEventListener('DOMContentLoaded',"+OBS+")")
    p.goto(url); return ctx,p,errs
def vistas(p): return p.evaluate('window.__vistas')
with sync_playwright() as pw:
    br=pw.chromium.launch(channel='msedge')
    mail='a%d@ejemplo.com'%int(time.time()*1000); nom='Ana'+str(int(time.time()))[-5:]
    # 1. sin sesión: entrar, sin portada
    ctx,p,e=nuevo(br,B); p.wait_for_selector('[data-a=entrarCuenta]'); p.wait_for_timeout(500)
    v=vistas(p); ok('portada' not in v and v[-1]=='acceso',f'sin sesión: acceso y nunca portada {v}')
    ok(p.evaluate("!!document.querySelector('#app img.logo')"),'acceso: lleva el logo')
    p.click('details.reglas summary'); p.click('[data-a=modoAcceso][data-m=crear]'); ok(p.evaluate("document.querySelector('details.reglas').open"),'«Cómo se juega» se lee en la pantalla de entrar y sigue abierto al cambiar de pestaña')
    # 2. registro nuevo -> editor -> guardar
    p.fill('#em',mail); p.fill('#pw','clave1234'); p.click('[data-a=crearCuenta]'); p.wait_for_selector('#nom')
    ok('acceso' not in vistas(p)[vistas(p).index('editor'):],'registro: va al editor sin volver a acceso')
    p.fill('#nom',nom); p.wait_for_timeout(600); p.click('[data-a=guardarPerfil]'); p.wait_for_selector('[data-a=crear]')
    estado=ctx.storage_state(); ctx.close()
    # 3. sesión guardada: portada directa, sin parpadeo de acceso
    ctx,p,e=nuevo(br,B,estado); p.wait_for_selector('[data-a=jugar]'); p.wait_for_timeout(600)
    v=vistas(p); ok('acceso' not in v and v[-1]=='portada',f'sesión guardada: portada sin parpadeo de acceso {v}')
    ok('carga' in v or v[0]=='portada',f'sesión guardada: carga con logo antes {v}')
    # 4. cerrar sesión -> acceso
    p.click('[data-a=jugar]'); p.click('[data-a=salirCuenta]'); p.wait_for_selector('[data-a=entrarCuenta]'); ok(True,'cerrar sesión: lleva a entrar')
    # 5. entrar con la cuenta existente -> portada
    p.fill('#em',mail); p.fill('#pw','clave1234'); p.click('[data-a=entrarCuenta]'); p.wait_for_selector('[data-a=jugar]'); ok(True,'entrar: a la portada con Jugar')
    estado=ctx.storage_state(); ctx.close()
    # 6. invitación con sesión: unión directa
    ctx,p,e=nuevo(br,B+'&c=QWERT',estado); p.wait_for_function("ME&&ME.code==='QWERT'",timeout=8000)
    v=vistas(p); ok('acceso' not in v and 'portada' not in v,f'invitación con sesión: se une directo, sin portada ni acceso {v}'); ctx.close()
    # 7. invitación sin sesión: aviso, registro, unión directa
    ctx,p,e=nuevo(br,B+'&c=ZXCVB'); p.wait_for_selector('[data-a=entrarCuenta]')
    ok('Te han invitado' in p.inner_text('#app'),'invitación sin sesión: aviso en la pantalla de entrar')
    p.click('[data-a=modoAcceso][data-m=crear]'); p.fill('#em','b'+mail); p.fill('#pw','clave1234'); p.click('[data-a=crearCuenta]'); p.wait_for_selector('#nom')
    p.fill('#nom','Bea'+str(int(time.time()))[-5:]); p.wait_for_timeout(600); p.click('[data-a=guardarPerfil]')
    p.wait_for_function("ME&&ME.code==='ZXCVB'",timeout=8000)
    v=vistas(p); ok('portada' not in v,f'invitación + registro: acaba en la partida sin portada {v}')
    # 7b. el código se rescata del móvil si la vuelta de un proveedor pierde la query
    ctx.close()
    ctx,p,e=nuevo(br,B+'&c=MNBVC'); p.wait_for_selector('[data-a=entrarCuenta]')
    p.evaluate("LS.set('pc.invita',{c:'MNBVC',t:Date.now()})")
    p.goto('http://localhost:8392/?supa=http://localhost:9999&supakey=local#error_description=x'); p.wait_for_selector('[data-a=entrarCuenta]')
    ok('Te han invitado' in p.inner_text('#app'),'vuelta de proveedor sin ?c=: el aviso de invitación sigue'); ctx.close()
    # 8. modo sin cuentas
    ctx,p,e=nuevo(br,'http://localhost:8392/?supa=x&supakey=&pruebas=1'); p.wait_for_selector('[data-a=jugar]'); v=vistas(p)
    ok(v==['portada'],f'sin cuentas: portada como siempre {v}'); p.click('[data-a=jugar]'); p.wait_for_selector('#nom'); ok(True,'sin cuentas: Jugar -> editor'); ctx.close()
    br.close()
print('\nFALLOS:',fallos if fallos else 'ninguno')
