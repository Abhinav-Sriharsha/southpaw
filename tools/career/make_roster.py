"""South Paw · tools/career/make_roster.py
Makes the career roster: every opponent in the three tournaments, with a name, nickname, hometown, fighting style,
signature punch, skill, toughness, power and look. Writes game/data/career.js (the game reads it) and roster.json
(for the sheet, tools/career/make_sheet.py). Fixed seed, so running it again gives the same fighters.
Run:  python3 tools/career/make_roster.py"""
import json, random, os
R = random.Random(2006)   # the year the Basement League opened
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, '..', '..', 'game')

# ---- fighting styles: how the CPU fights (multipliers on its skill numbers, punch mix, favourite game plan, distance)
STYLES = {
 'outboxer': {'name':'Out-boxer','desc':'Stays long behind a stiff jab and keeps moving. Hard to reach, rarely trades.',
   'mods':{'aggr':0.9,'defend':1.15,'slip':1.1,'combo':0.85},'range':0.2,'mix':{'straight':1.9,'hook':0.6,'upper':0.5,'body':0.8},'plan':{'box':1.6}},
 'swarmer': {'name':'Swarmer','desc':'Walks you down and never stops throwing. Lives on the inside with hooks.',
   'mods':{'aggr':1.35,'combo':1.3,'tmin':0.8,'defend':0.85},'range':-0.14,'mix':{'straight':0.8,'hook':1.6,'upper':1.2,'body':1.2},'plan':{'pressure':1.6}},
 'slugger': {'name':'Slugger','desc':'Slow feet, heavy hands. Waits for one big hook or uppercut to end it.',
   'mods':{'aggr':0.8,'combo':0.6,'tmin':1.25,'tmax':1.2,'defend':0.8,'slip':0.6},'range':-0.05,'mix':{'straight':0.6,'hook':1.8,'upper':1.7,'body':0.9,'power':1.6},'plan':{'pressure':0.6},'power':1.12},
 'counter': {'name':'Counter-puncher','desc':'Lets you lead, slips or blocks, then fires back before you reset.',
   'mods':{'aggr':0.65,'punish':1.4,'react':0.85,'slip':1.25,'acc':1.05},'range':0.08,'mix':{'straight':1.3,'hook':1.2},'plan':{'counter':1.9}},
 'body': {'name':'Body snatcher','desc':'Digs to the ribs and the liver round after round until your legs go.',
   'mods':{'aggr':1.05,'combo':1.1},'range':-0.08,'mix':{'straight':0.7,'hook':0.9,'upper':0.8,'body':2.5,'power':1.3},'plan':{'body':1.8}},
 'slick': {'name':'Slick defender','desc':'Slips, ducks and rolls everything, then pecks at you from odd angles.',
   'mods':{'slip':1.6,'defend':1.25,'aggr':0.85,'react':0.85},'range':0.1,'mix':{'straight':1.2,'hook':1.1,'upper':1.1},'plan':{'counter':0.8,'box':0.6}},
 'volume': {'name':'Volume puncher','desc':'Fast, light punches in long bunches. Wins rounds on work rate.',
   'mods':{'aggr':1.45,'combo':1.4,'tmin':0.7,'tmax':0.75},'range':0.0,'mix':{'straight':1.5,'hook':1.1,'body':1.1},'plan':{'pressure':0.8,'box':0.6},'power':0.9},
 'shell': {'name':'Shell guard','desc':'Hides behind a high guard, takes your best shots on the arms, then breaks yours.',
   'mods':{'defend':1.45,'slip':0.45,'aggr':0.85,'punish':1.2},'range':-0.02,'mix':{'straight':0.9,'hook':1.2,'upper':1.0,'power':2.2},'plan':{'counter':0.9,'body':0.6},'tough':1.08},
 'showman': {'name':'Showman','desc':'Flashy and loud. Throws in flurries, taunts when ahead, can be caught showing off.',
   'mods':{'aggr':1.15,'combo':1.25,'taunt':5.0,'defend':0.9,'acc':0.95},'range':0.02,'mix':{'hook':1.3,'upper':1.5},'plan':{'pressure':0.9}},
}
SIGS = {
 'double jab':{'L0':2.2},'stiff cross':{'R0':2.3},'left hook':{'L1':2.4},'long right hook':{'R1':2.4},
 'uppercut':{'L2':2.2,'R2':2.2},'liver shot':{'L5':3.2},'body jab':{'L4':2.6},'guard breaker':{'L3':2.8,'R3':2.8},
 'body hook':{'L5':1.8,'R5':2.2},'right uppercut':{'R2':2.8},
}
SIG_FOR = {'outboxer':['double jab','stiff cross','body jab'],'swarmer':['left hook','body hook','uppercut'],'slugger':['long right hook','guard breaker','right uppercut'],
  'counter':['stiff cross','left hook','right uppercut'],'body':['liver shot','body hook','body jab'],'slick':['left hook','uppercut','double jab'],
  'volume':['double jab','body jab','left hook'],'shell':['guard breaker','uppercut','body hook'],'showman':['uppercut','long right hook','left hook']}
