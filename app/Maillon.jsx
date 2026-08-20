"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =========================================================================
   MAILLON v4 — Prototype cliquable
   Plateforme de mise en relation B2B à double consentement.
   Parcours : page entreprise → démarchage → accepter/refuser → messagerie
   v4 : tous les secteurs d'activité + vue carte (sociétés géolocalisées)
   Données fictives · maquette navigable
   ========================================================================= */

/* ---- Secteurs (liste complète) + couleur par secteur ---- */
const SECTOR_COLORS = {
  "Tech & Dév":"#0F846B", "Marketing & Com":"#DC5B41", "Design & Création":"#D98A12",
  "Logistique & Transport":"#3B6FB0", "RH & Recrutement":"#8A5BC0", "Juridique & Compta":"#0F1826",
  "Finance & Assurance":"#1E7A6B", "Conseil & Stratégie":"#B0472F", "Industrie & Production":"#4A7A3B",
  "BTP & Construction":"#C08A2E", "Immobilier":"#5B6EA8", "Commerce & Distribution":"#C0417E",
  "Restauration & Traiteur":"#D2691E", "Événementiel":"#A0439E", "Santé & Bien-être":"#2E9E8A",
  "Éducation & Formation":"#3D6FA0", "Énergie & Environnement":"#5A8F3C", "Agroalimentaire":"#8A9A3B",
  "Tourisme & Hôtellerie":"#C75B4A", "Média & Audiovisuel":"#6A5BC0",
};
const SECTORS = Object.keys(SECTOR_COLORS);
const COLORS = ["#0F846B","#DC5B41","#3B6FB0","#D98A12","#8A5BC0","#C0417E","#0F1826","#4A7A3B"];
const EMP = ["1–10","11–50","51–200","200+"];
const CA = ["< 500 k€","500 k–2 M€","2–10 M€","> 10 M€"];
const DISPO = ["Disponible","Sur devis","Complet"];
const SERVICES = ["Direction","Commercial","Marketing & Com","RH","Comptabilité","Logistique","Technique","Achats"];

/* ---- Villes (coordonnées pour la carte) ---- */
const CITIES = {
  "Rennes":[48.11,-1.68], "Nantes":[47.22,-1.55], "Lille":[50.63,3.06], "Paris":[48.86,2.35],
  "Bordeaux":[44.84,-0.58], "Lyon":[45.76,4.84], "Clermont-Ferrand":[45.78,3.08], "Marseille":[43.30,5.37],
  "Toulouse":[43.60,1.44], "Strasbourg":[48.57,7.75], "Nice":[43.70,7.27], "Montpellier":[43.61,3.88],
  "Grenoble":[45.19,5.72], "Angers":[47.47,-0.55],
};
const distKm=(a,b)=>{if(!CITIES[a]||!CITIES[b])return null;const[la1,lo1]=CITIES[a],[la2,lo2]=CITIES[b];const R=6371,dLat=(la2-la1)*Math.PI/180,dLon=(lo2-lo1)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(x)));};

/* ---- Projection carte de France ---- */
const FR = { lngMin:-5.2, lngMax:8.4, latMin:41.3, latMax:51.2 };
const MAPW = 500, MAPH = 520, PAD = 26;
const project = (lat,lng) => [
  PAD + ((lng-FR.lngMin)/(FR.lngMax-FR.lngMin))*(MAPW-2*PAD),
  PAD + ((FR.latMax-lat)/(FR.latMax-FR.latMin))*(MAPH-2*PAD),
];
const FRANCE_PTS = [
  [51.03,2.37],[49.95,4.20],[49.54,5.90],[48.58,7.75],[47.55,7.55],[46.20,6.14],[45.90,6.80],
  [45.10,6.90],[44.10,7.00],[43.70,7.27],[43.29,5.37],[43.35,3.30],[42.85,3.03],[42.50,3.05],
  [42.60,1.45],[43.00,-0.30],[43.35,-1.45],[44.20,-1.20],[45.60,-1.10],[46.16,-1.15],[46.80,-2.10],
  [47.25,-2.25],[47.65,-3.40],[48.10,-4.30],[48.40,-4.49],[48.70,-3.50],[48.65,-1.60],[49.30,-1.30],
  [49.70,-1.60],[49.40,-0.20],[49.50,0.10],[50.05,1.35],[50.75,1.60],
];
const FRANCE_PATH = FRANCE_PTS.map((p,i)=>{const[x,y]=project(p[0],p[1]);return`${i?"L":"M"}${x.toFixed(1)} ${y.toFixed(1)}`;}).join(" ")+" Z";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;450;500;600;700&display=swap');
.mln * { box-sizing:border-box; }
.mln {
  --ink:#0F1826; --paper:#FBFAF7; --surface:#FFFFFF;
  --line:#E7E4DB; --line-soft:#F0EEE7; --slate:#5C6672; --slate-soft:#8A929C;
  --emerald:#0F846B; --emerald-bright:#16A886; --emerald-wash:#E6F3EF;
  --amber:#D98A12; --amber-wash:#FBF0DC; --coral:#DC5B41; --coral-wash:#FBE9E4; --blue:#3B6FB0; --sea:#EEF2F4;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--paper);
  min-height:100vh; -webkit-font-smoothing:antialiased; line-height:1.5;
}
.mln .mono{font-family:'Inter',monospace;}
.mln .disp{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-.02em;line-height:1.04;}
.mln button{font-family:inherit;cursor:pointer;border:none;background:none;}
.mln :focus-visible{outline:2px solid var(--emerald);outline-offset:2px;border-radius:4px;}
.mln input,.mln textarea,.mln select{font-family:inherit;}

