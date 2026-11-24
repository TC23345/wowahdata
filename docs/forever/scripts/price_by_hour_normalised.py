import csv, sys, collections, datetime as dt
D=sys.argv[1]
def load(k):
    with open(f"{D}/Accounting_Nightslayer_{k}.csv") as f: return list(csv.DictReader(f))
S=[r for r in load("sales") if r["source"]=="Auction"]; E=load("expired")
for r in S: r["q"]=int(r["quantity"]); r["p"]=int(r["price"])/1e4; r["t"]=int(r["time"])
for n in ["Large Prismatic Shard","Greater Planar Essence","Arcane Dust","Bolt of Netherweave"]:
    rows=[r for r in S if r["itemName"]==n]
    # week-normalised: price / that calendar-week's unit-weighted avg
    wk=collections.defaultdict(lambda:[0,0])
    for r in rows: k=(r["t"]-86400*5)//604800; wk[k][0]+=r["p"]*r["q"]; wk[k][1]+=r["q"]
    half=collections.defaultdict(lambda:[0,0]); raw=collections.defaultdict(lambda:[0,0])
    # also day-normalised
    dy=collections.defaultdict(lambda:[0,0])
    for r in rows: k=r["t"]//86400; dy[k][0]+=r["p"]*r["q"]; dy[k][1]+=r["q"]
    halfd=collections.defaultdict(lambda:[0,0])
    for r in rows:
        h=dt.datetime.fromtimestamp(r["t"],dt.timezone.utc).hour; b=0 if h<12 else 1
        w=wk[(r["t"]-86400*5)//604800]; rel=r["p"]/(w[0]/w[1]); half[b][0]+=rel*r["q"]; half[b][1]+=r["q"]
        d=dy[r["t"]//86400]; reld=r["p"]/(d[0]/d[1]); halfd[b][0]+=reld*r["q"]; halfd[b][1]+=r["q"]
        raw[b][0]+=r["p"]*r["q"]; raw[b][1]+=r["q"]
    print("%-24s raw 00-12=%.2f 12-24=%.2f (%+.1f%%) | week-normalised %+.1f%% | day-normalised %+.1f%% | units %d/%d"%(n,raw[0][0]/raw[0][1],raw[1][0]/raw[1][1],100*(raw[0][0]/raw[0][1]/(raw[1][0]/raw[1][1])-1),100*(half[0][0]/half[0][1]/(half[1][0]/half[1][1])-1),100*(halfd[0][0]/halfd[0][1]/(halfd[1][0]/halfd[1][1])-1),raw[0][1],raw[1][1]))
sr=collections.Counter(("DE Gear" if r["itemName"]=="?" else r["itemName"]) for r in S); er=collections.Counter(("DE Gear" if r["itemName"]=="?" else r["itemName"]) for r in E)
slow=[(n,sr[n],er[n]) for n in set(sr)|set(er) if sr[n]+er[n]>=3 and sr[n]/(sr[n]+er[n])<0.5]
print(sorted(slow,key=lambda x:-(x[1]+x[2])))