NICKS = {
 'outboxer':['The Professor','Long Arm','Metronome','Yardstick','The Surveyor','Tape Measure','The Fencer','Lighthouse','Compass'],
 'swarmer':['Buzzsaw','The Hornet','Relentless','Avalanche','Pitbull','Bulldozer','Steamroller','Wildfire','Riptide'],
 'slugger':['Sledgehammer','Dynamite','The Anvil','Wrecking Ball','Thunder','Boulder','Demolition','Big Bang','Hammerhead'],
 'counter':['The Mirror','Payback','The Trap','Echo','Snapback','Second Thought','The Ambush','Rebound','Return Fire'],
 'body':['Rib Breaker','The Butcher','Low Tide','Gut Check','The Drill','Body Bag','Pickaxe','Undertow','The Plumber'],
 'slick':['Smoke','The Ghost','Quicksilver','The Eel','Matador','Mirage','Slipstream','Phantom','Shadow'],
 'volume':['Machine Gun','Typewriter','Rapid Fire','The Drummer','Hailstorm','Woodpecker','Sewing Machine','Firecracker','Popcorn'],
 'shell':['The Vault','Iron Gate','Bunker','Turtle','Fortress','The Wall','Padlock','Storm Shelter','Lockbox'],
 'showman':['Showtime','The Peacock','Razzle','Hollywood','Glitter','Encore','The Circus','Spotlight','Fireworks'],
}
FIRST = ['Marcus','Tomas','Kofi','Ravi','Dmitri','Hiro','Mateo','Liam','Emeka','Sven','Jae-won','Andre','Callum','Diego','Ibrahim','Nikolai','Tariq','Jonah',
 'Paolo','Kwame','Arjun','Felix','Bruno','Yusuf','Aleksander','Ronan','Malik','Kenji','Lucas','Obi','Teodor','Rafael','Samir','Duncan','Ezra','Viktor',
 'Joaquin','Tunde','Ilya','Declan','Mehmet','Santiago','Hamish','Kai','Zoran','Leon','Amadou','Rocco','Farid','Gideon','Ivo','Nnamdi','Orlando','Pavel',
 'Reza','Silas','Thiago','Ulises','Vikram','Wes','Xander','Yerlan','Zeke','Anton','Bastian','Cyrus','Dario','Enzo','Fintan','Goran']
LAST = ['Okafor','Varga','Lindqvist','Mendes','Petrov','Nakamura',"O'Rourke",'Haddad','Kowalski','Banda','Castillo','Brennan','Adeyemi','Sato','Moretti',
 'Novak','Quinlan','Rahman','Strand','Ferreira','Ueda','Vasquez','Walsh','Yilmaz','Zielinski','Achterberg','Bakker','Cruz','Dlamini','Esposito','Farrell',
 'Gallo','Horvath','Ivanova','Jensen','Kaya','Laurent','Mwangi','Nilsson','Osei','Pereira','Rossi','Sandoval','Takeda','Uzor','Volkov','Whitlock','Xu',
 'Yeboah','Zamora','Abara','Brandt','Coyle','Dossou','Eriksen','Fontaine','Grieve','Halloran','Iwu','Jovanovic','Kerrigan','Lombardi','Marsh','Nwosu']
