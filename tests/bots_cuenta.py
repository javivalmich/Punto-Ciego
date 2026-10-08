# Prueba de la práctica con bots (para todos), de los atajos de prueba (solo con puede_bots) y de una partida completa con bots,
# contra el servidor que imita a Supabase. Prueba la raíz (la de la app); PUNTO_WEB=beta para probar beta/ (no lleva estos cambios).
# Uso: `python tests/bots_cuenta.py` (necesita playwright y Edge). Arranca solo mocksb.js (con un archivo de datos temporal)
# y un servidor estático en el puerto 8392, así que esos puertos deben estar libres.
# Comprueba: cuenta normal e invitado ven «Añadir bots» y pueden usarlos pero sin atajos; el cliente no puede ponerse el indicador
# puede_bots; con indicador el anfitrión además tiene los atajos; y partidas completas: como Ciego (los bots matan, sabotean,
# reportan y votan) y como Punto (matas tú).
import os,sys,json,time,tempfile,subprocess,threading,functools,http.server
from playwright.sync_api import sync_playwright
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS=os.path.join(tempfile.mkdtemp(),'mock.json')
B='http://localhost:8392/?supa=http://localhost:9999&supakey=local'
fallos=[]
def ok(c,m):
    print(('OK   ' if c else 'FALLA ')+m)
    if not c: fallos.append(m)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8392),functools.partial(Q,directory=os.path.join(RAIZ,'beta') if os.environ.get('PUNTO_WEB')=='beta' else RAIZ))
threading.Thread(target=srv.serve_forever,daemon=True).start()
def mock():
    pr=subprocess.Popen(['node',os.path.join(RAIZ,'mocksb.js')],env={**os.environ,'MOCKSB_DATOS':DATOS},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(1.2); return pr
def cuenta(br,mail,nom):
    ctx=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True); p=ctx.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
    p.goto(B); p.wait_for_selector('[data-a=modoAcceso]'); p.click('[data-a=modoAcceso][data-m=crear]')
    p.fill('#em',mail); p.fill('#pw','clave1234'); p.click('[data-a=crearCuenta]'); p.wait_for_selector('#nom')
    p.fill('#nom',nom); p.wait_for_timeout(600); p.click('[data-a=guardarPerfil]'); p.wait_for_selector('[data-a=crear]')
    return ctx,p,errs
def sala(p):
    p.click('[data-a=crear]'); p.wait_for_selector('[data-a=empezar]',state='attached')
# el anfitrión juega solo: en cada vuelta hace lo que pida su modo y devuelve la fase
BUCLE="""modo=>{
 if(!S)return 'nada';const me=mine();
 if(S.phase==='play'&&me&&!me.dead){
   if(modo==='imp'){const v=S.players.find(x=>!x.dead&&x.role!=='imp');if(v&&ahora()>=me.kcd)accion('kill',{target:v.id})}
   else if(modo==='tareas'){for(const t of me.tasks||[])if(t.done<t.steps.length){accion('task',{tid:t.id,step:t.done});break}}
 }
 if(S.phase==='meeting'&&S.meet&&me&&!me.dead){
   if(S.meet.fase==='disc')accion('listo',{n:S.meet.n});
   else if(S.meet.fase==='vote'&&!(me.id in S.meet.votes)){const o=S.players.filter(x=>!x.dead&&x.id!==me.id);accion('vote',{target:Math.random()<.5?'skip':o[Math.floor(Math.random()*o.length)].id})}
 }
 return S.phase}"""
def partida(p,rol,modo,etq):
    p.evaluate("r=>accion('pruebas',{rol:r,vel:'rapida'})",rol)
    p.evaluate("accion('cfg',{cfg:{killCd:10,disc:0,vote:15,tasks:2,largas:0,emerg:1}})")
    p.click('[data-a=empezar]'); p.wait_for_function("S&&S.phase==='play'",timeout=8000)
    roles=p.evaluate("S.players.map(x=>({n:x.name,b:!!x.bot,r:x.role}))")
    ok(all(x['r'] for x in roles),f'{etq}: todos reciben rol {roles}')
    ok(p.evaluate("mine().role")==('imp' if rol=='imp' else 'crew'),f'{etq}: tu papel es el elegido')
    t0=time.time(); votos_bot=0; fase='play'; reuniones=set()
    while time.time()-t0<300:
        fase=p.evaluate(BUCLE,modo)
        if p.evaluate("S.phase==='meeting'&&!!S.meet"):
            reuniones.add(p.evaluate("S.meet.n"))
            votos_bot=max(votos_bot,p.evaluate("Object.keys(S.meet.votes).filter(k=>k.startsWith('bot-')).length"))
        if fase=='end': break
        p.wait_for_timeout(700)
    ok(fase=='end',f'{etq}: la partida llega a su fin ({int(time.time()-t0)} s)')
    fin=p.evaluate("({w:S.end.w,why:S.end.why,log:S.log.map(l=>l.txt)})")
    print('     ',fin['w'],fin['why']); print('     ',' | '.join(fin['log'])[:700])
    return fin,reuniones,votos_bot
