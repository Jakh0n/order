import math
INK="#0B0B0F"; RED="#F5333F"; RED2="#D91E36"
def dash(c1=(48,128),r1=20,c2=(124,128),r2=24):
    d=c2[0]-c1[0]; k=(r2-r1)/d; s=math.sqrt(1-k*k)
    t1=(c1[0]-r1*k,c1[1]-r1*s); t2=(c2[0]-r2*k,c2[1]-r2*s)
    b2=(c2[0]-r2*k,c2[1]+r2*s); b1=(c1[0]-r1*k,c1[1]+r1*s)
    f=lambda p:f"{p[0]:.2f} {p[1]:.2f}"
    return f"M{f(t1)}L{f(t2)}A{r2} {r2} 0 1 1 {f(b2)}L{f(b1)}A{r1} {r1} 0 0 1 {f(t1)}Z"
D=dash()
def mark(dc,oc): return f'<path fill="{dc}" d="{D}"/><circle fill="{oc}" cx="196" cy="128" r="32"/>'
WMP=('M30 64V176A24 24 0 0 0 54 200H60M8 118H60 M106 159H188A41 41 0 1 0 180.6 182.5 M234 118H298L234 200H298 '
     'M426 52V200M426 159A41 41 0 1 1 344 159A41 41 0 1 1 426 159 M554 118V200M554 159A41 41 0 1 1 472 159A41 41 0 1 1 554 159')
def wm(c): return f'<path fill="none" stroke="{c}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round" d="{WMP}"/>'
def svg(w,h,body,title,bg=None):
    b=f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><title>{title}</title>{b}{body}</svg>'
# lockup: symbol scaled so dot = 0.8 x-height, dot centre on x-height middle (y=159)
s=100/64; sx=-28*s+8; sy=159-128*s
LW=int(200*s+48+8+5+567+13+12)
def lock(dc,oc,wc,bg=None,name="lockup"):
    return svg(LW,256,f'<g transform="translate({sx:.1f} {sy:.1f}) scale({s:.4f})">{mark(dc,oc)}</g><g transform="translate({200*s+48+8+5:.1f} 0)">{wm(wc)}</g>',f"Tezda {name}",bg)
# app icon: squircle-ish rounded rect, gradient
icon=('<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A4E"/>'
      f'<stop offset="1" stop-color="{RED2}"/></linearGradient></defs><rect width="256" height="256" rx="57" fill="url(#g)"/>'
      f'<g transform="translate(128 128) scale(0.78) translate(-128 -128)">{mark("#fff","#fff")}</g>')
files={
 "tezda-symbol.svg":svg(256,256,mark(INK,RED),"Tezda symbol"),
 "tezda-symbol-black.svg":svg(256,256,mark(INK,INK),"Tezda symbol black"),
 "tezda-symbol-white.svg":svg(256,256,mark("#fff","#fff"),"Tezda symbol white"),
 "tezda-app-icon.svg":svg(256,256,icon,"Tezda app icon"),
 "tezda-lockup.svg":lock(INK,RED,INK),
 "tezda-lockup-dark.svg":lock("#fff",RED,"#fff",bg=INK,name="lockup dark"),
 "tezda-lockup-black.svg":lock(INK,INK,INK,name="lockup black"),
}
for k,v in files.items(): open(k,"w").write(v)
print(LW)

# --- kit additions ---
# small-size cut: thicker, bigger gap (gap >= 1.5px at 16px)
DS=dash((40,128),24,(120,128),28)
small=f'<path fill="{INK}" d="{DS}"/><circle fill="{RED}" cx="208" cy="128" r="36"/>'
open("tezda-symbol-small.svg","w").write(svg(256,256,small,"Tezda symbol small"))
icon_small=('<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A4E"/>'
      f'<stop offset="1" stop-color="{RED2}"/></linearGradient></defs><rect width="256" height="256" rx="57" fill="url(#g)"/>'
      f'<g transform="translate(128 128) scale(0.84) translate(-130 -128)"><path fill="#fff" d="{DS}"/><circle fill="#fff" cx="208" cy="128" r="36"/></g>')
open("tezda-app-icon-small.svg","w").write(svg(256,256,icon_small,"Tezda app icon small"))
# stacked lockup
def stacked(dc,oc,wc,bg=None,name="stacked"):
    k=1.3; w=640
    sym=f'<g transform="translate({w/2-128*k:.1f} {40-96*k:.1f}) scale({k})">{mark(dc,oc)}</g>'
    word=f'<g transform="translate({w/2-281:.1f} 150)">{wm(wc)}</g>'
    return svg(w,400,sym+word,f"Tezda {name}",bg)
open("tezda-stacked.svg","w").write(stacked(INK,RED,INK))
open("tezda-stacked-dark.svg","w").write(stacked("#fff",RED,"#fff",bg=INK,name="stacked dark"))
open("tezda-wordmark.svg","w").write(svg(600,256,f'<g transform="translate(18 0)">{wm(INK)}</g>',"Tezda wordmark"))
open("tezda-lockup-white.svg","w").write(lock("#fff","#fff","#fff",name="lockup white"))