LAST = [l for l in LAST if l!='Ivanova']+['Ivanov']
TOWNS = ['Glasgow','Lagos','Manila','Belfast','Accra','Kraków','Osaka','Marseille','Cork','Durban','Naples','Gothenburg','Izmir','Monterrey','Bristol','Kumasi',
 'Rotterdam','Tijuana','Leeds','Nairobi','Porto','Detroit','Cardiff','Busan','Medellín','Sarajevo','Almaty','Cebu','Bilbao','Mombasa','Liverpool','Tbilisi',
 'Valencia','Hamburg','Dakar','Halifax','Perth','Recife','Odesa','Yokohama']
CUTS = [('bald',6),('buzz',10),('crew',10),('curly',7),('flat',4),('hightop',4),('afro',5),('mohawk',4),('faux',5),('spiky',4),('pomp',4),('bun',4),('pony',3),
        ('dreads',5),('rows',5),('part',6),('bowl',1),('original',4)]
HAIR = [('Black','#141013'),('Dark brown','#2a1a12'),('Brown','#5a3820'),('Auburn','#7a3016'),('Ginger','#a4481c'),('Blond','#c9a25a'),('Grey','#8d8b88')]
DYED = [('Bleached','#e6dcc2'),('Red dye','#c8281f'),('Blue dye','#2457c9'),('Green dye','#2f8f4e'),('Pink dye','#e0699a')]
SKIN = [('Fair','#f0c9a4'),('Light','#e8b48a'),('Tan','#d59a6c'),('Olive','#c08a5c'),('Brown','#a06a44'),('Dark brown','#8a5636'),('Deep','#5e3a24')]
EYES = [('Dark brown','#2a1a10'),('Brown','#5a3a1e'),('Hazel','#7a6a2e'),('Green','#3f7a45'),('Blue','#3a6fb8'),('Grey','#7d8a94')]
KIT = [('Red','#d8302a'),('Crimson','#9e1b22'),('Blue','#1e5bd0'),('Navy','#1b2a55'),('Sky','#4aa3df'),('Black','#17181d'),('White','#f1ece1'),('Gold','#ffc83a'),
       ('Green','#2f8f4e'),('Emerald','#0f6b4a'),('Purple','#6a3fb5'),('Pink','#e0699a'),('Orange','#e8762b'),('Teal','#1f8a8a'),('Silver','#b9bcc2'),('Maroon','#5c1a23')]
SHOES = [('Black','#16171c'),('White','#eeeae0'),('Red','#c8281f'),('Blue','#2457c9'),('Gold','#d8aa2e'),('Silver','#b9bcc2')]
BUILD = {'outboxer':(-0.45,0.3),'swarmer':(0.05,0.65),'slugger':(0.6,0.35),'counter':(-0.1,0.5),'body':(0.15,0.7),'slick':(-0.6,0.25),'volume':(-0.25,0.4),'shell':(0.25,0.9),'showman':(-0.05,0.85)}
CUT_LEN = {'buzz':(0.1,1.4),'crew':(1.2,5),'curly':(2,6),'flat':(3,9),'hightop':(6,15),'afro':(3,10),'mohawk':(3,15),'faux':(2,7),'spiky':(2,8),'pomp':(3,10),
           'bun':(2.5,6),'pony':(10,45),'dreads':(6,38),'rows':(0.4,1.0),'part':(1.5,6),'bowl':(1.5,5)}
TOURS = [
 {'id':'amateur','name':'Amateur Boxing Championship','short':'Amateur','size':16,'s':(0.0,0.45),'tough':(1.0,1.0),'power':(0.9,1.0),'cauli':0.08},
 {'id':'pro','name':'Pro Boxing Championship','short':'Pro','size':16,'s':(0.35,0.75),'tough':(1.04,1.14),'power':(1.0,1.08),'cauli':0.3},
 {'id':'ultimate','name':'Ultimate Boxing Championship','short':'Ultimate','size':32,'s':(0.62,1.0),'tough':(1.14,1.34),'power':(1.06,1.18),'cauli':0.55},
]
def pick_w(pairs): 
  tot=sum(w for _,w in pairs); r=R.random()*tot
  for v,w in pairs:
    r-=w
    if r<=0: return v
  return pairs[-1][0]