with sync_playwright() as pw:
    br=pw.chromium.launch(channel='msedge'); m=mock()
    try:
        # cuentas: una normal y una con indicador (que se pone "desde el servidor": editando el archivo del mock)
        cA,pA,eA=cuenta(br,'normal%d@ejemplo.com'%int(time.time()),'Norma'+str(int(time.time()))[-4:])
        cB,pB,eB=cuenta(br,'bots%d@ejemplo.com'%int(time.time()),'Beto'+str(int(time.time()))[-4:]); sB=cB.storage_state()
        # 1. sin indicador: bots de práctica sí, atajos no
        sala(pA)
        ok(pA.evaluate("PRUEBAS")==True,'cuenta normal: la práctica con bots está disponible')
        ok(pA.evaluate("ATAJOS")==False,'cuenta normal: sin atajos de prueba')
        ok('Práctica con bots' in pA.inner_text('#app'),'cuenta normal: la sala de espera muestra «Práctica con bots»')
        ok(pA.locator('[data-a=botMas3]').count()==1,'cuenta normal: aparece «Añadir bots»')
        pA.click('[data-a=botMas3]'); pA.wait_for_timeout(400)
        ok(pA.evaluate("S.players.filter(x=>x.bot).length")==3,'cuenta normal: se unen 3 bots')
        ok(pA.locator('.gente .bot-tag').count()==3,'cuenta normal: los bots llevan la etiqueta «bot»')
        ok(pA.evaluate("enAtajos()")==False and pA.evaluate("document.querySelector('#prFab').hidden")==True,'cuenta normal: ni función ni botón de atajos')
        pA.evaluate("accion('atajo',{k:'reunion'})"); ok(pA.evaluate("S.phase")=='lobby','cuenta normal: la acción de atajo no hace nada')
        # 1b. invitado: sin cuenta, perfil local, sin estadísticas, con bots
        ctxG=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True); pG=ctxG.new_page(); eG=[]; pG.on('pageerror',lambda e:eG.append(str(e)))
        pG.goto(B); pG.wait_for_selector('[data-a=invitado]'); pG.click('[data-a=invitado]'); pG.wait_for_selector('[data-a=jugar]'); pG.click('[data-a=jugar]')
        pG.wait_for_selector('#nom'); pG.fill('#nom','Invitada'); pG.wait_for_timeout(600); pG.click('[data-a=guardarPerfil]'); pG.wait_for_selector('[data-a=crear]')
        ok(pG.evaluate("!USER&&INVITADO")==True,'invitado: sin sesión, en modo invitado')
        ok(pG.locator('.stats').count()==0 and pG.locator('[data-a=aBorrarCuenta]').count()==0,'invitado: sin estadísticas ni «Eliminar cuenta»')
        sala(pG); pG.wait_for_selector('[data-a=botMas3]'); pG.click('[data-a=botMas3]'); pG.wait_for_timeout(400)
        ok(pG.evaluate("S.players.filter(x=>x.bot).length")==3,'invitado: ve «Añadir bots» y se unen 3 bots')
        ok(pG.evaluate("ATAJOS")==False,'invitado: sin atajos de prueba')
        pG.evaluate('salir()'); pG.wait_for_selector('[data-a=crear]'); pG.reload(); pG.wait_for_selector('[data-a=jugar]'); pG.click('[data-a=jugar]'); pG.wait_for_selector('[data-a=crear]')
        ok('Invitada' in pG.inner_text('#app'),'invitado: el perfil local sigue tras recargar')
        ok(not eG,f'invitado: sin errores de JS {eG}')
        ctxG.close()
        # 2. el cliente no puede ponerse el indicador
        r=pA.evaluate("""async()=>{const {error}=await SB.from('profiles').upsert({id:USER.id,username:PERFIL.name,puede_bots:true});
          const {data}=await SB.from('profiles').select('puede_bots').eq('id',USER.id).maybeSingle();return {e:!!error,v:data&&data.puede_bots}}""")
        ok(r['v']==False,f'el cliente no consigue activar puede_bots {r}')
        ok(not eA,f'cuenta normal: sin errores de JS {eA}')
        cA.close(); cB.close()
        # activar el indicador a mano en el servidor (equivale a la consulta update de la migración)
        m.terminate(); m.wait(); time.sleep(.5)
        db=json.load(open(DATOS,encoding='utf-8')); n=0
        for f in db['profiles']:
            if f['username'].startswith('Beto'): f['puede_bots']=True; n+=1
        json.dump(db,open(DATOS,'w',encoding='utf-8')); ok(n==1,'indicador activado en el servidor para una cuenta'); m=mock()
        # 3. con indicador
        for rol,modo,etq in [('crew','inactivo','Ciego (tú no haces nada)'),('imp','imp','Punto (matas tú)'),('crew','tareas','Ciego (haces tus tareas)')]:
            ctx=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True,storage_state=sB); p=ctx.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
            p.goto(B); p.wait_for_selector('[data-a=jugar]'); p.click('[data-a=jugar]'); p.wait_for_selector('[data-a=crear]')
            ok(p.evaluate("ATAJOS")==True,f'{etq}: la cuenta con indicador activa los atajos de prueba')
            sala(p); p.wait_for_selector('[data-a=botMas3]')
            ok('Añadir bots' in p.inner_text('#app'),f'{etq}: la sala de espera ofrece «Añadir bots»')
            p.click('[data-a=botMas3]'); p.wait_for_timeout(400)
            ok(p.evaluate("S.players.filter(x=>x.bot).length")==3,f'{etq}: se unen 3 bots')
            fin,reun,vb=partida(p,rol,modo,etq)
            hubo=lambda t:any(t in l for l in fin['log'])
            if modo!='tareas':
                ok(hubo('mató'),f'{etq}: hubo muertes'); ok(len(reun)>0,f'{etq}: hubo reuniones {sorted(reun)}'); ok(vb>0,f'{etq}: los bots votaron ({vb})')
            ok(not errs,f'{etq}: sin errores de JS {errs}')
            ok(p.evaluate("!S.chat.some(c=>String(c.pid).startsWith('bot-'))"),f'{etq}: los bots no hablan por el walkie')
            ctx.close()
        # 4. sabotaje del bot Punto: con una espera larga entre muertes tiene tiempo de sabotear antes de que acabe la partida
        ctx=br.new_context(viewport={'width':390,'height':760},is_mobile=True,has_touch=True,storage_state=sB); p=ctx.new_page()
        p.goto(B); p.wait_for_selector('[data-a=jugar]'); p.click('[data-a=jugar]'); p.wait_for_selector('[data-a=crear]'); sala(p); p.wait_for_selector('[data-a=botMas3]')
        p.click('[data-a=botMas3]'); p.wait_for_timeout(400)
        p.evaluate("accion('pruebas',{rol:'crew',vel:'rapida'})"); p.evaluate("accion('cfg',{cfg:{killCd:90,tasks:8,largas:0}})")
        p.click('[data-a=empezar]'); p.wait_for_function("S&&S.phase==='play'",timeout=8000)
        t0=time.time(); sab=False
        while time.time()-t0<150 and not sab:
            sab=p.evaluate("S.log.some(l=>/saboteó|cerró/.test(l.txt))"); p.wait_for_timeout(1000)
        ok(sab,f'Ciego: el bot Punto sabotea ({int(time.time()-t0)} s)')
        ok(p.evaluate("S.log.map(l=>l.txt).join(' | ')").count('|')>=0,'registro: '+p.evaluate("S.log.map(l=>l.txt).join(' | ')")[:300])
        ctx.close()
    finally:
        m.terminate(); srv.shutdown(); br.close()
print('\nFALLOS:',len(fallos)); sys.exit(1 if fallos else 0)
