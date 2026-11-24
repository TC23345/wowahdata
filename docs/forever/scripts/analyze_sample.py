import csv, sys, collections, statistics, math, datetime as dt
D=sys.argv[1]
def load(k):
    with open(f"{D}/Accounting_Nightslayer_{k}.csv") as f: return list(csv.DictReader(f))
P,S,E,C,I,X=[load(k) for k in ["purchases","sales","expired","canceled","income","expenses"]]
for r in P+S: r["quantity"]=int(r["quantity"]); r["price"]=int(r["price"]); r["time"]=int(r["time"])
for r in E+C: r["quantity"]=int(r["quantity"]); r["time"]=int(r["time"])
nm=lambda r: "DE Gear" if r["itemName"]=="?" else r["itemName"]
g=lambda r: r["price"]*r["quantity"]/1e4
print("rows P,S,E,C,I,X",len(P),len(S),len(E),len(C),len(I),len(X))
ts=[r["time"] for r in P+S]; print("span",dt.datetime.fromtimestamp(min(ts), dt.timezone.utc),dt.datetime.fromtimestamp(max(ts), dt.timezone.utc))
print("sources P",collections.Counter(r["source"] for r in P)); print("sources S",collections.Counter(r["source"] for r in S))
print("players",collections.Counter(r["player"] for r in S).most_common(6))
PA=[r for r in P if r["source"]=="Auction"]; SA=[r for r in S if r["source"]=="Auction"]
print("AH buy gold %.0f  AH sell gold %.0f  all-buy %.0f all-sell %.0f"%(sum(map(g,PA)),sum(map(g,SA)),sum(map(g,P)),sum(map(g,S))))
items=collections.defaultdict(lambda: dict(bu=0,bg=0,su=0,sg=0,br=0,sr=0,eu=0,er=0,cu=0,cr=0))
for r in PA: d=items[nm(r)]; d["bu"]+=r["quantity"]; d["bg"]+=g(r); d["br"]+=1
for r in SA: d=items[nm(r)]; d["su"]+=r["quantity"]; d["sg"]+=g(r); d["sr"]+=1
for r in E: d=items[nm(r)]; d["eu"]+=r["quantity"]; d["er"]+=1
for r in C: d=items[nm(r)]; d["cu"]+=r["quantity"]; d["cr"]+=1
print("distinct items",len(items), "sold items",sum(1 for d in items.values() if d["sr"]), "bought items",sum(1 for d in items.values() if d["br"]))
tot_sg=sum(d["sg"] for d in items.values())
top=sorted(items.items(), key=lambda kv:-kv[1]["sg"])[:15]
print("\nTOP by AH revenue (item, sellrows, units, rev, share, buyrows, buyunits, buycost, avg buy, avg sell, exp rows, cancel rows)")
cum=0
for n,d in top:
    cum+=d["sg"]
    print("%-28s sr=%5d su=%6d sg=%8.0f %4.1f%% cum%4.0f%% | br=%5d bu=%6d bg=%8.0f | ab=%6.2f as=%6.2f | er=%3d cr=%3d"%(n[:28],d["sr"],d["su"],d["sg"],100*d["sg"]/tot_sg,100*cum/tot_sg,d["br"],d["bu"],d["bg"],d["bg"]/d["bu"] if d["bu"] else 0,d["sg"]/d["su"] if d["su"] else 0,d["er"],d["cr"]))
topb=sorted(items.items(), key=lambda kv:-kv[1]["bg"])[:10]
print("\nTOP by AH buy cost"); 
for n,d in topb: print("%-28s br=%5d bu=%6d bg=%8.0f su=%6d sg=%8.0f"%(n[:28],d["br"],d["bu"],d["bg"],d["su"],d["sg"]))
# heatmap concentration (UTC) for all AH sales and top items
def heat(rows,label):
    cells=collections.Counter(); 
    for r in rows:
        t=dt.datetime.fromtimestamp(r["time"], dt.timezone.utc); cells[(t.weekday(),t.hour)]+=r["quantity"]
    tot=sum(cells.values()); 
    if not tot: return
    vals=sorted(cells.values(),reverse=True); top17=sum(vals[:17])/tot
    filled=len(cells)
    ent=-sum(v/tot*math.log(v/tot) for v in vals)/math.log(168)
    byh=collections.Counter(); byd=collections.Counter()
    for (d,h),v in cells.items(): byh[h]+=v; byd[d]+=v
    hs=sorted(byh.items(), key=lambda kv:-kv[1]); 
    best6=max(range(24), key=lambda s: sum(byh[(s+i)%24] for i in range(6))); b6=sum(byh[(best6+i)%24] for i in range(6))/tot
    worst6=min(range(24), key=lambda s: sum(byh[(s+i)%24] for i in range(6))); w6=sum(byh[(worst6+i)%24] for i in range(6))/tot
    dn="Mon Tue Wed Thu Fri Sat Sun".split()
    print("%-26s units=%7d cells=%3d/168 top10%%cells=%4.0f%% entropy=%.2f best6h=%02dUTC(%2.0f%%) worst6h=%02dUTC(%2.0f%%) days=%s"%(label[:26],tot,filled,100*top17,ent,best6,100*b6,worst6,100*w6," ".join("%s%2.0f"%(dn[d],100*byd[d]/tot) for d in range(7))))