used_names=set(); nick_left={k:R.sample(v,len(v)) for k,v in NICKS.items()}; sig_count={}
def make_name():
  while True:
    n=R.choice(FIRST)+' '+R.choice(LAST)
    if n not in used_names and n.split()[0] not in {u.split()[0] for u in used_names}|set(): used_names.add(n); return n
def contrast(c):
  others=[k for k in KIT if k[1]!=c[1]]; return R.choice(others)
def make_look(style,tour,s):
  cut=pick_w(CUTS); hairn,hairc=(R.choice(DYED) if (style=='showman' and R.random()<0.6) or R.random()<0.07 else R.choice(HAIR))
  skinn,skinc=R.choice(SKIN); eyen,eyec=R.choice(EYES); trunk=R.choice(KIT); band=contrast(trunk); w,m=BUILD[style]
  L=round(R.uniform(0.25,0.85),2); look={'cut':cut,'L':L,'V':round(R.uniform(0.3,0.8),2),'F':round(R.uniform(0.1,0.8),2),'line':round(R.uniform(-0.4,0.5),2),
    'hair':hairc,'tips':R.random()<(0.35 if style=='showman' else 0.06),'tip':R.choice(['#e8c55a','#e6dcc2','#c8281f','#4aa3df']),
    'eye':eyec,'brow':R.choice(['natural','thick','thin','angry','raised','natural','thick','angry']),'browHair':True,'browCol':hairc,
    'ear':'cauli' if R.random()<tour['cauli']+0.25*s else 'normal','skin':skinc,
    'weight':round(max(-1,min(1,w+R.uniform(-0.25,0.25))),2),'muscle':round(max(0,min(1,m+R.uniform(-0.2,0.2)+0.15*s)),2),
    'trunks':trunk[1],'band':band[1],'stripe':R.random()<0.45}
  sc=R.choice([band,contrast(trunk)]);look['stripeCol']=sc[1];look['shortLen']=round(R.uniform(-0.5,0.9),2)
  wr=R.choice([trunk,band,('White','#f1ece1'),('Black','#17181d')]);look['wraps']=wr[1];look['boot']=R.choice(['low','mid','high','high','mid'])
  sh=R.choice(SHOES);look['shoe']=sh[1];so=R.choice([('White','#f4efe4'),('Black','#16171c'),('Gum','#c49a5c')]);look['sole']=so[1]
  if cut in ('bald','original'): look['L']=0.5
  names={'hair':hairn,'skin':skinn,'eyes':eyen,'trunks':trunk[0],'band':band[0],'stripe':sc[0],'wraps':wr[0],'shoe':sh[0],'sole':so[0]}
  return look,names

# ---- the look for the game's fighter model (the Superhero rig; see src/render/look.js). Drawn from the look above with
# its own random stream per fighter, so changing this never reshuffles names, styles or skill.
CUT2 = {'original':['g_crew'],'bald':[''],'buzz':['Hair_Buzzed'],'crew':['g_crew'],'curly':['g_twists','g_afro'],'flat':['g_flattop'],'hightop':['g_hightop'],
        'afro':['g_afro'],'mohawk':['g_mohawk'],'faux':['g_fauxhawk'],'spiky':['g_fauxhawk'],'pomp':['g_slick'],'bun':['g_manbun','Hair_Buns'],
        'pony':['Hair_Long'],'dreads':['g_twists','Hair_Long'],'rows':['g_cornrows'],'part':['Hair_SimpleParted'],'bowl':['Hair_SimpleParted']}
