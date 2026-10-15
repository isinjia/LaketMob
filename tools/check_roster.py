import os,sys
A="E:/LAO/Google_QA/Assets"
FB=A+"/AssetBundleResourceSub/Texture/FullbodyImg"
IC=A+"/AssetBundleResource/Texture/PCInvenIcon"
VO=A+"/AssetBundleResource/Sounds/Voice"
fb=set(os.listdir(FB)); ic=set(os.listdir(IC)); vo=set(os.listdir(VO))
cands="BR_Brownie BR_Leprechaun BR_RedHood BR_Leona BR_Valkyrie BR_Phantom BR_Miho BR_BloodyPanther BR_WarWolf BR_Gnome BR_Bulgasari BR_Spriggan BR_Undine BR_Harpy BR_Hraesvelgr BR_Lindwurm BR_TalonFeather BR_Sylphid BR_Phoenix BR_Pixie BR_Khan BR_Cheona BR_Fafnir BR_Blackhound BR_Echidna BR_Efreeti BR_Djinnia BR_Banshee BR_Impet BR_Daika BR_Gremlin BR_Hyena BR_Io BR_Kheshig BR_MariaGrace BR_Thetis BR_Wraithy BR_RoyalArsenal BR_Raven BR_Emily BR_SandMan BR_Alvis BR_Amy BR_Calista BR_Sleipnir BR_HongRyun BR_Ellie BR_Nymph BR_Salamander BR_Uroborus BR_Shirayuri BR_Tomoe BR_Pani BR_PoniesAnger BR_QuickCamel BR_Scathy AGS_Tyrant AGS_Rampart AGS_Gigantes AGS_Goltarion AGS_Roc AGS_Arachne AGS_SpartanA AGS_Seljuq AGS_RheinRitter AGS_Fortress AGS_Watcher DS_Johanna DS_Atalanta DS_Faucre DS_Arman DS_Baekto DS_Charlotte DS_Kaen PECS_Cerberus PECS_DarkElf PECS_Express76 PECS_Fortune PECS_Saetti PECS_Audrey PECS_Babariana PECS_Ignis PECS_Sekhmet PECS_Draculina PECS_Merlin PECS_HighElven PECS_Triton 3P_Alice 3P_Daphne 3P_Labiata 3P_Vanilla 3P_Fenrir 3P_Aurora 3P_Hachiko 3P_Rhea 3P_Poi 3P_Sowan 3P_BlackLilith 3P_CSPerrault 3P_Eternity 3P_SnowFeather PECS_LemonadeBeta PECS_LemonadeDelta MP_LemonadeZeta MP_LemonadeOmega".split()
for c in cands:
    pre,name=c.split("_",1)
    f="FullbodyIMG_%s_N.png"%c in fb
    i=("InvenIcon_%s_N.png"%c) in ic
    vname=name
    v=vname in vo
    vs=""
    if v:
        fl=os.listdir(VO+"/"+vname)
        vs=",".join(sorted(set(x.split("_")[-1].replace(".mp3","") for x in fl if x.endswith(".mp3") and ("StageStart" in x or "Join" in x or "Retreat" in x or "BattleFocus" in x or "MVP" in x))))
    print(("OK " if f and i else "-- ")+c, "full" if f else "NOFULL","icon" if i else "NOICON","voice:"+vs if v else "NOVOICE")