.mln .bar{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(251,250,247,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);}
.mln .brand{display:flex;align-items:center;gap:9px;cursor:pointer;}
.mln .brand b{font-family:'Bricolage Grotesque';font-weight:800;font-size:19px;letter-spacing:-.03em;}
.mln .mark{width:25px;height:25px;}
.mln .nav{display:flex;gap:2px;background:var(--surface);border:1px solid var(--line);padding:4px;border-radius:999px;}
.mln .nav button{font-size:13px;font-weight:600;padding:7px 14px;border-radius:999px;color:var(--slate);display:flex;align-items:center;gap:6px;transition:.12s;}
.mln .nav button.on{background:var(--ink);color:#fff;}
.mln .badge{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 5px;border-radius:999px;font-size:10.5px;font-weight:700;background:var(--coral);color:#fff;}
.mln .nav button.on .badge{background:var(--emerald-bright);}
.mln .me{display:flex;align-items:center;gap:9px;cursor:pointer;}
.mln .me .av{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:15px;color:#fff;}
.mln .me small{font-size:12px;color:var(--slate);display:block;line-height:1.2;}
.mln .me b{font-size:13px;line-height:1.2;}

.mln .wrap{max-width:1120px;margin:0 auto;padding:0 24px;}
.mln .page{padding:30px 0 80px;}
.mln .ptitle{font-family:'Bricolage Grotesque';font-weight:700;font-size:26px;margin:0 0 4px;}
.mln .psub{font-size:14.5px;color:var(--slate);margin:0 0 24px;}

.mln .onb{max-width:560px;margin:0 auto;padding:48px 24px;}
.mln .onb .eyebrow{font-family:'Inter';font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);font-weight:700;}
.mln .onb h1{font-family:'Bricolage Grotesque';font-weight:800;font-size:clamp(28px,5vw,42px);margin:14px 0 10px;letter-spacing:-.02em;}
.mln .onb p.lead{font-size:16px;color:var(--slate);margin:0 0 26px;}
.mln .steps{display:flex;gap:8px;margin-bottom:22px;}
.mln .stp{flex:1;height:4px;border-radius:2px;background:var(--line);}
.mln .stp.on{background:var(--emerald);}
.mln .stphint{font-family:'Inter';font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:16px;}

.mln .field{margin-bottom:16px;}
.mln .field>label{display:block;font-family:'Inter';font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate);margin-bottom:6px;}
.mln .field input,.mln .field textarea,.mln .field select{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--ink);outline:none;background:#fff;}
.mln .field input:focus,.mln .field textarea:focus,.mln .field select:focus{border-color:var(--emerald);}
.mln .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.mln .colorpick{display:flex;gap:8px;margin-top:2px;flex-wrap:wrap;}
.mln .swatch{width:30px;height:30px;border-radius:8px;cursor:pointer;border:2px solid transparent;}
.mln .swatch.on{border-color:var(--ink);}

.mln .btn{background:var(--ink);color:#fff;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;transition:.15s;}
.mln .btn:hover{background:var(--emerald);}
.mln .btn.block{width:100%;}
.mln .btn:disabled{opacity:.4;pointer-events:none;}
.mln .btn.sm{padding:9px 16px;font-size:13.5px;border-radius:10px;}
.mln .btn-ghost{background:#fff;border:1px solid var(--line);color:var(--ink);font-weight:600;padding:12px 18px;border-radius:12px;transition:.12s;}
.mln .btn-ghost:hover{border-color:var(--ink);}
.mln .btn-ghost.sm{padding:8px 14px;font-size:13px;border-radius:10px;}
.mln .btn-danger{background:#fff;border:1px solid var(--line);color:var(--coral);font-weight:600;padding:8px 14px;border-radius:10px;font-size:13px;}
.mln .btn-danger:hover{border-color:var(--coral);background:var(--coral-wash);}
.mln .linkbtn{color:var(--slate);font-size:13.5px;font-weight:600;text-decoration:underline;}

.mln .toolbar{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center;}
.mln .search{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 15px;}
.mln .search input{border:none;outline:none;width:100%;font-size:15px;background:none;}
.mln .maptoggle{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:11px;padding:3px;gap:2px;}
.mln .maptoggle button{font-size:13px;font-weight:600;padding:8px 15px;border-radius:9px;color:var(--slate);display:flex;align-items:center;gap:6px;}
.mln .maptoggle button.on{background:var(--ink);color:#fff;}
.mln .advbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:18px;padding:12px 14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;}
.mln .advbar .grp{display:flex;flex-direction:column;gap:3px;}
.mln .advbar .grp label{font-family:'Inter';font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--slate-soft);}
.mln .advbar select{border:1px solid var(--line);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600;color:var(--ink);background:#fff;cursor:pointer;outline:none;}
.mln .advbar .toggle{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--slate);cursor:pointer;padding-bottom:6px;}
.mln .advbar .toggle input{accent-color:var(--emerald);width:15px;height:15px;}
.mln .advbar .clear{margin-left:auto;font-size:12.5px;color:var(--coral);font-weight:600;padding-bottom:6px;}
.mln .rescount{font-family:'Inter';font-size:12px;color:var(--slate);margin-bottom:14px;}

.mln .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.mln .card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;transition:.16s;}
.mln .card:hover{border-color:var(--ink);box-shadow:0 20px 44px -32px rgba(15,24,38,.4);}
.mln .ctop{display:flex;gap:13px;align-items:flex-start;}
.mln .logo{width:48px;height:48px;border-radius:13px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:20px;color:#fff;}
.mln .cname{font-weight:700;font-size:16.5px;display:flex;align-items:center;gap:6px;cursor:pointer;}
.mln .cname:hover{color:var(--emerald);}
.mln .verif{width:15px;height:15px;color:var(--emerald);}
.mln .csector{font-size:12.5px;color:var(--slate);}
.mln .aff{margin-left:auto;text-align:center;flex:0 0 auto;padding:5px 9px;border-radius:10px;background:var(--emerald-wash);}
.mln .aff .n{font-family:'Inter';font-weight:700;font-size:14px;color:var(--emerald);line-height:1;}
.mln .aff .l{font-family:'Inter';font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:#0c5f4d;margin-top:2px;}
.mln .ctag{font-size:14px;color:var(--slate);line-height:1.5;}
.mln .metaline{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--slate);}
.mln .metaline span{display:flex;align-items:center;gap:5px;}
.mln .seek{display:flex;gap:8px;flex-wrap:wrap;}
.mln .pill{font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:7px;}
.mln .pill.seek{background:var(--emerald-wash);color:#0c5f4d;}
.mln .pill.offer{background:var(--line-soft);color:var(--slate);}
.mln .pill.cert{background:var(--amber-wash);color:#8a5a05;}
.mln .cfoot{margin-top:auto;padding-top:13px;border-top:1px solid var(--line-soft);display:flex;align-items:center;gap:10px;}
.mln .status{font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;color:var(--slate);}
.mln .dot{width:7px;height:7px;border-radius:50%;}

/* map */
.mln .mapbox{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;display:flex;gap:22px;flex-wrap:wrap;}
.mln .mapsvg{flex:1;min-width:280px;position:relative;overflow:hidden;border-radius:14px;background:var(--sea);}
.mln .mapsvg svg{width:100%;height:auto;display:block;touch-action:none;cursor:grab;}
.mln .mapsvg svg:active{cursor:grabbing;}
.mln .mapctrls{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:6px;z-index:3;}
.mln .mapctrls button{width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--line);font-size:17px;font-weight:700;color:var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px -6px rgba(15,24,38,.35);}
.mln .mapctrls button:hover{background:var(--paper);}
.mln .mapop{position:absolute;z-index:4;width:236px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 22px 55px -20px rgba(15,24,38,.5);padding:14px;}
.mln .mapop .oph{display:flex;gap:10px;align-items:center;margin-bottom:9px;}
.mln .mapop .oph .logo{width:40px;height:40px;font-size:17px;border-radius:11px;overflow:hidden;}
.mln .mapop b{font-size:14px;display:flex;align-items:center;gap:5px;}
.mln .mapop small{font-size:11.5px;color:var(--slate);}
.mln .mapop .opaff{font-family:'Inter';font-size:11.5px;color:var(--emerald);font-weight:700;margin-bottom:11px;}
.mln .mapop .opact{display:flex;gap:8px;}
.mln .mapop .opclose{position:absolute;top:9px;right:9px;width:22px;height:22px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;color:var(--slate);}
.mln .maparrow{position:absolute;width:12px;height:12px;background:#fff;border-right:1px solid var(--line);border-bottom:1px solid var(--line);left:50%;bottom:-7px;transform:translateX(-50%) rotate(45deg);}
.mln .maplabel rect{fill:#fff;stroke:var(--line);}
.mln .maplabel text{fill:var(--ink);}

/* import logo */
.mln .logoup{display:flex;gap:14px;align-items:center;}
.mln .logoprev{width:58px;height:58px;border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque';font-weight:800;font-size:23px;flex:0 0 auto;border:1px solid var(--line);}
.mln .logoprev img{width:100%;height:100%;object-fit:cover;}
.mln .uplabel{display:inline-block;cursor:pointer;}
.mln .uphint{font-size:12px;color:var(--slate-soft);margin-top:6px;}
.mln .av,.mln .logo,.mln .proflogo,.mln .plogo{overflow:hidden;}
.mln .av img,.mln .logo img,.mln .proflogo img,.mln .plogo img{width:100%;height:100%;object-fit:cover;}
.mln .maplegend{width:210px;}
.mln .maplegend h5{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin:0 0 12px;}
.mln .legitem{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--slate);padding:4px 0;}
.mln .legdot{width:11px;height:11px;border-radius:50%;flex:0 0 auto;}
.mln .maphint{font-size:12.5px;color:var(--slate-soft);margin-top:14px;line-height:1.5;}

.mln .reqcard{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin-bottom:12px;}
.mln .reqhead{display:flex;gap:13px;align-items:center;}
.mln .reqmsg{margin:12px 0 0;padding:13px 15px;background:var(--paper);border-radius:12px;font-size:14px;color:var(--ink);line-height:1.55;border:1px solid var(--line-soft);}
.mln .consentrow{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--slate);margin:14px 0 4px;cursor:pointer;}
.mln .consentrow input{accent-color:var(--emerald);width:16px;height:16px;margin-top:1px;flex:0 0 auto;}
.mln .reqmsg .q{font-family:'Inter';font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);display:block;margin-bottom:5px;}
.mln .reqact{display:flex;gap:9px;margin-top:14px;}
.mln .seclabel{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin:26px 0 12px;display:flex;align-items:center;gap:8px;}

.mln .msgwrap{display:grid;grid-template-columns:280px 1fr;gap:0;background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden;height:560px;}
.mln .convlist{border-right:1px solid var(--line);overflow-y:auto;}
.mln .conv{display:flex;gap:11px;align-items:center;padding:14px 16px;cursor:pointer;border-bottom:1px solid var(--line-soft);transition:.1s;}
.mln .conv:hover{background:var(--paper);}
.mln .conv.on{background:var(--emerald-wash);}
.mln .conv .logo{width:38px;height:38px;font-size:16px;border-radius:10px;}
.mln .conv b{font-size:14px;display:block;}
.mln .conv small{font-size:12px;color:var(--slate);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;}
.mln .chat{display:flex;flex-direction:column;}
.mln .chathead{padding:14px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:11px;}
.mln .chathead .logo{width:40px;height:40px;font-size:17px;border-radius:11px;}
.mln .stream{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px;}
.mln .bub{max-width:74%;padding:11px 15px;border-radius:16px;font-size:14px;line-height:1.5;}
.mln .bub.them{background:var(--paper);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:5px;}
.mln .bub.me{background:var(--ink);color:#fff;align-self:flex-end;border-bottom-right-radius:5px;}
.mln .bub.sys{align-self:center;background:var(--emerald-wash);color:#0c5f4d;font-size:12.5px;border-radius:999px;padding:6px 14px;}
.mln .composer{display:flex;gap:9px;padding:14px 16px;border-top:1px solid var(--line);}
.mln .composer input{flex:1;border:1px solid var(--line);border-radius:12px;padding:12px 15px;font-size:14px;outline:none;}
.mln .composer input:focus{border-color:var(--emerald);}
.mln .msgempty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--slate);padding:30px;text-align:center;}
.mln .chantabs{display:flex;gap:6px;padding:11px 16px;border-bottom:1px solid var(--line-soft);overflow-x:auto;flex-wrap:wrap;}
.mln .chantab{font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:999px;color:var(--slate);background:var(--paper);border:1px solid var(--line);white-space:nowrap;}
.mln .chantab.on{background:var(--emerald);color:#fff;border-color:var(--emerald);}
.mln .chansub{font-size:11.5px;color:var(--slate-soft);}
.mln .svcwrap{display:flex;gap:8px;flex-wrap:wrap;}
.mln .svcchip{font-size:13px;font-weight:600;padding:8px 13px;border-radius:10px;background:#fff;border:1px solid var(--line);color:var(--slate);cursor:pointer;}
.mln .svcchip.on{background:var(--ink);color:#fff;border-color:var(--ink);}

/* visio */
.mln .meetcard{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;align-self:stretch;box-shadow:0 10px 26px -20px rgba(15,24,38,.4);}
.mln .meetcard .meetico{width:38px;height:38px;border-radius:10px;background:var(--emerald-wash);color:var(--emerald);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.mln .meetcard b{font-size:13.5px;display:block;}
.mln .meetcard small{font-size:12px;color:var(--slate);}
.mln .meetcard .btn{margin-left:auto;}
.mln .visio{position:fixed;inset:0;z-index:80;background:#0B1220;display:flex;flex-direction:column;animation:fade .2s;}
.mln .vishead{padding:16px 22px;color:#e8eaee;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;}
.mln .vistimer{margin-left:auto;font-family:'Inter';font-size:14px;background:rgba(255,255,255,.12);padding:5px 12px;border-radius:999px;display:flex;align-items:center;gap:7px;}
.mln .vistimer .rec{width:8px;height:8px;border-radius:50%;background:var(--coral);}
.mln .vistiles{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 22px;min-height:0;}
.mln .vistile{position:relative;border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.mln .vistile .vav{width:96px;height:96px;border-radius:24px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:40px;color:#fff;overflow:hidden;}
.mln .vistile .vav img{width:100%;height:100%;object-fit:cover;}
.mln .vistile .vname{position:absolute;bottom:14px;left:16px;color:#fff;font-weight:600;font-size:13.5px;background:rgba(0,0,0,.42);padding:5px 12px;border-radius:999px;}
.mln .vistile .voff{position:absolute;top:12px;right:14px;font-size:11px;color:#e6eaef;background:rgba(0,0,0,.45);padding:4px 10px;border-radius:999px;}
.mln .visctrls{display:flex;gap:12px;justify-content:center;align-items:center;padding:20px;}
.mln .visctrls button{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;display:flex;align-items:center;justify-content:center;transition:.12s;}
.mln .visctrls button:hover{background:rgba(255,255,255,.24);}
.mln .visctrls button.off{background:#fff;color:var(--ink);}
.mln .visctrls button.hang{background:var(--coral);width:62px;}
.mln .visctrls button.hang:hover{background:#c94d34;}
.mln .vissim{text-align:center;color:#6b7686;font-size:12px;padding-bottom:16px;}
.mln .agenda{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-bottom:18px;}
.mln .agtitle{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.mln .aggroup{margin-bottom:10px;}
.mln .agsvc{font-size:12.5px;font-weight:700;color:var(--emerald);margin-bottom:2px;}
.mln .agitem{display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid var(--line-soft);}
.mln .aglogo{width:34px;height:34px;border-radius:9px;overflow:hidden;flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque';font-weight:800;font-size:14px;}
.mln .aglogo img{width:100%;height:100%;object-fit:cover;}
.mln .aginfo{flex:1;min-width:0;}
.mln .aginfo b{font-size:13.5px;display:block;}
.mln .aginfo small{font-size:12px;color:var(--slate);}
.mln .agday{margin-bottom:22px;}
.mln .agdate{font-family:'Bricolage Grotesque';font-weight:700;font-size:17px;text-transform:capitalize;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line);}
.mln .agevent{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.mln .agtime{font-family:'Inter';font-weight:700;font-size:15px;color:var(--ink);min-width:50px;}
.mln .agevent .aginfo b{font-size:14.5px;}
.mln .agsvcs{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;}
.mln .agevent .btn{margin-left:auto;}
.mln .rolepick{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:5px 10px 5px 12px;margin-right:8px;}
.mln .rolepick svg{color:var(--emerald);flex:0 0 auto;}
.mln .rolepick select{border:none;background:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--ink);outline:none;cursor:pointer;max-width:120px;}
.mln .rolebar{font-size:13px;padding:11px 15px;border-radius:12px;margin-bottom:16px;background:var(--amber-wash);color:#7a5305;border:1px solid #efd9a8;}
.mln .rolebar b{color:#5c3d02;}
.mln .rolebar.admin{background:var(--emerald-wash);color:#0c5f4d;border-color:#bfe0d6;}
.mln .rolebar.admin b{color:#0c5f4d;}
.mln .gearbtn{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--slate);display:flex;align-items:center;justify-content:center;margin-right:8px;flex:0 0 auto;}
.mln .gearbtn:hover{border-color:var(--ink);color:var(--ink);}
.mln .accsec{margin-bottom:18px;}
.mln .accsec h5{font-family:'Inter';font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);margin:0 0 4px;}
.mln .accsec p.d{font-size:12.5px;color:var(--slate);margin:0 0 10px;}
.mln .accrow{padding:12px 0;border-top:1px solid var(--line-soft);}
.mln .accrow .rn{font-size:13.5px;font-weight:700;margin-bottom:7px;display:flex;align-items:center;gap:7px;}
.mln .accrow .rn .adm{font-family:'Inter';font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--emerald);color:#fff;padding:2px 7px;border-radius:999px;}
.mln .accnote{font-size:12px;color:var(--slate-soft);background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:11px 13px;margin-top:6px;}
.mln .rolepick span.rolename{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;}
.mln .login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;background:radial-gradient(120% 120% at 50% 0%, #fff 0%, var(--paper) 60%);}
.mln .loginbox{width:100%;max-width:420px;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:32px;box-shadow:0 40px 100px -50px rgba(15,24,38,.5);}
.mln .logco{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--paper);border:1px solid var(--line);border-radius:14px;margin-bottom:22px;}
.mln .logologo{width:44px;height:44px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque';font-weight:800;font-size:19px;flex:0 0 auto;}
.mln .logologo img{width:100%;height:100%;object-fit:cover;}
.mln .logco b{font-size:14.5px;display:block;}
.mln .logco small{font-size:12px;color:var(--slate);}
.mln .loginbox h1{font-family:'Bricolage Grotesque';font-weight:800;font-size:26px;margin:0 0 4px;letter-spacing:-.02em;}
.mln .loginsub{font-size:14px;color:var(--slate);margin:0 0 20px;}
.mln .logsep{display:flex;align-items:center;gap:12px;margin:20px 0 14px;color:var(--slate-soft);font-size:12px;}
.mln .logsep:before,.mln .logsep:after{content:"";flex:1;height:1px;background:var(--line);}
.mln .logaccts{display:flex;flex-direction:column;gap:8px;}
.mln .logacct{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:#fff;transition:.12s;}
.mln .logacct:hover{border-color:var(--emerald);background:var(--emerald-wash);}
.mln .logacct .lav{width:36px;height:36px;border-radius:10px;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;flex:0 0 auto;}
.mln .logacct b{font-size:13.5px;display:block;}
.mln .logacct small{font-size:12px;color:var(--slate);}
.mln .invrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.mln .invrow input{flex:1;min-width:160px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:13.5px;outline:none;}
.mln .invrow input:focus{border-color:var(--emerald);}
.mln .invrow select{border:1px solid var(--line);border-radius:10px;padding:9px 10px;font-size:13px;font-weight:600;background:#fff;color:var(--ink);}

/* recommandations */
.mln .recowrap{margin:0 0 22px;}
.mln .recohead{display:flex;align-items:center;gap:8px;font-family:'Inter';font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:12px;}
.mln .recohead svg{color:var(--amber);}
.mln .recorow{display:flex;gap:14px;overflow-x:auto;padding-bottom:4px;}
.mln .recocard{flex:0 0 258px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;}
.mln .recocard .rt{display:flex;gap:11px;align-items:center;}
.mln .recocard .logo{width:40px;height:40px;font-size:17px;border-radius:11px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque';font-weight:800;flex:0 0 auto;}
.mln .recocard .rname{font-weight:700;font-size:14.5px;}
.mln .recocard .rname:hover{color:var(--emerald);}
.mln .recocard .reason{font-size:12px;color:var(--emerald);font-weight:600;}
.mln .recocard .raff{margin-left:auto;font-family:'Inter';font-weight:700;font-size:13px;color:var(--emerald);}

/* mur de besoins */
.mln .needwrap{display:flex;flex-direction:column;gap:14px;max-width:720px;}
.mln .needcard{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;}
.mln .needhead{display:flex;gap:12px;align-items:center;margin-bottom:12px;}
.mln .needhead .logo{width:42px;height:42px;font-size:18px;border-radius:11px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque';font-weight:800;flex:0 0 auto;}
.mln .needhead b{font-size:14px;display:block;}
.mln .needhead small{font-size:12px;color:var(--slate);}
.mln .needmatch{margin-left:auto;font-family:'Inter';font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;background:var(--emerald-wash);color:#0c5f4d;padding:5px 10px;border-radius:999px;flex:0 0 auto;}
.mln .needcard h3{font-family:'Bricolage Grotesque';font-weight:700;font-size:17px;margin:0 0 10px;line-height:1.28;}
.mln .needmeta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
.mln .needfoot{display:flex;align-items:center;gap:12px;padding-top:12px;border-top:1px solid var(--line-soft);}
.mln .needfoot .resp{font-size:12.5px;color:var(--slate);}

/* notifications */
.mln .bell{position:relative;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--slate);display:flex;align-items:center;justify-content:center;margin-right:8px;flex:0 0 auto;}
.mln .bell:hover{border-color:var(--ink);color:var(--ink);}
.mln .bell .nb{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--coral);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;}
.mln .notifpanel{position:absolute;top:calc(100% + 6px);right:16px;width:320px;max-height:74vh;overflow-y:auto;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 60px -30px rgba(15,24,38,.5);z-index:50;}
.mln .chatpanel{position:fixed;top:90px;right:24px;bottom:24px;width:360px;background:var(--surface);border-radius:18px;box-shadow:0 30px 80px -20px rgba(15,24,38,.5);z-index:60;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);}
.mln .chatpanel .cphead{background:var(--ink);color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;gap:10px;}
.mln .chatpanel .cphead .cptitle{font-family:'Bricolage Grotesque';font-weight:800;font-size:19px;}
.mln .chatpanel .cpback{display:flex;align-items:center;gap:9px;cursor:pointer;min-width:0;}
.mln .chatpanel .cpback b{font-size:16px;font-family:'Bricolage Grotesque';font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mln .chatpanel .cpclose{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(255,255,255,.14);flex:0 0 auto;}
.mln .chatpanel .cpclose:hover{background:rgba(255,255,255,.24);}
.mln .chatpanel .cpbody{flex:1;overflow-y:auto;min-height:0;}
.mln .chatpanel .cpthread{flex:1;display:flex;flex-direction:column;min-height:0;}
@media(max-width:520px){.mln .chatpanel{left:12px;right:12px;top:70px;bottom:12px;width:auto;}}
.mln .notifpanel .nh{padding:13px 16px;font-family:'Inter';font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface);}
.mln .nat{display:block;font-family:'Inter';font-size:10.5px;color:var(--slate-soft);margin-top:3px;text-transform:capitalize;}
.mln .notifitem{display:flex;gap:11px;align-items:flex-start;padding:13px 16px;border-bottom:1px solid var(--line-soft);cursor:pointer;text-align:left;width:100%;background:none;}
.mln .notifitem:hover{background:var(--paper);}
.mln .notifitem .ni{width:30px;height:30px;border-radius:8px;background:var(--emerald-wash);color:var(--emerald);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.mln .notifitem p{margin:0;font-size:13px;line-height:1.4;color:var(--ink);}
.mln .notifempty{padding:26px 16px;text-align:center;color:var(--slate-soft);font-size:13px;}
.mln .setrow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid var(--line-soft);font-size:13.5px;color:var(--ink);cursor:pointer;}
.mln .setrow input{accent-color:var(--emerald);width:17px;height:17px;}
.mln .auditlist{display:flex;flex-direction:column;gap:0;}
.mln .auditrow{font-size:12.5px;color:var(--slate);padding:7px 0;border-top:1px solid var(--line-soft);display:flex;gap:10px;}
.mln .auditrow .at{font-family:'Inter';font-size:11px;color:var(--slate-soft);flex:0 0 auto;}
.mln .libcard{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;}
.mln .libitem{display:flex;gap:12px;align-items:flex-start;padding:14px 18px;border-bottom:1px solid var(--line-soft);}
.mln .libitem:last-child{border-bottom:none;}
.mln .libitem .ni{width:30px;height:30px;border-radius:8px;background:var(--emerald-wash);color:var(--emerald);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.mln .libitem p{margin:0;font-size:13.5px;line-height:1.4;color:var(--ink);flex:1;}
.mln .libitem .nat{margin:0;flex:0 0 auto;white-space:nowrap;}
.mln .subgrp{padding:13px 18px;border-bottom:1px solid var(--line-soft);}
.mln .subgrp:last-child{border-bottom:none;}
.mln .subhead{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:14px;}
.mln .subrow{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--slate);padding:4px 0 4px 16px;}
.mln .subrow .tree{color:var(--slate-soft);}
.mln .dashsec{max-width:720px;}
.mln .dashh{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin:0 0 12px;}
.mln .dash{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 26px;}
.mln .dtile{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;}
.mln .dtile b{font-family:'Bricolage Grotesque';font-weight:800;font-size:26px;display:block;line-height:1.1;}
.mln .dtile span{font-size:12px;color:var(--slate);}
.mln .loginrow{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:#fff;}
.mln .loginrow:hover{border-color:var(--emerald);}
.mln .loginrow .lav{width:38px;height:38px;border-radius:10px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;flex:0 0 auto;}
.mln .loginrow b{font-size:14px;display:block;}
.mln .loginrow small{font-size:12px;color:var(--slate);}
.mln .loginrow .cur{margin-left:auto;font-family:'Inter';font-size:10px;color:var(--emerald);font-weight:700;}
.mln .accrole{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line-soft);}
.mln .accrole b{font-size:13.5px;}
.mln .accrole small{font-size:11.5px;color:var(--slate);}
.mln .accrole select{margin-left:auto;border:1px solid var(--line);border-radius:9px;padding:6px 9px;font-size:13px;font-weight:600;background:#fff;color:var(--ink);}

.mln .scrim{position:fixed;inset:0;background:rgba(15,24,38,.42);backdrop-filter:blur(3px);z-index:60;animation:fade .2s;}
@keyframes fade{from{opacity:0}to{opacity:1}}
.mln .modal{position:fixed;inset:0;z-index:65;display:flex;align-items:center;justify-content:center;padding:20px;}
.mln .mbox{background:var(--surface);border-radius:20px;width:min(500px,100%);padding:28px;box-shadow:0 40px 100px -30px rgba(15,24,38,.6);animation:pop .24s cubic-bezier(.22,1,.36,1);max-height:90vh;overflow-y:auto;}
@keyframes pop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
.mln .mhead{display:flex;gap:13px;align-items:center;margin-bottom:18px;}
.mln .mbox h3{font-family:'Bricolage Grotesque';font-weight:700;font-size:21px;margin:0;}
.mln .mbox .mi{font-size:13.5px;color:var(--slate);margin:2px 0 0;}
.mln .msec{font-family:'Bricolage Grotesque';font-weight:700;font-size:14px;margin:20px 0 12px;padding-top:16px;border-top:1px solid var(--line-soft);}
.mln .mhead+.msec{padding-top:0;border-top:none;margin-top:0;}

.mln .panel{position:fixed;top:0;right:0;bottom:0;width:min(540px,96vw);background:var(--paper);z-index:62;overflow-y:auto;box-shadow:-30px 0 80px -40px rgba(15,24,38,.6);animation:slide .28s cubic-bezier(.22,1,.36,1);}
@keyframes slide{from{transform:translateX(40px);opacity:.4}to{transform:translateX(0);opacity:1}}
.mln .pclose{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--slate);z-index:2;}
.mln .pban{height:94px;}
.mln .phead{padding:0 30px 22px;}
.mln .pident{display:flex;gap:15px;align-items:flex-end;margin-top:-34px;}
.mln .plogo{width:76px;height:76px;border-radius:17px;border:4px solid var(--paper);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:31px;color:#fff;flex:0 0 auto;}
.mln .pname{font-family:'Bricolage Grotesque';font-weight:700;font-size:25px;display:flex;align-items:center;gap:8px;}
.mln .paff{display:flex;align-items:center;gap:13px;margin:18px 0 0;padding:14px 16px;background:var(--emerald-wash);border-radius:14px;}
.mln .paff .why{font-size:13px;color:#0c5f4d;line-height:1.5;}
.mln .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;margin-top:18px;}
.mln .pcell{padding:13px 15px;border-bottom:1px solid var(--line-soft);border-right:1px solid var(--line-soft);}
.mln .pcell:nth-child(even){border-right:none;}
.mln .pcell .k{font-family:'Inter';font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:3px;}
.mln .pcell .v{font-size:14px;font-weight:600;}
.mln .psec{padding:20px 30px;border-top:1px solid var(--line);}
.mln .psec h5{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin:0 0 10px;}
.mln .psec p{margin:0;font-size:14.5px;line-height:1.6;}
.mln .pcta{position:sticky;bottom:0;padding:15px 30px;background:rgba(251,250,247,.94);backdrop-filter:blur(8px);border-top:1px solid var(--line);display:flex;gap:10px;}

.mln .prof{background:var(--surface);border:1px solid var(--line);border-radius:20px;overflow:hidden;max-width:720px;}
.mln .profban{height:120px;}
.mln .profbody{padding:24px 28px 28px;}
.mln .profident{display:flex;gap:16px;align-items:flex-end;margin-top:-52px;margin-bottom:18px;}
.mln .proflogo{width:82px;height:82px;border-radius:18px;border:4px solid var(--surface);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:34px;color:#fff;flex:0 0 auto;}
.mln .profname{font-family:'Bricolage Grotesque';font-weight:700;font-size:27px;display:flex;align-items:center;gap:8px;}
.mln .profmeta{font-size:13.5px;color:var(--slate);}
.mln .profsec{margin-top:18px;}
.mln .profsec h5{font-family:'Inter';font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--slate-soft);margin:0 0 9px;}
.mln .profsec p{margin:0;font-size:14.5px;line-height:1.6;}

.mln .toasts{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:8px;align-items:center;}
.mln .toast{background:var(--ink);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 20px 50px -20px rgba(15,24,38,.6);animation:up .3s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;gap:10px;}
@keyframes up{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
.mln .toast .tk{color:var(--emerald-bright);}

.mln .empty{text-align:center;padding:70px 20px;color:var(--slate);}
.mln .empty h3{font-family:'Bricolage Grotesque';font-weight:700;font-size:21px;color:var(--ink);margin:10px 0 6px;}
.mln .foot{border-top:1px solid var(--line);padding:24px;text-align:center;font-size:12.5px;color:var(--slate-soft);}
.mln .foot b{font-family:'Bricolage Grotesque';color:var(--slate);}

/* blog central + adhésion */
.mln .blog{display:grid;grid-template-columns:1fr 288px;gap:30px;align-items:start;}
.mln .feed{display:flex;flex-direction:column;gap:16px;}
.mln .memban{display:flex;align-items:center;gap:12px;background:var(--amber-wash);border:1px solid #efd9a8;border-radius:14px;padding:13px 16px;margin-bottom:18px;font-size:13.5px;color:#7a5305;}
.mln .memban b{color:#5c3d02;}
.mln .memban .btn{margin-left:auto;padding:9px 15px;font-size:13px;}
.mln .post{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px;}
.mln .posthead{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.mln .posthead .logo{width:42px;height:42px;font-size:18px;border-radius:11px;}
.mln .posthead .who b{font-size:14.5px;display:flex;align-items:center;gap:5px;}
.mln .posthead .who small{font-size:12px;color:var(--slate);}
.mln .posttag{margin-left:auto;font-family:'Inter';font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 11px;border-radius:999px;background:var(--emerald-wash);color:#0c5f4d;}
.mln .post h3{font-family:'Bricolage Grotesque';font-weight:700;font-size:19px;margin:0 0 8px;line-height:1.18;}
.mln .post p.body{margin:0;font-size:14.5px;color:var(--slate);line-height:1.6;}
.mln .postfoot{display:flex;align-items:center;gap:18px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line-soft);}
.mln .like{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--slate);cursor:pointer;}
.mln .like.on{color:var(--coral);}
.mln .postself{font-family:'Inter';font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--emerald);margin-left:auto;}
.mln .postphoto{width:100%;max-height:340px;object-fit:cover;border-radius:12px;margin-top:14px;display:block;}
.mln .repostmeta{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--slate);margin-bottom:12px;}
.mln .repostmeta svg{color:var(--slate-soft);flex:0 0 auto;}
.mln .like.rep:hover{color:var(--emerald);}
.mln .photopick{display:flex;align-items:center;gap:10px;margin-top:4px;}
.mln .photopick img{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);}
.mln .photopick .rm{font-size:12px;color:var(--coral);font-weight:600;cursor:pointer;}
.mln .bside{position:sticky;top:78px;display:flex;flex-direction:column;gap:14px;}
.mln .memcard{background:var(--ink);color:#fff;border-radius:18px;padding:22px;}
.mln .memcard h4{font-family:'Bricolage Grotesque';font-weight:700;font-size:18px;margin:0 0 8px;}
.mln .memcard p{font-size:13px;color:#c7ccd4;line-height:1.55;margin:0 0 16px;}
.mln .memcard ul{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:9px;}
.mln .memcard li{font-size:13px;display:flex;align-items:center;gap:9px;color:#e8eaee;}
.mln .memcard li svg{color:var(--emerald-bright);flex:0 0 auto;}
.mln .btn-light{background:#fff;color:var(--ink);font-weight:700;font-size:14px;padding:12px;border-radius:11px;width:100%;transition:.14s;}
.mln .btn-light:hover{background:var(--emerald-wash);}
.mln .memok{background:var(--emerald-wash);border:1px solid #bfe0d6;border-radius:18px;padding:20px;}
.mln .memok h4{font-family:'Bricolage Grotesque';font-weight:700;font-size:16px;margin:0 0 6px;color:#0c5f4d;display:flex;align-items:center;gap:8px;}
.mln .memok p{font-size:13px;color:#0c5f4d;margin:0 0 14px;line-height:1.5;}
.mln .plan{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;cursor:pointer;transition:.14s;background:#fff;}
.mln .plan:hover{border-color:var(--emerald);box-shadow:0 12px 30px -20px rgba(15,132,107,.5);}
.mln .plan .pn{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;}
.mln .plan .pp{font-family:'Bricolage Grotesque';font-weight:800;font-size:26px;margin-top:4px;}
.mln .plan .pp small{font-size:13px;font-weight:500;color:var(--slate);}
.mln .plan .best{font-family:'Inter';font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--emerald);color:#fff;padding:3px 8px;border-radius:999px;}
.mln .simnote{font-size:11.5px;color:var(--slate-soft);text-align:center;margin-top:6px;}

/* onboarding : choix d'abonnement */
.mln .billtoggle{display:inline-flex;background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:3px;gap:2px;margin-bottom:16px;}
.mln .billtoggle button{font-size:13px;font-weight:600;padding:8px 16px;border-radius:9px;color:var(--slate);display:flex;align-items:center;gap:5px;}
.mln .billtoggle button.on{background:var(--ink);color:#fff;}
.mln .billtoggle .save{font-family:'Inter';font-size:10px;color:var(--emerald-bright);}
.mln .billtoggle button.on .save{color:#7fe6cf;}
.mln .planpick{border:1.5px solid var(--line);border-radius:16px;padding:18px;margin-bottom:12px;cursor:pointer;transition:.14s;background:#fff;}
.mln .planpick:hover{border-color:var(--slate);}
.mln .planpick.on{border-color:var(--emerald);box-shadow:0 0 0 3px var(--emerald-wash);}
.mln .planpick .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;}
.mln .planpick .pnm{font-family:'Bricolage Grotesque';font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px;}
.mln .planpick .radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);flex:0 0 auto;display:flex;align-items:center;justify-content:center;}
.mln .planpick.on .radio{border-color:var(--emerald);background:var(--emerald);}
.mln .planpick .prc{font-family:'Bricolage Grotesque';font-weight:800;font-size:23px;}
.mln .planpick .prc small{font-size:12px;font-weight:500;color:var(--slate);}
.mln .planpick .tg2{font-size:13px;color:var(--slate);margin:2px 0 12px;}
.mln .planpick ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;}
.mln .planpick li{font-size:13px;display:flex;align-items:center;gap:8px;color:var(--ink);}
.mln .planpick li.no{color:var(--slate-soft);}
.mln .planpick li svg{flex:0 0 auto;}

@media (max-width:820px){
  .mln .grid{grid-template-columns:1fr;}
  .mln .blog{grid-template-columns:1fr;}
  .mln .bside{position:static;}
  .mln .bar{padding:10px 14px;}
  .mln .nav button{padding:6px 9px;font-size:12px;}
  .mln .nav{max-width:58vw;overflow-x:auto;}
  .mln .rolepick{margin-right:4px;padding:4px 8px;}
  .mln .rolepick select{max-width:78px;font-size:12px;}
  .mln .brand b{font-size:16px;}
  .mln .me small{display:none;}
  .mln .msgwrap{grid-template-columns:1fr;height:auto;}
  .mln .convlist{max-height:180px;}
  .mln .grid2{grid-template-columns:1fr;}
  .mln .maplegend{width:100%;}
  .mln .vistiles{grid-template-columns:1fr;}
  .mln .dash{grid-template-columns:repeat(2,1fr);}
}
`;

const seed = (o) => ({ verified:true, rating:4.7, ...o, color:SECTOR_COLORS[o.sector] });
const DIRECTORY_RAW = [
  seed({ id:1, name:"Fibre & Cie", sector:"Tech & Dév", loc:"Rennes", size:"12 pers.", emp:"11–50",
    founded:2016, ca:"500 k–2 M€", dispo:"Disponible", web:"fibre-cie.fr", refs:34, rating:4.9,
    certifs:["RGPD","ISO 27001"], langues:["Français","Anglais"],
    tag:"Studio de développement web & applications métier pour PME.",
    seek:["Partenaires design","Apporteurs d'affaires"], offer:["Dev sur mesure","Intégration API","Maintenance"],
    desc:"Studio technique rennais. On conçoit des applications robustes, du cadrage au déploiement, avec un suivi long terme.", rel:"none" }),
  seed({ id:2, name:"Atelier Signal", sector:"Design & Création", loc:"Nantes", size:"6 pers.", emp:"1–10",
    founded:2019, ca:"< 500 k€", dispo:"Disponible", web:"ateliersignal.studio", refs:52, rating:4.8,
    certifs:["Qualiopi"], langues:["Français","Anglais","Espagnol"],
    tag:"Identité visuelle, branding et direction artistique.",
    seek:["Studios web","Imprimeurs"], offer:["Branding","Charte graphique","Packaging"],
    desc:"Petit atelier de design qui construit des identités qui durent. Un interlocuteur unique du brief à la livraison.", rel:"incoming", toService:"Commercial",
    reqMsg:"Bonjour, on cherche un partenaire tech fiable pour référer nos clients qui ont besoin de sites sur mesure. Votre profil colle parfaitement — on démarre une discussion ?" }),
  seed({ id:3, name:"Relais Nord", sector:"Logistique & Transport", loc:"Lille", size:"48 pers.", emp:"11–50",
    founded:2008, ca:"2–10 M€", dispo:"Sur devis", web:"relais-nord.com", refs:120, rating:4.6,
    certifs:["ISO 9001","AEO"], langues:["Français","Néerlandais"],
    tag:"Transport et stockage pour flux régionaux et nationaux.",
    seek:["E-commerçants","Industriels"], offer:["Entrepôt","Livraison dernier km","Préparation commandes"],
    desc:"Transporteur régional avec entrepôt de 4000m². Suivi en temps réel, engagement sur les délais, flotte récente.", rel:"none" }),
  seed({ id:4, name:"Cap Talents", sector:"RH & Recrutement", loc:"Paris", size:"22 pers.", emp:"11–50",
    founded:2014, ca:"2–10 M€", dispo:"Disponible", web:"captalents.fr", refs:88, rating:4.7, verified:false,
    certifs:["OPQCM"], langues:["Français","Anglais"],
    tag:"Recrutement de profils cadres et techniques.",
    seek:["Scale-ups","ESN"], offer:["Chasse de tête","Recrutement volume","Marque employeur"],
    desc:"Cabinet orienté tech et fonctions support. Sourcing rigoureux, garantie de remplacement, forte connaissance des salaires du marché.", rel:"none" }),
  seed({ id:5, name:"Bordier & Associés", sector:"Juridique & Compta", loc:"Rennes", size:"9 pers.", emp:"1–10",
    founded:2003, ca:"500 k–2 M€", dispo:"Sur devis", web:"bordier-associes.fr", refs:210, rating:4.9,
    certifs:["Ordre des experts-comptables"], langues:["Français"],
    tag:"Expertise comptable et conseil juridique aux TPE-PME.",
    seek:["Jeunes entreprises","Réseaux pro"], offer:["Comptabilité","Paie","Conseil juridique","Fiscalité"],
    desc:"Cabinet de proximité. On simplifie l'administratif pour que vous restiez concentré sur votre activité. Outils numériques inclus.", rel:"connected",
    channels:{Direction:[{from:"sys",text:"Mise en relation acceptée il y a 3 jours (canal Direction)."},{from:"them",text:"Ravi de démarrer cet échange ! On peut caler un point cette semaine ?"},{from:"sys",kind:"meeting",date:"2026-08-20",time:"14:30"}],
      "Comptabilité":[{from:"sys",text:"Canal Comptabilité ouvert."},{from:"them",text:"Bonjour, on peut échanger sur la reprise de votre comptabilité dès que vous voulez."}]} }),
  seed({ id:6, name:"Éclat Studio", sector:"Marketing & Com", loc:"Bordeaux", size:"15 pers.", emp:"11–50",
    founded:2017, ca:"500 k–2 M€", dispo:"Disponible", web:"eclat.studio", refs:67, rating:4.5,
    certifs:["Google Partner","Meta Business Partner"], langues:["Français","Anglais"],
    tag:"Stratégie de contenu, réseaux sociaux et acquisition.",
    seek:["Agences complémentaires","Annonceurs"], offer:["Social media","Publicité en ligne","SEO"],
    desc:"Agence data-driven. On pilote vos campagnes à la performance avec un reporting clair chaque mois.", rel:"incoming", toService:"Direction",
    reqMsg:"Salut ! On a plusieurs clients qui nous demandent du développement et on préfère référer que sous-traiter dans le flou. On aimerait vous rencontrer." }),
  seed({ id:7, name:"Grand Angle", sector:"Événementiel", loc:"Lyon", size:"11 pers.", emp:"11–50",
    founded:2012, ca:"2–10 M€", dispo:"Complet", web:"grandangle-events.fr", refs:45, rating:4.8,
    certifs:["ISO 20121"], langues:["Français","Anglais","Italien"],
    tag:"Organisation d'événements pro et séminaires d'entreprise.",
    seek:["Traiteurs","Prestataires audiovisuels"], offer:["Séminaires","Salons","Team building"],
    desc:"Agence événementielle clé en main. Du concept à la logistique, on orchestre des événements qui marquent, en France comme à l'étranger.", rel:"none" }),
  seed({ id:8, name:"Forge Industrielle", sector:"Industrie & Production", loc:"Clermont-Ferrand", size:"64 pers.", emp:"51–200",
    founded:1998, ca:"> 10 M€", dispo:"Sur devis", web:"forge-industrielle.fr", refs:150, rating:4.4, verified:false,
    certifs:["ISO 9001","EN 9100"], langues:["Français","Allemand"],
    tag:"Fabrication de pièces métalliques et sous-traitance.",
    seek:["Bureaux d'études","Donneurs d'ordre"], offer:["Usinage","Tôlerie","Prototypage"],
    desc:"Atelier de mécanique de précision. Petites et moyennes séries, prototypage rapide, contrôle qualité systématique.", rel:"none" }),
  seed({ id:9, name:"Solstice Énergie", sector:"Énergie & Environnement", loc:"Montpellier", size:"30 pers.", emp:"11–50",
    founded:2015, ca:"2–10 M€", dispo:"Disponible", web:"solstice-energie.fr", refs:74, rating:4.6,
    certifs:["QualiPV","RGE"], langues:["Français","Anglais"],
    tag:"Installation solaire et conseil en efficacité énergétique.",
    seek:["Industriels","Bailleurs","Collectivités"], offer:["Photovoltaïque","Audit énergétique","Bornes de recharge"],
    desc:"Installateur photovoltaïque et bureau d'études énergie. On aide les entreprises à réduire leur facture et leur empreinte.", rel:"none" }),
  seed({ id:10, name:"Cabinet Vega", sector:"Conseil & Stratégie", loc:"Toulouse", size:"18 pers.", emp:"11–50",
    founded:2011, ca:"2–10 M€", dispo:"Sur devis", web:"cabinet-vega.fr", refs:96, rating:4.7,
    certifs:["ISO 20700"], langues:["Français","Anglais","Espagnol"],
    tag:"Conseil en stratégie et transformation pour ETI.",
    seek:["Dirigeants","Fonds d'investissement"], offer:["Stratégie","Organisation","Pilotage de projet"],
    desc:"Cabinet de conseil indépendant. On accompagne les dirigeants sur leurs décisions structurantes, du diagnostic à la mise en œuvre.", rel:"none" }),
  seed({ id:11, name:"Novabat", sector:"BTP & Construction", loc:"Marseille", size:"85 pers.", emp:"51–200",
    founded:2005, ca:"> 10 M€", dispo:"Sur devis", web:"novabat.fr", refs:180, rating:4.3, verified:false,
    certifs:["Qualibat","RGE"], langues:["Français"],
    tag:"Gros œuvre et rénovation de bâtiments tertiaires.",
    seek:["Architectes","Promoteurs","Bureaux d'études"], offer:["Gros œuvre","Rénovation","Second œuvre"],
    desc:"Entreprise générale du bâtiment. On construit et rénove des locaux professionnels avec des délais tenus.", rel:"none" }),
  seed({ id:12, name:"Maison Gaultier", sector:"Restauration & Traiteur", loc:"Lyon", size:"20 pers.", emp:"11–50",
    founded:2009, ca:"500 k–2 M€", dispo:"Disponible", web:"maison-gaultier.fr", refs:130, rating:4.9,
    certifs:["Écotable"], langues:["Français","Anglais"],
    tag:"Traiteur événementiel local et de saison.",
    seek:["Agences événementielles","Entreprises"], offer:["Cocktails","Repas assis","Petits-déjeuners"],
    desc:"Traiteur lyonnais engagé. Des prestations soignées et locales, du petit-déjeuner d'équipe au dîner de gala.", rel:"none" }),
  seed({ id:13, name:"Alpha Assurance", sector:"Finance & Assurance", loc:"Strasbourg", size:"40 pers.", emp:"11–50",
    founded:2000, ca:"2–10 M€", dispo:"Disponible", web:"alpha-assurance.fr", refs:260, rating:4.5,
    certifs:["ORIAS"], langues:["Français","Allemand","Anglais"],
    tag:"Courtage en assurance des entreprises.",
    seek:["TPE-PME","Experts-comptables"], offer:["RC pro","Multirisque","Prévoyance collective"],
    desc:"Cabinet de courtage indépendant. On construit des couvertures sur mesure et on négocie pour vous auprès des assureurs.", rel:"none" }),
  seed({ id:14, name:"Studio Onde", sector:"Média & Audiovisuel", loc:"Nice", size:"9 pers.", emp:"1–10",
    founded:2018, ca:"< 500 k€", dispo:"Complet", web:"studio-onde.fr", refs:58, rating:4.8,
    certifs:[], langues:["Français","Anglais","Italien"],
    tag:"Production vidéo et motion design pour les marques.",
    seek:["Agences de com","Annonceurs"], offer:["Films de marque","Motion design","Captation événement"],
    desc:"Studio de production niçois. Du concept au montage, on raconte les marques en image, avec une vraie exigence esthétique.", rel:"none" }),
  seed({ id:15, name:"Terroir Direct", sector:"Agroalimentaire", loc:"Angers", size:"26 pers.", emp:"11–50",
    founded:2013, ca:"2–10 M€", dispo:"Disponible", web:"terroir-direct.fr", refs:145, rating:4.6,
    certifs:["Bio","HVE"], langues:["Français","Anglais"],
    tag:"Grossiste en produits locaux pour la restauration.",
    seek:["Restaurateurs","Traiteurs","Épiceries"], offer:["Approvisionnement local","Logistique du frais"],
    desc:"Plateforme d'approvisionnement en circuit court. On relie producteurs de l'Ouest et professionnels de la restauration.", rel:"none" }),
  seed({ id:16, name:"Form'Action", sector:"Éducation & Formation", loc:"Rennes", size:"14 pers.", emp:"11–50",
    founded:2016, ca:"500 k–2 M€", dispo:"Disponible", web:"formaction.fr", refs:200, rating:4.7,
    certifs:["Qualiopi"], langues:["Français","Anglais"],
    tag:"Formation professionnelle et montée en compétences.",
    seek:["Entreprises","OPCO","RH"], offer:["Formation métiers","Bilan de compétences","Coaching"],
    desc:"Organisme de formation certifié Qualiopi. Des parcours sur mesure pour faire progresser vos équipes.", rel:"none" }),
];

const SVC_MAP={
  1:["Direction","Commercial","Technique","RH"], 2:["Direction","Commercial","Marketing & Com"],
  3:["Direction","Commercial","Logistique","Achats"], 4:["Direction","Commercial","RH"],
  5:["Direction","Comptabilité","RH"], 6:["Direction","Commercial","Marketing & Com"],
  7:["Direction","Commercial","Marketing & Com"], 8:["Direction","Commercial","Technique","Achats","Logistique"],
  9:["Direction","Commercial","Technique"], 10:["Direction","Commercial"],
  11:["Direction","Commercial","Technique","Achats"], 12:["Direction","Commercial","Logistique"],
  13:["Direction","Commercial","Comptabilité"], 14:["Direction","Commercial","Marketing & Com"],
  15:["Direction","Commercial","Logistique","Achats"], 16:["Direction","Commercial","RH"],
};
const DIRECTORY=DIRECTORY_RAW.map((c)=>{const svcs=SVC_MAP[c.id]||["Direction","Commercial"];return {...c,services:svcs,receptionPole:svcs.includes("Commercial")?"Commercial":(svcs.includes("Direction")?"Direction":svcs[0]),siret:`${400+c.id} ${100+c.id} ${200+c.id*7} 000${10+c.id}`,verifiedSiren:c.verified};});

/* ---- Blog central : actualités des entreprises ---- */
const authorOf=(id)=>{const c=DIRECTORY.find((x)=>x.id===id);return{name:c.name,color:c.color,sector:c.sector,loc:c.loc};};
const SEED_POSTS=[
  {id:1001,author:authorOf(3),title:"Relais Nord ouvre un second entrepôt à Lille",tag:"Expansion",date:"Il y a 2 jours",likes:12,liked:false,
   body:"Pour accompagner la croissance de nos partenaires e-commerçants, nous inaugurons 2000 m² supplémentaires et deux nouvelles lignes de préparation de commandes."},
  {id:1002,author:authorOf(6),title:"Nouveau format : audit d'acquisition en 5 jours",tag:"Offre",date:"Il y a 3 jours",likes:8,liked:false,
   body:"On lance un audit express pour les PME qui veulent y voir clair sur leurs canaux d'acquisition avant d'investir. Résultats concrets, sans engagement."},
  {id:1003,author:authorOf(9),title:"Solstice Énergie certifié RGE QualiPV pour 2026",tag:"Certification",date:"Il y a 5 jours",likes:19,liked:false,
   body:"Notre équipe conserve sa certification pour une année de plus — un gage de qualité pour tous nos chantiers photovoltaïques auprès des entreprises."},
  {id:1004,author:authorOf(2),title:"Retour sur trois refontes de marque ce trimestre",tag:"Portfolio",date:"Il y a 1 semaine",likes:24,liked:false,
   body:"Trois identités livrées ce trimestre. On partage les coulisses : recherche typographique, palette, déclinaisons. Merci à nos partenaires studios web."},
  {id:1005,author:authorOf(12),title:"Maison Gaultier recrute un chef de partie",tag:"Recrutement",date:"Il y a 1 semaine",likes:6,liked:false,
   body:"On agrandit l'équipe pour la saison des séminaires. Si vous connaissez un profil passionné et attaché au local, mettez-nous en relation !"},
];

/* ---- Mur de besoins ---- */
const SEED_NEEDS=[
  {id:2001,companyId:3,title:"Nous cherchons des e-commerçants pour du stockage et de la préparation de commandes",sought:"Commerce & Distribution",loc:"Lille",date:"Il y a 1 jour",responses:3},
  {id:2002,companyId:6,title:"Agence de com cherche un studio de développement pour référer ses clients",sought:"Tech & Dév",loc:"Bordeaux",date:"Il y a 2 jours",responses:5},
  {id:2003,companyId:9,title:"Recherche bureaux d'études / BTP pour nos projets photovoltaïques",sought:"BTP & Construction",loc:"Montpellier",date:"Il y a 3 jours",responses:1},
  {id:2004,companyId:12,title:"Traiteur cherche des agences événementielles partenaires",sought:"Événementiel",loc:"Lyon",date:"Il y a 4 jours",responses:2},
  {id:2005,companyId:16,title:"Organisme de formation cherche des entreprises pour leurs plans de formation",sought:"RH",loc:"Rennes",date:"Il y a 5 jours",responses:4},
];

/* ---- Offres d'abonnement (tarifs fictifs) ---- */
const PLANS=[
  {id:"gratuit",name:"Découverte",monthly:0,annual:0,credits:5,tagline:"Pour tester et rejoindre le réseau, sans carte bancaire.",
   features:[{t:"Fiche entreprise + badge SIREN",ok:true},{t:"Annuaire, carte & score d'affinité",ok:true},{t:"5 démarchages (non renouvelables)",ok:true},{t:"Messagerie de base + Bibliothèque",ok:true},
     {t:"Mur de besoins (publication)",ok:false},{t:"Chat interne, Emailing & actualités",ok:false}]},
  {id:"essentiel",name:"Pro",monthly:19,annual:182,credits:null,tagline:"Pour prospecter activement et être trouvé.",
   features:[{t:"Tout Découverte",ok:true},{t:"Démarchages illimités",ok:true},{t:"Mur de besoins + recommandations",ok:true},{t:"Messagerie cloisonnée, visio & chat interne",ok:true},
     {t:"Collaboration (devis & documents)",ok:true},{t:"Publication d'actualités (blog)",ok:false}]},
  {id:"pro",name:"Business",monthly:39,annual:374,credits:null,tagline:"Pour la visibilité et les équipes.",best:true,
   features:[{t:"Tout Pro",ok:true},{t:"Emailing illimité + listes de diffusion sur-mesure",ok:true},{t:"Actualités avec photos, republication & mise en avant",ok:true},{t:"Visio de groupe multi-services + tableau de bord avancé",ok:true},
     {t:"Badge « Entreprise vérifiée » + priorité dans l'annuaire",ok:true},{t:"Accès illimités + journal, 2FA & support prioritaire",ok:true}]},
];

function Mark(){return(<svg className="mark" viewBox="0 0 32 32" fill="none"><rect x="1" y="1" width="30" height="30" rx="9" fill="#0F1826"/><path d="M11 20.5a4.5 4.5 0 0 1 0-9h2.2M21 11.5a4.5 4.5 0 0 1 0 9h-2.2M13 16h6" stroke="#16A886" strokeWidth="2.1" strokeLinecap="round"/></svg>);}
const Check=(p)=><svg viewBox="0 0 16 16" width="14" height="14" {...p}><path d="M13 4L6 12L3 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
const XI=(p)=><svg viewBox="0 0 16 16" width="14" height="14" {...p}><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;

function Ring({score,size=52}){
  const r=size/2-4,c=2*Math.PI*r;
  const col=score>=82?"#0F846B":score>=68?"#D98A12":"#8A929C";
  return(<svg width={size} height={size} style={{display:"block",flex:"0 0 auto"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#D4E8E1" strokeWidth="4"/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4" strokeLinecap="round"
      strokeDasharray={c} strokeDashoffset={c-(c*score)/100} transform={`rotate(-90 ${size/2} ${size/2})`}
      style={{transition:"stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)"}}/>
    <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter" fontWeight="700" fontSize="14" fill={col}>{score}</text>
  </svg>);
}

const logoImg=(o)=>o&&o.logo?<img src={o.logo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(o?o.name[0]:"?");
const fmtDate=(d)=>{try{const dt=new Date(d+"T00:00:00");if(isNaN(dt))return d;return dt.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});}catch(e){return d;}};
const buildEmailSkeleton=(subject)=>`<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F5F4F0;font-family:Arial,sans-serif;">
    {{HEADER}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
      <tr><td style="padding:32px;">
        <p>Bonjour [Prénom],</p>
        <p>${subject||"Votre message ici."}</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="[REDIRECT_URL]" style="background:#0F846B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Découvrir</a>
        </p>
        <p style="font-size:12px;color:#8A929C;">Si l'email ne s'affiche pas correctement, <a href="[VIEW_ONLINE]">consultez-le en ligne</a>.</p>
      </td></tr>
    </table>
    {{FOOTER}}
  </body>
</html>`;

const mapCompanyRow=(c)=>{
  const plan=PLANS.find((p)=>p.id===c.plan_id)||PLANS[0];
  return {
    id:c.id,name:c.name,sector:c.sector||"Non précisé",loc:c.loc||"France",emp:c.emp,
    size:(c.emp||"")+" pers.",founded:c.founded||"—",ca:c.ca,dispo:c.dispo,web:c.web||"—",
    refs:0,rating:5.0,plan:plan.name,planId:plan.id,billing:c.billing||"Mensuelle",
    membre:plan.id==="pro",logo:c.logo_url,color:c.color||"#0F846B",desc:c.description||"Présentation à compléter.",
    seek:c.seek||[],offer:c.offer||[],certifs:c.certifs||[],langues:c.langues&&c.langues.length?c.langues:["Français"],
    services:c.services&&c.services.length?c.services:["Direction","Commercial"],
    receptionPole:c.reception_pole||"Direction",siret:c.siret||"",verifiedSiren:!!c.verified_siren,verified:!!c.verified,
  };
};
const mapProfileRow=(p,email)=>({id:p.id,name:p.full_name||"Vous",role:p.role||"Direction",status:p.status||"active",email:email||""});
const mapDirectoryCompany=(row)=>{const base=mapCompanyRow(row);return {...base,tag:base.desc,rel:"none",channels:{}};};
const isRealCompany=(c)=>!!c&&typeof c.id==="string";

const FIRST_NAMES=["Jérôme","Kevin","Nicolas","Anthony","Philippe","Yann","Camille","Julie","Sophie","Thomas","Marion","Alexandre","Claire","Mathieu","Laura","Vincent"];
const LAST_NAMES=["Lesoudeer","Simon","Perennes","Garcia","Desaize","Parcheminier","Moreau","Girard","Lefebvre","Roussel","Faure","Marchand","Guillou","Le Goff","Bertin"];
const slugify=(s)=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"");
const genContacts=(c)=>{
  const domain=c.web||`${slugify(c.name)}.fr`;
  const n=1+Math.floor(Math.random()*2);
  const used=new Set();const out=[];
  while(out.length<n){
    const first=FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)];
    const last=LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)];
    const key=first+last;if(used.has(key))continue;used.add(key);
    out.push({name:`${first} ${last}`,email:`${slugify(first)}.${slugify(last)}@${domain}`});
  }
  return out;
};

function FranceMap({companies,onOpen,onProspect,aff}){
  const [scale,setScale]=useState(1);
  const [tx,setTx]=useState(0);
  const [ty,setTy]=useState(0);
  const [sel,setSel]=useState(null);
  const svgRef=useRef(null);
  const drag=useRef(null);

  const pts=useMemo(()=>{
    const byCity={};companies.forEach((c)=>{if(CITIES[c.loc])(byCity[c.loc]=byCity[c.loc]||[]).push(c);});
    const arr=[];Object.keys(byCity).forEach((city)=>{const g=byCity[city];const[lat,lng]=CITIES[city];const[bx,by]=project(lat,lng);
      g.forEach((c,i)=>{let ox=0,oy=0;if(g.length>1){const a=(i/g.length)*2*Math.PI;ox=Math.cos(a)*9;oy=Math.sin(a)*9;}arr.push({c,x:bx+ox,y:by+oy});});});
    return arr;
  },[companies]);

  const clusters=useMemo(()=>{
    const thr=30/scale;const used=new Array(pts.length).fill(false);const out=[];
    for(let i=0;i<pts.length;i++){if(used[i])continue;const grp=[pts[i]];used[i]=true;
      for(let j=i+1;j<pts.length;j++){if(used[j])continue;if(Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y)<thr){grp.push(pts[j]);used[j]=true;}}
      const cx=grp.reduce((s,p)=>s+p.x,0)/grp.length,cy=grp.reduce((s,p)=>s+p.y,0)/grp.length;
      out.push({x:cx,y:cy,items:grp});}
    return out;
  },[pts,scale]);

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const applyZoom=(f,cx,cy)=>{const ns=clamp(scale*f,1,6.5);const k=ns/scale;setTx(cx-(cx-tx)*k);setTy(cy-(cy-ty)*k);setScale(ns);};

  useEffect(()=>{const el=svgRef.current;if(!el)return;
    const onWheel=(e)=>{e.preventDefault();const r=el.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width*MAPW;const my=(e.clientY-r.top)/r.height*MAPH;applyZoom(e.deltaY<0?1.16:1/1.16,mx,my);};
    el.addEventListener("wheel",onWheel,{passive:false});return ()=>el.removeEventListener("wheel",onWheel);
  });

  const moveDrag=(cx,cy)=>{if(!drag.current)return;const el=svgRef.current;const r=el.getBoundingClientRect();
    setTx(drag.current.tx+(cx-drag.current.x)/r.width*MAPW);setTy(drag.current.ty+(cy-drag.current.y)/r.height*MAPH);};
  useEffect(()=>{const mm=(e)=>moveDrag(e.clientX,e.clientY);const mu=()=>{drag.current=null;};
    window.addEventListener("mousemove",mm);window.addEventListener("mouseup",mu);
    return ()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",mu);};});

  const selPt=sel?pts.find((p)=>p.c.id===sel):null;
  const selC=selPt?selPt.c:null;
  const leftPct=selPt?((selPt.x*scale+tx)/MAPW)*100:0;
  const topPct=selPt?((selPt.y*scale+ty)/MAPH)*100:0;
  const below=topPct<32;

  return(
    <div className="mapsvg">
      <svg ref={svgRef} viewBox={`0 0 ${MAPW} ${MAPH}`}
        onMouseDown={(e)=>{drag.current={x:e.clientX,y:e.clientY,tx,ty};}}
        onTouchStart={(e)=>{if(e.touches[0])drag.current={x:e.touches[0].clientX,y:e.touches[0].clientY,tx,ty};}}
        onTouchMove={(e)=>{if(e.touches[0])moveDrag(e.touches[0].clientX,e.touches[0].clientY);}}
        onTouchEnd={()=>{drag.current=null;}}>
        <rect x="0" y="0" width={MAPW} height={MAPH} fill="var(--sea)"/>
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>
          <path d={FRANCE_PATH} fill="#fff" stroke="#d9d5cb" strokeWidth={1.4/scale} strokeLinejoin="round"/>
          {clusters.map((cl,idx)=>{
            if(cl.items.length>1){
              return(
                <g key={"cl"+idx} transform={`translate(${cl.x},${cl.y}) scale(${1/scale})`} style={{cursor:"pointer"}}
                   onMouseDown={(e)=>e.stopPropagation()} onClick={()=>applyZoom(1.9,cl.x*scale+tx,cl.y*scale+ty)}>
                  <circle r="18" fill="#0F1826" opacity="0.9"/>
                  <circle r="18" fill="none" stroke="#fff" strokeWidth="2.5"/>
                  <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontFamily="Inter" fontWeight="700" fontSize="14">{cl.items.length}</text>
                </g>
              );
            }
            const m=cl.items[0];
            return(
              <g key={m.c.id} transform={`translate(${cl.x},${cl.y}) scale(${1/scale})`} style={{cursor:"pointer"}}
                 onMouseDown={(e)=>e.stopPropagation()} onClick={()=>setSel(m.c.id)}>
                <circle r="14" fill="transparent"/>
                <circle r={sel===m.c.id?9:8} fill={m.c.color} stroke="#fff" strokeWidth="2.4"/>
                {scale>1.9&&(
                  <g className="maplabel" transform="translate(12,-9)">
                    <rect width={m.c.name.length*6.4+14} height="19" rx="5"/>
                    <text x="7" y="13.5" fontSize="11.5" fontWeight="600" fontFamily="Inter">{m.c.name}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="mapctrls">
        <button onClick={()=>applyZoom(1.4,MAPW/2,MAPH/2)} aria-label="Zoom avant">+</button>
        <button onClick={()=>applyZoom(1/1.4,MAPW/2,MAPH/2)} aria-label="Zoom arrière">−</button>
        <button onClick={()=>{setScale(1);setTx(0);setTy(0);}} aria-label="Réinitialiser" style={{fontSize:14}}>⤾</button>
      </div>

      {selC&&(
        <div className="mapop" style={{left:leftPct+"%",top:topPct+"%",transform:below?"translate(-50%,18px)":"translate(-50%,calc(-100% - 18px))"}}>
          <button className="opclose" onClick={()=>setSel(null)}><XI/></button>
          <div className="oph">
            <div className="logo" style={{background:selC.color,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bricolage Grotesque",fontWeight:800,color:"#fff"}}>{logoImg(selC)}</div>
            <div><b>{selC.name}{selC.verified&&<Check className="verif"/>}</b><small>{selC.sector} · {selC.loc}</small></div>
          </div>
          <div className="opaff">{aff(selC)}% d'affinité</div>
          <div className="opact">
            <button className="btn sm" onClick={()=>{onOpen(selC.id);setSel(null);}}>Voir la fiche</button>
            {selC.rel==="none"&&<button className="btn-ghost sm" onClick={()=>{onProspect(selC);setSel(null);}}>Démarcher</button>}
          </div>
          {!below&&<div className="maparrow"/>}
        </div>
      )}
    </div>
  );
}

function VisioRoom({me,company,services,onEnd}){
  const [sec,setSec]=useState(0);
  const [mic,setMic]=useState(true);
  const [cam,setCam]=useState(true);
  const [screen,setScreen]=useState(false);
  useEffect(()=>{const t=setInterval(()=>setSec((s)=>s+1),1000);return ()=>clearInterval(t);},[]);
  const mm=String(Math.floor(sec/60)).padStart(2,"0");const ss=String(sec%60).padStart(2,"0");
  const svcs=services||[];
  const parts=[...svcs.map((s)=>({name:company.name,color:company.color,logo:company.logo,label:s})),{name:me.name,color:me.color,logo:me.logo,label:"Vous",isMe:true}];
  const cols=parts.length<=1?1:parts.length<=4?2:3;
  const ic={
    mic:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    micoff:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 9V6a3 3 0 0 1 5.6-1.5M15 12V9M6 11a6 6 0 0 0 9.5 4.9M12 17v4M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    cam:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    camoff:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h9a2 2 0 0 1 2 2v3m0 3v.5A1.5 1.5 0 0 1 12.5 16H5a2 2 0 0 1-2-2V8M15 10l6-3v10l-4-2M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    screen:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    hang:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 14c4-3 12-3 16 0 .6.5 1 .2 1.2-.4l.6-2c.2-.7-.1-1.3-.8-1.7C18 7.5 6 7.5 3 9.9c-.7.4-1 1-.8 1.7l.6 2c.2.6.6.9 1.2.4z" fill="currentColor"/></svg>,
  };
  return(
    <div className="visio">
      <div className="vishead">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="#e8eaee" strokeWidth="1.8"/><path d="M15 10l6-3v10l-6-3" stroke="#e8eaee" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        Visio · {svcs.join(", ")} · {me.name} ↔ {company.name}
        <div className="vistimer"><span className="rec"/>{mm}:{ss}</div>
      </div>
      <div className="vistiles" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}>
        {parts.map((p,i)=>(
          <div key={i} className="vistile" style={{background:`linear-gradient(140deg, ${p.color}, ${p.color}99)`}}>
            <div className="vav" style={{background:p.color}}>{logoImg(p)}</div>
            <div className="vname">{p.name} · {p.label}</div>
            {p.isMe&&!cam&&<div className="voff">Caméra désactivée</div>}
          </div>
        ))}
      </div>
      <div className="visctrls">
        <button className={mic?"":"off"} onClick={()=>setMic(!mic)} aria-label="Micro">{mic?ic.mic:ic.micoff}</button>
        <button className={cam?"":"off"} onClick={()=>setCam(!cam)} aria-label="Caméra">{cam?ic.cam:ic.camoff}</button>
        <button className={screen?"off":""} onClick={()=>setScreen(!screen)} aria-label="Partage d'écran">{ic.screen}</button>
        <button className="hang" onClick={()=>onEnd(sec)} aria-label="Raccrocher">{ic.hang}</button>
      </div>
      <div className="vissim">Visio simulée — maquette. Dans la vraie application, la vidéo passerait par un service temps réel (WebRTC, Whereby, Daily…).</div>
    </div>
  );
}

const REPLIES = [
  "Bonne question — on regarde ça de notre côté et on revient vers vous rapidement.",
  "Ça nous intéresse. On peut échanger en visio cette semaine ?",
  "Parfait, merci du message ! Je transmets à l'équipe.",
  "Tout à fait aligné avec ce qu'on cherche. On avance ?",
];
const INTERNAL_REPLIES = [
  "Reçu, je regarde ça et je reviens vers toi.",
  "Top, je m'en occupe cet après-midi.",
  "On en parle au point d'équipe ?",
  "Noté, merci pour l'info !",
  "Je valide de mon côté, ça me va.",
];

export default function Maillon(){
  const [me,setMe]=useState(null);
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [authMode,setAuthMode]=useState("signin");
  const [authError,setAuthError]=useState("");
  const [authBusy,setAuthBusy]=useState(false);
  const [obStep,setObStep]=useState(0);
  const [form,setForm]=useState({name:"",sector:"",loc:"",emp:EMP[0],color:COLORS[0],radius:50,
    desc:"",seek:"",offer:"",founded:"",ca:CA[0],dispo:DISPO[0],web:"",certifs:"",langues:"",plan:"gratuit",billing:"Mensuelle",logo:null,services:["Direction","Commercial","Marketing & Com","RH","Comptabilité"],receptionPole:"Direction",siret:""});
  const [view,setView]=useState("discover");
  const [mode,setMode]=useState("list");           // list | map
  const [companies,setCompanies]=useState(DIRECTORY);
  const [q,setQ]=useState("");
  const [fSector,setFSector]=useState("");
  const [fRadius,setFRadius]=useState(0);
  const [fEmp,setFEmp]=useState("");
  const [fVerif,setFVerif]=useState(false);
  const [sort,setSort]=useState("aff");
  const [prospect,setProspect]=useState(null);
  const [prospectsUsed,setProspectsUsed]=useState(0);
  const [limitOpen,setLimitOpen]=useState(false);
  const [pmsg,setPmsg]=useState("");
  const [openC,setOpenC]=useState(null);
  const [hoverM,setHoverM]=useState(null);
  const [activeConv,setActiveConv]=useState(5);
  const [activeService,setActiveService]=useState("Direction");
  const [visio,setVisio]=useState(null);
  const [visioSetup,setVisioSetup]=useState(false);
  const [visioSvcs,setVisioSvcs]=useState([]);
  const [team,setTeam]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [loginEmail,setLoginEmail]=useState("");
  const [loginPwd,setLoginPwd]=useState("");
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteRole,setInviteRole]=useState("");
  const [access,setAccess]=useState({admins:["Direction"],grants:{}});
  const [accessOpen,setAccessOpen]=useState(false);
  const [auditLog,setAuditLog]=useState([]);
  const [history,setHistory]=useState([]);
  const [notifEmail,setNotifEmail]=useState(true);
  const [notifPush,setNotifPush]=useState(false);
  const [twofa,setTwofa]=useState(false);
  const [collab,setCollab]=useState(null);
  const [collabForm,setCollabForm]=useState({subject:"",budget:"",name:""});
  const [schedForm,setSchedForm]=useState({date:"",time:""});
  const [draft,setDraft]=useState("");
  const [posts,setPosts]=useState(SEED_POSTS);
  const [composeOpen,setComposeOpen]=useState(false);
  const [postForm,setPostForm]=useState({title:"",body:"",tag:"",photo:null});
  const [adhesion,setAdhesion]=useState(false);
  const [needs,setNeeds]=useState(SEED_NEEDS);
  const [needOpen,setNeedOpen]=useState(false);
  const [needForm,setNeedForm]=useState({title:"",sought:SECTORS[0],loc:""});
  const [needFilter,setNeedFilter]=useState("all");
  const [notifOpen,setNotifOpen]=useState(false);
  const notifRef=useRef(null);
  const [toasts,setToasts]=useState([]);
  const [libQuery,setLibQuery]=useState("");
  const [emailOptIn,setEmailOptIn]=useState({});
  const [emailAddrByCompany,setEmailAddrByCompany]=useState({});
  const [campaigns,setCampaigns]=useState([]);
  const [campaignOpen,setCampaignOpen]=useState(false);
  const [campaignForm,setCampaignForm]=useState({name:"",subject:"",body:"",list:"all",html:"",needsRsvp:false});
  const [expandedCampaignId,setExpandedCampaignId]=useState(null);
  const [distLists,setDistLists]=useState([]);
  const [expandedListId,setExpandedListId]=useState(null);
  const [listOpen,setListOpen]=useState(false);
  const [listForm,setListForm]=useState({name:"",companyIds:[]});
  const [selectedIds,setSelectedIds]=useState([]);
  const streamRef=useRef(null);
  const teamStreamRef=useRef(null);
  const [internalChat,setInternalChat]=useState([]);
  const [internalMsg,setInternalMsg]=useState("");
  const [internalDMs,setInternalDMs]=useState({});
  const [activeTeammateId,setActiveTeammateId]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatPane,setChatPane]=useState("list");
  const dmKey=(a,b)=>[a,b].sort((x,y)=>x-y).join("-");

  const toast=(t)=>{const id=Math.random();setToasts((x)=>[...x,{id,t}]);setTimeout(()=>setToasts((x)=>x.filter((y)=>y.id!==id)),3200);};
  const logEvent=(text)=>setAuditLog((l)=>[{id:Date.now()+Math.random(),text,at:new Date().toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})},...l].slice(0,60));
  const logHist=(text,kind)=>setHistory((h)=>[{id:Date.now()+Math.random(),text,kind:kind||"info",at:new Date().toLocaleString("fr-FR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})},...h].slice(0,80));
  const histIcon=(k)=>({
    visio:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    send:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    accept:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    need:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    collab:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    info:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 8v.4M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  }[k]||null);
  const setReceptionPole=(pole)=>{setMe((m)=>({...m,receptionPole:pole}));logEvent(`Pôle de réception changé → ${pole}`);toast(`Pôle de réception : ${pole}`);};
  const toggleAccount=(id)=>{setTeam((ts)=>ts.map((x)=>x.id===id?{...x,status:x.status==="disabled"?"active":"disabled"}:x));const m=team.find((x)=>x.id===id);logEvent(`Compte ${m?m.name:""} ${m&&m.status==="disabled"?"réactivé":"désactivé"}`);};
  const postCollab=()=>{if(!active||!mSvc)return;if(collab==="quote"){if(!collabForm.subject.trim())return;pushCh(active.id,mSvc,{from:"me",kind:"quote",subject:collabForm.subject.trim(),budget:collabForm.budget.trim()});logHist(`Devis demandé à ${active.name}`,"collab");toast("Demande de devis envoyée");}else if(collab==="doc"){if(!collabForm.name.trim())return;pushCh(active.id,mSvc,{from:"me",kind:"doc",name:collabForm.name.trim()});logHist(`Document partagé avec ${active.name}`,"collab");toast("Document partagé");}setCollab(null);setCollabForm({subject:"",budget:"",name:""});};

  const incoming=companies.filter((c)=>c.rel==="incoming");
  const sent=companies.filter((c)=>c.rel==="sent");
  const connected=companies.filter((c)=>c.rel==="connected");
  const regions=useMemo(()=>[...new Set(companies.map((c)=>c.loc))].sort(),[companies]);

  useEffect(()=>{if(streamRef.current)streamRef.current.scrollTop=streamRef.current.scrollHeight;},[activeConv,activeService,companies]);
  useEffect(()=>{if(teamStreamRef.current)teamStreamRef.current.scrollTop=teamStreamRef.current.scrollHeight;},[internalChat,internalDMs,activeTeammateId]);
  const sendInternalMsg=()=>{
    if(!internalMsg.trim()||!currentUser)return;
    const text=internalMsg.trim();const ts=Date.now();
    if(activeTeammateId==null){
      const msg={id:ts,authorId:currentUser.id,authorName:currentUser.name,text};
      setInternalChat((c)=>[...c,msg]);
      const others=team.filter((m)=>m.status==="active"&&m.id!==currentUser.id);
      if(others.length&&Math.random()<0.5){
        const replier=others[Math.floor(Math.random()*others.length)];
        setTimeout(()=>{
          const reply={id:ts+1,authorId:replier.id,authorName:replier.name,text:INTERNAL_REPLIES[Math.floor(Math.random()*INTERNAL_REPLIES.length)]};
          setInternalChat((c)=>[...c,reply]);
          toast(`💬 Nouveau message de ${replier.name} (Général)`);
        },1800+Math.random()*2200);
      }
    }else{
      const other=team.find((m)=>m.id===activeTeammateId);
      const key=dmKey(currentUser.id,activeTeammateId);
      const msg={id:ts,authorId:currentUser.id,authorName:currentUser.name,text};
      setInternalDMs((d)=>({...d,[key]:[...(d[key]||[]),msg]}));
      if(other&&other.status==="active"&&Math.random()<0.6){
        setTimeout(()=>{
          const reply={id:ts+1,authorId:other.id,authorName:other.name,text:INTERNAL_REPLIES[Math.floor(Math.random()*INTERNAL_REPLIES.length)]};
          setInternalDMs((d)=>({...d,[key]:[...(d[key]||[]),reply]}));
          toast(`💬 Nouveau message de ${other.name}`);
        },1800+Math.random()*2200);
      }
    }
    setInternalMsg("");
  };
  useEffect(()=>{const k=(e)=>{if(e.key==="Escape"){setProspect(null);setOpenC(null);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);

  const hydrateFromSession=async(sess)=>{
    setSession(sess);
    if(!sess){setMe(null);setCurrentUser(null);setTeam([]);setAuthReady(true);return;}
    const {data:profile}=await supabase.from("profiles").select("*").eq("id",sess.user.id).single();
    if(!profile||!profile.company_id){
      setMe(null);setCurrentUser(profile?mapProfileRow(profile,sess.user.email):null);setTeam([]);setAuthReady(true);return;
    }
    const [{data:company},{data:teammates}]=await Promise.all([
      supabase.from("companies").select("*").eq("id",profile.company_id).single(),
      supabase.from("profiles").select("*").eq("company_id",profile.company_id),
    ]);
    if(!company){setMe(null);setCurrentUser(mapProfileRow(profile,sess.user.email));setTeam([]);setAuthReady(true);return;}
    const mappedCompany=mapCompanyRow(company);
    setMe(mappedCompany);
    setCurrentUser(mapProfileRow(profile,sess.user.email));
    setTeam((teammates||[]).map((p)=>mapProfileRow(p,p.id===sess.user.id?sess.user.email:"")));
    setAccess({admins:[mappedCompany.receptionPole],grants:{}});
    setAuthReady(true);
  };

  useEffect(()=>{
    let active=true;
    supabase.auth.getSession().then(({data})=>{if(active)hydrateFromSession(data.session);});
    const {data:sub}=supabase.auth.onAuthStateChange((_event,sess)=>{hydrateFromSession(sess);});
    return ()=>{active=false;sub.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{if(!notifOpen)return;const onDown=(e)=>{if(notifRef.current&&!notifRef.current.contains(e.target))setNotifOpen(false);};document.addEventListener("mousedown",onDown);return()=>document.removeEventListener("mousedown",onDown);},[notifOpen]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("companies").select("*").neq("id",me.id).then(({data,error})=>{
      if(!active||error||!data)return;
      const real=data.map(mapDirectoryCompany);
      setCompanies((cs)=>{
        const existing=new Set(cs.map((c)=>c.id));
        const fresh=real.filter((c)=>!existing.has(c.id));
        return fresh.length?[...fresh,...cs]:cs;
      });
      supabase.from("connections").select("*").or(`from_company_id.eq.${me.id},to_company_id.eq.${me.id}`).then(({data:conns})=>{
        if(!active||!conns)return;
        conns.forEach((row)=>{
          const otherId=row.from_company_id===me.id?row.to_company_id:row.from_company_id;
          let patch=null;
          if(row.status==="pending"){
            patch=row.from_company_id===me.id?{rel:"sent",sentTo:row.service}:{rel:"incoming",reqMsg:row.message};
          }else if(row.status==="accepted"){patch={rel:"connected"};}
          else if(row.status==="declined"){patch={rel:"declined"};}
          if(patch)update(otherId,{...patch,connectionId:row.id});
        });
        conns.forEach((row)=>{
          if(row.status==="accepted"&&row.from_company_id===me.id&&row.emailing_opt_in){
            update(row.to_company_id,{emailingConsent:true,emailingContacts:(row.emailing_addresses||[]).map((addr)=>({name:addr.split("@")[0],email:addr}))});
          }
        });
        const accepted=conns.filter((c)=>c.status==="accepted");
        if(!accepted.length)return;
        const otherOf={};accepted.forEach((row)=>{otherOf[row.id]=row.from_company_id===me.id?row.to_company_id:row.from_company_id;});
        supabase.from("messages").select("*").in("connection_id",accepted.map((c)=>c.id)).order("created_at",{ascending:true}).then(({data:msgs})=>{
          if(!active||!msgs)return;
          const byCompany={};
          msgs.forEach((m)=>{
            const otherId=otherOf[m.connection_id];if(!otherId)return;
            byCompany[otherId]=byCompany[otherId]||{};
            (byCompany[otherId][m.service]=byCompany[otherId][m.service]||[]).push({from:m.sender_company_id===me.id?"me":"them",text:m.body,id:m.id});
          });
          Object.keys(byCompany).forEach((otherId)=>update(otherId,{channels:byCompany[otherId]}));
        });
      });
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("messages-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},(payload)=>{
        const m=payload.new;
        if(m.sender_company_id===me.id)return;
        setCompanies((cs)=>cs.map((c)=>{
          if(c.connectionId!==m.connection_id)return c;
          const arr=(c.channels&&c.channels[m.service])||[];
          return {...c,channels:{...(c.channels||{}),[m.service]:[...arr,{from:"them",text:m.body,id:m.id}]}};
        }));
        toast("💬 Nouveau message reçu");
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("campaigns").select("*").eq("company_id",me.id).order("created_at",{ascending:false}).then(({data})=>{
      if(!active||!data)return;
      setCampaigns(data.map((row)=>({id:row.id,name:row.name,subject:row.subject,body:row.body,html:row.html,date:"—",recipients:(row.recipients||[]).map((r)=>r.name),rsvp:row.rsvp})));
    });
    supabase.from("distribution_lists").select("*").eq("company_id",me.id).order("created_at",{ascending:false}).then(({data})=>{
      if(!active||!data)return;
      setDistLists(data.map((row)=>({id:row.id,name:row.name,companyIds:row.company_ids||[]})));
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  const update=(id,patch)=>setCompanies((cs)=>cs.map((c)=>c.id===id?{...c,...patch}:c));
  const addLog=(id,entry)=>setCompanies((cs)=>cs.map((c)=>c.id===id?{...c,log:[...(c.log||[]),entry]}:c));

  const affinity=(c)=>{
    if(!me)return 70;
    const mineTxt=(me.seek.join(" ")+" "+me.offer.join(" ")+" "+me.sector).toLowerCase();
    const theirTxt=(c.offer.join(" ")+" "+c.seek.join(" ")+" "+c.sector+" "+c.tag).toLowerCase();
    let s=52;
    me.seek.forEach((k)=>{const w=k.toLowerCase().split(" ")[0];if(w.length>2&&theirTxt.includes(w))s+=9;});
    c.seek.forEach((k)=>{const w=k.toLowerCase().split(" ")[0];if(w.length>2&&mineTxt.includes(w))s+=7;});
    if(c.sector!==me.sector)s+=6;
    if(c.loc===me.loc)s+=7;
    s+=Math.round((c.rating-4.4)*8);
    if(c.verified)s+=3;
    return Math.max(51,Math.min(97,Math.round(s)));
  };

  const onLogo=(e)=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const url=reader.result;const img=new Image();
      img.onload=()=>{
        let col=form.color;
        try{
          const cv=document.createElement("canvas");cv.width=16;cv.height=16;
          const ctx=cv.getContext("2d");ctx.drawImage(img,0,0,16,16);
          const d=ctx.getImageData(0,0,16,16).data;let r=0,g=0,b=0,n=0;
          for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
          if(n){col=`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`;}
        }catch(err){/* image cross-origin ou svg — on garde la couleur par défaut */}
        setForm((f)=>({...f,logo:url,color:col}));
      };
      img.onerror=()=>setForm((f)=>({...f,logo:url}));
      img.src=url;
    };
    reader.readAsDataURL(file);
  };

  const finishOnboarding=async()=>{
    if(!session){toast("Session expirée, reconnectez-vous.");return;}
    const chosen=PLANS.find((p)=>p.id===form.plan)||PLANS[0];
    const services=(form.services&&form.services.length)?form.services:["Direction","Commercial"];
    const receptionPole=services.includes(form.receptionPole)?form.receptionPole:(services.includes("Direction")?"Direction":(services[0]||"Direction"));
    const splitList=(s)=>s?s.split(",").map((x)=>x.trim()).filter(Boolean):[];
    setAuthBusy(true);
    const {data:company,error}=await supabase.from("companies").insert({
      name:form.name||"Mon Entreprise",sector:form.sector||"Non précisé",loc:form.loc||"France",emp:form.emp,
      founded:form.founded||null,ca:form.ca,dispo:form.dispo,web:form.web||null,siret:form.siret||null,
      verified_siren:!!form.siret.trim(),color:form.color,logo_url:form.logo||null,
      description:form.desc||"Présentation à compléter.",seek:splitList(form.seek),offer:splitList(form.offer),
      certifs:splitList(form.certifs),langues:form.langues?splitList(form.langues):["Français"],
      services,reception_pole:receptionPole,plan_id:chosen.id,billing:form.billing,
    }).select().single();
    if(error){setAuthBusy(false);toast("Erreur : "+error.message);return;}
    const {data:profile,error:profErr}=await supabase.from("profiles").update({
      company_id:company.id,full_name:form.name,role:receptionPole,status:"active",
    }).eq("id",session.user.id).select().single();
    setAuthBusy(false);
    if(profErr){toast("Erreur : "+profErr.message);return;}
    setMe(mapCompanyRow(company));
    setCurrentUser(mapProfileRow(profile,session.user.email));
    setTeam([mapProfileRow(profile,session.user.email)]);
    setAccess({admins:[receptionPole],grants:{}});
    setView("discover");toast("Votre page est en ligne");
    setProspectsUsed(0);
  };
  const updateRole=(id,r)=>{setTeam((ts)=>ts.map((x)=>x.id===id?{...x,role:r}:x));setCurrentUser((u)=>u&&u.id===id?{...u,role:r}:u);logEvent(`Rôle modifié → ${r}`);};
  const logout=async()=>{if(currentUser)logEvent(`Déconnexion — ${currentUser.name}`);await supabase.auth.signOut();setLoginEmail("");setLoginPwd("");setView("discover");};
  const sendInvite=(email,rl)=>{const e=(email||"").trim();if(!e||!/@/.test(e))return;const local=e.split("@")[0];const nm=local.split(/[._-]/).map((p)=>p?p[0].toUpperCase()+p.slice(1):p).join(" ");setTeam((ts)=>[...ts,{id:Date.now(),name:nm,email:e,role:rl,status:"invited"}]);logEvent(`Invitation envoyée à ${e} (${rl})`);toast(`Invitation envoyée à ${e}`);};

  const planCredits=()=>{const p=PLANS.find((x)=>x.id===(me&&me.planId));return p?p.credits:null;};
  const remaining=()=>{const c=planCredits();return c==null?null:Math.max(0,c-prospectsUsed);};
  const canProspect=()=>{const c=planCredits();return c==null||prospectsUsed<c;};
  const upgradeTo=(planId,billing)=>{const p=PLANS.find((x)=>x.id===planId);if(!p)return;setMe((m)=>({...m,plan:p.name,planId:p.id,billing:billing||(m&&m.billing)||"Mensuelle",membre:p.id==="pro"}));setLimitOpen(false);setAdhesion(false);toast(`Passage à l'offre ${p.name}`);};

  const openProspect=(c)=>{if(!canProspect()){setOpenC(null);setLimitOpen(true);return;}setProspect(c);setOpenC(null);
    setPmsg(`Bonjour ${c.name}, je suis ${(me&&me.name)||"une entreprise"} (${(me&&me.sector)||form.sector}). `+
      `On aimerait explorer une collaboration autour de ${(c.seek&&c.seek[0])||"nos activités"}. Ouvert à en discuter ?`);};
  const sendProspect=()=>{
    const c=prospect;const target=c.receptionPole||"Direction";setProspectsUsed((n)=>n+1);update(c.id,{rel:"sent",sentTo:target});setProspect(null);logHist(`Demande de mise en relation envoyée à ${c.name} (pôle ${target})`,"send");toast(`Demande envoyée à ${c.name} · pôle ${target}`);
    if(isRealCompany(c)&&isRealCompany(me)){
      supabase.from("connections").insert({from_company_id:me.id,to_company_id:c.id,status:"pending",service:target,message:pmsg}).select().single()
        .then(({data,error})=>{if(!error&&data)update(c.id,{connectionId:data.id});});
      return;
    }
    setTimeout(()=>{
      const common=commonServices(c);const svc=common.includes(target)?target:(common[0]||"Direction");
      const emailingConsent=Math.random()<0.65;
      update(c.id,{rel:"connected",emailingConsent,channels:{[svc]:[{from:"sys",text:`${c.name} a accepté votre mise en relation · service ${svc}.`},
        {from:"them",text:REPLIES[Math.floor(Math.random()*REPLIES.length)]}]}});
      logHist(`${c.name} a accepté votre mise en relation`,"accept");toast(`✓ ${c.name} a accepté la mise en relation`);
      setTimeout(()=>{
        if(emailingConsent){update(c.id,{emailingContacts:genContacts(c)});logHist(`${c.name} a accepté de recevoir vos campagnes d'emailing`,"info");toast(`✓ ${c.name} a accepté de recevoir vos campagnes d'emailing`);}
        else{logHist(`${c.name} n'a pas souhaité recevoir vos campagnes d'emailing`,"info");}
      },1400);
    },2600);
  };

  const accept=(c,emailingOptIn,emailingAddresses)=>{const pole=(me&&me.receptionPole)||"Direction";const common=commonServices(c);const svc=common.includes(pole)?pole:(common[0]||"Direction");const addrs=emailingOptIn?(emailingAddresses||[]).map((e)=>e.trim()).filter(Boolean):[];update(c.id,{rel:"connected",emailingOptIn:!!emailingOptIn,emailingAddresses:addrs,channels:{[svc]:[{from:"sys",text:`Vous avez accepté la demande de ${c.name} · service ${svc}.`},{from:"them",text:c.reqMsg}]}});setActiveConv(c.id);setActiveService(svc);logEvent(`Mise en relation acceptée — ${c.name}`);logHist(`Vous avez accepté la demande de ${c.name}${emailingOptIn?" · abonné à l'emailing":""}`,"accept");toast(`Connecté avec ${c.name}`);
    if(isRealCompany(c)){
      if(c.connectionId)supabase.from("connections").update({status:"accepted",service:svc,emailing_opt_in:!!emailingOptIn,emailing_addresses:addrs,responded_at:new Date().toISOString()}).eq("id",c.connectionId).then(()=>{});
      return;
    }
    setTimeout(()=>{
      const emailingConsent=Math.random()<0.65;
      update(c.id,{emailingConsent,emailingContacts:emailingConsent?genContacts(c):undefined});
      if(emailingConsent){logHist(`${c.name} a accepté de recevoir vos campagnes d'emailing`,"info");toast(`✓ ${c.name} a accepté de recevoir vos campagnes d'emailing`);}
      else{logHist(`${c.name} n'a pas souhaité recevoir vos campagnes d'emailing`,"info");}
    },1800);
  };
  const decline=(c)=>{update(c.id,{rel:"declined"});logHist(`Demande de ${c.name} déclinée`,"info");toast(`Demande de ${c.name} déclinée`);
    if(isRealCompany(c)&&c.connectionId)supabase.from("connections").update({status:"declined",responded_at:new Date().toISOString()}).eq("id",c.connectionId).then(()=>{});
  };
  const updateRsvp=(campId,companyId,status)=>{
    setCampaigns((cs)=>{
      const next=cs.map((c)=>c.id===campId?{...c,rsvp:c.rsvp.map((r)=>r.companyId===companyId?{...r,status}:r)}:c);
      if(isRealCompany(me)){const camp=next.find((c)=>c.id===campId);if(camp&&isRealCompany(camp.id))supabase.from("campaigns").update({rsvp:camp.rsvp}).eq("id",camp.id).then(()=>{});}
      return next;
    });
  };
  const sendCampaign=async(recipients)=>{
    if(!campaignForm.name.trim()||!campaignForm.subject.trim()||recipients.length===0)return;
    const needsRsvp=campaignForm.needsRsvp;
    const rsvpInit=needsRsvp?recipients.map((c)=>({companyId:c.id,name:c.name,status:"pending"})):null;
    const row={company_id:me.id,name:campaignForm.name.trim(),subject:campaignForm.subject.trim(),body:campaignForm.body.trim(),html:campaignForm.html,needs_rsvp:needsRsvp,recipients:recipients.map((c)=>({id:c.id,name:c.name})),rsvp:rsvpInit};
    const {data,error}=await supabase.from("campaigns").insert(row).select().single();
    if(error){toast("Erreur : "+error.message);return;}
    const camp={id:data.id,name:data.name,subject:data.subject,body:data.body,html:data.html,list:campaignForm.list,date:"À l'instant",recipients:recipients.map((c)=>c.name),rsvp:data.rsvp};
    setCampaigns((cs)=>[camp,...cs]);setCampaignOpen(false);setCampaignForm({name:"",subject:"",body:"",list:"all",html:"",needsRsvp:false});
    logHist(`Campagne d'emailing envoyée : « ${camp.name} » (${recipients.length} destinataire${recipients.length>1?"s":""})`,"info");
    toast(`Campagne envoyée à ${recipients.length} entreprise${recipients.length>1?"s":""}`);
    if(needsRsvp){
      recipients.forEach((c,i)=>{
        setTimeout(()=>{
          const status=Math.random()<0.7?"confirmed":"declined";
          updateRsvp(camp.id,c.id,status);
          logHist(`${c.name} a ${status==="confirmed"?"confirmé sa présence":"décliné l'invitation"} pour « ${camp.name} »`,"info");
          toast(`${status==="confirmed"?"✓":"✗"} ${c.name} a ${status==="confirmed"?"confirmé sa présence":"décliné"}`);
        },2600+i*1700+Math.random()*1400);
      });
    }
  };
  const toggleRecipient=(id)=>setSelectedIds((ids)=>ids.includes(id)?ids.filter((x)=>x!==id):[...ids,id]);
  const toggleListMember=(id)=>setListForm((f)=>({...f,companyIds:f.companyIds.includes(id)?f.companyIds.filter((x)=>x!==id):[...f.companyIds,id]}));
  const createList=async()=>{
    if(!listForm.name.trim()||listForm.companyIds.length===0)return;
    const {data,error}=await supabase.from("distribution_lists").insert({company_id:me.id,name:listForm.name.trim(),company_ids:listForm.companyIds}).select().single();
    if(error){toast("Erreur : "+error.message);return;}
    const list={id:data.id,name:data.name,companyIds:data.company_ids};
    setDistLists((ls)=>[list,...ls]);setListOpen(false);setListForm({name:"",companyIds:[]});
    logHist(`Liste de diffusion créée : « ${list.name} » (${list.companyIds.length} entreprise${list.companyIds.length>1?"s":""})`,"info");
    toast(`Liste « ${list.name} » créée`);
  };
  const deleteList=(id)=>{
    const l=distLists.find((x)=>x.id===id);setDistLists((ls)=>ls.filter((x)=>x.id!==id));if(l)toast(`Liste « ${l.name} » supprimée`);
    if(isRealCompany(me))supabase.from("distribution_lists").delete().eq("id",id).then(()=>{});
  };

  const commonServices=(c)=>((me&&me.services)||[]).filter((s)=>(c.services||[]).includes(s));
  const getChan=(c,svc)=>(c.channels&&c.channels[svc])||[];
  const lastText=(c)=>{const ch=c.channels||{};let t=null;Object.keys(ch).forEach((k)=>{const arr=ch[k];for(let i=arr.length-1;i>=0;i--){if(arr[i].from!=="sys"){t=arr[i].text;break;}}});return t;};
  const canSee=(viewer,svc)=>{if(access.admins.includes(viewer))return true;if(viewer===svc)return true;return (access.grants[viewer]||[]).includes(svc);};
  const toggleAdmin=(s)=>{setAccess((a)=>({...a,admins:a.admins.includes(s)?a.admins.filter((x)=>x!==s):[...a.admins,s]}));logEvent(`Droits admin modifiés — ${s}`);};
  const toggleGrant=(s,o)=>{setAccess((a)=>{const cur=a.grants[s]||[];const next=cur.includes(o)?cur.filter((x)=>x!==o):[...cur,o];return {...a,grants:{...a.grants,[s]:next}};});logEvent(`Accès ${s} → ${o} modifié`);};

  const send=()=>{
    if(!draft.trim())return;const id=activeConv;const text=draft.trim();setDraft("");
    const c=companies.find((x)=>x.id===id);const svc=mSvc;
    if(!svc)return;
    const push=(from,t)=>setCompanies((cs)=>cs.map((x)=>x.id===id?{...x,channels:{...(x.channels||{}),[svc]:[...((x.channels&&x.channels[svc])||[]),{from,text:t}]}}:x));
    push("me",text);
    if(isRealCompany(c)&&c.connectionId){
      supabase.from("messages").insert({connection_id:c.connectionId,sender_company_id:me.id,service:svc,body:text}).then(()=>{});
      return;
    }
    setTimeout(()=>push("them",REPLIES[Math.floor(Math.random()*REPLIES.length)]),1400);
  };

  const pushCh=(id,svc,obj)=>setCompanies((cs)=>cs.map((x)=>x.id===id?{...x,channels:{...(x.channels||{}),[svc]:[...((x.channels&&x.channels[svc])||[]),obj]}}:x));
  const startVisio=(c,svcs)=>{const arr=(Array.isArray(svcs)?svcs:[svcs]).filter(Boolean);if(!arr.length)return;setVisio({companyId:c.id,services:arr});setVisioSetup(false);logHist(`Visio démarrée avec ${c.name} · ${arr.join(", ")}`,"visio");};
  const endVisio=(secs)=>{if(visio){const mm=String(Math.floor(secs/60)).padStart(2,"0"),ss=String(secs%60).padStart(2,"0");const cc=companies.find((x)=>x.id===visio.companyId);(visio.services||[]).forEach((svc)=>pushCh(visio.companyId,svc,{from:"sys",text:`Visio terminée · durée ${mm}:${ss}`}));logHist(`Visio terminée avec ${cc?cc.name:""} · durée ${mm}:${ss}`,"visio");}setVisio(null);toast("Visio terminée");};
  const scheduleVisio=()=>{if(!schedForm.date||!schedForm.time||!active||!visioSvcs.length)return;const d=schedForm.date,t=schedForm.time;visioSvcs.forEach((svc)=>pushCh(active.id,svc,{from:"sys",kind:"meeting",date:d,time:t,services:visioSvcs}));logHist(`Visio planifiée avec ${active.name} le ${d} à ${t}`,"visio");setVisioSetup(false);setSchedForm({date:"",time:""});setActiveService(visioSvcs[0]);toast("Visio planifiée");};

  const clearFilters=()=>{setFSector("");setFRadius(0);setFEmp("");setFVerif(false);setQ("");};

  // blog central + adhésion (adhésion simulée dans la maquette)
  const tryPublish=()=>{if(me.membre)setComposeOpen(true);else setAdhesion(true);};
  const adhere=(billing)=>{setMe({...me,membre:true,plan:"Pro",planId:"pro",billing});setAdhesion(false);toast("✓ Passage à l'offre Pro");setComposeOpen(true);};
  const publish=()=>{
    if(!postForm.title.trim())return;
    const post={id:Date.now(),author:{name:me.name,color:me.color,sector:me.sector,loc:me.loc,logo:me.logo,isMe:true},
      title:postForm.title.trim(),body:postForm.body.trim(),tag:postForm.tag.trim()||"Actu",photo:postForm.photo||null,date:"À l'instant",likes:0,liked:false};
    setPosts((p)=>[post,...p]);setComposeOpen(false);setPostForm({title:"",body:"",tag:"",photo:null});logHist("Actualité publiée","info");toast("Actualité publiée");
  };
  const toggleLike=(id)=>setPosts((ps)=>ps.map((p)=>p.id===id?{...p,liked:!p.liked,likes:p.likes+(p.liked?-1:1)}:p));
  const repost=(p)=>{
    const original=p.repostOf||p.author;
    const clone={id:Date.now(),author:{name:me.name,color:me.color,sector:me.sector,loc:me.loc,logo:me.logo,isMe:true},
      repostOf:original,title:p.title,body:p.body,tag:p.tag,photo:p.photo||null,date:"À l'instant",likes:0,liked:false};
    setPosts((ps)=>[clone,...ps]);logHist(`Actualité de ${original.name} republiée`,"info");toast("Actualité republiée sur votre fil");
  };
  const onPhotoPick=(e)=>{const file=e.target.files&&e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>setPostForm((f)=>({...f,photo:reader.result}));reader.readAsDataURL(file);};

  // moteur de mise en relation
  const recoReason=(c)=>{
    const myOffer=((me&&me.offer)||[]).join(" ").toLowerCase();
    const myNeed=((me&&me.seek)||[]).join(" ").toLowerCase();
    const theirOffer=(c.offer||[]).join(" ").toLowerCase();
    if((c.seek||[]).some((k)=>{const w=k.toLowerCase().split(" ")[0];return w.length>2&&myOffer.includes(w);}))return "Cherche ce que vous proposez";
    if((c.offer||[]).some((k)=>{const w=k.toLowerCase().split(" ")[0];return w.length>2&&myNeed.includes(w);}))return "Propose ce que vous cherchez";
    if(me&&c.loc===me.loc)return "Dans votre ville";
    {const d=me?distKm(me.loc,c.loc):null;if(d!=null&&d<=150)return `À ~${d} km de vous`;}
    return "Forte complémentarité";
  };
  const needAuthor=(n)=>n.mine?{name:me.name,color:me.color,sector:me.sector,loc:n.loc,logo:me.logo}:(companies.find((c)=>c.id===n.companyId)||{name:"—",color:"#ccc",sector:"",loc:""});
  const respondToNeed=(n)=>{const c=companies.find((x)=>x.id===n.companyId);if(!c)return;if(!canProspect()){setLimitOpen(true);return;}setNeeds((ns)=>ns.map((x)=>x.id===n.id?{...x,responses:x.responses+1}:x));setProspect(c);setView("discover");logHist(`Réponse envoyée au besoin de ${c.name}`,"need");setPmsg(`Bonjour ${c.name}, en réponse à votre besoin « ${n.title} » : je suis ${me.name} (${me.sector}) et je pense pouvoir vous aider. Ouvert à en discuter ?`);};
  const publishNeed=()=>{if(!needForm.title.trim())return;const ttl=needForm.title.trim();const n={id:Date.now(),mine:true,companyId:0,title:ttl,sought:needForm.sought,loc:needForm.loc||me.loc,date:"À l'instant",responses:0};setNeeds((ns)=>[n,...ns]);setNeedOpen(false);setNeedForm({title:"",sought:SECTORS[0],loc:""});logHist(`Besoin publié : « ${ttl} »`,"need");toast("Besoin publié");};

  const filtered=useMemo(()=>{
    let list=companies.filter((c)=>{
      if(fSector&&c.sector!==fSector)return false;
      if(fRadius>0&&me&&CITIES[me.loc]&&CITIES[c.loc]){const d=distKm(me.loc,c.loc);if(d!=null&&d>fRadius)return false;}
      if(fEmp&&c.emp!==fEmp)return false;
      if(fVerif&&!c.verified)return false;
      if(q){const h=(c.name+c.tag+c.sector+c.desc+c.offer.join(" ")).toLowerCase();if(!h.includes(q.toLowerCase()))return false;}
      return true;
    }).map((c)=>({...c,_aff:affinity(c)}));
    list.sort((a,b)=>sort==="aff"?b._aff-a._aff:sort==="rating"?b.rating-a.rating:sort==="recent"?b.founded-a.founded:a.name.localeCompare(b.name));
    return list;
  },[companies,fSector,fRadius,fEmp,fVerif,q,sort,me]);

  // marqueurs carte (regroupés par ville avec léger décalage)
  const markers=useMemo(()=>{
    const byCity={};
    filtered.forEach((c)=>{if(CITIES[c.loc]){(byCity[c.loc]=byCity[c.loc]||[]).push(c);}});
    const out=[];
    Object.keys(byCity).forEach((city)=>{
      const grp=byCity[city];const[lat,lng]=CITIES[city];const[bx,by]=project(lat,lng);
      grp.forEach((c,i)=>{
        let ox=0,oy=0;
        if(grp.length>1){const a=(i/grp.length)*2*Math.PI;ox=Math.cos(a)*12;oy=Math.sin(a)*12;}
        out.push({c,x:bx+ox,y:by+oy});
      });
    });
    return out;
  },[filtered]);

  const legendSectors=useMemo(()=>[...new Set(filtered.map((c)=>c.sector))],[filtered]);

  const relLabel=(rel)=>({sent:["En attente","var(--amber)"],incoming:["Vous a démarché","var(--blue)"],declined:["Décliné","var(--slate-soft)"]}[rel]);

  /* ============ CHARGEMENT ============ */
  if(!authReady){
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <div className="loginbox" style={{textAlign:"center"}}>
            <div className="brand" style={{marginBottom:22,justifyContent:"center"}}><Mark/><b className="disp" style={{fontSize:20}}>Maillon</b></div>
            <p className="loginsub">Chargement…</p>
          </div>
        </div>
      </div>
    );
  }

  /* ============ AUTHENTIFICATION ============ */
  if(!session){
    const doAuth=async()=>{
      setAuthError("");
      if(!loginEmail.trim()||!loginPwd){setAuthError("Renseignez un email et un mot de passe.");return;}
      setAuthBusy(true);
      const {error}=authMode==="signup"
        ?await supabase.auth.signUp({email:loginEmail.trim(),password:loginPwd})
        :await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPwd});
      setAuthBusy(false);
      if(error){setAuthError(error.message);return;}
      toast(authMode==="signup"?"Compte créé !":"Connexion réussie");
    };
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <div className="loginbox">
            <div className="brand" style={{marginBottom:22}}><Mark/><b className="disp" style={{fontSize:20}}>Maillon</b></div>
            <h1 className="disp">{authMode==="signup"?"Créer votre compte":"Connexion"}</h1>
            <p className="loginsub">{authMode==="signup"?"Créez votre compte, vous publierez ensuite la page de votre entreprise.":"Connectez-vous pour accéder à votre espace."}</p>
            <div className="field"><label>E-mail</label>
              <input value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)} placeholder="prenom.nom@entreprise.fr" onKeyDown={(e)=>e.key==="Enter"&&doAuth()}/></div>
            <div className="field"><label>Mot de passe</label>
              <input type="password" value={loginPwd} onChange={(e)=>setLoginPwd(e.target.value)} placeholder="••••••••" onKeyDown={(e)=>e.key==="Enter"&&doAuth()}/></div>
            {authError&&<p style={{color:"var(--coral)",fontSize:13,margin:"0 0 12px"}}>{authError}</p>}
            <button className="btn block" disabled={authBusy} onClick={doAuth}>{authBusy?"Un instant…":(authMode==="signup"?"Créer mon compte":"Se connecter")}</button>
            <div style={{textAlign:"center",marginTop:14}}>
              <button className="linkbtn" onClick={()=>{setAuthMode(authMode==="signup"?"signin":"signup");setAuthError("");}}>
                {authMode==="signup"?"Vous avez déjà un compte ? Se connecter":"Pas encore de compte ? En créer un"}
              </button>
            </div>
            <p className="simnote">Vos identifiants sont gérés de façon sécurisée par Supabase.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ============ ONBOARDING ============ */
  if(!me){
    const hints=["Identité","Activité","Détails","Abonnement"];
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="onb">
          <div className="brand" style={{marginBottom:24}}><Mark/><b className="disp" style={{fontSize:20}}>Maillon</b></div>
          <div className="eyebrow">Créez votre page entreprise</div>
          <h1>Votre entreprise,<br/>reliée aux bonnes.</h1>
          <p className="lead">Publiez une page complète, démarchez les sociétés qui vous intéressent. Si elles acceptent, vous communiquez directement. Rien sans double accord.</p>
          <p className="lead" style={{fontWeight:600,color:"var(--emerald)",marginTop:-6}}>Ne soyez plus le maillon faible : devenez un maillon fort de votre écosystème.</p>
          <div className="steps">{[0,1,2,3].map((i)=><div key={i} className={"stp"+(obStep>=i?" on":"")}/>)}</div>
          <div className="stphint">Étape {obStep+1}/4 · {hints[obStep]}</div>

          {obStep===0&&(<>
            <div className="field"><label>Nom de l'entreprise</label>
              <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="ex : Studio Kavan"/></div>
            <div className="grid2">
              <div className="field"><label>Secteur d'activité</label>
                <input list="sectorlist" value={form.sector} onChange={(e)=>setForm({...form,sector:e.target.value})} placeholder="Écrivez ou choisissez…"/>
                <datalist id="sectorlist">{SECTORS.map((s)=><option key={s} value={s}/>)}</datalist>
                <div className="uphint">Écrivez librement votre secteur, ou choisissez une suggestion.</div></div>
              <div className="field"><label>Localisation</label>
                <input value={form.loc} onChange={(e)=>setForm({...form,loc:e.target.value})} placeholder="Rennes"/></div>
            </div>
            <div className="field"><label>Effectif</label>
              <select value={form.emp} onChange={(e)=>setForm({...form,emp:e.target.value})}>{EMP.map((s)=><option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Logo de l'entreprise</label>
              <div className="logoup">
                <div className="logoprev" style={{background:form.color}}>{form.logo?<img src={form.logo} alt="logo"/>:(form.name?form.name[0]:"?")}</div>
                <div>
                  <label className="uplabel btn-ghost sm">Importer votre logo<input type="file" accept="image/*" onChange={onLogo} style={{display:"none"}}/></label>
                  <div className="uphint">PNG, JPG ou SVG — carré de préférence.</div>
                </div>
              </div></div>
            <div className="uphint" style={{marginTop:4}}>Tous les champs sont obligatoires.</div>
            <button className="btn block" style={{marginTop:8}} disabled={!(form.name.trim()&&form.sector.trim()&&form.loc.trim())} onClick={()=>setObStep(1)}>Continuer</button>
          </>)}

          {obStep===1&&(<>
            <div className="field"><label>Présentation</label>
              <textarea rows={3} value={form.desc} onChange={(e)=>setForm({...form,desc:e.target.value})} placeholder="En une ou deux phrases, ce que fait votre entreprise."/></div>
            <div className="field"><label>Ce que vous recherchez <span style={{textTransform:"none",letterSpacing:0}}>(virgules)</span></label>
              <input value={form.seek} onChange={(e)=>setForm({...form,seek:e.target.value})} placeholder="partenaires design, apporteurs d'affaires"/></div>
            <div className="field"><label>Ce que vous proposez</label>
              <input value={form.offer} onChange={(e)=>setForm({...form,offer:e.target.value})} placeholder="développement web, conseil"/></div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(0)}>Retour</button>
              <button className="btn block" disabled={!(form.desc.trim()&&form.seek.trim()&&form.offer.trim())} onClick={()=>setObStep(2)}>Continuer</button>
            </div>
          </>)}

          {obStep===2&&(<>
            <div className="grid2">
              <div className="field"><label>Année de création</label>
                <input value={form.founded} onChange={(e)=>setForm({...form,founded:e.target.value})} placeholder="2018"/></div>
              <div className="field"><label>Chiffre d'affaires</label>
                <select value={form.ca} onChange={(e)=>setForm({...form,ca:e.target.value})}>{CA.map((s)=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="field"><label>Certifications / labels <span style={{textTransform:"none",letterSpacing:0,color:"var(--slate-soft)"}}>(optionnel, séparez par des virgules)</span></label>
              <input value={form.certifs} onChange={(e)=>setForm({...form,certifs:e.target.value})} placeholder="RGPD, ISO 27001"/></div>
            <div className="field"><label>Site web <span style={{textTransform:"none",letterSpacing:0,color:"var(--slate-soft)"}}>(optionnel)</span></label>
              <input value={form.web} onChange={(e)=>setForm({...form,web:e.target.value})} placeholder="mon-entreprise.fr"/></div>
            <div className="field"><label>SIRET</label>
              <input value={form.siret} onChange={(e)=>setForm({...form,siret:e.target.value})} placeholder="123 456 789 00012"/>
              <div className="uphint">Vérification automatique via le répertoire SIREN — affiche un badge « entreprise vérifiée ».</div></div>
            <div className="field"><label>Vos services / départements</label>
              <div className="svcwrap">{SERVICES.map((s)=>(
                <button key={s} type="button" className={"svcchip"+(form.services.includes(s)?" on":"")}
                  onClick={()=>setForm((f)=>({...f,services:f.services.includes(s)?f.services.filter((x)=>x!==s):[...f.services,s]}))}>{s}</button>
              ))}</div>
              <div className="uphint">Chaque service pourra échanger avec le même service des entreprises connectées.</div></div>
            <div className="field"><label>Pôle qui reçoit les demandes</label>
              <select value={form.receptionPole} onChange={(e)=>setForm({...form,receptionPole:e.target.value})}>{(form.services.length?form.services:["Direction"]).map((s)=><option key={s} value={s}>{s}</option>)}</select>
              <div className="uphint">C'est ce pôle qui recevra les demandes de mise en relation adressées à votre entreprise.</div></div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(1)}>Retour</button>
              <button className="btn block" disabled={!(form.founded.trim()&&form.siret.trim()&&form.services.length>0)} onClick={()=>setObStep(3)}>Continuer</button>
            </div>
          </>)}

          {obStep===3&&(<>
            <div className="billtoggle">
              <button className={form.billing==="Mensuelle"?"on":""} onClick={()=>setForm({...form,billing:"Mensuelle"})}>Mensuel</button>
              <button className={form.billing==="Annuelle"?"on":""} onClick={()=>setForm((f)=>({...f,billing:"Annuelle",plan:f.plan==="gratuit"?"essentiel":f.plan}))}>Annuel <span className="save">2 mois offerts</span></button>
            </div>
            {form.billing==="Annuelle"&&<div className="uphint" style={{marginBottom:12}}>L'offre Découverte n'est disponible qu'en mensuel.</div>}
            {PLANS.filter((pl)=>!(form.billing==="Annuelle"&&pl.id==="gratuit")).map((pl)=>(
              <div key={pl.id} className={"planpick"+(form.plan===pl.id?" on":"")} onClick={()=>setForm({...form,plan:pl.id})}>
                <div className="ph">
                  <div className="pnm">{pl.name}{pl.best&&<span className="best">Recommandé</span>}</div>
                  <div className="radio">{form.plan===pl.id&&<Check style={{color:"#fff",width:12,height:12}}/>}</div>
                </div>
                <div className="prc">{pl.monthly===0?"Gratuit":<>{form.billing==="Annuelle"?pl.annual:pl.monthly} €<small>{form.billing==="Annuelle"?" / an":" / mois"}</small></>}</div>
                <div className="tg2">{pl.tagline}</div>
                <ul>{pl.features.map((f,i)=>(
                  <li key={i} className={f.ok?"":"no"}>{f.ok?<Check style={{color:"var(--emerald)",width:14,height:14}}/>:<XI style={{color:"var(--slate-soft)",width:13,height:13}}/>}{f.t}</li>
                ))}</ul>
              </div>
            ))}
            <p className="simnote">Tarifs indicatifs · abonnement simulé dans la maquette, aucun paiement réel.</p>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(2)}>Retour</button>
              <button className="btn block" onClick={finishOnboarding}>Publier ma page</button>
            </div>
          </>)}

          <div style={{textAlign:"center",marginTop:18}}>
            <button className="linkbtn" onClick={()=>{setForm((f)=>({...f,name:"Studio Kavan",sector:"Tech & Dév",loc:"Rennes",emp:"1–10",color:"#0F846B",radius:100,desc:"Studio produit qui conçoit et développe des interfaces sur mesure pour les entreprises.",seek:"partenaires design, apporteurs d'affaires",offer:"développement web, applications métier",founded:"2020",ca:"< 500 k€",web:"studiokavan.fr",certifs:"RGPD",siret:"902 445 178 00021",plan:"pro",billing:"Mensuelle",services:["Direction","Commercial","Technique","RH"],receptionPole:"Commercial"}));setObStep(2);}}>
              Remplir avec un exemple
            </button>
          </div>
        </div>
        <div className="foot">Prototype <b>Maillon</b> — maquette cliquable · données fictives</div>
      </div>
    );
  }

  const active=companies.find((c)=>c.id===activeConv&&c.rel==="connected")||connected[0];
  const role=currentUser?currentUser.role:((me&&me.services&&me.services[0])||"Direction");
  const isAdmin=access.admins.includes(role);
  const mServices=active?commonServices(active).filter((s)=>canSee(role,s)):[];
  const mSvc=active?((activeService&&mServices.includes(activeService))?activeService:mServices[0]):null;
  const mStream=(active&&mSvc)?getChan(active,mSvc):[];
  const agenda=[];
  connected.forEach((c)=>{const ch=c.channels||{};Object.keys(ch).forEach((svc)=>{ch[svc].forEach((m)=>{if(m.kind==="meeting")agenda.push({c,svc,date:m.date,time:m.time});});});});
  agenda.sort((a,b)=>((a.date||"")+(a.time||"")).localeCompare((b.date||"")+(b.time||"")));
  const agendaByService={};agenda.forEach((it)=>{(agendaByService[it.svc]=agendaByService[it.svc]||[]).push(it);});
  const evMap={};agenda.forEach((it)=>{const k=it.c.id+"|"+it.date+"|"+it.time;if(!evMap[k])evMap[k]={c:it.c,date:it.date,time:it.time,services:[]};if(!evMap[k].services.includes(it.svc))evMap[k].services.push(it.svc);});
  const events=Object.values(evMap).sort((a,b)=>((a.date||"")+(a.time||"")).localeCompare((b.date||"")+(b.time||"")));
  const roleEvents=events.filter((e)=>e.services.some((s)=>canSee(role,s)));
  const visIncoming=canSee(role,(me&&me.receptionPole)||"Direction")?incoming:[];
  const recos=companies.filter((c)=>c.rel==="none").map((c)=>({...c,_aff:affinity(c)})).sort((a,b)=>b._aff-a._aff).slice(0,4);
  const matchingNeeds=needs.filter((n)=>!n.mine&&me&&n.sought===me.sector);
  const notifs=[];
  matchingNeeds.forEach((n)=>{const a=needAuthor(n);notifs.push({id:"need"+n.id,kind:"need",text:`${a.name} cherche ${n.sought} — ça correspond à votre activité`,onClick:()=>{setView("needs");setNotifOpen(false);}});});
  if(recos[0])notifs.push({id:"reco",kind:"reco",text:`${recos[0].name} pourrait vous intéresser (${recos[0]._aff}% d'affinité)`,onClick:()=>{setOpenC(recos[0].id);setNotifOpen(false);}});
  const eventsByDate={};roleEvents.forEach((e)=>{(eventsByDate[e.date]=eventsByDate[e.date]||[]).push(e);});
  const detail=openC?companies.find((c)=>c.id===openC):null;
  const dAff=detail?affinity(detail):0;
  const hovered=hoverM?markers.find((m)=>m.c.id===hoverM):null;

  return(
    <div className="mln"><style>{CSS}</style>
      <div className="bar">
        <div className="brand" onClick={()=>setView("discover")}><Mark/><b>Maillon</b></div>
        <div className="nav">
          <button className={view==="discover"?"on":""} onClick={()=>setView("discover")}><span className="lbl">Découvrir</span></button>
          <button className={view==="requests"?"on":""} onClick={()=>setView("requests")}><span className="lbl">Demandes</span>{visIncoming.length>0&&<span className="badge">{visIncoming.length}</span>}</button>
          <button className={view==="messages"?"on":""} onClick={()=>setView("messages")}><span className="lbl">Messages</span>{connected.length>0&&<span className="badge">{connected.length}</span>}</button>
          <button className={view==="lists"?"on":""} onClick={()=>setView("lists")}><span className="lbl">Listes</span></button>
          <button className={view==="emailing"?"on":""} onClick={()=>setView("emailing")}><span className="lbl">Emailing</span></button>
          <button className={view==="needs"?"on":""} onClick={()=>setView("needs")}><span className="lbl">Besoins</span>{matchingNeeds.length>0&&<span className="badge">{matchingNeeds.length}</span>}</button>
          <button className={view==="agenda"?"on":""} onClick={()=>setView("agenda")}><span className="lbl">Événements</span>{roleEvents.length>0&&<span className="badge">{roleEvents.length}</span>}</button>
          <button className={view==="library"?"on":""} onClick={()=>setView("library")}><span className="lbl">Bibliothèque</span></button>
          <button className={view==="blog"?"on":""} onClick={()=>setView("blog")}><span className="lbl">Actualités</span></button>
          <button className={"teamnav"+(chatOpen?" on":"")} onClick={()=>{setChatPane("list");setChatOpen(true);}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v6H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            <span className="lbl">Chat</span>
          </button>
        </div>
        <div ref={notifRef} style={{display:"contents"}}>
          <button className="bell" title="Notifications" onClick={()=>setNotifOpen((v)=>!v)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {notifs.length>0&&<span className="nb">{notifs.length}</span>}
          </button>
          {notifOpen&&(
            <div className="notifpanel">
              <div className="nh">Alertes</div>
              {notifs.length===0?(<div className="notifempty">Rien de nouveau pour l'instant.</div>):notifs.map((n)=>(
                <button key={n.id} className="notifitem" onClick={n.onClick}>
                  <div className="ni">{n.kind==="need"?<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 7.4H22l-6 4.4 2.3 7.2L12 17.6 5.7 22 8 14.8 2 10.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>}</div>
                  <p>{n.text}</p>
                </button>
              ))}
              <div className="nh">Activité récente</div>
              {history.length===0?(<div className="notifempty">Aucune activité pour l'instant.</div>):history.map((e)=>(
                <div key={e.id} className="notifitem" style={{cursor:"default"}}>
                  <div className="ni">{histIcon(e.kind)}</div>
                  <div style={{minWidth:0}}><p>{e.text}</p><span className="nat">{e.at}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rolepick" title="Votre compte">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
          <span className="rolename">{role}{isAdmin?" · admin":""}</span>
        </div>
        {isAdmin&&<button className="gearbtn" title="Accès & cloisonnement" onClick={()=>setAccessOpen(true)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </button>}
        <button className="gearbtn" title="Se déconnecter" onClick={logout}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="me" onClick={()=>setView("profile")}>
          <div className="av" style={{background:me.color}}>{logoImg(me)}</div>
          <div><b>{me.name}</b><small>{me.sector}</small></div>
        </div>
      </div>

      {/* DISCOVER */}
      {view==="discover"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Découvrir des entreprises</h2>
          <p className="psub">Filtrez par secteur, rayon d'action et effectif. Basculez en carte pour situer les sociétés en France. Le score d'affinité estime la complémentarité avec {me.name}.</p>
          {me.planId==="gratuit"&&(
            <div className="memban">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8 2 9.4h7.6z" stroke="#7a5305" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              <span>Offre <b>Découverte</b> — {remaining()>0?`${remaining()} démarchage${remaining()>1?"s":""} restant${remaining()>1?"s":""} sur 5`:"vos 5 démarchages sont épuisés"}.</span>
              <button className="btn" onClick={()=>setLimitOpen(true)}>Passer au payant</button>
            </div>
          )}

          {recos.length>0&&(
            <div className="recowrap">
              <div className="recohead"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 7.4H22l-6 4.4 2.3 7.2L12 17.6 5.7 22 8 14.8 2 10.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>Recommandé pour vous</div>
              <div className="recorow">
                {recos.map((c)=>(
                  <div key={c.id} className="recocard">
                    <div className="rt">
                      <div className="logo" style={{background:c.color}}>{logoImg(c)}</div>
                      <div style={{minWidth:0}}><div className="rname" onClick={()=>setOpenC(c.id)} style={{cursor:"pointer"}}>{c.name}</div><div className="reason">{recoReason(c)}</div></div>
                      <div className="raff">{c._aff}%</div>
                    </div>
                    <button className="btn sm" onClick={()=>openProspect(c)}>Démarcher</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="toolbar">
            <div className="search">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate)" strokeWidth="1.8"/><path d="M14 14l4 4" stroke="var(--slate)" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <input placeholder="Rechercher une entreprise, un métier, un service…" value={q} onChange={(e)=>setQ(e.target.value)}/>
            </div>
            <div className="maptoggle">
              <button className={mode==="list"?"on":""} onClick={()=>setMode("list")}>Liste</button>
              <button className={mode==="map"?"on":""} onClick={()=>setMode("map")}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5c-2.5 0-4.5 2-4.5 4.5C3.5 9.5 8 14.5 8 14.5s4.5-5 4.5-8.5C12.5 3.5 10.5 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="1.6" fill="currentColor"/></svg>
                Carte
              </button>
            </div>
          </div>

          <div className="advbar">
            <div className="grp"><label>Secteur d'activité</label>
              <select value={fSector} onChange={(e)=>setFSector(e.target.value)}><option value="">Tous les secteurs</option>{SECTORS.map((s)=><option key={s}>{s}</option>)}</select></div>
            <div className="grp"><label>Rayon autour de vous</label>
              <select value={fRadius} onChange={(e)=>setFRadius(Number(e.target.value))}><option value={0}>Toute la France</option>{[50,100,150,200,300].map((r)=><option key={r} value={r}>{r} km</option>)}</select></div>
            <div className="grp"><label>Effectif</label>
              <select value={fEmp} onChange={(e)=>setFEmp(e.target.value)}><option value="">Tous</option>{EMP.map((r)=><option key={r}>{r}</option>)}</select></div>
            <div className="grp"><label>Trier par</label>
              <select value={sort} onChange={(e)=>setSort(e.target.value)}>
                <option value="aff">Affinité</option><option value="rating">Note</option><option value="recent">Plus récentes</option><option value="name">Nom A–Z</option></select></div>
            <label className="toggle"><input type="checkbox" checked={fVerif} onChange={()=>setFVerif(!fVerif)}/>Vérifiées</label>
            <button className="clear" onClick={clearFilters}>Réinitialiser</button>
          </div>

          <div className="rescount">{filtered.length} entreprise{filtered.length>1?"s":""}{fSector?` · ${fSector}`:""}{fRadius>0?` · ${fRadius} km`:""}</div>

          {mode==="map"?(
            <div className="mapbox">
              <FranceMap companies={filtered} onOpen={(id)=>setOpenC(id)} onProspect={openProspect} aff={affinity}/>
              <div className="maplegend">
                <h5>Secteurs affichés</h5>
                {legendSectors.map((s)=>(
                  <div key={s} className="legitem"><span className="legdot" style={{background:SECTOR_COLORS[s]}}/>{s}</div>
                ))}
                <div className="maphint">Glissez pour vous déplacer, molette ou +/− pour zoomer. Les points proches se regroupent ; cliquez un point pour la fiche, un groupe pour zoomer.</div>
              </div>
            </div>
          ):(
            <>
              <div className="grid">
                {filtered.map((c)=>{const rl=relLabel(c.rel);return(
                  <div key={c.id} className="card">
                    <div className="ctop">
                      <div className="logo" style={{background:c.color}}>{c.name[0]}</div>
                      <div style={{minWidth:0,flex:1}}>
                        <div className="cname" onClick={()=>setOpenC(c.id)}>{c.name}{c.verified&&<Check className="verif"/>}</div>
                        <div className="csector">{c.sector} · {c.loc} · {c.size}</div>
                      </div>
                      <div className="aff"><div className="n">{c._aff}%</div><div className="l">affinité</div></div>
                    </div>
                    <div className="ctag">{c.tag}</div>
                    <div className="metaline"><span>★ {c.rating}</span><span>Créée {c.founded}</span><span>{c.dispo}</span></div>
                    <div className="seek">
                      {c.seek.slice(0,2).map((s)=><span key={s} className="pill seek">↳ {s}</span>)}
                      {c.certifs.slice(0,1).map((s)=><span key={s} className="pill cert">{s}</span>)}
                    </div>
                    <div className="cfoot">
                      {c.rel==="none"?(
                        <><button className="btn sm" onClick={()=>openProspect(c)}>Démarcher</button>
                          <button className="btn-ghost sm" onClick={()=>setOpenC(c.id)}>Voir la fiche</button></>
                      ):c.rel==="sent"?(
                        <span className="status"><span className="dot" style={{background:"var(--amber)"}}/>Demande envoyée</span>
                      ):c.rel==="connected"?(
                        <button className="btn-ghost sm" onClick={()=>{setActiveConv(c.id);setView("messages");}}>Ouvrir la discussion</button>
                      ):c.rel==="incoming"?(
                        <button className="btn sm" onClick={()=>setView("requests")}>Répondre à sa demande</button>
                      ):(<span className="status" style={{color:"var(--slate-soft)"}}>Décliné</span>)}
                      {rl&&<span className="status" style={{marginLeft:"auto",color:rl[1]}}>{rl[0]}</span>}
                    </div>
                  </div>);})}
              </div>
              {filtered.length===0&&<div className="empty"><h3>Aucune entreprise sur ces critères</h3><p>Élargissez les filtres ou réinitialisez.</p></div>}
            </>
          )}
        </div></div>
      )}

      {/* REQUESTS */}
      {view==="requests"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Demandes de mise en relation</h2>
          <p className="psub">Vous décidez. Accepter ouvre la messagerie ; décliner clôt la demande.</p>
          <div className="seclabel">Reçues · à traiter {visIncoming.length>0&&<span className="badge">{visIncoming.length}</span>}</div>
          {visIncoming.length===0?(<p style={{color:"var(--slate)",fontSize:14}}>Aucune demande en attente{!isAdmin?` pour le service ${role}`:""}.</p>
          ):visIncoming.map((c)=>(
            <div key={c.id} className="reqcard">
              <div className="reqhead">
                <div className="logo" style={{background:c.color}}>{logoImg(c)}</div>
                <div style={{flex:1}}>
                  <div className="cname" onClick={()=>setOpenC(c.id)}>{c.name}{c.verified&&<Check className="verif"/>}</div>
                  <div className="csector">{c.sector} · {c.loc} · reçue par votre pôle <b>{me.receptionPole}</b></div>
                </div>
              </div>
              <div className="reqmsg"><span className="q">Son message</span>{c.reqMsg}</div>
              <label className="consentrow">
                <input type="checkbox" checked={!!emailOptIn[c.id]} onChange={(e)=>setEmailOptIn((m)=>({...m,[c.id]:e.target.checked}))}/>
                J'accepte de recevoir les campagnes d'emailing de {c.name}
              </label>
              {emailOptIn[c.id]&&(()=>{const emails=emailAddrByCompany[c.id]&&emailAddrByCompany[c.id].length?emailAddrByCompany[c.id]:[""];return(
                <div className="field" style={{margin:"0 0 14px 26px"}}>
                  <label>Adresse(s) email de réception</label>
                  {emails.map((val,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                      <input type="email" value={val} onChange={(e)=>{const next=[...emails];next[i]=e.target.value;setEmailAddrByCompany((m)=>({...m,[c.id]:next}));}} placeholder="contact@votre-entreprise.fr"/>
                      {emails.length>1&&<span className="rm" style={{color:"var(--coral)",cursor:"pointer",fontSize:12,fontWeight:600,flex:"0 0 auto"}} onClick={()=>{const next=emails.filter((_,x)=>x!==i);setEmailAddrByCompany((m)=>({...m,[c.id]:next}));}}>Retirer</span>}
                    </div>
                  ))}
                  <span className="rm" style={{color:"var(--emerald)",cursor:"pointer",fontSize:12.5,fontWeight:600}} onClick={()=>setEmailAddrByCompany((m)=>({...m,[c.id]:[...emails,""]}))}>+ Ajouter un autre email</span>
                </div>
              );})()}
              <div className="reqact">
                <button className="btn sm" disabled={!!emailOptIn[c.id]&&!(emailAddrByCompany[c.id]||[]).some((e)=>e.trim())} onClick={()=>accept(c,emailOptIn[c.id],emailAddrByCompany[c.id])}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Check/>Accepter</span></button>
                <button className="btn-danger" onClick={()=>decline(c)}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><XI/>Décliner</span></button>
              </div>
            </div>
          ))}
          <div className="seclabel">Envoyées · en attente</div>
          {sent.length===0?(<p style={{color:"var(--slate)",fontSize:14}}>Aucune demande envoyée en attente. Allez dans « Découvrir » pour démarcher une entreprise.</p>
          ):sent.map((c)=>(
            <div key={c.id} className="reqcard">
              <div className="reqhead">
                <div className="logo" style={{background:c.color}}>{c.name[0]}</div>
                <div style={{flex:1}}><div className="cname" style={{cursor:"default"}}>{c.name}</div><div className="csector">{c.sector} · {c.loc}{c.sentTo?` · service ${c.sentTo}`:""}</div></div>
                <span className="status" style={{color:"var(--amber)"}}><span className="dot" style={{background:"var(--amber)"}}/>En attente de réponse</span>
              </div>
            </div>
          ))}
        </div></div>
      )}

      {/* MESSAGES */}
      {view==="messages"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Messages</h2>
          <p className="psub">Vous échangez uniquement avec les entreprises connectées — et service par service : chaque département discute avec son homologue de l'autre entreprise.</p>
          {isAdmin?(
            <div className="rolebar admin">Accès administrateur (<b>{role}</b>) — vous voyez la messagerie de tous les services.</div>
          ):(
            <div className="rolebar">En tant que <b>{role}</b>, vous voyez : {[role,...(access.grants[role]||[])].join(", ")}. Les autres services restent cloisonnés.</div>
          )}
          {connected.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 3V5z" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              <h3>Aucune conversation</h3><p>Acceptez une demande ou démarchez une entreprise pour débloquer la messagerie.</p>
            </div>
          ):(
            <>
            {agenda.length>0&&Object.keys(agendaByService).some((svc)=>canSee(role,svc))&&(
              <div className="agenda">
                <div className="agtitle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Visios à venir · par service
                </div>
                {Object.keys(agendaByService).filter((svc)=>canSee(role,svc)).map((svc)=>(
                  <div key={svc} className="aggroup">
                    <div className="agsvc">{svc}</div>
                    {agendaByService[svc].map((it,i)=>(
                      <div key={i} className="agitem">
                        <div className="aglogo" style={{background:it.c.color}}>{logoImg(it.c)}</div>
                        <div className="aginfo"><b>{it.c.name}</b><small>{it.date} à {it.time}</small></div>
                        <button className="btn sm" onClick={()=>{setActiveConv(it.c.id);setActiveService(it.svc);startVisio(it.c,[it.svc]);}}>Rejoindre</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="msgwrap">
              <div className="convlist">
                {connected.map((c)=>(
                  <div key={c.id} className={"conv"+(active&&active.id===c.id?" on":"")} onClick={()=>{setActiveConv(c.id);setActiveService(commonServices(c)[0]||"Direction");}}>
                    <div className="logo" style={{background:c.color}}>{logoImg(c)}</div>
                    <div style={{minWidth:0}}><b>{c.name}</b><small>{lastText(c)||`${commonServices(c).length} services en commun`}</small></div>
                  </div>
                ))}
              </div>
              {active?(
                <div className="chat">
                  <div className="chathead">
                    <div className="logo" style={{background:active.color}}>{logoImg(active)}</div>
                    <div><b style={{fontSize:15}}>{active.name}</b><div className="chansub">{mServices.length} service{mServices.length>1?"s":""} en commun — choisissez un canal</div></div>
                    <button className="btn-ghost sm" style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}} onClick={()=>{const d=mSvc||commonServices(active)[0]||(active.services&&active.services[0])||"Direction";setVisioSvcs([d]);setVisioSetup(true);}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg>Visio</button>
                    {mSvc&&<button className="btn-ghost sm" onClick={()=>{setCollab("quote");setCollabForm({subject:"",budget:"",name:""});}}>Devis</button>}
                    {mSvc&&<button className="btn-ghost sm" onClick={()=>{setCollab("doc");setCollabForm({subject:"",budget:"",name:""});}}>Document</button>}
                  </div>
                  {mServices.length>0?(
                    <>
                      <div className="chantabs">
                        {mServices.map((s)=><button key={s} className={"chantab"+(s===mSvc?" on":"")} onClick={()=>setActiveService(s)}>{s}</button>)}
                      </div>
                      <div className="stream" ref={streamRef}>
                        <div className="bub sys">Canal {mSvc} · votre {mSvc} ↔ {mSvc} de {active.name}</div>
                        {mStream.map((m,i)=>{
                          if(m.kind==="meeting")return(
                          <div key={i} className="meetcard">
                            <div className="meetico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg></div>
                            <div><b>Visio planifiée</b><small>{m.date} à {m.time} · {(m.services||[mSvc]).join(", ")}</small></div>
                            <button className="btn sm" onClick={()=>startVisio(active,m.services||[mSvc])}>Rejoindre</button>
                          </div>);
                          if(m.kind==="quote")return(
                          <div key={i} className="meetcard">
                            <div className="meetico" style={{background:"var(--amber-wash)",color:"var(--amber)",fontWeight:800,fontFamily:"Bricolage Grotesque"}}>€</div>
                            <div><b>Demande de devis</b><small>{m.subject}{m.budget?` · budget ${m.budget}`:""}</small></div>
                            <span className="postself">{m.from==="me"?"Envoyée":"Reçue"}</span>
                          </div>);
                          if(m.kind==="doc")return(
                          <div key={i} className="meetcard">
                            <div className="meetico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 2v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></div>
                            <div><b>Document partagé</b><small>{m.name}</small></div>
                            <button className="btn-ghost sm" onClick={()=>toast("Téléchargement (démo)")}>Ouvrir</button>
                          </div>);
                          return <div key={i} className={"bub "+m.from}>{m.text}</div>;
                        })}
                      </div>
                      <div className="composer">
                        <input placeholder={`Écrire au service ${mSvc} de ${active.name}…`} value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()}/>
                        <button className="btn sm" onClick={send}>Envoyer</button>
                      </div>
                    </>
                  ):(
                    <div className="msgempty">Aucun service en commun avec {active.name}. Ajoutez des services à votre page pour ouvrir des canaux.</div>
                  )}
                </div>
              ):<div className="msgempty">Sélectionnez une conversation</div>}
            </div>
            </>
          )}
        </div></div>
      )}

      {/* CHAT INTERNE — panneau flottant */}
      {chatOpen&&(()=>{
        const mates=team.filter((m)=>m.status==="active"&&(!currentUser||m.id!==currentUser.id));
        const dmThread=currentUser&&activeTeammateId!=null?(internalDMs[dmKey(currentUser.id,activeTeammateId)]||[]):[];
        const activeMate=activeTeammateId!=null?team.find((m)=>m.id===activeTeammateId):null;
        const thread=activeTeammateId==null?internalChat:dmThread;
        const lastOf=(arr)=>arr.length?arr[arr.length-1]:null;
        const openThread=(id)=>{setActiveTeammateId(id);setChatPane("thread");};
        return(
          <div className="chatpanel">
            <div className="cphead">
              {chatPane==="list"?(
                <span className="cptitle">Chat</span>
              ):(
                <div className="cpback" onClick={()=>setChatPane("list")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <b>{activeTeammateId==null?"Général":(activeMate?activeMate.name:"")}</b>
                </div>
              )}
              <span className="cpclose" onClick={()=>setChatOpen(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              </span>
            </div>
            {chatPane==="list"?(
              <div className="cpbody convlist">
                <div className="conv" onClick={()=>openThread(null)}>
                  <div className="logo" style={{background:"var(--ink)"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 20v-1a3.5 3.5 0 0 0-2.5-3.4M15 4.2a3 3 0 0 1 0 5.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{minWidth:0}}><b>Général</b>
                    <small>{lastOf(internalChat)?`${lastOf(internalChat).authorId===(currentUser&&currentUser.id)?"Vous : ":""}${lastOf(internalChat).text}`:"Conversation d'équipe"}</small>
                  </div>
                </div>
                {mates.map((m)=>{const l=lastOf(currentUser?(internalDMs[dmKey(currentUser.id,m.id)]||[]):[]);return(
                  <div key={m.id} className="conv" onClick={()=>openThread(m.id)}>
                    <div className="logo" style={{background:"var(--ink)"}}>{m.name[0]}</div>
                    <div style={{minWidth:0}}><b>{m.name}</b>
                      <small>{l?`${l.authorId===currentUser.id?"Vous : ":""}${l.text}`:"Nouvelle conversation"}</small>
                    </div>
                  </div>
                );})}
              </div>
            ):(
              <div className="cpthread">
                <div className="stream" ref={teamStreamRef}>
                  {thread.length===0?(
                    <div className="bub sys">Aucun message pour l'instant — lancez la discussion.</div>
                  ):thread.map((m)=>{const mine=currentUser&&m.authorId===currentUser.id;return(
                    <div key={m.id} className={"bub "+(mine?"me":"them")}>
                      {!mine&&activeTeammateId==null&&<b style={{display:"block",fontSize:11.5,marginBottom:3,opacity:.75}}>{m.authorName}</b>}
                      {m.text}
                    </div>
                  );})}
                </div>
                <div className="composer">
                  <input placeholder={activeTeammateId==null?"Écrire au canal Général…":`Écrire à ${activeMate?activeMate.name:""}…`} value={internalMsg} onChange={(e)=>setInternalMsg(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&sendInternalMsg()}/>
                  <button className="btn sm" onClick={sendInternalMsg}>Envoyer</button>
                </div>
              </div>
            )}
          </div>
        );})()}

      {/* AGENDA */}
      {view==="agenda"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Événements</h2>
          <p className="psub">Toutes vos visios à venir avec les entreprises connectées, classées par date. Une visio de groupe apparaît avec tous ses services.{!isAdmin&&` En tant que ${role}, vous ne voyez que les visios de votre service.`}</p>
          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            <button className="btn-ghost sm" onClick={()=>toast("Événements exportés (.ics) — démo")}>Exporter (.ics)</button>
            <button className="btn-ghost sm" onClick={()=>toast("Connexion à Google Agenda — démo")}>Connecter Google Agenda</button>
            <button className="btn-ghost sm" onClick={()=>toast("Connexion à Outlook — démo")}>Connecter Outlook</button>
          </div>
          {roleEvents.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="var(--slate-soft)" strokeWidth="1.6"/><path d="M3 9h18M8 3v4M16 3v4" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <h3>Aucune visio planifiée</h3><p>Planifiez une visio depuis une conversation pour la retrouver ici.</p>
            </div>
          ):(
            Object.keys(eventsByDate).map((date)=>(
              <div key={date} className="agday">
                <div className="agdate">{fmtDate(date)}</div>
                {eventsByDate[date].map((e,i)=>(
                  <div key={i} className="agevent">
                    <div className="agtime">{e.time}</div>
                    <div className="aglogo" style={{background:e.c.color}}>{logoImg(e.c)}</div>
                    <div className="aginfo"><b>{e.c.name}{e.services.length>1?" · visio de groupe":""}</b>
                      <div className="agsvcs">{e.services.map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
                    <button className="btn sm" onClick={()=>startVisio(e.c,e.services)}>Rejoindre</button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div></div>
      )}

      {/* BIBLIOTHÈQUE — registre de toutes les actions */}
      {view==="library"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Bibliothèque</h2>
          <p className="psub">Le registre de toutes les actions effectuées sur votre espace : demandes envoyées, mises en relation, visios, publications…</p>
          <div className="toolbar">
            <div className="search">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate)" strokeWidth="1.8"/><path d="M14 14l4 4" stroke="var(--slate)" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <input placeholder="Rechercher dans la bibliothèque…" value={libQuery} onChange={(e)=>setLibQuery(e.target.value)}/>
            </div>
          </div>
          {(()=>{const filtered=libQuery.trim()?history.filter((e)=>e.text.toLowerCase().includes(libQuery.trim().toLowerCase())):history;
            if(history.length===0)return(
              <div className="empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 5h16M4 12h16M4 19h10" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <h3>Aucune activité pour l'instant</h3><p>Chaque action que vous effectuez apparaîtra ici, avec la date et l'heure.</p>
              </div>
            );
            if(filtered.length===0)return(
              <div className="empty">
                <svg width="46" height="46" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate-soft)" strokeWidth="1.6"/><path d="M14 14l4 4" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <h3>Aucun résultat</h3><p>Aucune action ne correspond à « {libQuery} ».</p>
              </div>
            );
            return(
              <div className="libcard">
                {filtered.map((e)=>(
                  <div key={e.id} className="libitem">
                    <div className="ni">{histIcon(e.kind)}</div>
                    <p>{e.text}</p>
                    <span className="nat">{e.at}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div></div>
      )}

      {/* EMAILING */}
      {view==="emailing"&&(()=>{const emailingRecipients=connected.filter((c)=>c.emailingConsent);
        const selectedCompanies=emailingRecipients.filter((c)=>selectedIds.includes(c.id));
        const allListedIds=[...new Set(distLists.flatMap((l)=>l.companyIds))];
        const allListedCompanies=emailingRecipients.filter((c)=>allListedIds.includes(c.id));
        const applyList=(val)=>{
          let pool;
          if(val==="all")pool=allListedCompanies;
          else if(val.startsWith("list:")){const l=distLists.find((x)=>x.id===Number(val.slice(5)));pool=l?emailingRecipients.filter((c)=>l.companyIds.includes(c.id)):[];}
          else pool=[];
          setSelectedIds(pool.map((c)=>c.id));
        };
        const openCampaign=()=>{setCampaignForm({name:"",subject:"",body:"",list:"all",html:""});setSelectedIds(allListedCompanies.map((c)=>c.id));setCampaignOpen(true);};
        return(
        <div className="wrap"><div className="page">
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 className="ptitle disp">Emailing</h2>
              <p className="psub" style={{marginBottom:0}}>Envoyez des campagnes uniquement aux entreprises qui ont accepté de les recevoir, au moment de la mise en relation.</p></div>
            <button className="btn sm" disabled={emailingRecipients.length===0} onClick={openCampaign}>Nouvelle campagne</button>
          </div>

          <div className="seclabel" style={{marginTop:26}}>Destinataires éligibles {emailingRecipients.length>0&&<span className="badge">{emailingRecipients.length}</span>}</div>
          {emailingRecipients.length===0?(
            <p style={{color:"var(--slate)",fontSize:14}}>Aucune entreprise n'a encore accepté de recevoir vos campagnes. Le consentement se donne dans l'onglet « Demandes » au moment d'accepter une mise en relation.</p>
          ):(
            <div className="libcard" style={{marginBottom:28}}>
              {emailingRecipients.map((c)=>(
                <div key={c.id} className="libitem">
                  <div className="logo" style={{background:c.color,width:30,height:30,fontSize:13,borderRadius:8}}>{logoImg(c)}</div>
                  <p>{c.name}</p>
                  <span className="nat">{c.sector}</span>
                </div>
              ))}
            </div>
          )}

          <div className="seclabel">Campagnes envoyées</div>
          {campaigns.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 7l8 6 8-6" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h3>Aucune campagne envoyée</h3><p>Créez votre première campagne d'emailing ci-dessus.</p>
            </div>
          ):(
            <div className="libcard">
              {campaigns.map((camp)=>{
                const open=expandedCampaignId===camp.id;
                const confirmed=camp.rsvp?camp.rsvp.filter((r)=>r.status==="confirmed").length:0;
                const declined=camp.rsvp?camp.rsvp.filter((r)=>r.status==="declined").length:0;
                const pending=camp.rsvp?camp.rsvp.filter((r)=>r.status==="pending").length:0;
                return(
                <div key={camp.id}>
                  <div className="libitem" style={{borderBottom:"1px solid var(--line-soft)",cursor:camp.rsvp?"pointer":"default"}} onClick={()=>{if(camp.rsvp)setExpandedCampaignId(open?null:camp.id);}}>
                    <div className="ni"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:600}}>{camp.name||camp.subject}</p>
                      <p style={{margin:"3px 0 0",fontSize:12.5,color:"var(--slate)"}}>Sujet : {camp.subject}</p>
                      {camp.body&&<p style={{margin:"4px 0 0",fontSize:13,color:"var(--slate)"}}>{camp.body}</p>}
                      {camp.rsvp&&(
                        <p style={{margin:"6px 0 0",fontSize:12,fontWeight:600}}>
                          <span style={{color:"var(--emerald)"}}>✓ {confirmed} confirmé{confirmed>1?"s":""}</span>{" · "}
                          <span style={{color:"var(--coral)"}}>✗ {declined} décliné{declined>1?"s":""}</span>{" · "}
                          <span style={{color:"var(--amber)"}}>⏳ {pending} en attente</span>
                        </p>
                      )}
                    </div>
                    <span className="nat">{camp.recipients.length} destinataire{camp.recipients.length>1?"s":""} · {camp.date}</span>
                  </div>
                  {open&&camp.rsvp&&(
                    <div style={{background:"var(--paper)",borderBottom:"1px solid var(--line-soft)"}}>
                      {camp.rsvp.map((r)=>(
                        <div key={r.companyId} className="subrow" style={{padding:"8px 18px"}}>
                          <span className="tree">└</span>{r.name}
                          <span style={{marginLeft:"auto",fontWeight:600,fontSize:12,color:r.status==="confirmed"?"var(--emerald)":r.status==="declined"?"var(--coral)":"var(--amber)"}}>
                            {r.status==="confirmed"?"✓ Confirmé":r.status==="declined"?"✗ Décliné":"⏳ En attente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}

          {campaignOpen&&(
            <>
              <div className="scrim" onClick={()=>setCampaignOpen(false)}/>
              <div className="modal" onClick={()=>setCampaignOpen(false)}>
                <div className="mbox" onClick={(e)=>e.stopPropagation()}>
                  <div className="mhead">
                    <div><h3 className="disp">Nouvelle campagne d'emailing</h3>
                      <p className="mi">Renseignez son identité, choisissez les destinataires, puis le contenu.</p></div>
                  </div>

                  <div className="msec">Identité de la campagne</div>
                  <div className="field"><label>Nom de la campagne</label>
                    <input value={campaignForm.name} onChange={(e)=>setCampaignForm({...campaignForm,name:e.target.value})} placeholder="ex : Promo rentrée 2026 — Réseau Maillon"/></div>
                  <div className="field"><label>Sujet de l'email</label>
                    <input value={campaignForm.subject} onChange={(e)=>setCampaignForm({...campaignForm,subject:e.target.value})} placeholder="ex : Nos nouveautés du mois"/></div>
                  <div className="field"><label>Liste de diffusion</label>
                    <select value={campaignForm.list} onChange={(e)=>{const val=e.target.value;setCampaignForm({...campaignForm,list:val});applyList(val);}}>
                      <option value="all">Toutes les listes de diffusion ({allListedCompanies.length})</option>
                      {distLists.length>0&&<optgroup label="Vos listes">
                        {distLists.map((l)=><option key={l.id} value={"list:"+l.id}>{l.name} ({l.companyIds.filter((id)=>emailingRecipients.some((c)=>c.id===id)).length})</option>)}
                      </optgroup>}
                    </select>
                    <div className="uphint">Présélectionne les destinataires ci-dessous ; vous pouvez encore ajuster la sélection à la main. Créez vos propres listes dans l'onglet « Listes ».</div>
                  </div>
                  <label className="consentrow">
                    <input type="checkbox" checked={campaignForm.needsRsvp} onChange={(e)=>setCampaignForm({...campaignForm,needsRsvp:e.target.checked})}/>
                    Cette campagne demande une confirmation (ex : présence à un événement)
                  </label>

                  <div className="msec">Destinataires</div>
                  <div className="field">
                    <label>Sélection ({selectedCompanies.length}/{emailingRecipients.length})</label>
                    <div className="libcard" style={{maxHeight:180,overflowY:"auto"}}>
                      {emailingRecipients.map((c)=>(
                        <label key={c.id} className="consentrow" style={{padding:"10px 14px",margin:0}}>
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggleRecipient(c.id)}/>
                          {c.name} <span style={{color:"var(--slate-soft)"}}>· {c.sector}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="msec">Template &amp; tracking</div>
                  <div className="field"><label>Message (texte simple)</label>
                    <textarea rows={3} value={campaignForm.body} onChange={(e)=>setCampaignForm({...campaignForm,body:e.target.value})} placeholder="Votre message aux entreprises abonnées."/></div>
                  <div className="field">
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <label style={{margin:0}}>HTML de l'email (facultatif)</label>
                      <button type="button" className="btn-ghost sm" onClick={()=>setCampaignForm((f)=>({...f,html:buildEmailSkeleton(f.subject)}))}>Générer le squelette email</button>
                    </div>
                    <textarea rows={6} className="mono" style={{fontSize:12.5}} value={campaignForm.html} onChange={(e)=>setCampaignForm({...campaignForm,html:e.target.value})} placeholder="<!DOCTYPE html><html>…"/>
                    <div className="uphint">Placeholders : [Prénom] · [VIEW_ONLINE] · {"{{HEADER}}"} (header expéditeur) · {"{{FOOTER}}"} (footer + désabo) · [REDIRECT_URL] (lien bouton tracké). Le pixel d'ouverture est injecté automatiquement.</div>
                  </div>

                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <button className="btn-ghost" onClick={()=>setCampaignOpen(false)}>Annuler</button>
                    <button className="btn block" disabled={!campaignForm.name.trim()||!campaignForm.subject.trim()||selectedCompanies.length===0} onClick={()=>sendCampaign(selectedCompanies)}>Envoyer la campagne</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div></div>
      );})()}

      {/* LISTES DE DIFFUSION */}
      {view==="lists"&&(()=>{const eligible=connected.filter((c)=>c.emailingConsent);return(
        <div className="wrap"><div className="page">
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 className="ptitle disp">Listes de diffusion</h2>
              <p className="psub" style={{marginBottom:0}}>Regroupez vos entreprises abonnées dans des listes réutilisables (ex : « Mail du jeudi matin ») pour ne plus avoir à tout recocher à chaque campagne.</p></div>
            <button className="btn sm" disabled={eligible.length===0} onClick={()=>{setListForm({name:"",companyIds:[]});setListOpen(true);}}>Créer une liste</button>
          </div>

          {eligible.length===0&&distLists.length===0?(
            <p style={{color:"var(--slate)",fontSize:14,marginTop:26}}>Aucune entreprise n'a encore accepté de recevoir vos campagnes. Le consentement se donne dans l'onglet « Demandes » au moment d'accepter une mise en relation.</p>
          ):distLists.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h7" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <h3>Aucune liste pour l'instant</h3><p>Créez votre première liste de diffusion ci-dessus.</p>
            </div>
          ):(
            <div className="libcard" style={{marginTop:26}}>
              {distLists.map((l)=>{const members=companies.filter((c)=>l.companyIds.includes(c.id));const open=expandedListId===l.id;return(
                <div key={l.id}>
                  <div className="libitem" style={{cursor:"pointer",borderBottom:"1px solid var(--line-soft)"}} onClick={()=>setExpandedListId(open?null:l.id)}>
                    <div className="ni"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:600}}>{l.name}</p>
                      <p style={{margin:"4px 0 0",fontSize:12.5,color:"var(--slate)"}}>{members.map((c)=>c.name).join(", ")||"Aucune entreprise (retirée depuis)"}</p>
                    </div>
                    <span className="nat" style={{display:"flex",alignItems:"center",gap:12}}>
                      {members.length} entreprise{members.length>1?"s":""}
                      <span className="rm" style={{color:"var(--coral)",cursor:"pointer",fontWeight:600}} onClick={(e)=>{e.stopPropagation();deleteList(l.id);}}>Supprimer</span>
                    </span>
                  </div>
                  {open&&(
                    <div style={{background:"var(--paper)",borderBottom:"1px solid var(--line-soft)"}}>
                      {members.length===0?(
                        <p style={{margin:0,padding:"14px 18px",fontSize:13,color:"var(--slate-soft)"}}>Aucune entreprise dans cette liste.</p>
                      ):members.map((c)=>(
                        <div key={c.id} className="subgrp">
                          <div className="subhead">
                            <div className="logo" style={{background:c.color,width:28,height:28,fontSize:12,borderRadius:7}}>{logoImg(c)}</div>
                            <b>{c.name}</b>
                          </div>
                          {(c.emailingContacts||[]).length===0?(
                            <div className="subrow"><span className="tree">└</span><span style={{color:"var(--slate-soft)"}}>Aucun contact enregistré</span></div>
                          ):c.emailingContacts.map((ct,i)=>(
                            <div key={i} className="subrow"><span className="tree">└</span><b style={{color:"var(--ink)"}}>{ct.name}</b>&nbsp;{ct.email}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}

          {listOpen&&(
            <>
              <div className="scrim" onClick={()=>setListOpen(false)}/>
              <div className="modal" onClick={()=>setListOpen(false)}>
                <div className="mbox" onClick={(e)=>e.stopPropagation()}>
                  <div className="mhead">
                    <div><h3 className="disp">Nouvelle liste de diffusion</h3>
                      <p className="mi">ex : « Mail du jeudi matin »</p></div>
                  </div>
                  <div className="field"><label>Nom de la liste</label>
                    <input value={listForm.name} onChange={(e)=>setListForm({...listForm,name:e.target.value})} placeholder="ex : Mail du jeudi matin"/></div>
                  <div className="field">
                    <label>Entreprises ({listForm.companyIds.length}/{eligible.length})</label>
                    <div className="libcard" style={{maxHeight:220,overflowY:"auto"}}>
                      {eligible.map((c)=>(
                        <label key={c.id} className="consentrow" style={{padding:"10px 14px",margin:0}}>
                          <input type="checkbox" checked={listForm.companyIds.includes(c.id)} onChange={()=>toggleListMember(c.id)}/>
                          {c.name} <span style={{color:"var(--slate-soft)"}}>· {c.sector}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <button className="btn-ghost" onClick={()=>setListOpen(false)}>Annuler</button>
                    <button className="btn block" disabled={!listForm.name.trim()||listForm.companyIds.length===0} onClick={createList}>Créer la liste</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div></div>
      );})()}

      {/* MUR DE BESOINS */}
      {view==="needs"&&(
        <div className="wrap"><div className="page">
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 className="ptitle disp">Mur de besoins</h2>
              <p className="psub" style={{marginBottom:0}}>Exprimez ce que vous cherchez, ou proposez vos services aux entreprises qui cherchent. La mise en relation vient à vous.</p></div>
            <button className="btn sm" onClick={()=>setNeedOpen(true)}>Publier un besoin</button>
          </div>

          <div className="filt" style={{margin:"20px 0 18px"}}>
            <button className={"fchip"+(needFilter==="all"?" on":"")} onClick={()=>setNeedFilter("all")}>Tous les besoins</button>
            <button className={"fchip"+(needFilter==="match"?" on":"")} onClick={()=>setNeedFilter("match")}>Qui me correspondent{matchingNeeds.length>0?` (${matchingNeeds.length})`:""}</button>
          </div>

          <div className="needwrap">
            {needs.filter((n)=>needFilter==="all"||n.mine||n.sought===me.sector).map((n)=>{
              const a=needAuthor(n);const match=!n.mine&&n.sought===me.sector;
              return(
                <div key={n.id} className="needcard">
                  <div className="needhead">
                    <div className="logo" style={{background:a.color}}>{logoImg(a)}</div>
                    <div style={{minWidth:0}}><b>{a.name}{n.mine?" · vous":""}</b><small>{a.sector}{a.sector?" · ":""}{n.loc} · {n.date}</small></div>
                    {match&&<span className="needmatch">Correspond à votre activité</span>}
                  </div>
                  <h3>{n.title}</h3>
                  <div className="needmeta">
                    <span className="pill seek">↳ Recherche : {n.sought}</span>
                    <span className="pill offer">{n.loc}</span>
                  </div>
                  <div className="needfoot">
                    <span className="resp">{n.responses} réponse{n.responses>1?"s":""}</span>
                    {n.mine?(
                      <span className="resp" style={{marginLeft:"auto",color:"var(--emerald)",fontWeight:600}}>Votre besoin</span>
                    ):(
                      <button className="btn sm" onClick={()=>respondToNeed(n)}>Proposer mes services</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div></div>
      )}

      {/* PROFILE */}
      {view==="profile"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">Ma page entreprise</h2>
          <p className="psub">Votre tableau de bord et la fiche que voient les autres entreprises.</p>
          <div className="dashsec"><h5 className="dashh">Tableau de bord</h5>
            <div className="dash">
              <div className="dtile"><b>{84+connected.length*12+needs.filter((n)=>n.mine).length*6}</b><span>Vues de la fiche (30 j)</span></div>
              <div className="dtile"><b>{connected.length}</b><span>Relations actives</span></div>
              <div className="dtile"><b>{incoming.length}</b><span>Demandes reçues</span></div>
              <div className="dtile"><b>{prospectsUsed}</b><span>Démarchages envoyés</span></div>
              <div className="dtile"><b>{needs.filter((n)=>n.mine).length}</b><span>Besoins publiés</span></div>
              <div className="dtile"><b>★ {me.rating}</b><span>Note moyenne</span></div>
            </div>
          </div>
          <div className="prof">
            <div className="profban" style={{background:`linear-gradient(120deg, ${me.color}, ${me.color}bb)`}}/>
            <div className="profbody">
              <div className="profident">
                <div className="proflogo" style={{background:me.color}}>{logoImg(me)}</div>
                <div><div className="profname disp">{me.name}<Check className="verif" style={{width:18,height:18}}/></div>
                  <div className="profmeta">{me.sector} · {me.loc} · {me.size}</div></div>
              </div>
              <div className="pgrid" style={{marginTop:4}}>
                <div className="pcell"><div className="k">Création</div><div className="v">{me.founded}</div></div>
                <div className="pcell"><div className="k">Chiffre d'affaires</div><div className="v">{me.ca}</div></div>
                <div className="pcell"><div className="k">Effectif</div><div className="v">{me.size}</div></div>
                <div className="pcell"><div className="k">Site web</div><div className="v">{me.web}</div></div>
                <div className="pcell"><div className="k">SIRET</div><div className="v" style={{fontSize:12.5}}>{me.siret||"—"}{me.verifiedSiren&&<Check className="verif" style={{width:13,height:13,marginLeft:5}}/>}</div></div>
                <div className="pcell"><div className="k">Abonnement</div><div className="v" style={{color:me.membre?"var(--emerald)":"var(--ink)"}}>{me.planId==="gratuit"?me.plan:`${me.plan} · ${me.billing}`}</div></div>
              </div>
              <div className="profsec"><h5>Pôle de réception des demandes</h5><p>Les demandes de mise en relation adressées à votre entreprise arrivent au pôle <b>{me.receptionPole}</b>.</p></div>
              <div className="profsec"><h5>Présentation</h5><p>{me.desc}</p></div>
              <div className="profsec"><h5>Ce que nous recherchons</h5>
                <div className="seek" style={{marginTop:4}}>{me.seek.map((s)=><span key={s} className="pill seek">↳ {s}</span>)}</div></div>
              <div className="profsec"><h5>Ce que nous proposons</h5>
                <div className="seek" style={{marginTop:4}}>{me.offer.map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
              {me.certifs.length>0&&<div className="profsec"><h5>Certifications</h5>
                <div className="seek" style={{marginTop:4}}>{me.certifs.map((s)=><span key={s} className="pill cert">{s}</span>)}</div></div>}
              <div style={{marginTop:22}}><button className="btn-ghost sm" onClick={()=>{setMe(null);setObStep(0);}}>Recréer / modifier ma page</button></div>
            </div>
          </div>
        </div></div>
      )}

      {/* BLOG CENTRAL */}
      {view==="blog"&&(
        <div className="wrap"><div className="page">
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 className="ptitle disp">Actualités</h2>
              <p className="psub" style={{marginBottom:0}}>Le fil commun des entreprises de Maillon. La lecture est ouverte à tous ; publier demande une adhésion.</p></div>
            <button className="btn sm" onClick={tryPublish}>Publier une actualité</button>
          </div>

          <div className="blog" style={{marginTop:24}}>
            <div>
              {!me.membre&&(
                <div className="memban">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v6H3z" stroke="#7a5305" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  <span>La publication est réservée à l'offre Pro. <b>Passez Pro</b> pour partager vos news.</span>
                  <button className="btn" onClick={()=>setAdhesion(true)}>Passer Pro</button>
                </div>
              )}
              <div className="feed">
                {posts.map((p)=>{const orig=p.repostOf||p.author;return(
                  <div key={p.id} className="post">
                    {p.repostOf&&(
                      <div className="repostmeta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 2l4 4-4 4M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 0 1-3 3H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Republié par <b>{p.author.name}</b>
                      </div>
                    )}
                    <div className="posthead">
                      <div className="logo" style={{background:orig.color}}>{logoImg(orig)}</div>
                      <div className="who"><b>{orig.name}{orig.isMe&&<Check className="verif"/>}</b>
                        <small>{orig.sector} · {orig.loc} · {p.date}</small></div>
                      <span className="posttag">{p.tag}</span>
                    </div>
                    <h3>{p.title}</h3>
                    {p.body&&<p className="body">{p.body}</p>}
                    {p.photo&&<img className="postphoto" src={p.photo} alt=""/>}
                    <div className="postfoot">
                      <button className={"like"+(p.liked?" on":"")} onClick={()=>toggleLike(p.id)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill={p.liked?"currentColor":"none"}><path d="M8 13.5S2 9.8 2 5.9A3 3 0 0 1 8 4a3 3 0 0 1 6 1.9c0 3.9-6 7.6-6 7.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                        {p.likes}
                      </button>
                      <span style={{fontSize:13,color:"var(--slate)",display:"flex",alignItems:"center",gap:6}}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 3h10v8H6l-3 2.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>Commenter</span>
                      <button className="like rep" onClick={()=>repost(p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 2l4 4-4 4M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 0 1-3 3H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Republier
                      </button>
                      {p.author.isMe&&<span className="postself">{p.repostOf?"Republié par vous":"Votre publication"}</span>}
                    </div>
                  </div>
                );})}
              </div>
            </div>

            <aside className="bside">
              {me.membre?(
                <div className="memok">
                  <h4><Check/> Offre Pro active</h4>
                  <p>Abonnement {me.plan} · {me.billing}. Vous pouvez publier vos actualités sur le fil commun.</p>
                  <button className="btn block" onClick={tryPublish}>Publier une actualité</button>
                </div>
              ):(
                <div className="memcard">
                  <h4>Passez à l'offre Pro</h4>
                  <p>Votre offre {me.plan} n'inclut pas la publication. Passez Pro pour publier vos news et gagner en visibilité.</p>
                  <ul>
                    <li><Check/> Publier sur le fil commun</li>
                    <li><Check/> Mise en avant de vos news</li>
                    <li><Check/> Statistiques de visibilité</li>
                    <li><Check/> Badge Pro sur votre page</li>
                  </ul>
                  <button className="btn-light" onClick={()=>setAdhesion(true)}>Voir l'offre Pro</button>
                </div>
              )}
            </aside>
          </div>
        </div></div>
      )}

      {/* DETAIL PANEL */}
      {detail&&(
        <>
          <div className="scrim" onClick={()=>setOpenC(null)}/>
          <div className="panel">
            <button className="pclose" onClick={()=>setOpenC(null)}><XI/></button>
            <div className="pban" style={{background:`linear-gradient(120deg, ${detail.color}, ${detail.color}bb)`}}/>
            <div className="phead">
              <div className="pident">
                <div className="plogo" style={{background:detail.color}}>{detail.name[0]}</div>
                <div><div className="pname disp">{detail.name}{detail.verified&&<Check className="verif" style={{width:17,height:17}}/>}</div>
                  <div className="csector">{detail.sector} · {detail.loc} · {detail.size}</div></div>
              </div>
              <div className="paff">
                <Ring score={dAff}/>
                <div className="why"><b>{dAff}% d'affinité avec {me.name}.</b> Estimée sur la complémentarité de vos activités, ce que vous cherchez de part et d'autre, et la proximité.</div>
              </div>
              <div className="pgrid">
                <div className="pcell"><div className="k">Création</div><div className="v">{detail.founded}</div></div>
                <div className="pcell"><div className="k">Effectif</div><div className="v">{detail.emp}</div></div>
                <div className="pcell"><div className="k">Chiffre d'affaires</div><div className="v">{detail.ca}</div></div>
                <div className="pcell"><div className="k">Disponibilité</div><div className="v">{detail.dispo}</div></div>
                <div className="pcell"><div className="k">Note</div><div className="v">★ {detail.rating}</div></div>
                <div className="pcell"><div className="k">Références</div><div className="v">{detail.refs} clients</div></div>
                <div className="pcell"><div className="k">Langues</div><div className="v">{detail.langues.join(", ")}</div></div>
                <div className="pcell"><div className="k">SIRET</div><div className="v" style={{fontSize:12.5}}>{detail.siret}{detail.verifiedSiren&&<Check className="verif" style={{width:13,height:13,marginLeft:5}}/>}</div></div>
                <div className="pcell"><div className="k">Site web</div><div className="v">{detail.web}</div></div>
              </div>
            </div>
            <div className="psec"><h5>À propos</h5><p>{detail.desc}</p></div>
            <div className="psec"><h5>Ce qu'elle recherche</h5>
              <div className="seek">{detail.seek.map((s)=><span key={s} className="pill seek">↳ {s}</span>)}</div></div>
            <div className="psec"><h5>Ce qu'elle propose</h5>
              <div className="seek">{detail.offer.map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
            {detail.certifs.length>0&&<div className="psec"><h5>Certifications & labels</h5>
              <div className="seek">{detail.certifs.map((s)=><span key={s} className="pill cert">{s}</span>)}</div></div>}
            <div className="psec"><h5>Services / départements</h5>
              <div className="seek">{(detail.services||[]).map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
            <div className="psec"><h5>Réception des demandes</h5>
              <p style={{fontSize:14,color:"var(--slate)"}}>Les demandes de mise en relation arrivent au pôle <b style={{color:"var(--ink)"}}>{detail.receptionPole}</b>.</p>
              <button className="linkbtn" style={{marginTop:10,color:"var(--coral)"}} onClick={()=>toast(`${detail.name} signalée — notre équipe va examiner`)}>⚑ Signaler cette entreprise</button></div>
            <div className="pcta">
              {detail.rel==="none"?(
                <button className="btn block" onClick={()=>openProspect(detail)}>Démarcher {detail.name}</button>
              ):detail.rel==="connected"?(
                <button className="btn block" onClick={()=>{setActiveConv(detail.id);setView("messages");setOpenC(null);}}>Ouvrir la discussion</button>
              ):detail.rel==="incoming"?(
                <button className="btn block" onClick={()=>{setView("requests");setOpenC(null);}}>Répondre à sa demande</button>
              ):detail.rel==="sent"?(
                <button className="btn-ghost block" disabled style={{opacity:.6}}>Demande en attente</button>
              ):(<button className="btn-ghost block" disabled style={{opacity:.6}}>Demande déclinée</button>)}
            </div>
          </div>
        </>
      )}

      {/* PROSPECT MODAL */}
      {prospect&&(
        <>
          <div className="scrim" onClick={()=>setProspect(null)}/>
          <div className="modal" onClick={()=>setProspect(null)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <div className="mhead">
                <div className="logo" style={{background:prospect.color}}>{prospect.name[0]}</div>
                <div><h3 className="disp">Démarcher {prospect.name}</h3>
                  <p className="mi">Votre demande part avec votre message. {prospect.name} accepte ou refuse la mise en relation.</p></div>
              </div>
              <div className="accnote" style={{marginBottom:14}}>Votre demande sera reçue par le pôle <b>{prospect.receptionPole}</b> de {prospect.name}, qui décidera de l'accepter.</div>
              <div className="field"><label>Votre message d'introduction</label>
                <textarea rows={4} value={pmsg} onChange={(e)=>setPmsg(e.target.value)}/></div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setProspect(null)}>Annuler</button>
                <button className="btn block" onClick={sendProspect}>Envoyer la demande</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ADHÉSION MODAL */}
      {adhesion&&(
        <>
          <div className="scrim" onClick={()=>setAdhesion(false)}/>
          <div className="modal" onClick={()=>setAdhesion(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">Passer à l'offre Pro</h3>
              <p className="mi" style={{marginBottom:18}}>La publication d'actualités est incluse dans l'offre Pro. Choisissez votre facturation :</p>
              <div className="plan" onClick={()=>adhere("Mensuelle")}>
                <div className="pn">Pro — mensuel</div>
                <div className="pp">39 €<small> / mois</small></div>
              </div>
              <div className="plan" onClick={()=>adhere("Annuelle")}>
                <div className="pn">Pro — annuel <span className="best">2 mois offerts</span></div>
                <div className="pp">374 €<small> / an</small></div>
              </div>
              <p className="simnote">Maquette — abonnement simulé, aucun paiement réel n'est effectué.</p>
            </div>
          </div>
        </>
      )}

      {/* COMPOSE MODAL */}
      {composeOpen&&(
        <>
          <div className="scrim" onClick={()=>setComposeOpen(false)}/>
          <div className="modal" onClick={()=>setComposeOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <div className="mhead">
                <div className="logo" style={{background:me.color}}>{logoImg(me)}</div>
                <div><h3 className="disp">Publier une actualité</h3>
                  <p className="mi">Elle apparaîtra sur le fil commun au nom de {me.name}.</p></div>
              </div>
              <div className="field"><label>Titre</label>
                <input value={postForm.title} onChange={(e)=>setPostForm({...postForm,title:e.target.value})} placeholder="ex : Nous recrutons un développeur"/></div>
              <div className="field"><label>Catégorie</label>
                <input value={postForm.tag} onChange={(e)=>setPostForm({...postForm,tag:e.target.value})} placeholder="Offre, Recrutement, Certification…"/></div>
              <div className="field"><label>Message</label>
                <textarea rows={4} value={postForm.body} onChange={(e)=>setPostForm({...postForm,body:e.target.value})} placeholder="Votre actualité en quelques lignes."/></div>
              <div className="field"><label>Photo (facultative)</label>
                {postForm.photo?(
                  <div className="photopick">
                    <img src={postForm.photo} alt=""/>
                    <span className="rm" onClick={()=>setPostForm((f)=>({...f,photo:null}))}>Retirer la photo</span>
                  </div>
                ):(
                  <label className="uplabel btn-ghost sm">Ajouter une photo<input type="file" accept="image/*" onChange={onPhotoPick} style={{display:"none"}}/></label>
                )}
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setComposeOpen(false)}>Annuler</button>
                <button className="btn block" onClick={publish}>Publier</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VISIO SETUP */}
      {visioSetup&&active&&(
        <>
          <div className="scrim" onClick={()=>setVisioSetup(false)}/>
          <div className="modal" onClick={()=>setVisioSetup(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">Visio avec {active.name}</h3>
              <p className="mi" style={{marginBottom:14}}>Choisissez un ou plusieurs services — vous pouvez inviter plusieurs services à la même visio.</p>
              <div className="field"><label>Services concernés</label>
                <div className="svcwrap">
                  {(isAdmin?[...new Set([...(me.services||[]),...(active.services||[])])]:[role,...(access.grants[role]||[])]).map((s)=>(
                    <button key={s} type="button" className={"svcchip"+(visioSvcs.includes(s)?" on":"")}
                      onClick={()=>setVisioSvcs((v)=>v.includes(s)?v.filter((x)=>x!==s):[...v,s])}>{s}</button>
                  ))}
                </div>
                <div className="uphint">{isAdmin?(visioSvcs.length>1?`Visio de groupe · ${visioSvcs.length} services`:"Sélectionnez un ou plusieurs services"):`En tant que ${role}, vous ne pouvez lancer une visio que pour votre service.`}</div>
              </div>
              <button className="btn block" onClick={()=>startVisio(active,visioSvcs)} style={visioSvcs.length?{}:{opacity:.5,pointerEvents:"none"}}>Démarrer la visio maintenant</button>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0",color:"var(--slate-soft)",fontSize:12}}><div style={{flex:1,height:1,background:"var(--line)"}}/>ou planifier<div style={{flex:1,height:1,background:"var(--line)"}}/></div>
              <div className="grid2">
                <div className="field"><label>Date</label><input type="date" value={schedForm.date} onChange={(e)=>setSchedForm({...schedForm,date:e.target.value})}/></div>
                <div className="field"><label>Heure</label><input type="time" value={schedForm.time} onChange={(e)=>setSchedForm({...schedForm,time:e.target.value})}/></div>
              </div>
              <button className="btn-ghost" style={{width:"100%",...(visioSvcs.length?{}:{opacity:.5,pointerEvents:"none"})}} onClick={scheduleVisio}>Planifier la visio</button>
              <p className="simnote">Visio simulée — aucune vidéo réelle n'est établie dans la maquette.</p>
            </div>
          </div>
        </>
      )}

      {/* VISIO ROOM */}
      {visio&&(()=>{const c=companies.find((x)=>x.id===visio.companyId);if(!c)return null;return <VisioRoom me={me} company={c} services={visio.services} onEnd={endVisio}/>;})()}

      {/* ACCÈS & CLOISONNEMENT */}
      {accessOpen&&(
        <>
          <div className="scrim" onClick={()=>setAccessOpen(false)}/>
          <div className="modal" onClick={()=>setAccessOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">Accès &amp; cloisonnement</h3>
              {isAdmin?(
                <p className="mi" style={{marginBottom:16}}>Vous êtes administrateur ({role}). Définissez qui a l'accès complet, et ce que chaque service peut voir en plus du sien.</p>
              ):(
                <p className="mi" style={{marginBottom:16}}>Réservé aux administrateurs. Vous êtes connecté en tant que {role} — voici les règles en vigueur (lecture seule).</p>
              )}

              <div className="accsec">
                <h5>Accès complet (administrateurs)</h5>
                <p className="d">Ces services voient la messagerie de tous les autres.</p>
                <div className="svcwrap">
                  {(me.services||[]).map((s)=>(
                    <button key={s} type="button" className={"svcchip"+(access.admins.includes(s)?" on":"")}
                      onClick={()=>isAdmin&&toggleAdmin(s)} style={isAdmin?{}:{cursor:"default",opacity:.9}}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="accsec">
                <h5>Autorisations supplémentaires</h5>
                <p className="d">Par défaut, chaque service ne voit que le sien. Accordez ici des accès en plus.</p>
                {(me.services||[]).filter((s)=>!access.admins.includes(s)).map((s)=>(
                  <div key={s} className="accrow">
                    <div className="rn">{s}<span style={{fontWeight:400,color:"var(--slate)",fontSize:12}}>peut aussi voir :</span></div>
                    <div className="svcwrap">
                      {(me.services||[]).filter((o)=>o!==s&&!access.admins.includes(o)).map((o)=>(
                        <button key={o} type="button" className={"svcchip"+((access.grants[s]||[]).includes(o)?" on":"")}
                          onClick={()=>isAdmin&&toggleGrant(s,o)} style={isAdmin?{}:{cursor:"default",opacity:.9}}>{o}</button>
                      ))}
                      {(me.services||[]).filter((o)=>o!==s&&!access.admins.includes(o)).length===0&&<span style={{fontSize:12.5,color:"var(--slate-soft)"}}>Aucun autre service à partager.</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="accsec">
                <h5>Collaborateurs</h5>
                <p className="d">Chaque collaborateur est rattaché à un rôle. Il ne voit que ce que ce rôle autorise — il ne peut pas le changer lui-même.</p>
                {team.map((m)=>(
                  <div key={m.id} className="accrole">
                    <div><b style={m.status==="disabled"?{color:"var(--slate-soft)"}:{}}>{m.name}</b><small> {m.status==="invited"?"invitation en attente":m.status==="disabled"?"compte désactivé":(access.admins.includes(m.role)?"administrateur":"accès cloisonné")}</small></div>
                    <select value={m.role} onChange={(e)=>isAdmin&&updateRole(m.id,e.target.value)} disabled={!isAdmin||m.status==="disabled"}>{(me.services||[]).map((s)=><option key={s} value={s}>{s}</option>)}</select>
                    {isAdmin&&m.status!=="invited"&&<button className="linkbtn" style={{fontSize:12,marginLeft:2}} onClick={()=>toggleAccount(m.id)}>{m.status==="disabled"?"Réactiver":"Désactiver"}</button>}
                  </div>
                ))}
              </div>

              {isAdmin&&(
                <div className="accsec">
                  <h5>Inviter un collaborateur</h5>
                  <p className="d">Envoyez une invitation par e-mail. La personne crée son compte et rejoint avec le rôle choisi.</p>
                  <div className="invrow">
                    <input placeholder="prenom.nom@entreprise.fr" value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)}/>
                    <select value={inviteRole||(me.services.find((s)=>!access.admins.includes(s))||me.services[0])} onChange={(e)=>setInviteRole(e.target.value)}>{(me.services||[]).map((s)=><option key={s} value={s}>{s}</option>)}</select>
                    <button className="btn sm" onClick={()=>{sendInvite(inviteEmail,inviteRole||(me.services.find((s)=>!access.admins.includes(s))||me.services[0]));setInviteEmail("");}}>Inviter</button>
                  </div>
                </div>
              )}

              <div className="accsec">
                <h5>Pôle de réception des demandes</h5>
                <p className="d">Le pôle qui reçoit toutes les demandes de mise en relation adressées à votre entreprise.</p>
                <select value={me.receptionPole} onChange={(e)=>isAdmin&&setReceptionPole(e.target.value)} disabled={!isAdmin} style={{border:"1px solid var(--line)",borderRadius:10,padding:"8px 11px",fontSize:13.5,fontWeight:600,background:"#fff",color:"var(--ink)"}}>{(me.services||[]).map((s)=><option key={s} value={s}>{s}</option>)}</select>
              </div>

              <div className="accsec">
                <h5>Sécurité &amp; notifications</h5>
                <label className="setrow"><span>Double authentification (2FA)</span><input type="checkbox" checked={twofa} onChange={()=>{if(!isAdmin)return;setTwofa(!twofa);logEvent(`2FA ${!twofa?"activée":"désactivée"}`);}} disabled={!isAdmin}/></label>
                <label className="setrow"><span>Notifications par e-mail</span><input type="checkbox" checked={notifEmail} onChange={()=>setNotifEmail(!notifEmail)}/></label>
                <label className="setrow"><span>Notifications push</span><input type="checkbox" checked={notifPush} onChange={()=>setNotifPush(!notifPush)}/></label>
              </div>

              <div className="accsec">
                <h5>Journal d'accès</h5>
                <p className="d">Historique des actions sensibles sur votre espace.</p>
                {auditLog.length===0?<p style={{fontSize:12.5,color:"var(--slate-soft)"}}>Aucune action enregistrée pour l'instant.</p>:
                  <div className="auditlist">{auditLog.slice(0,8).map((e)=><div key={e.id} className="auditrow"><span className="at">{e.at}</span>{e.text}</div>)}</div>}
              </div>

              <div className="accnote">Le cloisonnement s'applique à votre entreprise uniquement. L'autre entreprise gère ses propres règles de son côté.</div>
              <button className="btn block" style={{marginTop:16}} onClick={()=>setAccessOpen(false)}>Fermer</button>
            </div>
          </div>
        </>
      )}

      {/* LIMITE OFFRE GRATUITE */}
      {limitOpen&&(
        <>
          <div className="scrim" onClick={()=>setLimitOpen(false)}/>
          <div className="modal" onClick={()=>setLimitOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">Passez à la vitesse supérieure</h3>
              <p className="mi" style={{marginBottom:18}}>L'offre Découverte est limitée à 5 démarchages, non renouvelables{remaining()===0?" — vous les avez tous utilisés":""}. Pour continuer à démarcher, passez à une offre payante (démarchages illimités).</p>
              <div className="plan" onClick={()=>upgradeTo("essentiel","Mensuelle")}>
                <div className="pn">Pro</div>
                <div className="pp">19 €<small> / mois</small></div>
                <div className="tg2" style={{margin:"2px 0 0"}}>Démarchages illimités + mur de besoins & visio</div>
              </div>
              <div className="plan" onClick={()=>upgradeTo("pro","Mensuelle")}>
                <div className="pn">Business <span className="best">Blog inclus</span></div>
                <div className="pp">39 €<small> / mois</small></div>
                <div className="tg2" style={{margin:"2px 0 0"}}>Tout Pro + actualités, mise en avant & visio de groupe</div>
              </div>
              <p className="simnote">Abonnement simulé — aucun paiement réel n'est effectué.</p>
            </div>
          </div>
        </>
      )}

      {/* PUBLIER UN BESOIN */}
      {needOpen&&(
        <>
          <div className="scrim" onClick={()=>setNeedOpen(false)}/>
          <div className="modal" onClick={()=>setNeedOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">Publier un besoin</h3>
              <p className="mi" style={{marginBottom:16}}>Décrivez ce que vous cherchez. Les entreprises concernées pourront vous proposer leurs services.</p>
              <div className="field"><label>Votre besoin</label>
                <textarea rows={3} value={needForm.title} onChange={(e)=>setNeedForm({...needForm,title:e.target.value})} placeholder="ex : Nous cherchons un prestataire logistique en Bretagne"/></div>
              <div className="grid2">
                <div className="field"><label>Secteur recherché</label>
                  <select value={needForm.sought} onChange={(e)=>setNeedForm({...needForm,sought:e.target.value})}>{SECTORS.map((s)=><option key={s}>{s}</option>)}</select></div>
                <div className="field"><label>Localisation</label>
                  <input value={needForm.loc} onChange={(e)=>setNeedForm({...needForm,loc:e.target.value})} placeholder={me.loc}/></div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setNeedOpen(false)}>Annuler</button>
                <button className="btn block" onClick={publishNeed}>Publier</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* COLLABORATION : DEVIS / DOCUMENT */}
      {collab&&active&&(
        <>
          <div className="scrim" onClick={()=>setCollab(null)}/>
          <div className="modal" onClick={()=>setCollab(null)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{collab==="quote"?"Demander un devis":"Partager un document"}</h3>
              <p className="mi" style={{marginBottom:16}}>Service {mSvc} · {active.name}.</p>
              {collab==="quote"?(
                <>
                  <div className="field"><label>Objet de la demande</label><input value={collabForm.subject} onChange={(e)=>setCollabForm({...collabForm,subject:e.target.value})} placeholder="ex : Refonte de notre site e-commerce"/></div>
                  <div className="field"><label>Budget indicatif (optionnel)</label><input value={collabForm.budget} onChange={(e)=>setCollabForm({...collabForm,budget:e.target.value})} placeholder="ex : 5 000 – 8 000 €"/></div>
                </>
              ):(
                <div className="field"><label>Nom du document</label><input value={collabForm.name} onChange={(e)=>setCollabForm({...collabForm,name:e.target.value})} placeholder="Proposition_commerciale.pdf"/></div>
              )}
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setCollab(null)}>Annuler</button>
                <button className="btn block" onClick={postCollab}>{collab==="quote"?"Envoyer la demande":"Partager"}</button>
              </div>
              <p className="simnote">Espace de collaboration — dans la vraie application, devis et fichiers seraient réellement transmis et stockés.</p>
            </div>
          </div>
        </>
      )}

      <div className="toasts">
        {toasts.map((t)=><div key={t.id} className="toast">{t.t.startsWith("✓")?<span className="tk"><Check/></span>:null}{t.t.replace("✓ ","")}</div>)}
      </div>

      <div className="foot">Prototype <b>Maillon</b> — tous secteurs · carte · affinité · double consentement · messagerie par service · visio · blog & adhésion · données fictives</div>
    </div>
  );
}