print("\nHEATMAP concentration (uniform top10%=10%, uniform 6h=25%)")
heat(SA,"ALL AH sales")
for n,d in top[:10]: heat([r for r in SA if nm(r)==n], n)
# median price by hour-of-day for top item: is there price-timing signal?
print("\nPRICE x TIME signal (unit-weighted avg sell price by 6h UTC block, and weekday)")
for n,d in top[:6]:
    rows=[r for r in SA if nm(r)==n]
    blk=collections.defaultdict(lambda:[0,0]); wd=collections.defaultdict(lambda:[0,0])
    for r in rows:
        t=dt.datetime.fromtimestamp(r["time"], dt.timezone.utc); b=blk[t.hour//6]; b[0]+=g(r); b[1]+=r["quantity"]; w=wd[t.weekday()]; w[0]+=g(r); w[1]+=r["quantity"]
    print("%-24s blocks: %s | wd: %s"%(n[:24]," ".join("%.2f"%(blk[i][0]/blk[i][1]) if blk[i][1] else "  - " for i in range(4))," ".join("%.2f"%(wd[i][0]/wd[i][1]) if wd[i][1] else " - " for i in range(7))))
# spread: items with both buys and sells
print("\nFLIP SPREAD (items with >=20 buy rows and >=20 sell rows): qty-weighted median buy, sell, spread%, hist overlap")
def wmed(rows):
    xs=sorted((r["price"],r["quantity"]) for r in rows); tot=sum(q for _,q in xs); acc=0
    for p,q in xs:
        acc+=q
        if acc>=tot/2: return p/1e4
for n,d in sorted(items.items(), key=lambda kv:-kv[1]["sg"]):
    if d["br"]>=20 and d["sr"]>=20:
        b=[r for r in PA if nm(r)==n]; s=[r for r in SA if nm(r)==n]; mb,ms=wmed(b),wmed(s)
        # overlap: share of buy units priced above median sell
        above=sum(r["quantity"] for r in b if r["price"]/1e4>=ms)/d["bu"]
        # price volatility over time: weekly avg sell
        wk=collections.defaultdict(lambda:[0,0])
        for r in s:
            k=(r["time"]-345600-86400*5)//604800; wk[k][0]+=g(r); wk[k][1]+=r["quantity"]
        wa=[v[0]/v[1] for k,v in sorted(wk.items())]
        print("%-26s mb=%7.2f ms=%7.2f spread=%+5.0f%% buys>=medsell=%3.0f%% weekly avg sell min/max=%.2f/%.2f (%d wks) pnl=%8.0f"%(n[:26],mb,ms,100*(ms/mb-1),100*above,min(wa),max(wa),len(wa),d["sg"]-d["bg"]))
# sell-through
print("\nSELL-THROUGH")
st=[(n,d["sr"]/(d["sr"]+d["er"]),d) for n,d in items.items() if d["sr"]+d["er"]>=3]
slow=[x for x in st if x[1]<0.5]
print("items with >=3 events:",len(st),"slow(<50%):",len(slow),"perfect(100%):",sum(1 for x in st if x[1]==1))
print("overall rows sold %d expired %d canceled %d -> row sell-through %.1f%%; incl canceled %.1f%%"%(len(SA),len(E),len(C),100*len(SA)/(len(SA)+len(E)),100*len(SA)/(len(SA)+len(E)+len(C))))
for n,r,d in sorted(slow,key=lambda x:-x[2]["er"])[:8]: print("  slow %-28s rate=%3.0f%% sr=%d er=%d cr=%d"%(n[:28],100*r,d["sr"],d["er"],d["cr"]))
canc=sorted(items.items(), key=lambda kv:-kv[1]["cu"])[:6]
print("top canceled:",[(n,d["cr"],d["cu"],d["sr"]) for n,d in canc])
# cash flow
print("\nCASHFLOW")
ex=collections.Counter(); 
for r in X: ex[r["type"]]+=int(r["amount"])/1e4
inc=collections.Counter()
for r in I: inc[r["type"]]+=int(r["amount"])/1e4
print("expenses",dict(ex)); print("income",dict(inc))
# P&L daily
day=collections.defaultdict(float)
for r in SA: day[r["time"]//86400]+=g(r)
for r in PA: day[r["time"]//86400]-=g(r)
vals=list(day.values()); print("\nDAILY P&L all items: days=%d pos=%d neg=%d total=%.0f best=%.0f worst=%.0f"%(len(vals),sum(v>0 for v in vals),sum(v<0 for v in vals),sum(vals),max(vals),min(vals)))
# DE-sourced
print("\nIMPLIED non-AH sourced (sold+expired-bought >0) top:")
de=sorted(((n,d["su"]+d["eu"]-d["bu"],d) for n,d in items.items()), key=lambda x:-x[1])[:8]
for n,v,d in de: print("  %-26s implied=%6d sold=%6d bought=%6d"%(n[:26],v,d["su"],d["bu"]))
# volume scale
perday=collections.Counter(r["time"]//86400 for r in P+S); print("\nrows/day median %d max %d"%(statistics.median(perday.values()),max(perday.values())))
print("otherPlayer distinct buyers:",len(set(r["otherPlayer"] for r in SA)),"sellers bought from:",len(set(r["otherPlayer"] for r in PA)))
tb=collections.Counter(); 
for r in SA: tb[r["otherPlayer"]]+=g(r)
t=sum(tb.values()); print("top 10 buyers share of revenue: %.0f%%"%(100*sum(v for _,v in tb.most_common(10))/t))
ts_=collections.Counter()
for r in PA: ts_[r["otherPlayer"]]+=g(r)
t=sum(ts_.values()); print("top 10 sellers share of buy cost: %.0f%%"%(100*sum(v for _,v in ts_.most_common(10))/t))