FACES2 = ['','','','Square jaw','Long and narrow','Round and soft','Sharp','Wide nose','Strong chin']
def make_look2(fid,style,tour,l):
  Q=random.Random('look2-'+fid)
  hair=Q.choice(CUT2[l['cut']]); face='Brawler' if l['ear']=='cauli' else Q.choice(FACES2)
  beard='Hair_Beard' if Q.random()<{'slugger':0.4,'shell':0.35,'body':0.3}.get(style,0.18)+(0.1 if tour['id']=='ultimate' else 0) else ''
  if tour['id']=='amateur': beard='Hair_Beard' if Q.random()<0.08 else ''
  bottom='u_shorts_long' if l['shortLen']>0.35 else ''
  if style in ('swarmer','showman') and Q.random()<0.25: bottom='u_mma'
  top,gear='',''
  if tour['id']=='amateur':
    if Q.random()<0.6: top='u_tank'
    if Q.random()<0.5: gear='u_headgear'
  feet={'low':'low','mid':'mid','high':'u_boots'}[l['boot']]
  return {'face':face,'hair':hair,'hairC':l['hair'],'beard':beard,'brow':'Eyebrows_Female' if l['brow']=='thin' else 'Eyebrows_Regular','eye':l['eye'],
    'skin':l['skin'],'mus':round(0.4+0.55*l['muscle'],2),'fat':l['weight'],'bottom':bottom,'trunk':l['trunks'],'trim':l['band'],'top':top,'topC':l['trunks'],
    'hands':'u_gloves','gloveC':l['wraps'],'wrapC':'#efece4','feet':feet,'boot':l['shoe'],'sole':l['sole'],'gear':gear}
fighters=[]
styles=list(STYLES)
for t in TOURS:
  n=t['size']-1
  # a spread of styles in every tournament, so each bracket has a bit of everything
  order=(styles*4)[:n]; R.shuffle(order)
  for k in range(n):
    s=round(t['s'][0]+(t['s'][1]-t['s'][0])*(k/(n-1)),3)
    st=order[k]; sig=R.choice(SIG_FOR[st]); nick=nick_left[st].pop() if nick_left[st] else st.title()
    f_t=t['tough'][0]+(t['tough'][1]-t['tough'][0])*(k/(n-1)); f_p=t['power'][0]+(t['power'][1]-t['power'][0])*(k/(n-1))
    look,names=make_look(st,t,s)
    fighters.append({'id':t['id'][0]+str(k+1).zfill(2),'tour':t['id'],'rank':n-k,'name':make_name(),'nick':nick,'from':R.choice(TOWNS),'style':st,'sig':sig,'s':s,
      'tough':round(f_t*STYLES[st].get('tough',1),3),'power':round(f_p*STYLES[st].get('power',1),3),'look':look,'names':names})
    fighters[-1]['look2']=make_look2(fighters[-1]['id'],st,t,look)
data={'styles':{k:{kk:vv for kk,vv in v.items()} for k,v in STYLES.items()},'sigs':SIGS,
  'tours':[{'id':t['id'],'name':t['name'],'short':t['short'],'size':t['size']} for t in TOURS],
  'fighters':[dict({k:v for k,v in f.items() if k not in ('names','look','look2')},look=f['look2']) for f in fighters]}
js=("/* South Paw · data/career.js\n   The career: three tournaments and every opponent in them. Generated by tools/career/make_roster.py (fixed seed);\n"
    "   the roster sheet is tools/career/roster.xlsx. Edit the generator and run it again rather than editing by hand.\n"
    "   styles: how each kind of fighter fights (multipliers on the CPU's skill numbers, punch mix, favourite game plan, distance).\n"
    "   sigs: signature punches (extra weight on one punch). fighters: s = skill 0-1, tough = damage taken is divided by this,\n"
    "   power = damage dealt is multiplied by this, look = the look from the Customise screen. */\n'use strict';\nconst CAREER="+json.dumps(data,separators=(',',':'),ensure_ascii=False)+";\n")
open(os.path.join(GAME,'data','career.js'),'w').write(js)
json.dump({'styles':STYLES,'tours':TOURS,'fighters':fighters},open(os.path.join(HERE,'roster.json'),'w'),indent=1,ensure_ascii=False)
print(len(fighters),'fighters', os.path.getsize(os.path.join(GAME,'data','career.js')),'bytes')
from collections import Counter
print(Counter((f['tour'],f['style']) for f in fighters).most_common(5)); print(Counter(f['look']['cut'] for f in fighters))
