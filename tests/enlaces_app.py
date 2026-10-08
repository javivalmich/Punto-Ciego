# Prueba de los enlaces externos en la app (Capacitor simulado) y en la web, sirviendo la raíz del repo en el puerto 8393.
# Uso: `python tests/enlaces_app.py` (necesita playwright y Edge).
import os,sys,threading,functools,http.server
from playwright.sync_api import sync_playwright
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fallos=[]
def ok(c,m):
    print(('OK   ' if c else 'FALLA ')+m)
    if not c: fallos.append(m)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8393),functools.partial(Q,directory=RAIZ)); threading.Thread(target=srv.serve_forever,daemon=True).start()
CAP="""window.__abiertas=[];window.Capacitor={isNativePlatform:()=>true,registerPlugin:n=>({open:o=>{window.__abiertas.push([n,o.url]);return Promise.resolve()}})};"""
U='http://localhost:8393/?supa=x&supakey='
with sync_playwright() as pw:
    br=pw.chromium.launch(channel='msedge')
    for app in (True,False):
        etq='app' if app else 'web'
        ctx=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True); p=ctx.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
        if app: p.add_init_script(CAP)
        p.goto(U); p.wait_for_selector('[data-a=jugar]')
        # enlaces de la portada
        hrefs=p.evaluate("[...document.querySelectorAll('a[data-ext]')].map(a=>a.getAttribute('href'))")
        ok(hrefs==['/privacidad/','terminos.html','/soporte/'],f'{etq}: los href de siempre se conservan {hrefs}')
        # las URLs de la app son las públicas
        ext=p.evaluate("[...document.querySelectorAll('a[data-ext]')].map(a=>a.dataset.ext)")
        ok(ext==['https://puntostudio.es/punto-ciego/privacidad.html','https://puntostudio.es/punto-ciego/terminos.html','https://puntostudio.es/punto-ciego/soporte.html'],f'{etq}: URLs absolutas {ext}')
        if app:
            for i in range(3):
                p.evaluate("i=>{document.querySelectorAll('a[data-ext]')[i].click()}",i)
            ab=p.evaluate("window.__abiertas")
            ok([u for _,u in ab]==ext and all(n=='Browser' for n,_ in ab),f'app: los tres enlaces se abren con Browser.open {ab}')
            ok(p.evaluate("location.href")==U,'app: la página no navega')
            ok(p.evaluate("(()=>{ME={code:'ABCDE'};return urlPartida()})()")=='https://puntostudio.es/punto-ciego/?c=ABCDE','app: el enlace para compartir lleva la web pública')
            ok(p.evaluate("redirigeA()")=='https://puntostudio.es/punto-ciego/','app: las redirecciones de cuentas llevan a la web')
        else:
            ok(p.evaluate("(()=>{ME={code:'ABCDE'};return urlPartida()})()")=='http://localhost:8393/?c=ABCDE','web: el enlace para compartir no cambia')
            sin=p.evaluate("(()=>{let d=null;document.addEventListener('click',e=>{d=e.defaultPrevented;e.preventDefault()},{once:false});document.querySelector('a[data-ext]').click();return d})()")
            ok(sin==False and p.evaluate("window.__abiertas===undefined"),'web: el clic no se intercepta, el enlace funciona como siempre')
        ok(not errs,f'{etq}: sin errores de JS {errs}'); ctx.close()
    br.close()
srv.shutdown(); print('\nFALLOS:',len(fallos)); sys.exit(1 if fallos else 0)
