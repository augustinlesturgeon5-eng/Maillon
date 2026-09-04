"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const RealFranceMap = dynamic(() => import("./RealFranceMap"), { ssr: false });

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
  "Logistique & Transport":"#3B6FB0", "RH & Recrutement":"#8A5BC0", "Juridique & Compta":"#26282B",
  "Finance & Assurance":"#1E7A6B", "Conseil & Stratégie":"#B0472F", "Industrie & Production":"#4A7A3B",
  "BTP & Construction":"#C08A2E", "Immobilier":"#5B6EA8", "Commerce & Distribution":"#C0417E",
  "Restauration & Traiteur":"#D2691E", "Événementiel":"#A0439E", "Santé & Bien-être":"#2E9E8A",
  "Éducation & Formation":"#3D6FA0", "Énergie & Environnement":"#5A8F3C", "Agroalimentaire":"#8A9A3B",
  "Tourisme & Hôtellerie":"#C75B4A", "Média & Audiovisuel":"#6A5BC0",
};
const SECTORS = Object.keys(SECTOR_COLORS);
const COLORS = ["#0F846B","#DC5B41","#3B6FB0","#D98A12","#8A5BC0","#C0417E","#26282B","#4A7A3B"];
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


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;450;500;600;700&display=swap');
.mln * { box-sizing:border-box; }
.mln {
  --ink:#26282B; --paper:#FAFAF9; --surface:#FFFFFF;
  --line:#E5E5E7; --line-soft:#F0F0F0; --slate:#54565B; --slate-soft:#8A8C90;
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

.mln .onb{position:relative;max-width:560px;margin:0 auto;padding:48px 24px;}
.mln .onb .eyebrow{font-family:'Inter';font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);font-weight:700;}
.mln .onb h1{font-family:'Bricolage Grotesque';font-weight:800;font-size:clamp(28px,5vw,42px);margin:14px 0 10px;letter-spacing:-.02em;}
.mln .onb p.lead{font-size:16px;color:var(--slate);margin:0 0 26px;}
.mln .steps{display:flex;gap:8px;margin-bottom:22px;}
.mln .stp{flex:1;height:4px;border-radius:2px;background:var(--line);}
.mln .stp.on{background:var(--emerald);}
.mln .stphint{font-family:'Inter';font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate-soft);margin-bottom:16px;}

.mln .landing{min-height:100vh;background:var(--paper);overflow-x:hidden;}
.mln .landbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:20px 28px;background:rgba(251,250,247,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);}
.mln .landbar .actions{display:flex;align-items:center;gap:14px;}
.mln .landglow{position:relative;}
.mln .landglow::before{content:"";position:absolute;top:-140px;left:50%;transform:translateX(-50%);width:min(1000px,160vw);height:620px;background:radial-gradient(closest-side, rgba(15,132,107,.18), rgba(15,132,107,0) 72%);pointer-events:none;z-index:0;}
.mln .landglow::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(15,24,38,.06) 1px, transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(closest-side, #000 0%, transparent 75%);mask-image:radial-gradient(closest-side, #000 0%, transparent 75%);-webkit-mask-position:top center;mask-position:top center;pointer-events:none;z-index:0;}
.mln .landhero{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:72px 24px 56px;text-align:center;}
.mln .landhero .eyebrow{font-family:'Inter';font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--emerald);font-weight:700;margin-bottom:16px;}
.mln .landhero h1{font-family:'Bricolage Grotesque';font-weight:800;font-size:clamp(34px,6vw,58px);line-height:1.06;letter-spacing:-.02em;margin:0 0 18px;}
.mln .landhero h1 .accent{color:var(--emerald);}
.mln .landhero p.lead{font-size:17px;color:var(--slate);max-width:560px;margin:0 auto 30px;line-height:1.55;}
.mln .landcta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;}
.mln .landcta .btn,.mln .landcta .btn-ghost{padding:14px 26px;font-size:15.5px;}
.mln .landcta .btn{box-shadow:0 16px 34px -16px rgba(15,132,107,.55);}
.mln .landsub{font-size:12.5px;color:var(--slate-soft);}
.mln .landfeats{position:relative;z-index:1;max-width:1040px;margin:0 auto;padding:10px 24px 64px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;}
.mln .featcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px 22px;text-align:left;transition:transform .28s cubic-bezier(.22,1,.36,1),box-shadow .28s ease,border-color .28s ease;}
.mln .featcard:hover{transform:translateY(-5px);box-shadow:0 22px 44px -26px rgba(15,24,38,.24);border-color:var(--emerald);}
.mln .featcard .fi{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--emerald-wash),#fff);color:var(--emerald);display:flex;align-items:center;justify-content:center;margin-bottom:14px;}
.mln .featcard h4{font-family:'Bricolage Grotesque';font-weight:700;font-size:16px;margin:0 0 8px;}
.mln .featcard p{font-size:13.5px;color:var(--slate);line-height:1.5;margin:0;}
.mln .landbanner{position:relative;overflow:hidden;max-width:760px;margin:0 auto 72px;padding:40px 32px;border-radius:20px;background:radial-gradient(130% 180% at 50% -30%, rgba(22,168,134,.4), transparent 62%),var(--ink);text-align:center;}
.mln .landbanner h3{position:relative;font-family:'Bricolage Grotesque';color:#fff;font-weight:800;font-size:clamp(20px,3vw,26px);margin:0 0 10px;}
.mln .landbanner p{position:relative;color:#c7ccd4;font-size:14px;margin:0 0 22px;}
.mln .landbanner .btn{position:relative;background:var(--emerald);}
.mln .landbanner .btn:hover{background:var(--emerald-bright);}
.mln .reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease;}
.mln .reveal.in{opacity:1;transform:none;}
@media (prefers-reduced-motion: reduce){.mln .reveal{opacity:1;transform:none;transition:none;}}

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
.mln .mapview{flex:1;min-width:280px;height:520px;border-radius:14px;overflow:hidden;}
.mln .mapview .leaflet-popup-content-wrapper{border-radius:10px;}

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
.mln .fchip{font-size:13px;font-weight:600;padding:8px 13px;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--slate);cursor:pointer;white-space:nowrap;}
.mln .fchip:hover{border-color:var(--ink);color:var(--ink);}
.mln .fchip.on{background:var(--emerald);color:#fff;border-color:var(--emerald);}

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
.mln .agdate{font-family:'Bricolage Grotesque';font-weight:700;font-size:17px;text-transform:capitalize;}
.mln .agdayhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line);flex-wrap:wrap;}
.mln .agevent{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.mln .agtime{font-family:'Inter';font-weight:700;font-size:15px;color:var(--ink);min-width:50px;}
.mln .agevent .aginfo b{font-size:14.5px;}
.mln .agsvcs{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;}
.mln .agevent .btn{margin-left:auto;}
.mln .calwrap{background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:26px;overflow:hidden;box-shadow:0 1px 2px rgba(16,20,25,.03);}
.mln .calhead{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line-soft);background:linear-gradient(180deg,var(--sea),transparent);}
.mln .calhead h4{font-family:'Bricolage Grotesque';font-weight:700;font-size:18px;letter-spacing:-.01em;text-transform:capitalize;margin:0;min-width:170px;text-align:center;}
.mln .calnav{display:flex;align-items:center;gap:6px;}
.mln .calnavbtn{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--slate);transition:background .15s ease,color .15s ease,transform .15s ease;}
.mln .calnavbtn:hover{background:var(--emerald-wash);color:var(--emerald);transform:scale(1.06);}
.mln .calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:14px 12px 16px;}
.mln .calweekday{text-align:center;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--slate-soft);padding-bottom:10px;}
.mln .calcell{position:relative;aspect-ratio:1;border:none;border-radius:12px;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:4px 2px;cursor:pointer;font-family:'Inter';gap:3px;transition:background .15s ease;}
.mln .calcell:hover{background:var(--sea);}
.mln .calnum{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink);transition:background .15s ease,color .15s ease,transform .15s ease;}
.mln .calcell:hover .calnum{transform:scale(1.06);}
.mln .calcell.out .calnum{color:var(--slate-soft);opacity:.55;}
.mln .calcell.today .calnum{background:var(--emerald-wash);color:var(--emerald);font-weight:700;}
.mln .calcell.sel .calnum{background:var(--emerald);color:#fff;font-weight:700;box-shadow:0 3px 10px -2px rgba(15,132,107,.5);}
.mln .caldots{display:flex;gap:3px;flex-wrap:wrap;justify-content:center;max-width:36px;}
.mln .caldot{width:5px;height:5px;border-radius:50%;flex:0 0 auto;}
.mln .calmore{font-size:9px;line-height:1;color:var(--slate-soft);font-weight:600;}
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
.mln .login{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;background:radial-gradient(120% 120% at 50% 0%, #fff 0%, var(--paper) 60%);}
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
.mln .nat{display:block;font-family:'Inter';font-size:10.5px;color:var(--slate-soft);margin-top:3px;text-transform:capitalize;}
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
.mln .emptynet{position:relative;max-width:480px;margin:48px auto;padding:56px 32px;text-align:center;}
.mln .emptynet::before{content:"";position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:280px;height:280px;background:radial-gradient(closest-side, rgba(15,132,107,.14), rgba(15,132,107,0) 72%);pointer-events:none;z-index:0;}
.mln .emptynet-icon{position:relative;z-index:1;width:64px;height:64px;margin:0 auto 20px;border-radius:18px;background:linear-gradient(135deg,var(--emerald-wash),#fff);color:var(--emerald);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -18px rgba(15,132,107,.5);}
.mln .emptynet h3{position:relative;z-index:1;font-family:'Bricolage Grotesque';font-weight:800;font-size:22px;color:var(--ink);margin:0 0 10px;}
.mln .emptynet p{position:relative;z-index:1;font-size:14px;color:var(--slate);line-height:1.55;max-width:380px;margin:0 auto 24px;}
.mln .emptynet-cta{position:relative;z-index:1;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.mln .foot{border-top:1px solid var(--line);padding:24px;text-align:center;font-size:12.5px;color:var(--slate-soft);}
.mln .foot b{font-family:'Bricolage Grotesque';color:var(--slate);}
.mln .foot a{color:var(--slate-soft);text-decoration:underline;text-underline-offset:2px;}
.mln .foot a:hover{color:var(--emerald);}

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
.mln .best{font-family:'Inter';font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--emerald);color:#fff;padding:3px 8px;border-radius:999px;animation:bestPulse 2.4s ease-in-out infinite;}
@keyframes bestPulse{0%,100%{box-shadow:0 0 0 0 rgba(15,132,107,.35);}50%{box-shadow:0 0 0 5px rgba(15,132,107,0);}}
.mln .simnote{font-size:11.5px;color:var(--slate-soft);text-align:center;margin-top:6px;}

/* onboarding : choix d'abonnement */
.mln .billtoggle{position:relative;display:inline-flex;background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:3px;gap:2px;margin-bottom:16px;}
.mln .billtoggle .slide{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);background:var(--ink);border-radius:9px;transition:transform .32s cubic-bezier(.22,1,.36,1);z-index:0;}
.mln .billtoggle button{position:relative;z-index:1;font-size:13px;font-weight:600;padding:8px 16px;border-radius:9px;color:var(--slate);display:flex;align-items:center;gap:5px;transition:color .25s;}
.mln .billtoggle button.on{color:#fff;}
.mln .billtoggle .save{font-family:'Inter';font-size:10px;color:var(--emerald-bright);}
.mln .billtoggle button.on .save{color:#7fe6cf;}
.mln .compwrap{overflow-x:auto;margin:4px 0 6px;border:1px solid var(--line);border-radius:16px;}
.mln .comptable{width:100%;border-collapse:collapse;font-size:14px;min-width:620px;}
.mln .comptable th,.mln .comptable td{padding:13px 14px;text-align:center;border-bottom:1px solid var(--line-soft);}
.mln .comptable .fname{text-align:left;color:var(--slate);white-space:nowrap;}
.mln .comptable td.on{background:var(--emerald-wash);}
.mln .comptable tbody tr:last-child td{border-bottom:none;}
.mln .comptable svg{display:inline-block;vertical-align:middle;}
.mln .compval{font-size:12.5px;font-weight:600;color:var(--ink);}
.mln .comptable thead .rowsel th{padding:22px 16px 18px;border-bottom:1.5px solid var(--line);cursor:pointer;background:var(--paper);transition:background .18s ease;vertical-align:top;}
.mln .comptable thead .rowsel th:hover{background:var(--line-soft);}
.mln .comptable thead .rowsel th.on{background:var(--emerald-wash);}
.mln .comptable thead .rowsel th .best{display:inline-block;margin-bottom:8px;}
.mln .comptable .planname{font-family:'Bricolage Grotesque';font-weight:700;font-size:18px;color:var(--ink);}
.mln .comptable thead .radio{width:20px;height:20px;margin:9px auto;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;transition:transform .28s cubic-bezier(.34,1.56,.64,1),border-color .2s,background .2s;}
.mln .comptable thead th.on .radio{border-color:var(--emerald);background:var(--emerald);transform:scale(1.12);}
.mln .comptable .prc{font-family:'Bricolage Grotesque';font-weight:800;font-size:24px;}
.mln .comptable .prc small{font-size:12.5px;font-weight:500;color:var(--slate);}
.mln .comptable .prcalt{font-size:11px;color:var(--slate-soft);margin-top:1px;}

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
  .mln .dash{grid-template-columns:repeat(2,1fr);}
}
`;

const priceFmt=(n)=>n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const urlBase64ToUint8Array=(base64String)=>{
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData=atob(base64);
  const outputArray=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;i++)outputArray[i]=rawData.charCodeAt(i);
  return outputArray;
};
/* ---- Offres d'abonnement (tarifs fictifs) ---- */
const PLANS=[
  {id:"gratuit",name:"Premier Maillon",monthly:0,annual:0,credits:5,tagline:"Pour tester et rejoindre le réseau, sans carte bancaire."},
  {id:"essentiel",name:"Maillon Central",monthly:19.99,annual:199.9,noCommit:29.99,credits:null,tagline:"Pour prospecter activement et être trouvé."},
  {id:"pro",name:"Maillon Fort",monthly:39.99,annual:399.9,noCommit:49.99,credits:null,tagline:"Pour la visibilité et les équipes.",best:true},
];
/* Comparatif des offres : une ligne par fonctionnalité, une valeur par offre (Découverte, Pro, Business) */
const FEATURE_MATRIX=[
  {label:"Fiche entreprise + badge SIREN",vals:[true,true,true]},
  {label:"Annuaire, carte & score d'affinité",vals:[true,true,true]},
  {label:"Démarchages",vals:["5 (non renouvelables)","Illimités","Illimités"]},
  {label:"Messagerie cloisonnée par service",vals:[false,true,true]},
  {label:"Bibliothèque (historique)",vals:[true,true,true]},
  {label:"Mur de besoins",vals:[false,"Avec recommandations","Avec recommandations"]},
  {label:"Chat interne",vals:[false,true,true]},
  {label:"Visioconférence",vals:[false,true,"Groupe multi-services"]},
  {label:"Collaboration (devis & documents)",vals:[false,true,true]},
  {label:"Emailing & listes de diffusion",vals:[false,false,"Illimité, sur-mesure"]},
  {label:"Publication d'actualités",vals:[false,false,"Photos, republication, mise en avant"]},
  {label:"Badge « Entreprise vérifiée » + priorité annuaire",vals:[false,false,true]},
];

function Mark({height=26}){return(<img src="/logo-maillon-ink.png" alt="Maillon" style={{height,display:"block"}}/>);}
function Tagline({size=10.5,align="center",dashes=true,text="Transformer vos connexions en opportunités."}){return(
  <div style={{display:"flex",alignItems:"center",justifyContent:align,gap:10}}>
    {dashes&&<span style={{width:18,height:1,background:"var(--slate-soft)",flex:"0 0 auto"}}/>}
    <span style={{fontSize:size,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--slate)",fontWeight:600,textAlign:"center"}}>{text}</span>
    {dashes&&<span style={{width:18,height:1,background:"var(--slate-soft)",flex:"0 0 auto"}}/>}
  </div>
);}
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

const buildBrandedEmail=({heading,bodyHtml,ctaText,ctaHref})=>`<!DOCTYPE html>
<html>
  <body style="margin:0;padding:36px 16px;background:#F5F4F0;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr><td style="text-align:center;padding:0 0 26px;">
        <img src="https://getmaillon.fr/logo-maillon-ink.png" alt="Maillon" height="26" style="display:inline-block;border:0;"/>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;">
        <h1 style="margin:0 0 16px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:#0F1826;">${heading}</h1>
        <div style="font-size:15px;line-height:1.65;color:#3d4552;">${bodyHtml}</div>
        ${ctaHref?`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 6px;"><tr><td style="border-radius:10px;background:#0F846B;"><a href="${ctaHref}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">${ctaText}</a></td></tr></table>`:""}
      </td></tr>
      <tr><td style="text-align:center;padding:26px 12px 0;font-size:12px;line-height:1.6;color:#8A929C;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
        Maillon — le réseau B2B à double consentement<br/>getmaillon.fr
      </td></tr>
    </table>
  </body>
</html>`;

const buildInviteEmail=({inviterCompany,link})=>`<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Invitation à rejoindre Maillon</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap');
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    body { margin:0; padding:0; width:100%!important; background-color:#FBFAF7; }
    a { color:#0F846B; }
    .btn-a:hover { background-color:#0c6d59 !important; }
    @media only screen and (max-width:600px){
      .container { width:100%!important; }
      .px { padding-left:24px!important; padding-right:24px!important; }
      .h1 { font-size:24px!important; line-height:31px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#FBFAF7;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#FBFAF7; opacity:0;">
    ${inviterCompany} vous invite à rejoindre Maillon, le réseau des entreprises qui se choisissent.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBFAF7;">
    <tbody><tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">
          <tbody><tr>
            <td style="padding:8px 8px 22px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tbody><tr>
                  <td width="42" height="42" align="center" valign="middle" bgcolor="#0F846B" style="width:42px; height:42px; border-radius:11px; color:#ffffff; font-family:'Bricolage Grotesque',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:22px; font-weight:800;">M</td>
                  <td style="padding-left:11px; font-family:'Bricolage Grotesque',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:21px; font-weight:800; color:#0F1826; letter-spacing:-0.3px;">Maillon</td>
                </tr>
              </tbody></table>
            </td>
          </tr>
          <tr>
            <td class="px" style="background-color:#ffffff; border:1px solid #ECEAE4; border-radius:20px; padding:40px 44px;">
              <p style="margin:0 0 14px 0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#0F846B;">Invitation</p>
              <h1 class="h1" style="margin:0 0 16px 0; font-family:'Bricolage Grotesque',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:28px; line-height:35px; font-weight:800; color:#0F1826; letter-spacing:-0.5px;">
                ${inviterCompany} vous invite à rejoindre&nbsp;Maillon.
              </h1>
              <p style="margin:0 0 18px 0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; line-height:26px; color:#42505F;">
                Maillon est le réseau qui relie les entreprises entre elles&nbsp;: trouvez les sociétés complémentaires près de chez vous, démarchez-les en un clic, et échangez en toute confiance — service par service, et uniquement si les deux parties acceptent.
              </p>
              <p style="margin:0 0 30px 0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; line-height:25px; font-weight:600; color:#0F846B;">
                Ne soyez plus le maillon faible&nbsp;: devenez un maillon fort de votre écosystème.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
                <tbody><tr>
                  <td align="center" bgcolor="#0F846B" style="border-radius:12px;">
                    <a class="btn-a" href="${link}" target="_blank" style="display:inline-block; padding:15px 34px; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px;">
                      Rejoindre le réseau&nbsp;→
                    </a>
                  </td>
                </tr>
              </tbody></table>
              <p style="margin:22px 0 0 0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#8A94A0;">
                Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:<br>
                <a href="${link}" target="_blank" style="color:#0F846B; word-break:break-all;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:20px 44px 0 44px;">
              <p style="margin:0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#8A94A0;">
                Cette invitation vous est personnellement adressée. Si vous ne l'attendiez pas, vous pouvez simplement ignorer cet e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 44px 8px 44px;">
              <hr style="border:none; border-top:1px solid #ECEAE4; margin:0 0 18px 0;">
              <p style="margin:0 0 6px 0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#0F1826; font-weight:600;">Maillon</p>
              <p style="margin:0; font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:19px; color:#8A94A0;">
                Le réseau de mise en relation entre entreprises — local, service par service, sur double accord.
              </p>
            </td>
          </tr>
        </tbody></table>
      </td>
    </tr>
  </tbody></table>
</body></html>`;

const founderActive=(c)=>!!c.founder_free_until&&new Date(c.founder_free_until)>new Date();
const pad2=(n)=>String(n).padStart(2,"0");
const ymd=(dt)=>`${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
/* Les messages "devis"/"document"/"visio planifiée" sont stockés en JSON dans messages.body ; un message texte classique reste une simple chaîne. */
const decodeMsg=(body)=>{
  if(typeof body==="string"&&body[0]==="{"){
    try{const parsed=JSON.parse(body);if(parsed&&["quote","doc","meeting"].includes(parsed.kind))return parsed;}catch(e){/* pas du JSON structuré, message texte normal */}
  }
  return {text:body};
};
const mapCompanyRow=(c)=>{
  const plan=PLANS.find((p)=>p.id===c.plan_id)||PLANS[0];
  const founderOn=founderActive(c);
  return {
    id:c.id,name:c.name,sector:c.sector||"Non précisé",loc:c.loc||"France",emp:c.emp,
    size:(c.emp||"")+" pers.",founded:c.founded||"—",ca:c.ca,dispo:c.dispo,web:c.web||"—",
    refs:0,rating:5.0,plan:plan.name,planId:plan.id,billing:c.billing||"Mensuelle",
    membre:plan.id==="pro"||founderOn,logo:c.logo_url,color:c.color||"#0F846B",desc:c.description||"Présentation à compléter.",
    seek:c.seek||[],offer:c.offer||[],certifs:c.certifs||[],langues:c.langues&&c.langues.length?c.langues:["Français"],
    services:c.services&&c.services.length?c.services:["Direction","Commercial"],
    receptionPole:c.reception_pole||"Direction",siret:c.siret||"",verifiedSiren:!!c.verified_siren,verified:!!c.verified,
    adminServices:c.admin_services&&c.admin_services.length?c.admin_services:null,accessGrants:c.access_grants||{},
    isFounder:!!c.is_founder,founderFreeUntil:c.founder_free_until||null,founderFreeActive:founderOn,founderMonthsGranted:c.founder_months_granted||0,invitedBy:c.invited_by||null,
  };
};
const mapProfileRow=(p,email)=>({id:p.id,name:p.full_name||"Vous",role:p.role||"Direction",status:p.status||"active",email:email||"",notifyEmail:p.notify_email!==false,language:p.language||"fr"});
const LANGUAGES=[{code:"fr",name:"Français"},{code:"en",name:"English"}];
const TRANSLATIONS={en:{
  "2 mois offerts":"2 months free",
  "Abonnement":"Plan",
  "Abonnement & facturation":"Plan & billing",
  "Accepter":"Accept",
  "Acceptez une demande ou démarchez une entreprise pour débloquer la messagerie.":"Accept a request or reach out to a company to unlock messaging.",
  "Accès & cloisonnement":"Access & segmentation",
  "Accès administrateur":"Administrator access",
  "Accès complet (administrateurs)":"Full access (administrators)",
  "Achats":"Purchasing",
  "Activer la double authentification":"Enable two-factor authentication",
  "Activité":"Business",
  "Actualités":"News",
  "Administrateur":"Administrator",
  "Adresse(s) email de réception":"Receiving email address(es)",
  "Affinité":"Affinity",
  "Ajouter":"Add",
  "Ajouter un autre email":"Add another email",
  "Ajouter une photo":"Add a photo",
  "Ajoutez des services à votre page pour ouvrir des canaux.":"Add departments to your page to open channels.",
  "Annuler":"Cancel",
  "Annuler les modifications":"Discard changes",
  "Année de création":"Year founded",
  "Attention":"Warning",
  "Aucun abonnement payant à gérer pour le moment.":"No paid plan to manage right now.",
  "Aucun autre service à partager.":"No other department to share with.",
  "Aucun contact enregistré":"No contact saved",
  "Aucun message pour l'instant — lancez la discussion.":"No messages yet — start the conversation.",
  "Aucun résultat":"No results",
  "Aucun service en commun avec":"No department in common with",
  "Aucune action enregistrée pour l'instant.":"No action recorded yet.",
  "Aucune action ne correspond aux filtres sélectionnés.":"No action matches the selected filters.",
  "Aucune action ne correspond à":"No action matches",
  "Aucune activité pour l'instant":"No activity yet",
  "Aucune campagne envoyée":"No campaign sent yet",
  "Aucune conversation":"No conversation",
  "Aucune demande en attente":"No pending request",
  "Aucune demande envoyée en attente. Allez dans « Découvrir » pour démarcher une entreprise.":"No pending sent request. Go to \"Discover\" to reach out to a company.",
  "Aucune entreprise (retirée depuis)":"No company (removed since)",
  "Aucune entreprise dans cette liste.":"No company in this list.",
  "Aucune entreprise n'a encore accepté de recevoir vos campagnes. Le consentement se donne dans l'onglet « Demandes » au moment d'accepter une mise en relation.":"No company has agreed to receive your campaigns yet. Consent is given in the \"Requests\" tab when accepting a connection.",
  "Aucune entreprise sur ces critères":"No company matches these criteria",
  "Aucune liste pour l'instant":"No list yet",
  "Aucune visio planifiée":"No video call scheduled",
  "Autorisations supplémentaires":"Additional permissions",
  "Autre":"Other",
  "Autre (précisez)…":"Other (specify)…",
  "Badge Maillon Fort sur votre page":"Maillon Fort badge on your page",
  "Besoin publié":"Need posted",
  "Besoins":"Needs",
  "Besoins publiés":"Needs posted",
  "Bibliothèque":"Library",
  "Blog inclus":"Blog included",
  "Budget indicatif (optionnel)":"Indicative budget (optional)",
  "C'est ce pôle qui recevra les demandes de mise en relation adressées à votre entreprise.":"This department will receive the connection requests addressed to your company.",
  "Campagnes envoyées":"Sent campaigns",
  "Canal":"Channel",
  "Carte":"Map",
  "Catégorie":"Category",
  "Ce qu'elle propose":"What they offer",
  "Ce qu'elle recherche":"What they're looking for",
  "Ce que nous proposons":"What we offer",
  "Ce que nous recherchons":"What we're looking for",
  "Ce que vous proposez":"What you offer",
  "Ce que vous recherchez":"What you're looking for",
  "Certifications":"Certifications",
  "Certifications & labels":"Certifications & labels",
  "Certifications / labels":"Certifications / labels",
  "Ces services voient la messagerie de tous les pôles.":"These departments can see the messaging of every department.",
  "Cette campagne demande une confirmation (ex : présence à un événement)":"This campaign requires confirmation (e.g. attendance at an event)",
  "Changer le mot de passe":"Change password",
  "Chaque action que vous effectuez apparaîtra ici, avec la date et l'heure.":"Every action you take will appear here, with the date and time.",
  "Chaque collaborateur est rattaché à un rôle. Il ne voit que ce que ce rôle autorise — il ne peut pas le changer lui-même.":"Each team member is assigned a role. They only see what that role allows — they can't change it themselves.",
  "Chaque service pourra échanger avec le même service des entreprises connectées.":"Each department will be able to exchange with the matching department at connected companies.",
  "Chargement…":"Loading…",
  "Chat":"Chat",
  "Cherche ce que vous proposez":"Looking for what you offer",
  "Chiffre d'affaires":"Revenue",
  "Choisissez un ou plusieurs services — vous pouvez inviter plusieurs services à la même visio.":"Choose one or more departments — you can invite several departments to the same call.",
  "Code à 6 chiffres":"6-digit code",
  "Collaborateurs":"Team members",
  "Commenter":"Comment",
  "Commercial":"Sales",
  "Comptabilité":"Accounting",
  "Compte créé !":"Account created!",
  "Confirmer":"Confirm",
  "Confirmer et activer":"Confirm and enable",
  "Confirmer le nouveau mot de passe":"Confirm new password",
  "Confirmé":"Confirmed",
  "Connecter Google Agenda":"Connect Google Calendar",
  "Connecter Outlook":"Connect Outlook",
  "Connectez-vous pour accéder à votre espace.":"Log in to access your workspace.",
  "Connexion":"Log in",
  "Connexion réussie":"Logged in successfully",
  "Connexion à Google Agenda — démo":"Google Calendar connection — demo",
  "Connexion à Outlook — démo":"Outlook connection — demo",
  "Connexion à la visio…":"Connecting to the call…",
  "Continuer":"Continue",
  "Conversation d'équipe":"Team conversation",
  "Copier le lien":"Copy link",
  "Correspond à votre activité":"Matches your business",
  "Création":"Founded",
  "Créer la liste":"Create list",
  "Créer mon compte":"Create my account",
  "Créer une liste":"Create a list",
  "Créer votre compte":"Create your account",
  "Créez votre compte, vous publierez ensuite la page de votre entreprise.":"Create your account, then publish your company page.",
  "Créez votre page entreprise":"Create your company page",
  "Créez votre première campagne d'emailing ci-dessus.":"Create your first email campaign above.",
  "Créez votre première liste de diffusion ci-dessus.":"Create your first mailing list above.",
  "Créée":"Founded",
  "Dans votre ville":"In your city",
  "Date":"Date",
  "Demande de devis":"Quote request",
  "Demande déclinée":"Request declined",
  "Demande en attente":"Request pending",
  "Demande envoyée":"Request sent",
  "Demander un devis":"Request a quote",
  "Demandes":"Requests",
  "Demandes de mise en relation":"Connection requests",
  "Demandes reçues":"Requests received",
  "Dernière connexion":"Last login",
  "Destinataires":"Recipients",
  "Destinataires éligibles":"Eligible recipients",
  "Devis":"Quote",
  "Direction":"Management",
  "Disponibilité":"Availability",
  "Document":"Document",
  "Document indisponible":"Document unavailable",
  "Envoyé directement à":"Sent directly to",
  "4 Mo maximum pour l'instant.":"4 MB maximum for now.",
  "Document partagé":"Document shared",
  "Donner le rôle Direction à":"Giving the Management role to",
  "Double authentification (2FA)":"Two-factor authentication (2FA)",
  "Décliner":"Decline",
  "Décliné":"Declined",
  "Découvrir":"Discover",
  "Découvrir Maillon":"Discover Maillon",
  "Découvrir des entreprises":"Discover companies",
  "Décrivez ce que vous cherchez. Les entreprises concernées pourront vous proposer leurs services.":"Describe what you're looking for. Relevant companies will be able to offer their services.",
  "Démarchages envoyés":"Outreach sent",
  "Démarchages illimités + mur de besoins & visio":"Unlimited outreach + needs board & video calls",
  "Démarcher":"Reach out",
  "Démarrer la visio maintenant":"Start the call now",
  "Désactiver":"Disable",
  "Détails":"Details",
  "E-mail":"Email",
  "Effectif":"Headcount",
  "Elle apparaîtra sur le fil commun au nom de":"It will appear on the shared feed under the name of",
  "Email":"Email",
  "Emailing":"Emailing",
  "En attente":"Pending",
  "En attente de réponse":"Awaiting response",
  "En tant que":"As",
  "En une ou deux phrases, ce que fait votre entreprise.":"In one or two sentences, what your company does.",
  "Engagement 1 an":"1-year commitment",
  "Enregistrement…":"Saving…",
  "Enregistrer":"Save",
  "Entreprises":"Companies",
  "Entrez le code à 6 chiffres généré par votre application d'authentification.":"Enter the 6-digit code generated by your authenticator app.",
  "Envoyer":"Send",
  "Envoyer la campagne":"Send campaign",
  "Envoyer la demande":"Send request",
  "Envoyez des campagnes uniquement aux entreprises qui ont accepté de les recevoir, au moment de la mise en relation.":"Send campaigns only to companies who agreed to receive them when the connection was made.",
  "Envoyée":"Sent",
  "Envoyées · en attente":"Sent · pending",
  "Espace de collaboration — dans la vraie application, devis et fichiers seraient réellement transmis et stockés.":"Collaboration space — in the real application, quotes and files would actually be sent and stored.",
  "Estimée sur la complémentarité de vos activités, ce que vous cherchez de part et d'autre, et la proximité.":"Estimated from how your businesses complement each other, what you're each looking for, and proximity.",
  "Exporter (.ics)":"Export (.ics)",
  "Aujourd'hui":"Today",
  "Ajouter un événement":"Add an event",
  "Entreprise":"Company",
  "Choisir une entreprise…":"Choose a company…",
  "Nouvel événement":"New event",
  "Sélectionnez une entreprise connectée pour planifier un événement.":"Select a connected company to schedule an event.",
  "Rappel":"Reminder",
  "ex : Renouvellement du SIRET":"e.g. SIRET renewal",
  "Heure (optionnel)":"Time (optional)",
  "Note (optionnel)":"Note (optional)",
  "Ajouter l'événement":"Add event",
  "Toutes vos visios à venir avec les entreprises connectées, ainsi que vos événements libres, classés par date.":"All your upcoming video calls with connected companies, plus your own reminders, sorted by date.",
  "Mois précédent":"Previous month",
  "Mois suivant":"Next month",
  "Aucun événement ce jour.":"No events on this day.",
  "Aucun événement à exporter":"No events to export",
  "Le fichier .ics s'importe dans Google Agenda, Outlook ou Apple Calendar (menu « Importer un calendrier »).":"The .ics file can be imported into Google Calendar, Outlook or Apple Calendar (\"Import calendar\" menu).",
  "Exprimez ce que vous cherchez, ou proposez vos services aux entreprises qui cherchent. La mise en relation vient à vous.":"Say what you're looking for, or offer your services to companies who are searching. The connection comes to you.",
  "Filtrez par secteur, rayon d'action et effectif. Basculez en carte pour situer les sociétés en France. Le score d'affinité estime la complémentarité avec":"Filter by sector, reach and headcount. Switch to map view to locate companies across France. The affinity score estimates how well you'd complement",
  "Forte complémentarité":"Strong complementarity",
  "Glissez pour vous déplacer, molette pour zoomer. Cliquez un point pour voir la fiche de l'entreprise.":"Drag to move around, scroll to zoom. Click a point to view the company's profile.",
  "Gratuit":"Free",
  "Général":"General",
  "Activation de votre abonnement…":"Activating your subscription…",
  "Le réseau démarre tout juste":"The network is just getting started",
  "Aucune autre entreprise n'a encore rejoint Maillon. Revenez bientôt — votre page est déjà visible pour les prochaines qui s'inscriront.":"No other company has joined Maillon yet. Check back soon — your page is already visible to the next ones who sign up.",
  "Aucune actualité pour l'instant":"No news yet",
  "Les publications des entreprises du réseau apparaîtront ici.":"Posts from companies in the network will appear here.",
  "Aucun besoin pour l'instant":"No needs yet",
  "Soyez le premier à publier ce que vous recherchez.":"Be the first to post what you're looking for.",
  "Le réseau des entreprises qui se choisissent.":"The network where companies choose each other.",
  "Le réseau des entreprises":"The network where companies",
  "Voir ma page":"View my page",
  "Copier le lien de Maillon":"Copy the Maillon link",
  "Inviter une entreprise":"Invite a company",
  "Acceptée":"Accepted",
  "Accès Maillon Fort offert jusqu'au":"Free Maillon Fort access until",
  "Aucune invitation envoyée pour l'instant.":"No invitation sent yet.",
  "Entreprise Fondatrice":"Founding Company",
  "Inscription en cours":"Signing up",
  "Invitez des entreprises de votre réseau et gagnez 1 mois offert sur Maillon Fort pour chaque entreprise qui rejoint Maillon.":"Invite companies from your network and earn 1 free month of Maillon Fort for each company that joins Maillon.",
  "Si vous n'êtes pas encore abonné, ce mois vous donne un accès gratuit à Maillon Fort. Si vous payez déjà Maillon Fort, il est directement déduit de votre prochaine facture.":"If you're not subscribed yet, this month gives you free access to Maillon Fort. If you're already paying for Maillon Fort, it's deducted directly from your next invoice.",
  "Lien ouvert":"Link opened",
  "Mes invitations":"My invitations",
  "Offre Fondateur":"Founder Offer",
  "Un lien d'invitation personnel est créé — l'entreprise qui l'utilise pour s'inscrire vous fait gagner 1 mois offert.":"A personal invite link is created — the company that uses it to sign up earns you 1 free month.",
  "Votre avantage":"Your benefit",
  "Vous ne pouvez pas vous inviter vous-même.":"You can't invite yourself.",
  "acceptées":"accepted",
  "entreprises ont rejoint Maillon grâce à vous":"companies joined Maillon thanks to you",
  "envoyées":"sent",
  "inscrites":"signed up",
  "invitez une entreprise à rejoindre Maillon et obtenez 1 mois supplémentaire.":"invite a company to join Maillon and get 1 extra month.",
  "mois offert":"free month",
  "mois offerts":"free months",
  "Campagnes d'emailing":"Email campaigns",
  "Autoriser":"Allow",
  "à vous envoyer des campagnes d'emailing":"to send you email campaigns",
  "a accepté de recevoir vos campagnes d'emailing.":"agreed to receive your email campaigns.",
  "n'a pas souhaité recevoir vos campagnes d'emailing.":"did not want to receive your email campaigns.",
  "Ne plus être connecté":"Disconnect",
  "Un email d'invitation sera envoyé en votre nom, avec un lien vers Maillon.":"An invitation email will be sent in your name, with a link to Maillon.",
  "Envoyer l'invitation":"Send invitation",
  "Invitation envoyée à":"Invitation sent to",
  "envoi impossible":"could not send",
  "Erreur d'envoi de l'invitation":"Error sending the invitation",
  "Invitations envoyées":"Invitations sent",
  "qui se choisissent.":"choose each other.",
  "Repérez les partenaires les plus complémentaires à votre activité, partout en France, et n'échangez qu'avec ceux qui vous ont dit oui.":"Spot the partners most complementary to your business, anywhere in France, and only talk to the ones who said yes to you.",
  "Mensuel":"Monthly",
  "Comptant (1 an)":"Upfront (1 year)",
  "soit":"i.e.",
  "Continuer vers le paiement":"Continue to payment",
  "Emailing & listes de diffusion":"Emailing & mailing lists",
  "Envoyez des campagnes aux entreprises qui ont accepté de les recevoir, et regroupez-les dans vos propres listes.":"Send campaigns to companies who agreed to receive them, and group them into your own lists.",
  "Gratuit pour commencer, sans carte bancaire.":"Free to start, no credit card required.",
  "Maillon connecte les entreprises qui se complètent, sur la base d'un double consentement : vous démarchez qui vous intéresse, elles décident si elles répondent.":"Maillon connects companies that complement each other, based on double consent: you reach out to whoever interests you, they decide whether to respond.",
  "Prêt à trouver vos prochains partenaires ?":"Ready to find your next partners?",
  "Publiez votre page en quelques minutes et commencez à explorer le réseau.":"Publish your page in minutes and start exploring the network.",
  "Générer le squelette email":"Generate email skeleton",
  "Gérer mon abonnement / facturation":"Manage my plan / billing",
  "Gérez ici votre offre et vos informations de paiement, séparément du reste de votre compte.":"Manage your plan and payment details here, separately from the rest of your account.",
  "HTML de l'email (facultatif)":"Email HTML (optional)",
  "Heure":"Time",
  "Historique des actions sensibles sur votre espace.":"History of sensitive actions on your workspace.",
  "Identique":"Same as above",
  "Identité":"Identity",
  "Identité de la campagne":"Campaign identity",
  "Ignorer":"Dismiss",
  "Importer votre logo":"Upload your logo",
  "Informations personnelles":"Personal information",
  "Inviter":"Invite",
  "Inviter un collaborateur":"Invite a team member",
  "J'accepte de recevoir les campagnes d'emailing de":"I agree to receive email campaigns from",
  "Journal d'accès":"Access log",
  "L'adresse email ne peut pas être modifiée ici.":"The email address cannot be changed here.",
  "L'offre":"The",
  "L'offre Premier Maillon est limitée à 5 démarchages, non renouvelables":"The Premier Maillon plan is limited to 5 outreach credits, non-renewable",
  "La double authentification est propre à votre compte personnel (elle vous protège, vous — pas toute l'entreprise).":"Two-factor authentication is specific to your personal account (it protects you, not the whole company).",
  "La langue utilisée pour vos communications et, à terme, l'interface de Maillon.":"The language used for your communications and, eventually, the Maillon interface.",
  "La personne invitée avec le rôle Direction aura le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?":"The person invited with the Management role will have full control over your company's access rights and segmentation. Confirm?",
  "La publication d'actualités est incluse dans l'offre Maillon Fort. Choisissez votre facturation :":"Posting news is included in the Maillon Fort plan. Choose your billing:",
  "La publication est réservée à l'offre Maillon Fort.":"Posting is reserved for the Maillon Fort plan.",
  "Langue":"Language",
  "Langue enregistrée":"Language saved",
  "Langues":"Languages",
  "Le cloisonnement s'applique à votre entreprise uniquement. L'autre entreprise gère ses propres règles de son côté.":"Segmentation applies to your company only. The other company manages its own rules on its side.",
  "Le fil commun des entreprises de Maillon. La lecture est ouverte à tous ; publier demande une adhésion.":"The shared feed for Maillon companies. Reading is open to everyone; posting requires membership.",
  "Le pixel d'ouverture est injecté automatiquement.":"The open-tracking pixel is injected automatically.",
  "Le pôle qui reçoit toutes les demandes de mise en relation adressées à votre entreprise.":"The department that receives every connection request addressed to your company.",
  "Le registre de toutes les actions effectuées sur votre espace : demandes envoyées, mises en relation, visios, publications…":"The log of every action on your workspace: requests sent, connections made, video calls, posts…",
  "Les autres services restent cloisonnés.":"Other departments remain restricted.",
  "Les demandes de mise en relation adressées à votre entreprise arrivent au pôle":"Connection requests to your company are routed to the",
  "Les demandes de mise en relation arrivent au pôle":"Connection requests are routed to the",
  "Lien copié !":"Link copied!",
  "Liste":"List",
  "Liste de diffusion":"Mailing list",
  "Listes":"Lists",
  "Listes de diffusion":"Mailing lists",
  "Localisation":"Location",
  "Logistique":"Logistics",
  "Logo de l'entreprise":"Company logo",
  "Ma page entreprise":"My company page",
  "Maillon Central":"Maillon Central",
  "Maillon Fort":"Maillon Fort",
  "Maillon Fort — engagement 1 an":"Maillon Fort — 1-year commitment",
  "Maillon Fort — sans engagement":"Maillon Fort — no commitment",
  "Marketing & Com":"Marketing & Comms",
  "Message":"Message",
  "Message (texte simple)":"Message (plain text)",
  "Messages":"Messages",
  "Min. 8 caractères":"Min. 8 characters",
  "Mise en avant de vos news":"Featured placement for your news",
  "Modifier le mot de passe":"Change password",
  "Mon compte":"My account",
  "Mot de passe":"Password",
  "Mot de passe actuel":"Current password",
  "Mur de besoins":"Needs board",
  "Ne soyez plus le maillon faible : devenez un maillon fort de votre écosystème.":"Stop being the weak link: become a strong link in your ecosystem.",
  "Nom A–Z":"Name A–Z",
  "Nom de l'entreprise":"Company name",
  "Nom de la campagne":"Campaign name",
  "Nom de la liste":"List name",
  "Nom du document":"Document name",
  "Non, créer ma propre entreprise":"No, create my own company",
  "Note":"Rating",
  "Note moyenne":"Average rating",
  "Notifications par e-mail":"Email notifications",
  "Notifications push":"Push notifications",
  "Nouveau mot de passe":"New password",
  "Nouvelle campagne":"New campaign",
  "Nouvelle campagne d'emailing":"New email campaign",
  "Nouvelle conversation":"New conversation",
  "Nouvelle liste de diffusion":"New mailing list",
  "Objet de la demande":"Request subject",
  "Offre":"Plan",
  "Offre Pro active":"Pro plan active",
  "Offre actuelle":"Current plan",
  "Ou entrez la clé manuellement":"Or enter the key manually",
  "Ouvrir":"Open",
  "Ouvrir la discussion":"Open the conversation",
  "PNG, JPG ou SVG — carré de préférence.":"PNG, JPG or SVG — square preferred.",
  "Paiement sécurisé via Stripe.":"Secure payment via Stripe.",
  "Par défaut, ce service ne voit que sa messagerie par pôle.":"By default, this department only sees its own department's messaging.",
  "Partager":"Share",
  "Partager un document":"Share a document",
  "Pas encore de compte ? En créer un":"No account yet? Create one",
  "Passer au payant":"Upgrade to a paid plan",
  "Passer à Maillon Fort":"Switch to Maillon Fort",
  "Passer à l'offre Maillon Fort":"Switch to the Maillon Fort plan",
  "Passez à Maillon Fort":"Switch to Maillon Fort",
  "Passez à l'offre Maillon Fort":"Switch to the Maillon Fort plan",
  "Passez à la vitesse supérieure":"Step up a gear",
  "Photo (facultative)":"Photo (optional)",
  "Placeholders":"Placeholders",
  "Planifier la visio":"Schedule the call",
  "Planifiez une visio depuis une conversation pour la retrouver ici.":"Schedule a call from a conversation to find it here.",
  "Plus récentes":"Most recent",
  "Pour continuer à démarcher, passez à une offre payante (démarchages illimités).":"To keep reaching out, switch to a paid plan (unlimited outreach).",
  "Propose ce que vous cherchez":"Offers what you're looking for",
  "Proposer mes services":"Offer my services",
  "Prototype":"Prototype",
  "Mentions légales":"Legal notice",
  "Confidentialité":"Privacy",
  "CGU/CGV":"Terms",
  "Préciser le service":"Specify the department",
  "Précisez le service…":"Specify the department…",
  "Prénom et nom":"First and last name",
  "Présentation":"About",
  "Présélectionne les destinataires ci-dessous ; vous pouvez encore ajuster la sélection à la main. Créez vos propres listes dans l'onglet « Listes ».":"Pre-selects the recipients below; you can still adjust the selection manually. Create your own lists in the \"Lists\" tab.",
  "Publier":"Publish",
  "Publier ma page":"Publish my page",
  "Publier sur le fil commun":"Post to the shared feed",
  "Publier un besoin":"Post a need",
  "Publier une actualité":"Publish a post",
  "Publiez une page complète, démarchez les sociétés qui vous intéressent. Si elles acceptent, vous communiquez directement. Rien sans double accord.":"Publish a complete page, reach out to the companies you're interested in. If they accept, you communicate directly. Nothing happens without mutual consent.",
  "Pôle de réception des demandes":"Request-receiving department",
  "Pôle qui reçoit les demandes":"Request-receiving department",
  "Quel service pour":"Which department for",
  "Qui me correspondent":"That match me",
  "RH":"HR",
  "Raccrocher":"Hang up",
  "Rayon autour de vous":"Radius around you",
  "Recherche":"Looking for",
  "Rechercher dans la bibliothèque…":"Search the library…",
  "Rechercher une entreprise, un métier, un service…":"Search a company, a trade, a department…",
  "Recommandé":"Recommended",
  "Recommandé pour vous":"Recommended for you",
  "Recréer / modifier ma page":"Recreate / edit my page",
  "Regroupez vos entreprises abonnées dans des listes réutilisables (ex : « Mail du jeudi matin ») pour ne plus avoir à tout recocher à chaque campagne.":"Group your subscribed companies into reusable lists (e.g. \"Thursday morning email\") so you don't have to recheck everything for every campaign.",
  "Rejoindre":"Join",
  "Rejoindre l'entreprise":"Join the company",
  "Rejoindre la visio":"Join the call",
  "Relations actives":"Active connections",
  "Remplir avec un exemple":"Fill with an example",
  "Renseignez son identité, choisissez les destinataires, puis le contenu.":"Fill in its identity, choose the recipients, then the content.",
  "Republier":"Repost",
  "Republié par":"Reposted by",
  "Republié par vous":"Reposted by you",
  "Retirer":"Remove",
  "Retirer la photo":"Remove photo",
  "Retour":"Back",
  "Reçue":"Received",
  "Reçues · à traiter":"Received · to handle",
  "Réactiver":"Reactivate",
  "Réception des demandes":"Request receiving",
  "Références":"References",
  "Réinitialiser":"Reset",
  "Réinitialiser les filtres":"Reset filters",
  "Répondre à sa demande":"Respond to their request",
  "Révoquer":"Revoke",
  "SIRET":"Business ID",
  "Sans engagement":"No commitment",
  "Sauvegarder":"Save",
  "Scannez ce code avec votre application d'authentification (Google Authenticator, Authy…), puis entrez le code à 6 chiffres généré.":"Scan this code with your authenticator app (Google Authenticator, Authy…), then enter the generated 6-digit code.",
  "Se connecter":"Log in",
  "Se déconnecter":"Log out",
  "Secteur d'activité":"Business sector",
  "Secteur recherché":"Sector sought",
  "Secteurs affichés":"Sectors shown",
  "Service":"Department",
  "Services / départements":"Departments",
  "Services concernés":"Departments involved",
  "Seule la Direction peut gérer les droits d'accès et le cloisonnement. Vous êtes connecté en tant que":"Only Management can manage access rights and segmentation. You're logged in as",
  "Signaler cette entreprise":"Report this company",
  "Site web":"Website",
  "Son message":"Their message",
  "Statistiques de visibilité":"Visibility statistics",
  "Sujet":"Subject",
  "Sujet de l'email":"Email subject",
  "Supprimer":"Delete",
  "Sécurité & notifications":"Security & notifications",
  "Sélection":"Selection",
  "Sélectionnez un ou plusieurs services":"Select one or more departments",
  "Sélectionnez une conversation":"Select a conversation",
  "Tableau de bord":"Dashboard",
  "Technique":"Technical",
  "Template & tracking":"Template & tracking",
  "Titre":"Title",
  "Tous":"All",
  "Tous les besoins":"All needs",
  "Tous les champs sont obligatoires.":"All fields are required.",
  "Tous les secteurs":"All sectors",
  "Tout Maillon Central + actualités, mise en avant & visio de groupe":"Everything in Maillon Central + news posts, featured placement & group video calls",
  "Toute la France":"All of France",
  "Toutes les listes de diffusion":"All mailing lists",
  "Toutes vos visios à venir avec les entreprises connectées, classées par date. Une visio de groupe apparaît avec tous ses services.":"All your upcoming video calls with connected companies, sorted by date. A group call appears with all of its departments.",
  "Transformer vos connexions en opportunités.":"Turn your connections into opportunities.",
  "Trier par":"Sort by",
  "Téléchargement (démo)":"Download (demo)",
  "Un instant…":"One moment…",
  "Un lien d'invitation est créé et copié dans votre presse-papiers. Envoyez-le vous-même à votre collègue (email, message…) : en l'ouvrant, il/elle rejoint directement votre entreprise avec le rôle choisi.":"An invite link is created and copied to your clipboard. Send it yourself to your colleague (email, message…): opening it lets them join your company directly with the chosen role.",
  "Valider":"Confirm",
  "Visio":"Video call",
  "Visio avec":"Video call with",
  "Visio de groupe":"Group video call",
  "Visio entrante":"Incoming video call",
  "Visio planifiée":"Video call scheduled",
  "Visio simulée — aucune vidéo réelle n'est établie dans la maquette.":"Simulated video call — no real video connection is made in this prototype.",
  "Visio sécurisée, hébergée par notre prestataire Daily.co.":"Secure video calls, hosted by our provider Daily.co.",
  "Visios à venir · par service":"Upcoming video calls · by department",
  "Voir l'offre Maillon Fort":"View the Maillon Fort plan",
  "Voir la fiche":"View profile",
  "Vos identifiants sont gérés de façon sécurisée par Supabase.":"Your credentials are securely managed by Supabase.",
  "Vos listes":"Your lists",
  "Vos services / départements":"Your departments",
  "Votre actualité en quelques lignes.":"Your news in a few lines.",
  "Votre besoin":"Your need",
  "Votre compte":"Your account",
  "Votre demande part avec votre message.":"Your request is sent along with your message.",
  "Votre demande sera reçue par le pôle":"Your request will be received by the",
  "Votre entreprise,":"Your company,",
  "Votre message aux entreprises abonnées.":"Your message to subscribed companies.",
  "Votre message d'introduction":"Your introduction message",
  "Votre navigateur vous demandera l'autorisation. Fonctionne même si Maillon est en arrière-plan, tant que ce navigateur reste ouvert.":"Your browser will ask for permission. Works even if Maillon is in the background, as long as this browser stays open.",
  "Votre offre":"Your plan",
  "Votre page est en ligne. Découvrez les entreprises du réseau et commencez à transformer vos connexions en opportunités.":"Your page is live. Discover the companies in the network and start turning your connections into opportunities.",
  "Votre prénom et nom":"Your first and last name",
  "Votre publication":"Your post",
  "Votre tableau de bord et la fiche que voient les autres entreprises.":"Your dashboard and the profile other companies see.",
  "Vous":"You",
  "Vous avez déjà un compte ? Se connecter":"Already have an account? Log in",
  "Vous décidez. Accepter ouvre la messagerie ; décliner clôt la demande.":"You decide. Accepting opens the messaging thread; declining closes the request.",
  "Vous pouvez publier vos actualités sur le fil commun.":"You can post your news on the shared feed.",
  "Vous échangez uniquement avec les entreprises connectées — et service par service : chaque département discute avec son homologue de l'autre entreprise.":"You only exchange messages with connected companies — department by department: each team talks to its counterpart at the other company.",
  "Vous êtes en Direction : vous seul(e) pouvez gérer les droits d'accès et le cloisonnement de votre entreprise.":"You're in Management: you're the only one who can manage access rights and segmentation for your company.",
  "Vous êtes invité(e)":"You're invited",
  "Vous êtes sur l'offre":"You're on the",
  "Vues de la fiche (30 j)":"Profile views (30d)",
  "Vérification automatique via le répertoire SIREN — affiche un badge « entreprise vérifiée ».":"Automatic check via the SIREN registry — displays a \"verified company\" badge.",
  "Vérification en deux étapes":"Two-step verification",
  "Vérification…":"Checking…",
  "Vérifiées":"Verified",
  "accepte ou refuse la mise en relation.":"accepts or declines the connection.",
  "accès cloisonné":"restricted access",
  "admin":"admin",
  "administrateur":"administrator",
  "affinité":"affinity",
  "an":"year",
  "budget":"budget",
  "choisissez un canal":"choose a channel",
  "clients":"clients",
  "compte désactivé":"account disabled",
  "confirmé":"confirmed",
  "confirmés":"confirmed",
  "d'affinité avec":"affinity with",
  "de":"with",
  "destinataire":"recipient",
  "destinataires":"recipients",
  "décliné":"declined",
  "déclinés":"declined",
  "en attente":"pending",
  "en tant que":"as",
  "entreprise":"company",
  "entreprises":"companies",
  "est activée immédiatement ; les offres payantes vous redirigent vers une page de paiement.":"is activated immediately; paid plans redirect you to a payment page.",
  "footer + désabo":"footer + unsubscribe",
  "header expéditeur":"sender header",
  "invitation en attente":"invitation pending",
  "km de vous":"km from you",
  "lien bouton tracké":"tracked button link",
  "lui donnera aussi le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?":"will also give them full control over your company's access rights and segmentation. Confirm?",
  "maquette cliquable · données fictives":"clickable mockup · fictional data",
  "mois":"month",
  "n'est disponible qu'avec un engagement d'un an.":"is only available with a 1-year commitment.",
  "n'inclut pas la publication. Passez à Maillon Fort pour publier vos news et gagner en visibilité.":"does not include posting. Switch to Maillon Fort to post your news and gain visibility.",
  "optionnel":"optional",
  "optionnel, séparez par des virgules":"optional, comma-separated",
  "ou":"or",
  "ou planifier":"or schedule",
  "peut aussi voir :":"can also see:",
  "pour le service":"for the",
  "pour partager vos news.":"to share your news.",
  "qui décidera de l'accepter.":"who will decide whether to accept it.",
  "reliée aux bonnes.":"connected to the right ones.",
  "reçue par votre pôle":"received by your",
  "réponse":"response",
  "réponses":"responses",
  "service":"department",
  "service en commun":"shared department",
  "services":"departments",
  "services en commun":"shared departments",
  "signalée — notre équipe va examiner":"reported — our team will review it",
  "tous secteurs · carte · affinité · double consentement · messagerie par service · visio · blog & adhésion · données fictives":"all sectors · map · affinity · double consent · department messaging · video calls · blog & membership · fictional data",
  "virgules":"comma-separated",
  "visio de groupe":"group call",
  "voici les règles en vigueur (lecture seule).":"here are the current rules (read-only).",
  "vos 5 démarchages sont épuisés":"your 5 outreach credits are used up",
  "votre":"your",
  "vous":"you",
  "vous invite à une visio":"invites you to a video call",
  "vous les avez tous utilisés":"you've used them all",
  "vous ne pouvez lancer une visio que pour votre service.":"you can only start a video call for your department.",
  "vous ne voyez que les visios de votre service.":"you only see video calls for your department.",
  "vous voyez":"you see",
  "vous voyez la messagerie de tous les services.":"you see the messaging of every department.",
  "À l'instant":"Just now",
  "À propos":"About",
  "À ~":"About ~",
  "Écrire au canal Général…":"Write to the General channel…",
  "Écrire au service":"Write to the",
  "Écrire à":"Write to",
  "Écrivez librement votre secteur, ou choisissez une suggestion.":"Write your sector freely, or pick a suggestion.",
  "Écrivez ou choisissez…":"Type or choose…",
  "Élargissez les filtres ou réinitialisez.":"Widen the filters or reset them.",
  "Étape":"Step",
  "Événements":"Events",
  "Événements exportés (.ics) — démo":"Events exported (.ics) — demo",
  "à":"at",
}};
const mapDirectoryCompany=(row)=>{const base=mapCompanyRow(row);return {...base,tag:base.desc,rel:"none",channels:{}};};
const isRealCompany=(c)=>!!c&&typeof c.id==="string";

const LAND_FEATS=[
  {icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    title:"Double consentement",body:"Vous démarchez, l'entreprise décide. Aucune messagerie ne s'ouvre sans accord des deux côtés."},
  {icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    title:"Messagerie cloisonnée",body:"Chaque service échange avec son homologue chez l'autre entreprise, en toute confidentialité."},
  {icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8 2 9.4h7.6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
    title:"Carte & score d'affinité",body:"Repérez partout en France les entreprises les plus complémentaires à la vôtre."},
  {icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title:"Emailing & listes de diffusion",body:"Envoyez des campagnes aux entreprises qui ont accepté de les recevoir, et regroupez-les dans vos propres listes."},
];

function Landing({t,uiLang,toggleGuestLang,onAuth}){
  const revealRefs=useRef([]);
  revealRefs.current=[];
  const addReveal=(el)=>{if(el&&!revealRefs.current.includes(el))revealRefs.current.push(el);};
  useEffect(()=>{
    const els=revealRefs.current;
    if(!els.length)return;
    if(typeof IntersectionObserver==="undefined"){els.forEach((el)=>el.classList.add("in"));return;}
    const io=new IntersectionObserver((entries)=>{
      entries.forEach((e)=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});
    },{threshold:0.15});
    els.forEach((el)=>io.observe(el));
    return ()=>io.disconnect();
  },[]);
  return(
    <div className="mln"><style>{CSS}</style>
      <div className="landing">
        <div className="landbar">
          <div className="brand"><Mark height={24}/></div>
          <div className="actions">
            <button className="linkbtn" onClick={toggleGuestLang}>{uiLang==="fr"?"EN":"FR"}</button>
            <button className="btn-ghost sm" onClick={()=>onAuth("signin")}>{t("Se connecter")}</button>
          </div>
        </div>
        <div className="landglow">
          <div className="landhero">
            <div className="eyebrow">{t("Créez votre page entreprise")}</div>
            <h1>{t("Le réseau des entreprises")} <span className="accent">{t("qui se choisissent.")}</span></h1>
            <p className="lead">{t("Repérez les partenaires les plus complémentaires à votre activité, partout en France, et n'échangez qu'avec ceux qui vous ont dit oui.")}</p>
            <div className="landcta">
              <button className="btn" onClick={()=>onAuth("signup")}>{t("Créer mon compte")}</button>
              <button className="btn-ghost" onClick={()=>onAuth("signin")}>{t("Se connecter")}</button>
            </div>
            <div className="landsub">{t("Gratuit pour commencer, sans carte bancaire.")}</div>
          </div>
        </div>
        <div className="landfeats">
          {LAND_FEATS.map((f,i)=>(
            <div key={f.title} ref={addReveal} className="featcard reveal" style={{transitionDelay:`${i*70}ms`}}>
              <div className="fi">{f.icon}</div>
              <h4>{t(f.title)}</h4>
              <p>{t(f.body)}</p>
            </div>
          ))}
        </div>
        <div ref={addReveal} className="landbanner reveal">
          <h3>{t("Prêt à trouver vos prochains partenaires ?")}</h3>
          <p>{t("Publiez votre page en quelques minutes et commencez à explorer le réseau.")}</p>
          <button className="btn" onClick={()=>onAuth("signup")}>{t("Créer mon compte")}</button>
        </div>
        <div className="foot">© {new Date().getFullYear()} <b>Maillon</b> — <a href="/mentions-legales">{t("Mentions légales")}</a> · <a href="/cgu-cgv">{t("CGU/CGV")}</a> · <a href="/confidentialite">{t("Confidentialité")}</a></div>
      </div>
    </div>
  );
}

function VisioRoom({me,company,services,url,onEnd,lang}){
  const t=(s)=>(TRANSLATIONS[lang]&&TRANSLATIONS[lang][s])||s;
  const [sec,setSec]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setSec((s)=>s+1),1000);return ()=>clearInterval(id);},[]);
  const mm=String(Math.floor(sec/60)).padStart(2,"0");const ss=String(sec%60).padStart(2,"0");
  const svcs=services||[];
  const hang=<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 14c4-3 12-3 16 0 .6.5 1 .2 1.2-.4l.6-2c.2-.7-.1-1.3-.8-1.7C18 7.5 6 7.5 3 9.9c-.7.4-1 1-.8 1.7l.6 2c.2.6.6.9 1.2.4z" fill="currentColor"/></svg>;
  return(
    <div className="visio">
      <div className="vishead">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="#e8eaee" strokeWidth="1.8"/><path d="M15 10l6-3v10l-6-3" stroke="#e8eaee" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        {t("Visio")} · {svcs.map((s)=>t(s)).join(", ")} · {me.name} ↔ {company.name}
        <div className="vistimer"><span className="rec"/>{mm}:{ss}</div>
      </div>
      <div style={{flex:1,minHeight:0,padding:"0 22px"}}>
        {url?(
          <iframe title="Visio" src={url} allow="camera; microphone; fullscreen; display-capture; autoplay" style={{width:"100%",height:"100%",border:0,borderRadius:12}}/>
        ):(
          <div style={{color:"#e8eaee",textAlign:"center",paddingTop:60}}>{t("Connexion à la visio…")}</div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:20}}>
        <button className="hang" onClick={()=>onEnd(sec)} aria-label={t("Raccrocher")} style={{width:62,height:52,borderRadius:26,background:"var(--coral)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{hang}</button>
      </div>
    </div>
  );
}

export default function Maillon(){
  const [uiLang,setUiLang]=useState(()=>(typeof window!=="undefined"&&window.localStorage.getItem("maillon_lang"))||"fr");
  const t=(s)=>(TRANSLATIONS[uiLang]&&TRANSLATIONS[uiLang][s])||s;
  const toggleGuestLang=()=>{const next=uiLang==="fr"?"en":"fr";setUiLang(next);if(typeof window!=="undefined")window.localStorage.setItem("maillon_lang",next);};
  const [preAuthView,setPreAuthView]=useState(()=>{if(typeof window==="undefined")return "landing";const p=new URLSearchParams(window.location.search);return p.get("invite")||p.get("ref")?"auth":"landing";});
  const [me,setMe]=useState(null);
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [authMode,setAuthMode]=useState("signin");
  const [authError,setAuthError]=useState("");
  const [authBusy,setAuthBusy]=useState(false);
  const [obStep,setObStep]=useState(0);
  const [justOnboarded,setJustOnboarded]=useState(false);
  const [checkoutJustSucceeded,setCheckoutJustSucceeded]=useState(false);
  const [pendingBillingSync,setPendingBillingSync]=useState(false);
  const [checkoutPending,setCheckoutPending]=useState(()=>typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("checkout")==="success");
  const [customService,setCustomService]=useState("");
  const [form,setForm]=useState({name:"",ownerName:"",sector:"",loc:"",emp:EMP[0],color:COLORS[0],radius:50,
    desc:"",seek:"",offer:"",founded:"",ca:CA[0],dispo:DISPO[0],web:"",certifs:"",langues:"",plan:"gratuit",billing:"Mensuelle",logo:null,services:["Direction","Commercial","Marketing & Com","RH","Comptabilité"],receptionPole:"Direction",siret:""});
  const [view,setView]=useState("discover");
  const [calMonth,setCalMonth]=useState(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()};});
  const [calSelected,setCalSelected]=useState(null);
  const [mode,setMode]=useState("list");           // list | map
  const [companies,setCompanies]=useState([]);
  const [q,setQ]=useState("");
  const [fSector,setFSector]=useState("");
  const [fRadius,setFRadius]=useState(0);
  const [fEmp,setFEmp]=useState("");
  const [fVerif,setFVerif]=useState(false);
  const [sort,setSort]=useState("aff");
  const [prospect,setProspect]=useState(null);
  const [prospectsUsed,setProspectsUsed]=useState(0);
  const [limitOpen,setLimitOpen]=useState(false);
  const [upgradePlan,setUpgradePlan]=useState("essentiel");
  const [upgradeBilling,setUpgradeBilling]=useState("Mensuelle");
  const [pmsg,setPmsg]=useState("");
  const [openC,setOpenC]=useState(null);
  const [activeConv,setActiveConv]=useState(5);
  const [activeService,setActiveService]=useState("Direction");
  const [visio,setVisio]=useState(null);
  const [visioSetup,setVisioSetup]=useState(false);
  const [visioCompanyId,setVisioCompanyId]=useState(null);
  const [genEvents,setGenEvents]=useState([]);
  const [noteModalOpen,setNoteModalOpen]=useState(false);
  const [noteForm,setNoteForm]=useState({title:"",date:"",time:"",note:""});
  const [noteBusy,setNoteBusy]=useState(false);
  const [incomingVisio,setIncomingVisio]=useState(null);
  const [visioSvcs,setVisioSvcs]=useState([]);
  const [team,setTeam]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [loginEmail,setLoginEmail]=useState("");
  const [profileName,setProfileName]=useState("");
  const [profileNameSaving,setProfileNameSaving]=useState(false);
  const [pwdCurrent,setPwdCurrent]=useState("");
  const [pwdNew,setPwdNew]=useState("");
  const [pwdConfirm,setPwdConfirm]=useState("");
  const [pwdError,setPwdError]=useState("");
  const [pwdBusy,setPwdBusy]=useState(false);
  const [loginPwd,setLoginPwd]=useState("");
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteRole,setInviteRole]=useState("");
  const [inviteRoleCustom,setInviteRoleCustom]=useState("");
  const [pendingInvites,setPendingInvites]=useState([]);
  const [inviteToken,setInviteToken]=useState(null);
  const [inviteInfo,setInviteInfo]=useState(null);
  const [inviteChecked,setInviteChecked]=useState(false);
  const [referralCode,setReferralCode]=useState(null);
  const [referralInfo,setReferralInfo]=useState(null);
  const [joinName,setJoinName]=useState("");
  const [access,setAccess]=useState({admins:["Direction"],grants:{}});
  const [savedAccess,setSavedAccess]=useState({admins:["Direction"],grants:{}});
  const [accessDirty,setAccessDirty]=useState(false);
  const [accessSaving,setAccessSaving]=useState(false);
  const [directionConfirm,setDirectionConfirm]=useState(null);
  const [customRolePrompt,setCustomRolePrompt]=useState(null);
  const [customRoleValue,setCustomRoleValue]=useState("");
  const [auditLog,setAuditLog]=useState([]);
  const [history,setHistory]=useState([]);
  const [notifEmail,setNotifEmail]=useState(true);
  const [notifPush,setNotifPush]=useState(false);
  const [mfaFactors,setMfaFactors]=useState([]);
  const twofa=mfaFactors.length>0;
  const [mfaEnrollOpen,setMfaEnrollOpen]=useState(false);
  const [mfaQr,setMfaQr]=useState(null);
  const [mfaSecret,setMfaSecret]=useState("");
  const [mfaFactorId,setMfaFactorId]=useState(null);
  const [mfaCode,setMfaCode]=useState("");
  const [mfaBusy,setMfaBusy]=useState(false);
  const [mfaError,setMfaError]=useState("");
  const [mfaChallengeNeeded,setMfaChallengeNeeded]=useState(false);
  const [mfaChallengeFactorId,setMfaChallengeFactorId]=useState(null);
  const [mfaLoginCode,setMfaLoginCode]=useState("");
  const [mfaLoginError,setMfaLoginError]=useState("");
  const [mfaLoginBusy,setMfaLoginBusy]=useState(false);
  const [collab,setCollab]=useState(null);
  const [collabForm,setCollabForm]=useState({subject:"",budget:""});
  const [collabFile,setCollabFile]=useState(null);
  const [collabBusy,setCollabBusy]=useState(false);
  const [schedForm,setSchedForm]=useState({date:"",time:""});
  const [draft,setDraft]=useState("");
  const [posts,setPosts]=useState([]);
  const [composeOpen,setComposeOpen]=useState(false);
  const [postForm,setPostForm]=useState({title:"",body:"",tag:"",photo:null});
  const [adhesion,setAdhesion]=useState(false);
  const [needs,setNeeds]=useState([]);
  const [needOpen,setNeedOpen]=useState(false);
  const [needForm,setNeedForm]=useState({title:"",sought:SECTORS[0],loc:""});
  const [inviteCoOpen,setInviteCoOpen]=useState(false);
  const [inviteCoForm,setInviteCoForm]=useState({email:"",name:""});
  const [inviteCoBusy,setInviteCoBusy]=useState(false);
  const [referrals,setReferrals]=useState([]);
  const [needFilter,setNeedFilter]=useState("all");
  const [unreadChat,setUnreadChat]=useState({});
  const [toasts,setToasts]=useState([]);
  const [libQuery,setLibQuery]=useState("");
  const [libFilters,setLibFilters]=useState([]);
  const toggleLibFilter=(k)=>setLibFilters((f)=>f.includes(k)?f.filter((x)=>x!==k):[...f,k]);
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
  const dmKey=(a,b)=>[String(a),String(b)].sort().join("_");

  const toast=(t)=>{const id=Math.random();setToasts((x)=>[...x,{id,t}]);setTimeout(()=>setToasts((x)=>x.filter((y)=>y.id!==id)),3200);};
  const logEvent=(text)=>{
    setAuditLog((l)=>[{id:Date.now()+Math.random(),text,at:new Date().toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})},...l].slice(0,60));
    if(me&&currentUser)supabase.from("audit_log").insert({company_id:me.id,created_by:currentUser.id,text}).then(()=>{});
  };
  const histAt=(d)=>d.toLocaleString("fr-FR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  const logHist=(text,kind)=>{
    setHistory((h)=>[{id:Date.now()+Math.random(),text,kind:kind||"info",at:histAt(new Date())},...h].slice(0,80));
    if(me&&currentUser)supabase.from("history_log").insert({company_id:me.id,created_by:currentUser.id,text,kind:kind||"info"}).then(()=>{});
  };
  const histIcon=(k)=>({
    visio:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    demande:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    acceptation:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    refus:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    besoin:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    devis:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    document:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    emailing:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M4 6l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
    liste:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
    actualite:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 7.4H22l-6 4.4 2.3 7.2L12 17.6 5.7 22 8 14.8 2 10.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
    invitation:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M17 3v5M14.5 5.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
    info:<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 8v.4M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  }[k]||null);
  const HIST_CATEGORIES=[
    {kind:"demande",label:"Démarchages envoyés"},
    {kind:"acceptation",label:"Mises en relation acceptées"},
    {kind:"refus",label:"Demandes refusées"},
    {kind:"emailing",label:"Emailing"},
    {kind:"liste",label:"Listes de diffusion"},
    {kind:"visio",label:"Visioconférences"},
    {kind:"devis",label:"Devis"},
    {kind:"document",label:"Documents partagés"},
    {kind:"besoin",label:"Besoins"},
    {kind:"actualite",label:"Actualités"},
    {kind:"invitation",label:"Invitations envoyées"},
  ];
  const setReceptionPole=(pole)=>{setMe((m)=>({...m,receptionPole:pole}));if(me)supabase.from("companies").update({reception_pole:pole}).eq("id",me.id).then(()=>{});logEvent(`Pôle de réception changé → ${pole}`);toast(`Pôle de réception : ${pole}`);};
  const toggleAccount=(id)=>{
    const m=team.find((x)=>x.id===id);
    const nextStatus=m&&m.status==="disabled"?"active":"disabled";
    setTeam((ts)=>ts.map((x)=>x.id===id?{...x,status:nextStatus}:x));
    supabase.from("profiles").update({status:nextStatus}).eq("id",id).then(()=>{});
    logEvent(`Compte ${m?m.name:""} ${nextStatus==="active"?"réactivé":"désactivé"}`);
  };
  const sendCollabMsg=(obj)=>{
    pushCh(active.id,mSvc,{from:"me",...obj});
    if(active.connectionId)supabase.from("messages").insert({connection_id:active.connectionId,sender_company_id:me.id,service:mSvc,body:JSON.stringify(obj)}).then(()=>{});
  };
  const postCollab=async()=>{
    if(!active||!mSvc||collabBusy)return;
    if(collab==="quote"){
      if(!collabForm.subject.trim())return;
      sendCollabMsg({kind:"quote",subject:collabForm.subject.trim(),budget:collabForm.budget.trim()});
      logHist(`Devis demandé à ${active.name}`,"devis");
      toast("Demande de devis envoyée");
    }else if(collab==="doc"){
      if(!collabFile)return;
      if(collabFile.size>4*1024*1024){toast("Fichier trop volumineux (4 Mo max pour l'instant)");return;}
      setCollabBusy(true);
      try{
        const dataUrl=await new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(reader.result);
          reader.onerror=reject;
          reader.readAsDataURL(collabFile);
        });
        sendCollabMsg({kind:"doc",name:collabFile.name,dataUrl});
        logHist(`Document partagé avec ${active.name}`,"document");
        toast("Document partagé");
      }catch(e){
        toast("Impossible de lire le fichier");
      }finally{
        setCollabBusy(false);
      }
    }
    setCollab(null);setCollabForm({subject:"",budget:""});setCollabFile(null);
  };

  const incoming=companies.filter((c)=>c.rel==="incoming");
  const sent=companies.filter((c)=>c.rel==="sent");
  const connected=companies.filter((c)=>c.rel==="connected");
  const regions=useMemo(()=>[...new Set(companies.map((c)=>c.loc))].sort(),[companies]);

  useEffect(()=>{if(streamRef.current)streamRef.current.scrollTop=streamRef.current.scrollHeight;},[activeConv,activeService,companies]);
  useEffect(()=>{if(teamStreamRef.current)teamStreamRef.current.scrollTop=teamStreamRef.current.scrollHeight;},[internalChat,internalDMs,activeTeammateId]);
  const sendInternalMsg=()=>{
    if(!internalMsg.trim()||!currentUser||!me)return;
    const text=internalMsg.trim();const ts=Date.now();
    const channel=activeTeammateId==null?"general":dmKey(currentUser.id,activeTeammateId);
    const msg={id:ts,authorId:currentUser.id,text};
    if(activeTeammateId==null)setInternalChat((c)=>[...c,msg]);
    else setInternalDMs((d)=>({...d,[channel]:[...(d[channel]||[]),msg]}));
    setInternalMsg("");
    supabase.from("team_messages").insert({company_id:me.id,sender_id:currentUser.id,channel,body:text}).then(()=>{});
  };
  useEffect(()=>{const k=(e)=>{if(e.key==="Escape"){setProspect(null);setOpenC(null);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);

  const hydrateFromSession=async(sess)=>{
    setSession(sess);
    if(!sess){setMe(null);setCurrentUser(null);setTeam([]);setMfaChallengeNeeded(false);setAuthReady(true);return;}
    const {data:aal}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal&&aal.nextLevel==="aal2"&&aal.nextLevel!==aal.currentLevel){
      const {data:factors}=await supabase.auth.mfa.listFactors();
      const factor=factors&&factors.totp&&factors.totp[0];
      setMfaChallengeFactorId(factor?factor.id:null);
      setMfaChallengeNeeded(true);
      setAuthReady(true);
      return;
    }
    setMfaChallengeNeeded(false);
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
    const mappedProfile=mapProfileRow(profile,sess.user.email);
    setMe(mappedCompany);
    setCurrentUser(mappedProfile);
    setTeam((teammates||[]).map((p)=>mapProfileRow(p,p.id===sess.user.id?sess.user.email:"")));
    {const loadedAccess={admins:mappedCompany.adminServices||[mappedCompany.receptionPole],grants:mappedCompany.accessGrants||{}};setAccess(loadedAccess);setSavedAccess(loadedAccess);setAccessDirty(false);}
    setNotifEmail(mappedProfile.notifyEmail);
    setUiLang(mappedProfile.language||"fr");
    refreshMfaFactors();
    setAuthReady(true);
  };

  const refreshMfaFactors=async()=>{
    const {data}=await supabase.auth.mfa.listFactors();
    setMfaFactors(data&&data.totp?data.totp.filter((f)=>f.status==="verified"):[]);
  };
  const startMfaEnroll=async()=>{
    setMfaError("");setMfaBusy(true);
    const {data,error}=await supabase.auth.mfa.enroll({factorType:"totp"});
    setMfaBusy(false);
    if(error){toast("Erreur : "+error.message);return;}
    if(!data||!data.totp||!data.totp.qr_code){toast("Erreur : le QR code n'a pas pu être généré.");return;}
    setMfaFactorId(data.id);setMfaQr(data.totp.qr_code);setMfaSecret(data.totp.secret);setMfaCode("");setMfaEnrollOpen(true);
  };
  const cancelMfaEnroll=()=>{
    if(mfaFactorId)supabase.auth.mfa.unenroll({factorId:mfaFactorId}).then(()=>{});
    setMfaEnrollOpen(false);setMfaQr(null);setMfaSecret("");setMfaFactorId(null);setMfaCode("");setMfaError("");
  };
  const confirmMfaEnroll=async()=>{
    if(!mfaCode.trim()||!mfaFactorId)return;
    setMfaBusy(true);setMfaError("");
    const {data:ch,error:chErr}=await supabase.auth.mfa.challenge({factorId:mfaFactorId});
    if(chErr){setMfaBusy(false);setMfaError(chErr.message);return;}
    const {error:vErr}=await supabase.auth.mfa.verify({factorId:mfaFactorId,challengeId:ch.id,code:mfaCode.trim()});
    setMfaBusy(false);
    if(vErr){setMfaError("Code incorrect, réessayez.");return;}
    setMfaEnrollOpen(false);setMfaCode("");setMfaQr(null);setMfaSecret("");setMfaFactorId(null);
    await refreshMfaFactors();
    logEvent("Double authentification activée");toast("2FA activée !");
  };
  const disableMfa=async()=>{
    const f=mfaFactors[0];if(!f)return;
    setMfaBusy(true);
    const {error}=await supabase.auth.mfa.unenroll({factorId:f.id});
    setMfaBusy(false);
    if(error){toast("Erreur : "+error.message);return;}
    await refreshMfaFactors();
    logEvent("Double authentification désactivée");toast("2FA désactivée");
  };
  const submitMfaChallenge=async()=>{
    if(!mfaChallengeFactorId||!mfaLoginCode.trim())return;
    setMfaLoginError("");setMfaLoginBusy(true);
    const {data:ch,error:chErr}=await supabase.auth.mfa.challenge({factorId:mfaChallengeFactorId});
    if(chErr){setMfaLoginBusy(false);setMfaLoginError(chErr.message);return;}
    const {error:vErr}=await supabase.auth.mfa.verify({factorId:mfaChallengeFactorId,challengeId:ch.id,code:mfaLoginCode.trim()});
    setMfaLoginBusy(false);
    if(vErr){setMfaLoginError("Code incorrect.");return;}
    setMfaLoginCode("");
    const {data:{session:freshSession}}=await supabase.auth.getSession();
    hydrateFromSession(freshSession);
  };

  useEffect(()=>{
    let active=true;
    supabase.auth.getSession().then(({data})=>{if(active)hydrateFromSession(data.session);});
    const {data:sub}=supabase.auth.onAuthStateChange((_event,sess)=>{hydrateFromSession(sess);});
    return ()=>{active=false;sub.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("invite");
    if(!token){setInviteChecked(true);return;}
    setInviteToken(token);
    supabase.rpc("get_invite",{invite_token:token}).then(({data})=>{
      const row=Array.isArray(data)?data[0]:data;
      setInviteInfo(row&&row.status==="pending"?row:null);
      setInviteChecked(true);
    });
  },[]);
  useEffect(()=>{
    const code=new URLSearchParams(window.location.search).get("ref");
    if(!code)return;
    setReferralCode(code);
    supabase.rpc("get_referral",{ref_code:code}).then(({data})=>{
      const row=Array.isArray(data)?data[0]:data;
      if(row){
        setReferralInfo({inviterCompanyId:row.inviter_company_id,inviterName:row.inviter_name,status:row.status});
        if(row.status==="pending")supabase.rpc("mark_referral_clicked",{ref_code:code}).then(()=>{});
      }
    });
  },[]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const checkout=params.get("checkout");
    const billingReturn=params.get("billing");
    if(!checkout&&!billingReturn)return;
    window.history.replaceState({},"",window.location.pathname);
    if(checkout==="success"){toast("✓ Paiement confirmé — activation en cours…");setPendingBillingSync(true);setCheckoutJustSucceeded(true);}
    else if(checkout==="cancel")toast("Paiement annulé.");
    else if(billingReturn==="return")setPendingBillingSync(true);
  },[]);
  useEffect(()=>{
    if(!pendingBillingSync||!session||!me)return;
    setPendingBillingSync(false);
    const wasCheckout=checkoutJustSucceeded;
    setCheckoutJustSucceeded(false);
    fetch("/api/sync-subscription",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({companyId:me.id,accessToken:session.access_token})})
      .then((r)=>r.json()).then((data)=>{
        if(!data.planId)return;
        const plan=PLANS.find((p)=>p.id===data.planId)||PLANS[0];
        setMe((m)=>m&&({...m,planId:data.planId,plan:plan.name,billing:data.billing,membre:data.planId==="pro"}));
        if(wasCheckout&&data.planId!=="gratuit"){setJustOnboarded(true);}
        else toast(`Abonnement à jour : ${plan.name}`);
      }).catch(()=>{}).finally(()=>setCheckoutPending(false));
  },[pendingBillingSync,session,me]);
  useEffect(()=>{
    if(!checkoutPending)return;
    const id=setTimeout(()=>setCheckoutPending(false),8000);
    return ()=>clearTimeout(id);
  },[checkoutPending]);
  useEffect(()=>{if(currentUser)setProfileName(currentUser.name);},[currentUser&&currentUser.id]);
  useEffect(()=>{
    if(!currentUser||!("serviceWorker" in navigator))return;
    let active=true;
    navigator.serviceWorker.getRegistration().then((reg)=>reg&&reg.pushManager.getSubscription()).then((sub)=>{
      if(active&&sub)setNotifPush(true);
    }).catch(()=>{});
    return ()=>{active=false;};
  },[currentUser&&currentUser.id]);

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
          const connFromMe=row.from_company_id===me.id;
          let patch=null;
          if(row.status==="pending"){
            patch=connFromMe?{rel:"sent",sentTo:row.service}:{rel:"incoming",reqMsg:row.message};
          }else if(row.status==="accepted"){patch={rel:"connected",connFromMe};}
          else if(row.status==="declined"){patch={rel:"declined"};}
          if(patch)update(otherId,{...patch,connectionId:row.id});
        });
        conns.forEach((row)=>{
          if(row.status==="accepted"&&row.from_company_id===me.id&&row.emailing_opt_in){
            update(row.to_company_id,{emailingConsent:true,emailingContacts:(row.emailing_addresses||[]).map((addr)=>({name:addr.split("@")[0],email:addr}))});
          }
          if(row.status==="accepted"&&row.to_company_id===me.id){
            update(row.from_company_id,{myEmailingOptIn:!!row.emailing_opt_in});
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
            (byCompany[otherId][m.service]=byCompany[otherId][m.service]||[]).push({from:m.sender_company_id===me.id?"me":"them",...decodeMsg(m.body),id:m.id});
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
          return {...c,channels:{...(c.channels||{}),[m.service]:[...arr,{from:"them",...decodeMsg(m.body),id:m.id}]}};
        }));
        toast("💬 Nouveau message reçu");
        notifyByEmail("Nouveau message sur Maillon","Vous avez reçu un nouveau message sur votre messagerie Maillon.");
        notifyByPush("Nouveau message sur Maillon","Vous avez reçu un nouveau message sur votre messagerie.");
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("visio-calls-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"visio_calls",filter:`to_company_id=eq.${me.id}`},(payload)=>{
        const row=payload.new;
        const c=companies.find((x)=>x.id===row.from_company_id);
        setIncomingVisio({fromName:c?c.name:"Une entreprise",fromCompanyId:row.from_company_id,services:row.services,room:row.room});
        toast(`🎥 Visio entrante de ${c?c.name:"une entreprise"}`);
        notifyByPush("Visio entrante",`${c?c.name:"Une entreprise"} vous invite à une visio.`);
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id,companies]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("team_messages").select("*").eq("company_id",me.id).order("created_at",{ascending:true}).then(({data})=>{
      if(!active||!data)return;
      const general=[];const dms={};
      data.forEach((row)=>{
        const msg={id:row.id,authorId:row.sender_id,text:row.body};
        if(row.channel==="general")general.push(msg);
        else (dms[row.channel]=dms[row.channel]||[]).push(msg);
      });
      setInternalChat(general);
      setInternalDMs(dms);
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me||!currentUser)return;
    const channel=supabase.channel("team-messages-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"team_messages",filter:`company_id=eq.${me.id}`},(payload)=>{
        const row=payload.new;
        if(row.sender_id===currentUser.id)return;
        const msg={id:row.id,authorId:row.sender_id,text:row.body};
        setUnreadChat((u)=>({...u,[row.channel]:(u[row.channel]||0)+1}));
        if(row.channel==="general"){
          setInternalChat((c)=>[...c,msg]);
          toast("💬 Nouveau message (Général)");
          notifyByEmail("Nouveau message sur Maillon","Vous avez reçu un nouveau message dans le canal Général de votre équipe.");
          notifyByPush("Nouveau message · Général","Vous avez reçu un nouveau message dans le canal Général.");
        }else{
          setInternalDMs((d)=>({...d,[row.channel]:[...(d[row.channel]||[]),msg]}));
          if(row.channel===dmKey(currentUser.id,row.sender_id)){
            toast("💬 Nouveau message reçu");
            notifyByEmail("Nouveau message sur Maillon","Vous avez reçu un nouveau message privé sur votre chat interne Maillon.");
            notifyByPush("Nouveau message privé","Vous avez reçu un nouveau message privé sur le chat interne.");
          }
        }
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id,currentUser&&currentUser.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("history_log").select("*").eq("company_id",me.id).order("created_at",{ascending:false}).limit(80).then(({data})=>{
      if(!active||!data)return;
      setHistory(data.map((row)=>({id:row.id,text:row.text,kind:row.kind,at:histAt(new Date(row.created_at))})));
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me||!currentUser)return;
    const channel=supabase.channel("history-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"history_log",filter:`company_id=eq.${me.id}`},(payload)=>{
        const row=payload.new;
        if(row.created_by===currentUser.id)return;
        setHistory((h)=>[{id:row.id,text:row.text,kind:row.kind,at:histAt(new Date(row.created_at))},...h].slice(0,80));
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id,currentUser&&currentUser.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("audit_log").select("*").eq("company_id",me.id).order("created_at",{ascending:false}).limit(60).then(({data})=>{
      if(!active||!data)return;
      setAuditLog(data.map((row)=>({id:row.id,text:row.text,at:histAt(new Date(row.created_at))})));
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me||!currentUser)return;
    const channel=supabase.channel("audit-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"audit_log",filter:`company_id=eq.${me.id}`},(payload)=>{
        const row=payload.new;
        if(row.created_by===currentUser.id)return;
        setAuditLog((l)=>[{id:row.id,text:row.text,at:histAt(new Date(row.created_at))},...l].slice(0,60));
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id,currentUser&&currentUser.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("calendar_events").select("*").eq("company_id",me.id).order("date",{ascending:true}).then(({data})=>{
      if(!active||!data)return;
      setGenEvents(data);
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("calendar-events-"+me.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"calendar_events",filter:`company_id=eq.${me.id}`},(payload)=>{
        setGenEvents((g)=>g.some((e)=>e.id===payload.new.id)?g:[...g,payload.new]);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"calendar_events",filter:`company_id=eq.${me.id}`},(payload)=>{
        setGenEvents((g)=>g.filter((e)=>e.id!==payload.old.id));
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("posts").select("*").order("created_at",{ascending:false}).limit(60).then(async({data})=>{
      if(!active||!data)return;
      const ids=data.map((r)=>r.id);
      const {data:likeRows}=ids.length?await supabase.from("post_likes").select("post_id,company_id").in("post_id",ids):{data:[]};
      const countOf={};const mineOf={};
      (likeRows||[]).forEach((l)=>{countOf[l.post_id]=(countOf[l.post_id]||0)+1;if(l.company_id===me.id)mineOf[l.post_id]=true;});
      if(!active)return;
      const real=data.map((row)=>({id:row.id,companyId:row.company_id,repostOfCompanyId:row.repost_of_company_id||null,title:row.title,body:row.body||"",tag:row.tag||"Actu",photo:row.photo||null,date:relDate(row.created_at),likes:countOf[row.id]||0,liked:!!mineOf[row.id]}));
      setPosts((ps)=>{
        const existing=new Set(ps.map((p)=>p.id));
        const fresh=real.filter((p)=>!existing.has(p.id));
        return fresh.length?[...fresh,...ps]:ps;
      });
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("posts-feed")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"},(payload)=>{
        const row=payload.new;
        if(row.company_id===me.id)return;
        const post={id:row.id,companyId:row.company_id,repostOfCompanyId:row.repost_of_company_id||null,title:row.title,body:row.body||"",tag:row.tag||"Actu",photo:row.photo||null,date:relDate(row.created_at),likes:0,liked:false};
        setPosts((ps)=>[post,...ps]);
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("needs").select("*").order("created_at",{ascending:false}).limit(60).then(async({data})=>{
      if(!active||!data)return;
      const ids=data.map((r)=>r.id);
      const {data:respRows}=ids.length?await supabase.from("need_responses").select("need_id").in("need_id",ids):{data:[]};
      const countOf={};(respRows||[]).forEach((r)=>{countOf[r.need_id]=(countOf[r.need_id]||0)+1;});
      if(!active)return;
      const real=data.map((row)=>({id:row.id,companyId:row.company_id,mine:row.company_id===me.id,title:row.title,sought:row.sought,loc:row.loc,date:relDate(row.created_at),responses:countOf[row.id]||0}));
      setNeeds((ns)=>{
        const existing=new Set(ns.map((n)=>n.id));
        const fresh=real.filter((n)=>!existing.has(n.id));
        return fresh.length?[...fresh,...ns]:ns;
      });
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    let active=true;
    supabase.from("referrals").select("*").eq("inviter_company_id",me.id).order("created_at",{ascending:false}).then(({data})=>{
      if(!active||!data)return;
      setReferrals(data);
    });
    return ()=>{active=false;};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("needs-feed")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"needs"},(payload)=>{
        const row=payload.new;
        if(row.company_id===me.id)return;
        const n={id:row.id,companyId:row.company_id,mine:false,title:row.title,sought:row.sought,loc:row.loc,date:relDate(row.created_at),responses:0};
        setNeeds((ns)=>[n,...ns]);
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("need-responses-feed")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"need_responses"},(payload)=>{
        const row=payload.new;
        if(row.company_id===me.id)return;
        setNeeds((ns)=>ns.map((n)=>n.id===row.need_id?{...n,responses:n.responses+1}:n));
      })
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me&&me.id]);

  useEffect(()=>{
    if(!me)return;
    const channel=supabase.channel("post-likes-feed")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"post_likes"},(payload)=>{
        const row=payload.new;
        if(row.company_id===me.id)return;
        setPosts((ps)=>ps.map((p)=>p.id===row.post_id?{...p,likes:p.likes+1}:p));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"post_likes"},(payload)=>{
        const row=payload.old;
        if(!row||row.company_id===me.id)return;
        setPosts((ps)=>ps.map((p)=>p.id===row.post_id?{...p,likes:Math.max(0,p.likes-1)}:p));
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
    supabase.from("invites").select("*").eq("company_id",me.id).eq("status","pending").order("created_at",{ascending:false}).then(({data})=>{
      if(!active||!data)return;
      setPendingInvites(data);
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

  const joinViaInvite=async()=>{
    if(!session||!inviteToken||!joinName.trim())return;
    setAuthBusy(true);
    const {error}=await supabase.rpc("accept_invite",{invite_token:inviteToken,new_full_name:joinName.trim()});
    setAuthBusy(false);
    if(error){toast("Erreur : "+error.message);return;}
    window.history.replaceState({},"",window.location.pathname);
    setInviteToken(null);setInviteInfo(null);setJoinName("");
    toast("Vous avez rejoint l'entreprise !");
    hydrateFromSession(session);
  };

  const addCustomService=()=>{
    const v=customService.trim();
    if(!v)return;
    setForm((f)=>f.services.includes(v)?f:{...f,services:[...f.services,v]});
    setCustomService("");
  };
  const manageBilling=async()=>{
    if(!session||!me)return;
    const res=await fetch("/api/create-portal-session",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({companyId:me.id,accessToken:session.access_token})});
    const data=await res.json();
    if(!res.ok||!data.url){toast("Erreur : "+(data.error||"aucun abonnement à gérer"));return;}
    window.location.href=data.url;
  };
  const startCheckout=async(companyId,planId,billing)=>{
    if(!session)return;
    try{
      const res=await fetch("/api/create-checkout-session",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({companyId,planId,billing,email:session.user.email,accessToken:session.access_token})});
      const data=await res.json();
      if(!res.ok||!data.url){toast("Erreur : "+(data.error||"impossible de lancer le paiement"));return;}
      window.location.href=data.url;
    }catch(e){
      toast("Erreur réseau : "+(e&&e.message?e.message:String(e)));
    }
  };
  const finishOnboarding=async()=>{
    if(authBusy)return;
    toast("Publication en cours…");
    if(!session){toast("Session expirée, reconnectez-vous.");return;}
    setAuthBusy(true);
    try{
      const chosen=PLANS.find((p)=>p.id===form.plan)||PLANS[0];
      const services=(form.services&&form.services.length)?form.services:["Direction","Commercial"];
      const receptionPole=services.includes(form.receptionPole)?form.receptionPole:(services.includes("Direction")?"Direction":(services[0]||"Direction"));
      const splitList=(s)=>s?s.split(",").map((x)=>x.trim()).filter(Boolean):[];
      const {data:company,error}=await supabase.from("companies").insert({
        name:form.name||"Mon Entreprise",sector:form.sector||"Non précisé",loc:form.loc||"France",emp:form.emp,
        founded:form.founded||null,ca:form.ca,dispo:form.dispo,web:form.web||null,siret:form.siret||null,
        verified_siren:!!form.siret.trim(),color:form.color,logo_url:form.logo||null,
        description:form.desc||"Présentation à compléter.",seek:splitList(form.seek),offer:splitList(form.offer),
        certifs:splitList(form.certifs),langues:form.langues?splitList(form.langues):["Français"],
        services,reception_pole:receptionPole,plan_id:"gratuit",billing:null,
      }).select().single();
      if(error){toast("Erreur : "+error.message);return;}
      if(referralInfo&&referralCode){
        supabase.rpc("accept_referral",{ref_code:referralCode,new_company_id:company.id}).then(()=>{});
        fetch("/api/grant-founder-credit",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({inviterCompanyId:referralInfo.inviterCompanyId,accessToken:session.access_token})}).catch(()=>{});
      }
      const {data:profile,error:profErr}=await supabase.from("profiles").update({
        company_id:company.id,full_name:form.ownerName.trim()||form.name,role:receptionPole,status:"active",
      }).eq("id",session.user.id).select().single();
      if(profErr){toast("Erreur : "+profErr.message);return;}
      if(chosen.id!=="gratuit"){
        toast("Redirection vers le paiement…");
        await startCheckout(company.id,chosen.id,form.billing);
        return;
      }
      setMe(mapCompanyRow(company));
      setCurrentUser(mapProfileRow(profile,session.user.email));
      setTeam([mapProfileRow(profile,session.user.email)]);
      {const initAccess={admins:[receptionPole],grants:{}};setAccess(initAccess);setSavedAccess(initAccess);setAccessDirty(false);}
      setView("discover");
      setProspectsUsed(0);
      setJustOnboarded(true);
    }catch(e){
      toast("Erreur inattendue : "+(e&&e.message?e.message:String(e)));
    }finally{
      setAuthBusy(false);
    }
  };
  const updateRole=(id,r)=>{
    setTeam((ts)=>ts.map((x)=>x.id===id?{...x,role:r}:x));
    setCurrentUser((u)=>u&&u.id===id?{...u,role:r}:u);
    supabase.from("profiles").update({role:r}).eq("id",id).then(()=>{});
    logEvent(`Rôle modifié → ${r}`);
  };
  const logout=async()=>{if(currentUser)logEvent(`Déconnexion — ${currentUser.name}`);await supabase.auth.signOut();setLoginEmail("");setLoginPwd("");setView("discover");setPreAuthView("landing");};
  const saveProfileName=async()=>{
    const v=profileName.trim();
    if(!v||!currentUser)return;
    setProfileNameSaving(true);
    const {error}=await supabase.from("profiles").update({full_name:v}).eq("id",currentUser.id);
    setProfileNameSaving(false);
    if(error){toast("Erreur : "+error.message);return;}
    setCurrentUser((u)=>u&&({...u,name:v}));
    setTeam((ts)=>ts.map((x)=>x.id===currentUser.id?{...x,name:v}:x));
    logEvent("Nom du compte modifié");
    toast("Informations enregistrées");
  };
  const changePassword=async()=>{
    setPwdError("");
    if(!pwdCurrent||!pwdNew||!pwdConfirm){setPwdError("Renseignez les trois champs.");return;}
    if(pwdNew.length<8){setPwdError("Le nouveau mot de passe doit faire au moins 8 caractères.");return;}
    if(pwdNew!==pwdConfirm){setPwdError("Les deux mots de passe ne correspondent pas.");return;}
    setPwdBusy(true);
    const {error:checkErr}=await supabase.auth.signInWithPassword({email:session.user.email,password:pwdCurrent});
    if(checkErr){setPwdBusy(false);setPwdError("Mot de passe actuel incorrect.");return;}
    const {error}=await supabase.auth.updateUser({password:pwdNew});
    setPwdBusy(false);
    if(error){setPwdError(error.message);return;}
    setPwdCurrent("");setPwdNew("");setPwdConfirm("");
    logEvent("Mot de passe modifié");
    toast("Mot de passe modifié");
  };
  const inviteLink=(token)=>`${window.location.origin}${window.location.pathname}?invite=${token}`;
  const sendInvite=async(email,rl)=>{
    const e=(email||"").trim();if(!e||!/@/.test(e)||!me)return;
    const {data,error}=await supabase.from("invites").insert({company_id:me.id,email:e,role:rl}).select().single();
    if(error){toast("Erreur : "+error.message);return;}
    setPendingInvites((p)=>[data,...p]);
    logEvent(`Invitation créée pour ${e} (${rl})`);
    navigator.clipboard&&navigator.clipboard.writeText(inviteLink(data.token)).catch(()=>{});
    toast(`Lien d'invitation copié pour ${e}`);
  };
  const revokeInvite=(id)=>{
    setPendingInvites((p)=>p.filter((x)=>x.id!==id));
    supabase.from("invites").update({status:"revoked"}).eq("id",id).then(()=>{});
  };
  const genReferralCode=()=>{const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<5;i++)s+=chars[Math.floor(Math.random()*chars.length)];return `MAIL-${s}`;};
  const createReferral=async()=>{
    const email=inviteCoForm.email.trim();
    if(!email||!/@/.test(email)||!me)return null;
    if(session&&session.user&&session.user.email&&email.toLowerCase()===session.user.email.toLowerCase()){toast(t("Vous ne pouvez pas vous inviter vous-même."));return null;}
    const name=inviteCoForm.name.trim();
    const code=genReferralCode();
    const {data,error}=await supabase.from("referrals").insert({inviter_company_id:me.id,invited_email:email,invited_name:name||null,code}).select().single();
    if(error){toast("Erreur : "+error.message);return null;}
    setReferrals((rs)=>[data,...rs]);
    return {code,email,name};
  };
  const referralLink=(code)=>`${typeof window!=="undefined"?window.location.origin:"https://getmaillon.fr"}/?ref=${code}`;
  const copyReferralLink=async()=>{
    setInviteCoBusy(true);
    const r=await createReferral();
    if(!r){setInviteCoBusy(false);return;}
    const link=referralLink(r.code);
    navigator.clipboard&&navigator.clipboard.writeText(link).catch(()=>{});
    logHist(`Lien d'invitation créé pour ${r.email}`,"invitation");
    toast(t("Lien copié !"));
    setInviteCoOpen(false);setInviteCoForm({email:"",name:""});
    setInviteCoBusy(false);
  };
  const sendCompanyInvite=async()=>{
    setInviteCoBusy(true);
    const r=await createReferral();
    if(!r){setInviteCoBusy(false);return;}
    const link=referralLink(r.code);
    const subject=`${me.name} vous invite à rejoindre Maillon`;
    const html=buildInviteEmail({inviterCompany:me.name,link});
    try{
      const res=await fetch("/api/send-campaign",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({subject,html,fromName:me.name,replyTo:session&&session.user&&session.user.email,recipients:[{email:r.email,name:r.name}]})});
      const data=await res.json();
      const ok=data.results&&data.results[0]&&data.results[0].ok;
      if(!ok){toast("Erreur : "+((data.results&&data.results[0]&&data.results[0].error)||data.error||t("envoi impossible")));setInviteCoBusy(false);return;}
      logHist(`Invitation envoyée à ${r.email}`,"invitation");
      toast(`${t("Invitation envoyée à")} ${r.email}`);
      setInviteCoOpen(false);setInviteCoForm({email:"",name:""});
    }catch(e){
      toast(t("Erreur d'envoi de l'invitation"));
    }
    setInviteCoBusy(false);
  };

  const planCredits=()=>{if(me&&me.founderFreeActive)return null;const p=PLANS.find((x)=>x.id===(me&&me.planId));return p?p.credits:null;};
  const remaining=()=>{const c=planCredits();return c==null?null:Math.max(0,c-prospectsUsed);};
  const canProspect=()=>{const c=planCredits();return c==null||prospectsUsed<c;};
  const upgradeTo=(planId,billing)=>{setLimitOpen(false);setAdhesion(false);if(me)startCheckout(me.id,planId,billing||"Mensuelle");};
  const openLimitUpgrade=()=>{setUpgradePlan("essentiel");setUpgradeBilling("Mensuelle");setLimitOpen(true);};
  const openAdhesionUpgrade=()=>{setUpgradePlan("pro");setUpgradeBilling("Mensuelle");setAdhesion(true);};

  const openProspect=(c)=>{if(!canProspect()){setOpenC(null);openLimitUpgrade();return;}setProspect(c);setOpenC(null);
    setPmsg(`Bonjour ${c.name}, je suis ${(me&&me.name)||"une entreprise"} (${(me&&me.sector)||form.sector}). `+
      `On aimerait explorer une collaboration autour de ${(c.seek&&c.seek[0])||"nos activités"}. Ouvert à en discuter ?`);};
  const sendProspect=()=>{
    const c=prospect;const target=c.receptionPole||"Direction";setProspectsUsed((n)=>n+1);update(c.id,{rel:"sent",sentTo:target,connFromMe:true});setProspect(null);logHist(`Demande de mise en relation envoyée à ${c.name} (pôle ${target})`,"demande");toast(`Demande envoyée à ${c.name} · pôle ${target}`);
    supabase.from("connections").upsert({from_company_id:me.id,to_company_id:c.id,status:"pending",service:target,message:pmsg,responded_at:null},{onConflict:"from_company_id,to_company_id"}).select().single()
      .then(({data,error})=>{if(!error&&data)update(c.id,{connectionId:data.id});});
  };

  const accept=(c,emailingOptIn,emailingAddresses)=>{const pole=(me&&me.receptionPole)||"Direction";const common=commonServices(c);const svc=common.includes(pole)?pole:(common[0]||"Direction");const addrs=emailingOptIn?(emailingAddresses||[]).map((e)=>e.trim()).filter(Boolean):[];update(c.id,{rel:"connected",connFromMe:false,myEmailingOptIn:!!emailingOptIn,emailingOptIn:!!emailingOptIn,emailingAddresses:addrs,channels:{[svc]:[{from:"sys",text:`Vous avez accepté la demande de ${c.name} · service ${svc}.`},{from:"them",text:c.reqMsg}]}});setActiveConv(c.id);setActiveService(svc);logEvent(`Mise en relation acceptée — ${c.name}`);logHist(`Vous avez accepté la demande de ${c.name}${emailingOptIn?" · abonné à l'emailing":""}`,"acceptation");toast(`Connecté avec ${c.name}`);
    if(c.connectionId)supabase.from("connections").update({status:"accepted",service:svc,emailing_opt_in:!!emailingOptIn,emailing_addresses:addrs,responded_at:new Date().toISOString()}).eq("id",c.connectionId).then(()=>{});
  };
  const setMyEmailingOptIn=(c,val)=>{
    update(c.id,{myEmailingOptIn:val});
    if(c.connectionId)supabase.from("connections").update({emailing_opt_in:val,emailing_addresses:val?[session.user.email]:[]}).eq("id",c.connectionId).then(()=>{});
    logHist(`${val?"Autorisation":"Retrait de l'autorisation"} des campagnes d'emailing de ${c.name}`,"emailing");
  };
  const disconnectCompany=(c)=>{
    update(c.id,{rel:"none",connectionId:null,channels:{},emailingConsent:false,myEmailingOptIn:false});
    if(c.connectionId)supabase.from("connections").update({status:"ended",responded_at:new Date().toISOString()}).eq("id",c.connectionId).then(()=>{});
    logHist(`Connexion terminée avec ${c.name}`,"refus");
    toast(`Vous n'êtes plus connecté avec ${c.name}`);
    setOpenC(null);
  };
  const decline=(c)=>{update(c.id,{rel:"declined"});logHist(`Demande de ${c.name} déclinée`,"refus");toast(`Demande de ${c.name} déclinée`);
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
    logHist(`Campagne d'emailing envoyée : « ${camp.name} » (${recipients.length} destinataire${recipients.length>1?"s":""})`,"emailing");
    toast(`Campagne envoyée à ${recipients.length} entreprise${recipients.length>1?"s":""}`);
    const mails=recipients.flatMap((c)=>(c.emailingContacts||[]).map((ct)=>({email:ct.email,name:ct.name})));
    if(mails.length){
      fetch("/api/send-campaign",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({subject:camp.subject,html:camp.html,text:camp.body,fromName:me.name,replyTo:session&&session.user&&session.user.email,recipients:mails})})
        .then((r)=>r.json()).then(({results,error})=>{
          if(error){toast("Erreur d'envoi : "+error);return;}
          const ok=(results||[]).filter((r)=>r.ok).length;const fail=(results||[]).length-ok;
          toast(fail?`✉️ ${ok} email(s) envoyé(s), ${fail} échec(s)`:`✉️ ${ok} email(s) réellement envoyé(s)`);
        }).catch(()=>toast("Erreur d'envoi des emails"));
    }
    if(needsRsvp){
      recipients.forEach((c,i)=>{
        setTimeout(()=>{
          const status=Math.random()<0.7?"confirmed":"declined";
          updateRsvp(camp.id,c.id,status);
          logHist(`${c.name} a ${status==="confirmed"?"confirmé sa présence":"décliné l'invitation"} pour « ${camp.name} »`,"emailing");
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
    logHist(`Liste de diffusion créée : « ${list.name} » (${list.companyIds.length} entreprise${list.companyIds.length>1?"s":""})`,"liste");
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
  const toggleAdmin=(s)=>{
    if(!isAdmin)return;
    if(access.admins.includes(s)&&access.admins.length===1){
      toast("Impossible de retirer le dernier administrateur — ajoutez d'abord un autre service en accès complet.");
      return;
    }
    setAccess((a)=>({...a,admins:a.admins.includes(s)?a.admins.filter((x)=>x!==s):[...a.admins,s]}));
    setAccessDirty(true);
  };
  const toggleGrant=(s,o)=>{
    if(!isAdmin)return;
    setAccess((a)=>{
      const cur=a.grants[s]||[];
      return{...a,grants:{...a.grants,[s]:cur.includes(o)?cur.filter((x)=>x!==o):[...cur,o]}};
    });
    setAccessDirty(true);
  };
  const saveAccess=async()=>{
    if(!me||!isAdmin)return;
    setAccessSaving(true);
    const {error}=await supabase.from("companies").update({admin_services:access.admins,access_grants:access.grants}).eq("id",me.id);
    setAccessSaving(false);
    if(error){toast("Erreur : "+error.message);return;}
    setSavedAccess(access);
    setAccessDirty(false);
    logEvent("Droits d'accès & cloisonnement mis à jour");
    toast("Modifications enregistrées");
  };
  const resetAccessDraft=()=>{setAccess(savedAccess);setAccessDirty(false);};
  const notifyByEmail=(subject,text)=>{
    if(!notifEmail||!session||!session.user||!session.user.email)return;
    fetch("/api/send-campaign",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({subject,text,fromName:"Maillon",recipients:[{email:session.user.email,name:currentUser?currentUser.name:""}]})}).catch(()=>{});
  };
  const notifyByPush=(title,body)=>{
    if(!notifPush||!currentUser||!session)return;
    fetch("/api/send-push",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({profileId:currentUser.id,title,body,accessToken:session.access_token})}).catch(()=>{});
  };
  const enablePush=async()=>{
    if(!currentUser)return;
    if(!("serviceWorker" in navigator)||!("PushManager" in window)){toast("Votre navigateur ne supporte pas les notifications push.");return;}
    try{
      const perm=await Notification.requestPermission();
      if(perm!=="granted"){toast("Notifications refusées dans le navigateur.");return;}
      const reg=await navigator.serviceWorker.register("/sw.js");
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)});
      const json=sub.toJSON();
      const {error}=await supabase.from("push_subscriptions").insert({profile_id:currentUser.id,endpoint:json.endpoint,p256dh:json.keys.p256dh,auth:json.keys.auth});
      if(error&&!error.message.includes("duplicate")){toast("Erreur : "+error.message);return;}
      setNotifPush(true);
      toast("Notifications push activées");
    }catch(e){
      toast("Erreur d'activation des notifications push");
    }
  };
  const disablePush=async()=>{
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      const sub=reg&&await reg.pushManager.getSubscription();
      if(sub){await supabase.from("push_subscriptions").delete().eq("endpoint",sub.endpoint);await sub.unsubscribe();}
    }catch(e){}
    setNotifPush(false);
    toast("Notifications push désactivées");
  };
  const toggleNotifEmail=()=>{
    setNotifEmail((v)=>{
      const next=!v;
      if(currentUser)supabase.from("profiles").update({notify_email:next}).eq("id",currentUser.id).then(()=>{});
      return next;
    });
  };
  const setLanguage=(code)=>{
    if(!currentUser)return;
    setCurrentUser((u)=>u&&({...u,language:code}));
    setUiLang(code);
    if(typeof window!=="undefined")window.localStorage.setItem("maillon_lang",code);
    supabase.from("profiles").update({language:code}).eq("id",currentUser.id).then(()=>{});
    logEvent(`Langue modifiée → ${(LANGUAGES.find((l)=>l.code===code)||{}).name||code}`);
    toast(t("Langue enregistrée"));
  };

  const send=()=>{
    if(!draft.trim())return;const id=activeConv;const text=draft.trim();setDraft("");
    const c=companies.find((x)=>x.id===id);const svc=mSvc;
    if(!svc)return;
    const push=(from,t)=>setCompanies((cs)=>cs.map((x)=>x.id===id?{...x,channels:{...(x.channels||{}),[svc]:[...((x.channels&&x.channels[svc])||[]),{from,text:t}]}}:x));
    push("me",text);
    if(c.connectionId)supabase.from("messages").insert({connection_id:c.connectionId,sender_company_id:me.id,service:svc,body:text}).then(()=>{});
  };

  const pushCh=(id,svc,obj)=>setCompanies((cs)=>cs.map((x)=>x.id===id?{...x,channels:{...(x.channels||{}),[svc]:[...((x.channels&&x.channels[svc])||[]),obj]}}:x));
  const startVisio=async(c,svcs)=>{
    const arr=(Array.isArray(svcs)?svcs:[svcs]).filter(Boolean);if(!arr.length)return;
    setVisioSetup(false);
    setVisio({companyId:c.id,services:arr,url:null});
    try{
      const res=await fetch("/api/create-room",{method:"POST"});
      const data=await res.json();
      if(!res.ok||!data.url){toast("Erreur : "+(data.error||"impossible de créer la visio"));setVisio(null);return;}
      setVisio({companyId:c.id,services:arr,url:data.url});
      logHist(`Visio démarrée avec ${c.name} · ${arr.join(", ")}`,"visio");
      if(isRealCompany(c)&&c.connectionId&&me){
        supabase.from("visio_calls").insert({connection_id:c.connectionId,from_company_id:me.id,to_company_id:c.id,services:arr,room:data.url}).then(()=>{});
      }
    }catch(e){
      toast("Erreur de connexion à la visio");setVisio(null);
    }
  };
  const endVisio=(secs)=>{if(visio){const mm=String(Math.floor(secs/60)).padStart(2,"0"),ss=String(secs%60).padStart(2,"0");const cc=companies.find((x)=>x.id===visio.companyId);(visio.services||[]).forEach((svc)=>pushCh(visio.companyId,svc,{from:"sys",text:`Visio terminée · durée ${mm}:${ss}`}));logHist(`Visio terminée avec ${cc?cc.name:""} · durée ${mm}:${ss}`,"visio");}setVisio(null);toast("Visio terminée");};
  const joinIncomingVisio=()=>{
    if(!incomingVisio)return;
    setVisio({companyId:incomingVisio.fromCompanyId,services:incomingVisio.services,url:incomingVisio.room});
    logHist(`Visio rejointe avec ${incomingVisio.fromName} · ${(incomingVisio.services||[]).join(", ")}`,"visio");
    setIncomingVisio(null);
  };
  const scheduleVisio=(company)=>{
    const target=company||active;
    if(!schedForm.date||!schedForm.time||!target||!visioSvcs.length)return;
    const d=schedForm.date,tm=schedForm.time;
    const obj={kind:"meeting",date:d,time:tm,services:visioSvcs};
    visioSvcs.forEach((svc)=>{
      pushCh(target.id,svc,{from:"me",...obj});
      if(target.connectionId)supabase.from("messages").insert({connection_id:target.connectionId,sender_company_id:me.id,service:svc,body:JSON.stringify(obj)}).then(()=>{});
    });
    logHist(`Visio planifiée avec ${target.name} le ${d} à ${tm}`,"visio");
    setVisioSetup(false);setSchedForm({date:"",time:""});setVisioCompanyId(null);if(active&&active.id===target.id)setActiveService(visioSvcs[0]);toast("Visio planifiée");
  };

  const addGenericEvent=async()=>{
    if(!me||noteBusy)return;
    const title=noteForm.title.trim();
    if(!title||!noteForm.date)return;
    setNoteBusy(true);
    const row={company_id:me.id,title,note:noteForm.note.trim()||null,date:noteForm.date,time:noteForm.time||null,created_by:currentUser&&currentUser.id};
    const {data,error}=await supabase.from("calendar_events").insert(row).select().single();
    setNoteBusy(false);
    if(error){toast("Erreur : "+error.message);return;}
    setGenEvents((g)=>[...g,data]);
    setNoteModalOpen(false);setNoteForm({title:"",date:"",time:"",note:""});
    toast("Événement ajouté");
  };
  const deleteGenericEvent=async(id)=>{
    setGenEvents((g)=>g.filter((e)=>e.id!==id));
    await supabase.from("calendar_events").delete().eq("id",id);
  };

  const clearFilters=()=>{setFSector("");setFRadius(0);setFEmp("");setFVerif(false);setQ("");};

  // blog central + adhésion (adhésion simulée dans la maquette)
  const tryPublish=()=>{if(me.membre)setComposeOpen(true);else openAdhesionUpgrade();};
  const relDate=(iso)=>{
    const min=Math.floor((Date.now()-new Date(iso).getTime())/60000);
    if(min<1)return"À l'instant";
    if(min<60)return`Il y a ${min} min`;
    const h=Math.floor(min/60);if(h<24)return`Il y a ${h} h`;
    const d=Math.floor(h/24);if(d<7)return`Il y a ${d} j`;
    return new Date(iso).toLocaleDateString("fr-FR");
  };
  const authorFromId=(id)=>{
    if(me&&id===me.id)return{name:me.name,color:me.color,sector:me.sector,loc:me.loc,logo:me.logo,isMe:true};
    const c=companies.find((x)=>x.id===id);
    return c?{name:c.name,color:c.color,sector:c.sector,loc:c.loc,logo:c.logo,isMe:false}:{name:"Entreprise",color:"#0F846B",sector:"",loc:"",logo:null,isMe:false};
  };
  const postAuthor=(p)=>p.author||authorFromId(p.companyId);
  const postRepostOf=(p)=>p.repostOf||(p.repostOfCompanyId?authorFromId(p.repostOfCompanyId):null);
  const publish=()=>{
    if(!postForm.title.trim()||!me)return;
    const tempId=Date.now();
    const title=postForm.title.trim(),body=postForm.body.trim(),tag=postForm.tag.trim()||"Actu",photo=postForm.photo||null;
    const post={id:tempId,companyId:me.id,title,body,tag,photo,date:"À l'instant",likes:0,liked:false};
    setPosts((p)=>[post,...p]);setComposeOpen(false);setPostForm({title:"",body:"",tag:"",photo:null});logHist("Actualité publiée","actualite");toast("Actualité publiée");
    supabase.from("posts").insert({company_id:me.id,title,body,tag,photo}).select().single().then(({data})=>{
      if(data)setPosts((ps)=>ps.map((x)=>x.id===tempId?{...x,id:data.id}:x));
    });
  };
  const toggleLike=(id)=>{
    const p=posts.find((x)=>x.id===id);if(!p)return;
    const nowLiked=!p.liked;
    setPosts((ps)=>ps.map((x)=>x.id===id?{...x,liked:nowLiked,likes:x.likes+(nowLiked?1:-1)}:x));
    if(typeof id!=="string"||!me)return;
    if(nowLiked)supabase.from("post_likes").insert({post_id:id,company_id:me.id}).then(()=>{});
    else supabase.from("post_likes").delete().eq("post_id",id).eq("company_id",me.id).then(()=>{});
  };
  const repost=(p)=>{
    if(!me)return;
    const original=postRepostOf(p)||postAuthor(p);
    const originalId=p.repostOfCompanyId||p.companyId||null;
    const tempId=Date.now();
    const clone={id:tempId,companyId:me.id,repostOf:original,title:p.title,body:p.body,tag:p.tag,photo:p.photo||null,date:"À l'instant",likes:0,liked:false};
    setPosts((ps)=>[clone,...ps]);logHist(`Actualité de ${original.name} republiée`,"actualite");toast("Actualité republiée sur votre fil");
    supabase.from("posts").insert({company_id:me.id,repost_of_company_id:typeof originalId==="string"?originalId:null,title:clone.title,body:clone.body,tag:clone.tag,photo:clone.photo}).select().single().then(({data})=>{
      if(data)setPosts((ps)=>ps.map((x)=>x.id===tempId?{...x,id:data.id}:x));
    });
  };
  const onPhotoPick=(e)=>{const file=e.target.files&&e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>setPostForm((f)=>({...f,photo:reader.result}));reader.readAsDataURL(file);};

  // moteur de mise en relation
  const recoReason=(c)=>{
    const myOffer=((me&&me.offer)||[]).join(" ").toLowerCase();
    const myNeed=((me&&me.seek)||[]).join(" ").toLowerCase();
    const theirOffer=(c.offer||[]).join(" ").toLowerCase();
    if((c.seek||[]).some((k)=>{const w=k.toLowerCase().split(" ")[0];return w.length>2&&myOffer.includes(w);}))return t("Cherche ce que vous proposez");
    if((c.offer||[]).some((k)=>{const w=k.toLowerCase().split(" ")[0];return w.length>2&&myNeed.includes(w);}))return t("Propose ce que vous cherchez");
    if(me&&c.loc===me.loc)return t("Dans votre ville");
    {const d=me?distKm(me.loc,c.loc):null;if(d!=null&&d<=150)return `${t("À ~")}${d} ${t("km de vous")}`;}
    return t("Forte complémentarité");
  };
  const needAuthor=(n)=>n.mine?{name:me.name,color:me.color,sector:me.sector,loc:n.loc,logo:me.logo}:(companies.find((c)=>c.id===n.companyId)||{name:"—",color:"#ccc",sector:"",loc:""});
  const respondToNeed=(n)=>{
    const c=companies.find((x)=>x.id===n.companyId);if(!c)return;
    if(!canProspect()){openLimitUpgrade();return;}
    setNeeds((ns)=>ns.map((x)=>x.id===n.id?{...x,responses:x.responses+1}:x));
    setProspect(c);setView("discover");logHist(`Réponse envoyée au besoin de ${c.name}`,"besoin");
    setPmsg(`Bonjour ${c.name}, en réponse à votre besoin « ${n.title} » : je suis ${me.name} (${me.sector}) et je pense pouvoir vous aider. Ouvert à en discuter ?`);
    if(typeof n.id==="string"&&me)supabase.from("need_responses").insert({need_id:n.id,company_id:me.id}).then(()=>{});
  };
  const publishNeed=()=>{
    if(!needForm.title.trim()||!me)return;
    const ttl=needForm.title.trim();const sought=needForm.sought;const loc=needForm.loc||me.loc;
    const tempId=Date.now();
    const n={id:tempId,mine:true,companyId:me.id,title:ttl,sought,loc,date:t("À l'instant"),responses:0};
    setNeeds((ns)=>[n,...ns]);setNeedOpen(false);setNeedForm({title:"",sought:SECTORS[0],loc:""});logHist(`Besoin publié : « ${ttl} »`,"besoin");toast(t("Besoin publié"));
    supabase.from("needs").insert({company_id:me.id,title:ttl,sought,loc}).select().single().then(({data})=>{
      if(data)setNeeds((ns)=>ns.map((x)=>x.id===tempId?{...x,id:data.id}:x));
    });
  };

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


  const legendSectors=useMemo(()=>[...new Set(filtered.map((c)=>c.sector))],[filtered]);

  const relLabel=(rel)=>{const m={sent:["En attente","var(--amber)"],incoming:["Vous a démarché","var(--blue)"],declined:["Décliné","var(--slate-soft)"]}[rel];return m&&[t(m[0]),m[1]];};

  /* ============ CHARGEMENT ============ */
  if(!authReady||checkoutPending){
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <div className="loginbox" style={{textAlign:"center"}}>
            <div className="brand" style={{marginBottom:22,justifyContent:"center"}}><Mark height={26}/></div>
            <p className="loginsub">{checkoutPending?t("Activation de votre abonnement…"):t("Chargement…")}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ============ VÉRIFICATION 2FA ============ */
  if(mfaChallengeNeeded){
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <div className="loginbox">
            <div className="brand" style={{marginBottom:22}}><Mark height={26}/></div>
            <h1 className="disp" style={{fontSize:20}}>{t("Vérification en deux étapes")}</h1>
            <p className="loginsub">{t("Entrez le code à 6 chiffres généré par votre application d'authentification.")}</p>
            <div className="field"><label>{t("Code à 6 chiffres")}</label>
              <input value={mfaLoginCode} onChange={(e)=>setMfaLoginCode(e.target.value)} placeholder="123456" maxLength={6} onKeyDown={(e)=>e.key==="Enter"&&submitMfaChallenge()}/></div>
            {mfaLoginError&&<p style={{color:"var(--coral)",fontSize:13,margin:"0 0 12px"}}>{mfaLoginError}</p>}
            <button className="btn block" disabled={mfaLoginBusy||!mfaLoginCode.trim()} onClick={submitMfaChallenge}>{mfaLoginBusy?t("Vérification…"):t("Valider")}</button>
            <div style={{textAlign:"center",marginTop:14}}>
              <button className="linkbtn" onClick={async()=>{await supabase.auth.signOut();setMfaChallengeNeeded(false);}}>{t("Se déconnecter")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============ PAGE D'ACCUEIL ============ */
  if(!session&&preAuthView==="landing"){
    const goAuth=(mode)=>{setAuthMode(mode);setAuthError("");setPreAuthView("auth");};
    return <Landing t={t} uiLang={uiLang} toggleGuestLang={toggleGuestLang} onAuth={goAuth}/>;
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
      toast(authMode==="signup"?t("Compte créé !"):t("Connexion réussie"));
    };
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <button className="linkbtn" onClick={()=>setPreAuthView("landing")} style={{position:"absolute",top:18,left:18,fontSize:12}}>← {t("Retour")}</button>
          <button className="linkbtn" onClick={toggleGuestLang} style={{position:"absolute",top:18,right:18,fontSize:12}}>{uiLang==="fr"?"EN":"FR"}</button>
          <div className="loginbox">
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginBottom:22}}>
              <Mark height={30}/>
              <Tagline size={9.5} dashes={false} text={t("Transformer vos connexions en opportunités.")}/>
            </div>
            <h1 className="disp">{authMode==="signup"?t("Créer votre compte"):t("Connexion")}</h1>
            <p className="loginsub">{authMode==="signup"?t("Créez votre compte, vous publierez ensuite la page de votre entreprise."):t("Connectez-vous pour accéder à votre espace.")}</p>
            <div className="field"><label>{t("E-mail")}</label>
              <input value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)} placeholder="prenom.nom@entreprise.fr" onKeyDown={(e)=>e.key==="Enter"&&doAuth()}/></div>
            <div className="field"><label>{t("Mot de passe")}</label>
              <input type="password" value={loginPwd} onChange={(e)=>setLoginPwd(e.target.value)} placeholder="••••••••" onKeyDown={(e)=>e.key==="Enter"&&doAuth()}/></div>
            {authError&&<p style={{color:"var(--coral)",fontSize:13,margin:"0 0 12px"}}>{authError}</p>}
            <button className="btn block" disabled={authBusy} onClick={doAuth}>{authBusy?t("Un instant…"):(authMode==="signup"?t("Créer mon compte"):t("Se connecter"))}</button>
            <div style={{textAlign:"center",marginTop:14}}>
              <button className="linkbtn" onClick={()=>{setAuthMode(authMode==="signup"?"signin":"signup");setAuthError("");}}>
                {authMode==="signup"?t("Vous avez déjà un compte ? Se connecter"):t("Pas encore de compte ? En créer un")}
              </button>
            </div>
            <p className="simnote">{t("Vos identifiants sont gérés de façon sécurisée par Supabase.")}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ============ INVITATION ============ */
  if(!me&&inviteToken&&inviteInfo){
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <button className="linkbtn" onClick={toggleGuestLang} style={{position:"absolute",top:18,right:18,fontSize:12}}>{uiLang==="fr"?"EN":"FR"}</button>
          <div className="loginbox" style={{textAlign:"center"}}>
            <div className="brand" style={{marginBottom:22,justifyContent:"center"}}><Mark height={26}/></div>
            <h1 className="disp" style={{fontSize:20}}>{t("Vous êtes invité(e)")}</h1>
            <p className="loginsub">{t("Rejoindre")} <b>{inviteInfo.company_name}</b> {t("en tant que")} <b>{t(inviteInfo.role)}</b> ?</p>
            <div className="field" style={{textAlign:"left"}}><label>{t("Votre prénom et nom")}</label>
              <input value={joinName} onChange={(e)=>setJoinName(e.target.value)} placeholder="ex : Camille Dubois" onKeyDown={(e)=>e.key==="Enter"&&joinViaInvite()}/></div>
            <button className="btn block" disabled={authBusy||!joinName.trim()} onClick={joinViaInvite}>{authBusy?t("Un instant…"):t("Rejoindre l'entreprise")}</button>
            <div style={{textAlign:"center",marginTop:14}}>
              <button className="linkbtn" onClick={()=>{setInviteToken(null);setInviteInfo(null);window.history.replaceState({},"",window.location.pathname);}}>
                {t("Non, créer ma propre entreprise")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPlanTable=(plansList,billing,setBilling,plan,setPlan)=>{
    const shown=plansList.filter((pl)=>!(billing==="SansEngagement"&&pl.id==="gratuit"));
    return(<>
      <div className="billtoggle">
        <div className="slide" style={{transform:billing==="SansEngagement"?"translateX(100%)":"translateX(0%)"}}/>
        <button className={billing!=="SansEngagement"?"on":""} onClick={()=>setBilling(billing==="SansEngagement"?"Mensuelle":billing)}>{t("Engagement 1 an")}</button>
        <button className={billing==="SansEngagement"?"on":""} onClick={()=>setBilling("SansEngagement")}>{t("Sans engagement")}</button>
      </div>
      {billing!=="SansEngagement"&&(
        <div style={{display:"flex",gap:8,margin:"-6px 0 16px"}}>
          <button type="button" className={"fchip"+(billing==="Mensuelle"?" on":"")} onClick={()=>setBilling("Mensuelle")}>{t("Mensuel")}</button>
          <button type="button" className={"fchip"+(billing==="Annuelle"?" on":"")} onClick={()=>setBilling("Annuelle")}>{t("Comptant (1 an)")}</button>
        </div>
      )}
      <div className="compwrap">
        <table className="comptable">
          <thead>
            <tr className="rowsel">
              <th></th>
              {shown.map((pl)=>(
                <th key={pl.id} className={plan===pl.id?"on":""} onClick={()=>setPlan(pl.id)}>
                  {pl.best&&<span className="best">{t("Recommandé")}</span>}
                  <div className="planname">{pl.name}</div>
                  <div className="radio">{plan===pl.id&&<Check style={{color:"#fff",width:12,height:12}}/>}</div>
                  {pl.monthly===0?<div className="prc">{t("Gratuit")}</div>:billing==="SansEngagement"?(
                    <div className="prc">{priceFmt(pl.noCommit)} €<small> / {t("mois")}</small></div>
                  ):billing==="Annuelle"?(
                    <>
                      <div className="prc">{priceFmt(pl.annual)} €<small> / {t("an")}</small></div>
                      <div className="prcalt">{t("soit")} {priceFmt(pl.annual/12)} € / {t("mois")}</div>
                    </>
                  ):(
                    <div className="prc">{priceFmt(pl.monthly)} €<small> / {t("mois")}</small></div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_MATRIX.map((row,i)=>(
              <tr key={i}>
                <td className="fname">{t(row.label)}</td>
                {shown.map((pl)=>{const v=row.vals[PLANS.indexOf(pl)];return(
                  <td key={pl.id} className={plan===pl.id?"on":""}>
                    {typeof v==="boolean"?(v?<Check style={{color:"var(--emerald)",width:15,height:15}}/>:<XI style={{color:"var(--slate-soft)",width:13,height:13}}/>):(
                      <span className="compval">{t(v)}</span>
                    )}
                  </td>
                );})}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>);
  };

  /* ============ ONBOARDING ============ */
  if(!me){
    const hints=[t("Identité"),t("Activité"),t("Détails"),t("Abonnement")];
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="onb" style={obStep===3?{maxWidth:900}:undefined}>
          <button className="linkbtn" onClick={toggleGuestLang} style={{position:"absolute",top:18,right:18,fontSize:12}}>{uiLang==="fr"?"EN":"FR"}</button>
          <div className="brand" style={{marginBottom:24}}><Mark height={26}/></div>
          <div className="eyebrow">{t("Créez votre page entreprise")}</div>
          <h1>{t("Votre entreprise,")}<br/>{t("reliée aux bonnes.")}</h1>
          <p className="lead">{t("Publiez une page complète, démarchez les sociétés qui vous intéressent. Si elles acceptent, vous communiquez directement. Rien sans double accord.")}</p>
          <p className="lead" style={{fontWeight:600,color:"var(--emerald)",marginTop:-6}}>{t("Ne soyez plus le maillon faible : devenez un maillon fort de votre écosystème.")}</p>
          <div className="steps">{[0,1,2,3].map((i)=><div key={i} className={"stp"+(obStep>=i?" on":"")}/>)}</div>
          <div className="stphint">{t("Étape")} {obStep+1}/4 · {hints[obStep]}</div>

          {obStep===0&&(<>
            <div className="field"><label>{t("Votre prénom et nom")}</label>
              <input value={form.ownerName} onChange={(e)=>setForm({...form,ownerName:e.target.value})} placeholder="ex : Camille Dubois"/></div>
            <div className="field"><label>{t("Nom de l'entreprise")}</label>
              <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="ex : Studio Kavan"/></div>
            <div className="grid2">
              <div className="field"><label>{t("Secteur d'activité")}</label>
                <input list="sectorlist" value={form.sector} onChange={(e)=>setForm({...form,sector:e.target.value})} placeholder={t("Écrivez ou choisissez…")}/>
                <datalist id="sectorlist">{SECTORS.map((s)=><option key={s} value={s}/>)}</datalist>
                <div className="uphint">{t("Écrivez librement votre secteur, ou choisissez une suggestion.")}</div></div>
              <div className="field"><label>{t("Localisation")}</label>
                <input value={form.loc} onChange={(e)=>setForm({...form,loc:e.target.value})} placeholder="Rennes"/></div>
            </div>
            <div className="field"><label>{t("Effectif")}</label>
              <select value={form.emp} onChange={(e)=>setForm({...form,emp:e.target.value})}>{EMP.map((s)=><option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>{t("Logo de l'entreprise")}</label>
              <div className="logoup">
                <div className="logoprev" style={{background:form.color}}>{form.logo?<img src={form.logo} alt="logo"/>:(form.name?form.name[0]:"?")}</div>
                <div>
                  <label className="uplabel btn-ghost sm">{t("Importer votre logo")}<input type="file" accept="image/*" onChange={onLogo} style={{display:"none"}}/></label>
                  <div className="uphint">{t("PNG, JPG ou SVG — carré de préférence.")}</div>
                </div>
              </div></div>
            <div className="uphint" style={{marginTop:4}}>{t("Tous les champs sont obligatoires.")}</div>
            <button className="btn block" style={{marginTop:8}} disabled={!(form.ownerName.trim()&&form.name.trim()&&form.sector.trim()&&form.loc.trim())} onClick={()=>setObStep(1)}>{t("Continuer")}</button>
          </>)}

          {obStep===1&&(<>
            <div className="field"><label>{t("Présentation")}</label>
              <textarea rows={3} value={form.desc} onChange={(e)=>setForm({...form,desc:e.target.value})} placeholder={t("En une ou deux phrases, ce que fait votre entreprise.")}/></div>
            <div className="field"><label>{t("Ce que vous recherchez")} <span style={{textTransform:"none",letterSpacing:0}}>({t("virgules")})</span></label>
              <input value={form.seek} onChange={(e)=>setForm({...form,seek:e.target.value})} placeholder="partenaires design, apporteurs d'affaires"/></div>
            <div className="field"><label>{t("Ce que vous proposez")}</label>
              <input value={form.offer} onChange={(e)=>setForm({...form,offer:e.target.value})} placeholder="développement web, conseil"/></div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(0)}>{t("Retour")}</button>
              <button className="btn block" disabled={!(form.desc.trim()&&form.seek.trim()&&form.offer.trim())} onClick={()=>setObStep(2)}>{t("Continuer")}</button>
            </div>
          </>)}

          {obStep===2&&(<>
            <div className="grid2">
              <div className="field"><label>{t("Année de création")}</label>
                <input value={form.founded} onChange={(e)=>setForm({...form,founded:e.target.value})} placeholder="2018"/></div>
              <div className="field"><label>{t("Chiffre d'affaires")}</label>
                <select value={form.ca} onChange={(e)=>setForm({...form,ca:e.target.value})}>{CA.map((s)=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="field"><label>{t("Certifications / labels")} <span style={{textTransform:"none",letterSpacing:0,color:"var(--slate-soft)"}}>({t("optionnel, séparez par des virgules")})</span></label>
              <input value={form.certifs} onChange={(e)=>setForm({...form,certifs:e.target.value})} placeholder="RGPD, ISO 27001"/></div>
            <div className="field"><label>{t("Site web")} <span style={{textTransform:"none",letterSpacing:0,color:"var(--slate-soft)"}}>({t("optionnel")})</span></label>
              <input value={form.web} onChange={(e)=>setForm({...form,web:e.target.value})} placeholder="mon-entreprise.fr"/></div>
            <div className="field"><label>{t("SIRET")}</label>
              <input value={form.siret} onChange={(e)=>setForm({...form,siret:e.target.value})} placeholder="123 456 789 00012"/>
              <div className="uphint">{t("Vérification automatique via le répertoire SIREN — affiche un badge « entreprise vérifiée ».")}</div></div>
            <div className="field"><label>{t("Vos services / départements")}</label>
              <div className="svcwrap">{SERVICES.map((s)=>(
                <button key={s} type="button" className={"svcchip"+(form.services.includes(s)?" on":"")}
                  onClick={()=>setForm((f)=>({...f,services:f.services.includes(s)?f.services.filter((x)=>x!==s):[...f.services,s]}))}>{t(s)}</button>
              ))}
              {form.services.filter((s)=>!SERVICES.includes(s)).map((s)=>(
                <button key={s} type="button" className="svcchip on" onClick={()=>setForm((f)=>({...f,services:f.services.filter((x)=>x!==s)}))}>{s} ✕</button>
              ))}</div>
              <div className="invrow" style={{marginTop:8}}>
                <input value={customService} onChange={(e)=>setCustomService(e.target.value)} placeholder={t("Autre (précisez)…")} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();addCustomService();}}}/>
                <button type="button" className="btn-ghost sm" onClick={addCustomService}>{t("Ajouter")}</button>
              </div>
              <div className="uphint">{t("Chaque service pourra échanger avec le même service des entreprises connectées.")}</div></div>
            <div className="field"><label>{t("Pôle qui reçoit les demandes")}</label>
              <select value={form.receptionPole} onChange={(e)=>setForm({...form,receptionPole:e.target.value})}>{(form.services.length?form.services:["Direction"]).map((s)=><option key={s} value={s}>{t(s)}</option>)}</select>
              <div className="uphint">{t("C'est ce pôle qui recevra les demandes de mise en relation adressées à votre entreprise.")}</div></div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(1)}>{t("Retour")}</button>
              <button className="btn block" disabled={!(form.founded.trim()&&form.siret.trim()&&form.services.length>0)} onClick={()=>setObStep(3)}>{t("Continuer")}</button>
            </div>
          </>)}

          {obStep===3&&(<>
            {renderPlanTable(PLANS,form.billing,(b)=>setForm({...form,billing:b}),form.plan,(id)=>setForm({...form,plan:id}))}
            <p className="simnote">{t("Paiement sécurisé via Stripe.")} {t("L'offre")} {PLANS[0].name} {t("est activée immédiatement ; les offres payantes vous redirigent vers une page de paiement.")}</p>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-ghost" onClick={()=>setObStep(2)}>{t("Retour")}</button>
              <button className="btn block" disabled={authBusy} onClick={finishOnboarding}>{authBusy?t("Un instant…"):t("Publier ma page")}</button>
            </div>
          </>)}

          <div style={{textAlign:"center",marginTop:18}}>
            <button className="linkbtn" onClick={()=>{setForm((f)=>({...f,ownerName:f.ownerName||"Camille Dubois",name:"Studio Kavan",sector:"Tech & Dév",loc:"Rennes",emp:"1–10",color:"#0F846B",radius:100,desc:"Studio produit qui conçoit et développe des interfaces sur mesure pour les entreprises.",seek:"partenaires design, apporteurs d'affaires",offer:"développement web, applications métier",founded:"2020",ca:"< 500 k€",web:"studiokavan.fr",certifs:"RGPD",siret:"902 445 178 00021",plan:"pro",billing:"Mensuelle",services:["Direction","Commercial","Technique","RH"],receptionPole:"Direction"}));setObStep(2);}}>
              {t("Remplir avec un exemple")}
            </button>
          </div>
        </div>
        <div className="foot">© {new Date().getFullYear()} <b>Maillon</b> — <a href="/mentions-legales">{t("Mentions légales")}</a> · <a href="/cgu-cgv">{t("CGU/CGV")}</a> · <a href="/confidentialite">{t("Confidentialité")}</a></div>
      </div>
    );
  }

  /* ============ BIENVENUE ============ */
  if(me&&justOnboarded){
    return(
      <div className="mln"><style>{CSS}</style>
        <div className="login">
          <div className="loginbox" style={{textAlign:"center"}}>
            <div className="brand" style={{justifyContent:"center",marginBottom:20}}><Mark height={30}/></div>
            <h1 className="disp" style={{fontSize:24,margin:"12px 0"}}>{t("Ne soyez plus le maillon faible : devenez un maillon fort de votre écosystème.")}</h1>
            <p className="loginsub">{t("Votre page est en ligne. Découvrez les entreprises du réseau et commencez à transformer vos connexions en opportunités.")}</p>
            <button className="btn block" style={{marginTop:8}} onClick={()=>setJustOnboarded(false)}>{t("Découvrir Maillon")}</button>
          </div>
        </div>
      </div>
    );
  }

  const active=companies.find((c)=>c.id===activeConv&&c.rel==="connected")||connected[0];
  const role=currentUser?currentUser.role:((me&&me.services&&me.services[0])||"Direction");
  const isAdmin=role==="Direction";
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
  const totalChatUnread=Object.values(unreadChat).reduce((a,b)=>a+b,0);
  const eventsByDate={};roleEvents.forEach((e)=>{(eventsByDate[e.date]=eventsByDate[e.date]||[]).push(e);});
  const genEventsByDate={};genEvents.forEach((e)=>{(genEventsByDate[e.date]=genEventsByDate[e.date]||[]).push(e);});
  const calFirst=new Date(calMonth.y,calMonth.m,1);
  const calStartOffset=(calFirst.getDay()+6)%7;
  const calCells=Array.from({length:42},(_,i)=>{const dt=new Date(calMonth.y,calMonth.m,1-calStartOffset+i);return {dt,key:ymd(dt),out:dt.getMonth()!==calMonth.m};});
  const todayKey=ymd(new Date());
  const calSelectedKey=calSelected||(eventsByDate[todayKey]||genEventsByDate[todayKey]?todayKey:(roleEvents[0]&&roleEvents[0].date)||todayKey);
  const calSelectedVisio=eventsByDate[calSelectedKey]||[];
  const calSelectedNotes=genEventsByDate[calSelectedKey]||[];
  const calSelectedItems=[
    ...calSelectedVisio.map((e)=>({type:"visio",time:e.time,data:e})),
    ...calSelectedNotes.map((e)=>({type:"note",time:e.time,data:e})),
  ].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
  const icsEscape=(s)=>String(s||"").replace(/[\\,;]/g,(c)=>"\\"+c).replace(/\n/g,"\\n");
  const exportIcs=()=>{
    if(!roleEvents.length){toast(t("Aucun événement à exporter"));return;}
    const stamp=(d)=>d.split("-").join("");
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Maillon//Agenda//FR","CALSCALE:GREGORIAN"];
    roleEvents.forEach((e)=>{
      if(!e.date||!e.time)return;
      const [hh,mm]=e.time.split(":").map(Number);
      const start=`${stamp(e.date)}T${pad2(hh)}${pad2(mm)}00`;
      const endD=new Date(2000,0,1,hh,mm);endD.setMinutes(endD.getMinutes()+60);
      const end=`${stamp(e.date)}T${pad2(endD.getHours())}${pad2(endD.getMinutes())}00`;
      const uid=`${e.c.id}-${e.date}-${e.time}`.replace(/[^a-zA-Z0-9\-]/g,"")+"@getmaillon.fr";
      lines.push("BEGIN:VEVENT",`UID:${uid}`,`DTSTART:${start}`,`DTEND:${end}`,
        `SUMMARY:${icsEscape(`Visio Maillon avec ${e.c.name}`)}`,
        `DESCRIPTION:${icsEscape(`Services concernés : ${e.services.map((s)=>t(s)).join(", ")}`)}`,
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="maillon-agenda.ics";document.body.appendChild(a);a.click();a.remove();
    URL.revokeObjectURL(url);
  };
  const detail=openC?companies.find((c)=>c.id===openC):null;
  const dAff=detail?affinity(detail):0;

  return(
    <div className="mln"><style>{CSS}</style>
      <div className="bar">
        <div className="brand" onClick={()=>setView("discover")}><Mark height={22}/></div>
        <div className="nav">
          <button className={view==="discover"?"on":""} onClick={()=>setView("discover")}><span className="lbl">{t("Découvrir")}</span></button>
          <button className={view==="requests"?"on":""} onClick={()=>setView("requests")}><span className="lbl">{t("Demandes")}</span>{visIncoming.length>0&&<span className="badge">{visIncoming.length}</span>}</button>
          <button className={view==="messages"?"on":""} onClick={()=>setView("messages")}><span className="lbl">{t("Messages")}</span>{connected.length>0&&<span className="badge">{connected.length}</span>}</button>
          <button className={view==="lists"?"on":""} onClick={()=>setView("lists")}><span className="lbl">{t("Listes")}</span></button>
          <button className={view==="emailing"?"on":""} onClick={()=>setView("emailing")}><span className="lbl">{t("Emailing")}</span></button>
          <button className={view==="needs"?"on":""} onClick={()=>setView("needs")}><span className="lbl">{t("Besoins")}</span>{matchingNeeds.length>0&&<span className="badge">{matchingNeeds.length}</span>}</button>
          <button className={view==="agenda"?"on":""} onClick={()=>setView("agenda")}><span className="lbl">{t("Événements")}</span>{roleEvents.length>0&&<span className="badge">{roleEvents.length}</span>}</button>
          <button className={view==="library"?"on":""} onClick={()=>setView("library")}><span className="lbl">{t("Bibliothèque")}</span></button>
          <button className={view==="blog"?"on":""} onClick={()=>setView("blog")}><span className="lbl">{t("Actualités")}</span></button>
          <button className={"teamnav"+(chatOpen?" on":"")} onClick={()=>{setChatPane("list");setChatOpen(true);}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v6H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            <span className="lbl">{t("Chat")}</span>
            {totalChatUnread>0&&<span className="badge">{totalChatUnread}</span>}
          </button>
        </div>
        <div className="rolepick" title={t("Votre compte")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
          <span className="rolename">{t(role)}{isAdmin?` · ${t("admin")}`:""}</span>
        </div>
        <button className="gearbtn" title={t("Se déconnecter")} onClick={logout}>
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
          <h2 className="ptitle disp">{t("Découvrir des entreprises")}</h2>
          <p className="psub">{t("Filtrez par secteur, rayon d'action et effectif. Basculez en carte pour situer les sociétés en France. Le score d'affinité estime la complémentarité avec")} {me.name}.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
            <button className="btn-ghost sm" onClick={()=>setView("profile")}>{t("Voir ma page")}</button>
            <button className="btn-ghost sm" onClick={()=>setInviteCoOpen(true)}>{t("Inviter une entreprise")}</button>
          </div>
          <div className="memban">
            <span>🏆 <b>{t("Offre Fondateur")}</b> — {t("invitez une entreprise à rejoindre Maillon et obtenez 1 mois supplémentaire.")}</span>
            <button className="btn-ghost sm" onClick={()=>setInviteCoOpen(true)}>{t("Inviter une entreprise")} →</button>
          </div>
          {me.planId==="gratuit"&&(
            <div className="memban">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8 2 9.4h7.6z" stroke="#7a5305" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              <span>{t("Offre")} <b>{PLANS[0].name}</b> — {remaining()>0?`${remaining()} ${t(remaining()>1?"démarchages restants sur 5":"démarchage restant sur 5")}`:t("vos 5 démarchages sont épuisés")}.</span>
              <button className="btn" onClick={openLimitUpgrade}>{t("Passer au payant")}</button>
            </div>
          )}

          {recos.length>0&&(
            <div className="recowrap">
              <div className="recohead"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 7.4H22l-6 4.4 2.3 7.2L12 17.6 5.7 22 8 14.8 2 10.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>{t("Recommandé pour vous")}</div>
              <div className="recorow">
                {recos.map((c)=>(
                  <div key={c.id} className="recocard">
                    <div className="rt">
                      <div className="logo" style={{background:c.color}}>{logoImg(c)}</div>
                      <div style={{minWidth:0}}><div className="rname" onClick={()=>setOpenC(c.id)} style={{cursor:"pointer"}}>{c.name}</div><div className="reason">{recoReason(c)}</div></div>
                      <div className="raff">{c._aff}%</div>
                    </div>
                    <button className="btn sm" onClick={()=>openProspect(c)}>{t("Démarcher")}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {companies.length===0?(
            <div className="emptynet">
              <div className="emptynet-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 21V8l8-5 8 5v13" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 21v-6h6v6M4 21h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
              <h3>{t("Le réseau démarre tout juste")}</h3>
              <p>{t("Aucune autre entreprise n'a encore rejoint Maillon. Revenez bientôt — votre page est déjà visible pour les prochaines qui s'inscriront.")}</p>
            </div>
          ):(<>
          <div className="toolbar">
            <div className="search">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate)" strokeWidth="1.8"/><path d="M14 14l4 4" stroke="var(--slate)" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <input placeholder={t("Rechercher une entreprise, un métier, un service…")} value={q} onChange={(e)=>setQ(e.target.value)}/>
            </div>
            <div className="maptoggle">
              <button className={mode==="list"?"on":""} onClick={()=>setMode("list")}>{t("Liste")}</button>
              <button className={mode==="map"?"on":""} onClick={()=>setMode("map")}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5c-2.5 0-4.5 2-4.5 4.5C3.5 9.5 8 14.5 8 14.5s4.5-5 4.5-8.5C12.5 3.5 10.5 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="1.6" fill="currentColor"/></svg>
                {t("Carte")}
              </button>
            </div>
          </div>

          <div className="advbar">
            <div className="grp"><label>{t("Secteur d'activité")}</label>
              <select value={fSector} onChange={(e)=>setFSector(e.target.value)}><option value="">{t("Tous les secteurs")}</option>{SECTORS.map((s)=><option key={s}>{s}</option>)}</select></div>
            <div className="grp"><label>{t("Rayon autour de vous")}</label>
              <select value={fRadius} onChange={(e)=>setFRadius(Number(e.target.value))}><option value={0}>{t("Toute la France")}</option>{[50,100,150,200,300].map((r)=><option key={r} value={r}>{r} km</option>)}</select></div>
            <div className="grp"><label>{t("Effectif")}</label>
              <select value={fEmp} onChange={(e)=>setFEmp(e.target.value)}><option value="">{t("Tous")}</option>{EMP.map((r)=><option key={r}>{r}</option>)}</select></div>
            <div className="grp"><label>{t("Trier par")}</label>
              <select value={sort} onChange={(e)=>setSort(e.target.value)}>
                <option value="aff">{t("Affinité")}</option><option value="rating">{t("Note")}</option><option value="recent">{t("Plus récentes")}</option><option value="name">{t("Nom A–Z")}</option></select></div>
            <label className="toggle"><input type="checkbox" checked={fVerif} onChange={()=>setFVerif(!fVerif)}/>{t("Vérifiées")}</label>
            <button className="clear" onClick={clearFilters}>{t("Réinitialiser")}</button>
          </div>

          <div className="rescount">{filtered.length} {filtered.length>1?t("entreprises"):t("entreprise")}{fSector?` · ${fSector}`:""}{fRadius>0?` · ${fRadius} km`:""}</div>

          {mode==="map"?(
            <div className="mapbox">
              <div className="mapview"><RealFranceMap companies={filtered} onOpen={(id)=>setOpenC(id)} onProspect={openProspect} aff={affinity}/></div>
              <div className="maplegend">
                <h5>{t("Secteurs affichés")}</h5>
                {legendSectors.map((s)=>(
                  <div key={s} className="legitem"><span className="legdot" style={{background:SECTOR_COLORS[s]}}/>{s}</div>
                ))}
                <div className="maphint">{t("Glissez pour vous déplacer, molette pour zoomer. Cliquez un point pour voir la fiche de l'entreprise.")}</div>
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
                      <div className="aff"><div className="n">{c._aff}%</div><div className="l">{t("affinité")}</div></div>
                    </div>
                    <div className="ctag">{c.tag}</div>
                    <div className="metaline"><span>★ {c.rating}</span><span>{t("Créée")} {c.founded}</span><span>{c.dispo}</span></div>
                    <div className="seek">
                      {c.seek.slice(0,2).map((s)=><span key={s} className="pill seek">↳ {s}</span>)}
                      {c.certifs.slice(0,1).map((s)=><span key={s} className="pill cert">{s}</span>)}
                    </div>
                    <div className="cfoot">
                      {c.rel==="none"?(
                        <><button className="btn sm" onClick={()=>openProspect(c)}>{t("Démarcher")}</button>
                          <button className="btn-ghost sm" onClick={()=>setOpenC(c.id)}>{t("Voir la fiche")}</button></>
                      ):c.rel==="sent"?(
                        <span className="status"><span className="dot" style={{background:"var(--amber)"}}/>{t("Demande envoyée")}</span>
                      ):c.rel==="connected"?(
                        <button className="btn-ghost sm" onClick={()=>{setActiveConv(c.id);setView("messages");}}>{t("Ouvrir la discussion")}</button>
                      ):c.rel==="incoming"?(
                        <button className="btn sm" onClick={()=>setView("requests")}>{t("Répondre à sa demande")}</button>
                      ):(<span className="status" style={{color:"var(--slate-soft)"}}>{t("Décliné")}</span>)}
                      {rl&&<span className="status" style={{marginLeft:"auto",color:rl[1]}}>{rl[0]}</span>}
                    </div>
                  </div>);})}
              </div>
              {filtered.length===0&&<div className="empty"><h3>{t("Aucune entreprise sur ces critères")}</h3><p>{t("Élargissez les filtres ou réinitialisez.")}</p></div>}
            </>
          )}
          </>)}
        </div></div>
      )}

      {/* REQUESTS */}
      {view==="requests"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">{t("Demandes de mise en relation")}</h2>
          <p className="psub">{t("Vous décidez. Accepter ouvre la messagerie ; décliner clôt la demande.")}</p>
          <div className="seclabel">{t("Reçues · à traiter")} {visIncoming.length>0&&<span className="badge">{visIncoming.length}</span>}</div>
          {visIncoming.length===0?(<p style={{color:"var(--slate)",fontSize:14}}>{t("Aucune demande en attente")}{!isAdmin?` ${t("pour le service")} ${t(role)}`:""}.</p>
          ):visIncoming.map((c)=>(
            <div key={c.id} className="reqcard">
              <div className="reqhead">
                <div className="logo" style={{background:c.color}}>{logoImg(c)}</div>
                <div style={{flex:1}}>
                  <div className="cname" onClick={()=>setOpenC(c.id)}>{c.name}{c.verified&&<Check className="verif"/>}</div>
                  <div className="csector">{c.sector} · {c.loc} · {t("reçue par votre pôle")} <b>{t(me.receptionPole)}</b></div>
                </div>
              </div>
              <div className="reqmsg"><span className="q">{t("Son message")}</span>{c.reqMsg}</div>
              <label className="consentrow">
                <input type="checkbox" checked={!!emailOptIn[c.id]} onChange={(e)=>setEmailOptIn((m)=>({...m,[c.id]:e.target.checked}))}/>
                {t("J'accepte de recevoir les campagnes d'emailing de")} {c.name}
              </label>
              {emailOptIn[c.id]&&(()=>{const emails=emailAddrByCompany[c.id]&&emailAddrByCompany[c.id].length?emailAddrByCompany[c.id]:[""];return(
                <div className="field" style={{margin:"0 0 14px 26px"}}>
                  <label>{t("Adresse(s) email de réception")}</label>
                  {emails.map((val,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                      <input type="email" value={val} onChange={(e)=>{const next=[...emails];next[i]=e.target.value;setEmailAddrByCompany((m)=>({...m,[c.id]:next}));}} placeholder="contact@votre-entreprise.fr"/>
                      {emails.length>1&&<span className="rm" style={{color:"var(--coral)",cursor:"pointer",fontSize:12,fontWeight:600,flex:"0 0 auto"}} onClick={()=>{const next=emails.filter((_,x)=>x!==i);setEmailAddrByCompany((m)=>({...m,[c.id]:next}));}}>{t("Retirer")}</span>}
                    </div>
                  ))}
                  <span className="rm" style={{color:"var(--emerald)",cursor:"pointer",fontSize:12.5,fontWeight:600}} onClick={()=>setEmailAddrByCompany((m)=>({...m,[c.id]:[...emails,""]}))}>+ {t("Ajouter un autre email")}</span>
                </div>
              );})()}
              <div className="reqact">
                <button className="btn sm" disabled={!!emailOptIn[c.id]&&!(emailAddrByCompany[c.id]||[]).some((e)=>e.trim())} onClick={()=>accept(c,emailOptIn[c.id],emailAddrByCompany[c.id])}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Check/>{t("Accepter")}</span></button>
                <button className="btn-danger" onClick={()=>decline(c)}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><XI/>{t("Décliner")}</span></button>
              </div>
            </div>
          ))}
          <div className="seclabel">{t("Envoyées · en attente")}</div>
          {sent.length===0?(<p style={{color:"var(--slate)",fontSize:14}}>{t("Aucune demande envoyée en attente. Allez dans « Découvrir » pour démarcher une entreprise.")}</p>
          ):sent.map((c)=>(
            <div key={c.id} className="reqcard">
              <div className="reqhead">
                <div className="logo" style={{background:c.color}}>{c.name[0]}</div>
                <div style={{flex:1}}><div className="cname" style={{cursor:"default"}}>{c.name}</div><div className="csector">{c.sector} · {c.loc}{c.sentTo?` · ${t("service")} ${t(c.sentTo)}`:""}</div></div>
                <span className="status" style={{color:"var(--amber)"}}><span className="dot" style={{background:"var(--amber)"}}/>{t("En attente de réponse")}</span>
              </div>
            </div>
          ))}
        </div></div>
      )}

      {/* MESSAGES */}
      {view==="messages"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">{t("Messages")}</h2>
          <p className="psub">{t("Vous échangez uniquement avec les entreprises connectées — et service par service : chaque département discute avec son homologue de l'autre entreprise.")}</p>
          {isAdmin?(
            <div className="rolebar admin">{t("Accès administrateur")} (<b>{t(role)}</b>) — {t("vous voyez la messagerie de tous les services.")}</div>
          ):(
            <div className="rolebar">{t("En tant que")} <b>{t(role)}</b>, {t("vous voyez")} : {[role,...(access.grants[role]||[])].map((s)=>t(s)).join(", ")}. {t("Les autres services restent cloisonnés.")}</div>
          )}
          {connected.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 3V5z" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              <h3>{t("Aucune conversation")}</h3><p>{t("Acceptez une demande ou démarchez une entreprise pour débloquer la messagerie.")}</p>
            </div>
          ):(
            <>
            {agenda.length>0&&Object.keys(agendaByService).some((svc)=>canSee(role,svc))&&(
              <div className="agenda">
                <div className="agtitle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  {t("Visios à venir · par service")}
                </div>
                {Object.keys(agendaByService).filter((svc)=>canSee(role,svc)).map((svc)=>(
                  <div key={svc} className="aggroup">
                    <div className="agsvc">{t(svc)}</div>
                    {agendaByService[svc].map((it,i)=>(
                      <div key={i} className="agitem">
                        <div className="aglogo" style={{background:it.c.color}}>{logoImg(it.c)}</div>
                        <div className="aginfo"><b>{it.c.name}</b><small>{it.date} {t("à")} {it.time}</small></div>
                        <button className="btn sm" onClick={()=>{setActiveConv(it.c.id);setActiveService(it.svc);startVisio(it.c,[it.svc]);}}>{t("Rejoindre")}</button>
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
                    <div style={{minWidth:0}}><b>{c.name}</b><small>{lastText(c)||`${commonServices(c).length} ${t("services en commun")}`}</small></div>
                  </div>
                ))}
              </div>
              {active?(
                <div className="chat">
                  <div className="chathead">
                    <div className="logo" style={{background:active.color}}>{logoImg(active)}</div>
                    <div><b style={{fontSize:15}}>{active.name}</b><div className="chansub">{mServices.length} {mServices.length>1?t("services en commun"):t("service en commun")} — {t("choisissez un canal")}</div></div>
                    <button className="btn-ghost sm" style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}} onClick={()=>{const d=mSvc||commonServices(active)[0]||(active.services&&active.services[0])||"Direction";setVisioSvcs([d]);setVisioCompanyId(active.id);setSchedForm({date:"",time:""});setVisioSetup(true);}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg>{t("Visio")}</button>
                    {mSvc&&<button className="btn-ghost sm" onClick={()=>{setCollab("quote");setCollabForm({subject:"",budget:""});setCollabFile(null);}}>{t("Devis")}</button>}
                    {mSvc&&<button className="btn-ghost sm" onClick={()=>{setCollab("doc");setCollabForm({subject:"",budget:""});setCollabFile(null);}}>{t("Document")}</button>}
                  </div>
                  {mServices.length>0?(
                    <>
                      <div className="chantabs">
                        {mServices.map((s)=><button key={s} className={"chantab"+(s===mSvc?" on":"")} onClick={()=>setActiveService(s)}>{t(s)}</button>)}
                      </div>
                      <div className="stream" ref={streamRef}>
                        <div className="bub sys">{t("Canal")} {t(mSvc)} · {t("votre")} {t(mSvc)} ↔ {t(mSvc)} {t("de")} {active.name}</div>
                        {mStream.map((m,i)=>{
                          if(m.kind==="meeting")return(
                          <div key={i} className="meetcard">
                            <div className="meetico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><path d="M15 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg></div>
                            <div><b>{t("Visio planifiée")}</b><small>{m.date} {t("à")} {m.time} · {(m.services||[mSvc]).map((s)=>t(s)).join(", ")}</small></div>
                            <button className="btn sm" onClick={()=>startVisio(active,m.services||[mSvc])}>{t("Rejoindre")}</button>
                          </div>);
                          if(m.kind==="quote")return(
                          <div key={i} className="meetcard">
                            <div className="meetico" style={{background:"var(--amber-wash)",color:"var(--amber)",fontWeight:800,fontFamily:"Bricolage Grotesque"}}>€</div>
                            <div><b>{t("Demande de devis")}</b><small>{m.subject}{m.budget?` · ${t("budget")} ${m.budget}`:""}</small></div>
                            <span className="postself">{m.from==="me"?t("Envoyée"):t("Reçue")}</span>
                          </div>);
                          if(m.kind==="doc")return(
                          <div key={i} className="meetcard">
                            <div className="meetico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 2v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></div>
                            <div><b>{t("Document partagé")}</b><small>{m.name}</small></div>
                            <button className="btn-ghost sm" onClick={()=>{if(!m.dataUrl){toast(t("Document indisponible"));return;}const a=document.createElement("a");a.href=m.dataUrl;a.download=m.name||"document";document.body.appendChild(a);a.click();a.remove();}}>{t("Ouvrir")}</button>
                          </div>);
                          return <div key={i} className={"bub "+m.from}>{m.text}</div>;
                        })}
                      </div>
                      <div className="composer">
                        <input placeholder={`${t("Écrire au service")} ${t(mSvc)} ${t("de")} ${active.name}…`} value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()}/>
                        <button className="btn sm" onClick={send}>{t("Envoyer")}</button>
                      </div>
                    </>
                  ):(
                    <div className="msgempty">{t("Aucun service en commun avec")} {active.name}. {t("Ajoutez des services à votre page pour ouvrir des canaux.")}</div>
                  )}
                </div>
              ):<div className="msgempty">{t("Sélectionnez une conversation")}</div>}
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
        const openThread=(id)=>{if(currentUser){const ch=id==null?"general":dmKey(currentUser.id,id);setUnreadChat((u)=>({...u,[ch]:0}));}setActiveTeammateId(id);setChatPane("thread");};
        return(
          <div className="chatpanel">
            <div className="cphead">
              {chatPane==="list"?(
                <span className="cptitle">{t("Chat")}</span>
              ):(
                <div className="cpback" onClick={()=>setChatPane("list")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <b>{activeTeammateId==null?t("Général"):(activeMate?activeMate.name:"")}</b>
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
                  <div style={{minWidth:0}}><b>{t("Général")}</b>
                    <small>{lastOf(internalChat)?`${lastOf(internalChat).authorId===(currentUser&&currentUser.id)?t("Vous")+" : ":""}${lastOf(internalChat).text}`:t("Conversation d'équipe")}</small>
                  </div>
                </div>
                {mates.map((m)=>{const l=lastOf(currentUser?(internalDMs[dmKey(currentUser.id,m.id)]||[]):[]);return(
                  <div key={m.id} className="conv" onClick={()=>openThread(m.id)}>
                    <div className="logo" style={{background:"var(--ink)"}}>{m.name[0]}</div>
                    <div style={{minWidth:0}}><b>{m.name}</b>
                      <small>{l?`${l.authorId===currentUser.id?t("Vous")+" : ":""}${l.text}`:t("Nouvelle conversation")}</small>
                    </div>
                  </div>
                );})}
              </div>
            ):(
              <div className="cpthread">
                <div className="stream" ref={teamStreamRef}>
                  {thread.length===0?(
                    <div className="bub sys">{t("Aucun message pour l'instant — lancez la discussion.")}</div>
                  ):thread.map((m)=>{const mine=currentUser&&m.authorId===currentUser.id;return(
                    <div key={m.id} className={"bub "+(mine?"me":"them")}>
                      {!mine&&activeTeammateId==null&&<b style={{display:"block",fontSize:11.5,marginBottom:3,opacity:.75}}>{(team.find((tm)=>tm.id===m.authorId)||{}).name||"—"}</b>}
                      {m.text}
                    </div>
                  );})}
                </div>
                <div className="composer">
                  <input placeholder={activeTeammateId==null?t("Écrire au canal Général…"):`${t("Écrire à")} ${activeMate?activeMate.name:""}…`} value={internalMsg} onChange={(e)=>setInternalMsg(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&sendInternalMsg()}/>
                  <button className="btn sm" onClick={sendInternalMsg}>{t("Envoyer")}</button>
                </div>
              </div>
            )}
          </div>
        );})()}

      {/* AGENDA */}
      {view==="agenda"&&(()=>{
        const calWeekdays=uiLang==="fr"?["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        const calMonthLabel=calFirst.toLocaleDateString(uiLang==="fr"?"fr-FR":"en-US",{month:"long",year:"numeric"});
        const calPrevMonth=()=>setCalMonth(({y,m})=>m===0?{y:y-1,m:11}:{y,m:m-1});
        const calNextMonth=()=>setCalMonth(({y,m})=>m===11?{y:y+1,m:0}:{y,m:m+1});
        const calGoToday=()=>{const d=new Date();setCalMonth({y:d.getFullYear(),m:d.getMonth()});setCalSelected(ymd(d));};
        const openAddVisio=()=>{
          setVisioCompanyId(connected.length===1?connected[0].id:null);
          setVisioSvcs([]);
          setSchedForm({date:calSelectedKey,time:""});
          setVisioSetup(true);
        };
        const openAddNote=()=>{
          setNoteForm({title:"",date:calSelectedKey,time:"",note:""});
          setNoteModalOpen(true);
        };
        return (
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">{t("Événements")}</h2>
          <p className="psub">{t("Toutes vos visios à venir avec les entreprises connectées, ainsi que vos événements libres, classés par date.")}{!isAdmin&&` ${t("En tant que")} ${t(role)}, ${t("vous ne voyez que les visios de votre service.")}`}</p>
          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            <button className="btn-ghost sm" onClick={calGoToday}>{t("Aujourd'hui")}</button>
            <button className="btn-ghost sm" onClick={exportIcs}>{t("Exporter (.ics)")}</button>
          </div>
          {roleEvents.length>0&&<p className="uphint" style={{marginTop:-10,marginBottom:16}}>{t("Le fichier .ics s'importe dans Google Agenda, Outlook ou Apple Calendar (menu « Importer un calendrier »).")}</p>}

          <div className="calwrap">
            <div className="calhead">
              <button className="calnavbtn" onClick={calPrevMonth} aria-label={t("Mois précédent")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 4 7 12l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h4>{calMonthLabel}</h4>
              <button className="calnavbtn" onClick={calNextMonth} aria-label={t("Mois suivant")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 4v16l8-8L9 4Z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="calgrid">
              {calWeekdays.map((w)=><div key={w} className="calweekday">{w}</div>)}
              {calCells.map((cell,i)=>{
                const dotColors=[
                  ...(eventsByDate[cell.key]||[]).map((e)=>e.c.color),
                  ...(genEventsByDate[cell.key]||[]).map(()=>"#8A8C90"),
                ];
                return (
                  <button key={i} type="button"
                    className={"calcell"+(cell.out?" out":"")+(cell.key===todayKey?" today":"")+(cell.key===calSelectedKey?" sel":"")}
                    onClick={()=>setCalSelected(cell.key)}>
                    <span className="calnum">{cell.dt.getDate()}</span>
                    {dotColors.length>0&&<div className="caldots">
                      {dotColors.slice(0,3).map((color,j)=><span key={j} className="caldot" style={{background:color}}/>)}
                      {dotColors.length>3&&<span className="calmore">+{dotColors.length-3}</span>}
                    </div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="agday">
            <div className="agdayhead">
              <div className="agdate">{calSelectedKey===todayKey?t("Aujourd'hui"):fmtDate(calSelectedKey)}</div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn-ghost sm" onClick={openAddNote}>+ {t("Rappel")}</button>
                {connected.length>0&&<button className="btn-ghost sm" onClick={openAddVisio}>+ {t("Visio")}</button>}
              </div>
            </div>
            {calSelectedItems.length===0?(
              <p className="psub" style={{margin:0}}>{t("Aucun événement ce jour.")}</p>
            ):calSelectedItems.map((item,i)=>item.type==="visio"?(
              <div key={i} className="agevent" style={{borderLeft:`3px solid ${item.data.c.color}`}}>
                <div className="agtime">{item.data.time}</div>
                <div className="aglogo" style={{background:item.data.c.color}}>{logoImg(item.data.c)}</div>
                <div className="aginfo"><b>{item.data.c.name}{item.data.services.length>1?` · ${t("visio de groupe")}`:""}</b>
                  <div className="agsvcs">{item.data.services.map((s)=><span key={s} className="pill offer">{t(s)}</span>)}</div></div>
                <button className="btn sm" onClick={()=>startVisio(item.data.c,item.data.services)}>{t("Rejoindre")}</button>
              </div>
            ):(
              <div key={i} className="agevent" style={{borderLeft:"3px solid #8A8C90"}}>
                <div className="agtime">{item.data.time||"—"}</div>
                <div className="aglogo" style={{background:"#8A8C90"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.9"/></svg>
                </div>
                <div className="aginfo"><b>{item.data.title}</b>
                  {item.data.note&&<small style={{display:"block",marginTop:2}}>{item.data.note}</small>}</div>
                <button className="btn-ghost sm" onClick={()=>deleteGenericEvent(item.data.id)} aria-label={t("Supprimer")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div></div>
        );
      })()}

      {/* BIBLIOTHÈQUE — registre de toutes les actions */}
      {view==="library"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">{t("Bibliothèque")}</h2>
          <p className="psub">{t("Le registre de toutes les actions effectuées sur votre espace : demandes envoyées, mises en relation, visios, publications…")}</p>
          <div className="toolbar">
            <div className="search">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate)" strokeWidth="1.8"/><path d="M14 14l4 4" stroke="var(--slate)" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <input placeholder={t("Rechercher dans la bibliothèque…")} value={libQuery} onChange={(e)=>setLibQuery(e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"2px 0 18px"}}>
            {HIST_CATEGORIES.map((cat)=>{const count=history.filter((e)=>e.kind===cat.kind).length;if(!count)return null;return(
              <button key={cat.kind} type="button" className={"fchip"+(libFilters.includes(cat.kind)?" on":"")} onClick={()=>toggleLibFilter(cat.kind)}>{t(cat.label)} ({count})</button>
            );})}
            {libFilters.length>0&&<button type="button" className="linkbtn" style={{fontSize:12.5}} onClick={()=>setLibFilters([])}>{t("Réinitialiser les filtres")}</button>}
          </div>
          {(()=>{const byCategory=libFilters.length?history.filter((e)=>libFilters.includes(e.kind)):history;
            const filtered=libQuery.trim()?byCategory.filter((e)=>e.text.toLowerCase().includes(libQuery.trim().toLowerCase())):byCategory;
            if(history.length===0)return(
              <div className="empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 5h16M4 12h16M4 19h10" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <h3>{t("Aucune activité pour l'instant")}</h3><p>{t("Chaque action que vous effectuez apparaîtra ici, avec la date et l'heure.")}</p>
              </div>
            );
            if(filtered.length===0)return(
              <div className="empty">
                <svg width="46" height="46" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--slate-soft)" strokeWidth="1.6"/><path d="M14 14l4 4" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <h3>{t("Aucun résultat")}</h3><p>{libQuery.trim()?`${t("Aucune action ne correspond à")} « ${libQuery} ».`:t("Aucune action ne correspond aux filtres sélectionnés.")}</p>
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
            <div><h2 className="ptitle disp">{t("Emailing")}</h2>
              <p className="psub" style={{marginBottom:0}}>{t("Envoyez des campagnes uniquement aux entreprises qui ont accepté de les recevoir, au moment de la mise en relation.")}</p></div>
            <button className="btn sm" disabled={emailingRecipients.length===0} onClick={openCampaign}>{t("Nouvelle campagne")}</button>
          </div>

          <div className="seclabel" style={{marginTop:26}}>{t("Destinataires éligibles")} {emailingRecipients.length>0&&<span className="badge">{emailingRecipients.length}</span>}</div>
          {emailingRecipients.length===0?(
            <p style={{color:"var(--slate)",fontSize:14}}>{t("Aucune entreprise n'a encore accepté de recevoir vos campagnes. Le consentement se donne dans l'onglet « Demandes » au moment d'accepter une mise en relation.")}</p>
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

          <div className="seclabel">{t("Campagnes envoyées")}</div>
          {campaigns.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 7l8 6 8-6" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h3>{t("Aucune campagne envoyée")}</h3><p>{t("Créez votre première campagne d'emailing ci-dessus.")}</p>
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
                      <p style={{margin:"3px 0 0",fontSize:12.5,color:"var(--slate)"}}>{t("Sujet")} : {camp.subject}</p>
                      {camp.body&&<p style={{margin:"4px 0 0",fontSize:13,color:"var(--slate)"}}>{camp.body}</p>}
                      {camp.rsvp&&(
                        <p style={{margin:"6px 0 0",fontSize:12,fontWeight:600}}>
                          <span style={{color:"var(--emerald)"}}>✓ {confirmed} {confirmed>1?t("confirmés"):t("confirmé")}</span>{" · "}
                          <span style={{color:"var(--coral)"}}>✗ {declined} {declined>1?t("déclinés"):t("décliné")}</span>{" · "}
                          <span style={{color:"var(--amber)"}}>⏳ {pending} {t("en attente")}</span>
                        </p>
                      )}
                    </div>
                    <span className="nat">{camp.recipients.length} {camp.recipients.length>1?t("destinataires"):t("destinataire")} · {camp.date}</span>
                  </div>
                  {open&&camp.rsvp&&(
                    <div style={{background:"var(--paper)",borderBottom:"1px solid var(--line-soft)"}}>
                      {camp.rsvp.map((r)=>(
                        <div key={r.companyId} className="subrow" style={{padding:"8px 18px"}}>
                          <span className="tree">└</span>{r.name}
                          <span style={{marginLeft:"auto",fontWeight:600,fontSize:12,color:r.status==="confirmed"?"var(--emerald)":r.status==="declined"?"var(--coral)":"var(--amber)"}}>
                            {r.status==="confirmed"?"✓ "+t("Confirmé"):r.status==="declined"?"✗ "+t("Décliné"):"⏳ "+t("En attente")}
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
                    <div><h3 className="disp">{t("Nouvelle campagne d'emailing")}</h3>
                      <p className="mi">{t("Renseignez son identité, choisissez les destinataires, puis le contenu.")}</p></div>
                  </div>

                  <div className="msec">{t("Identité de la campagne")}</div>
                  <div className="field"><label>{t("Nom de la campagne")}</label>
                    <input value={campaignForm.name} onChange={(e)=>setCampaignForm({...campaignForm,name:e.target.value})} placeholder="ex : Promo rentrée 2026 — Réseau Maillon"/></div>
                  <div className="field"><label>{t("Sujet de l'email")}</label>
                    <input value={campaignForm.subject} onChange={(e)=>setCampaignForm({...campaignForm,subject:e.target.value})} placeholder="ex : Nos nouveautés du mois"/></div>
                  <div className="field"><label>{t("Liste de diffusion")}</label>
                    <select value={campaignForm.list} onChange={(e)=>{const val=e.target.value;setCampaignForm({...campaignForm,list:val});applyList(val);}}>
                      <option value="all">{t("Toutes les listes de diffusion")} ({allListedCompanies.length})</option>
                      {distLists.length>0&&<optgroup label={t("Vos listes")}>
                        {distLists.map((l)=><option key={l.id} value={"list:"+l.id}>{l.name} ({l.companyIds.filter((id)=>emailingRecipients.some((c)=>c.id===id)).length})</option>)}
                      </optgroup>}
                    </select>
                    <div className="uphint">{t("Présélectionne les destinataires ci-dessous ; vous pouvez encore ajuster la sélection à la main. Créez vos propres listes dans l'onglet « Listes ».")}</div>
                  </div>
                  <label className="consentrow">
                    <input type="checkbox" checked={campaignForm.needsRsvp} onChange={(e)=>setCampaignForm({...campaignForm,needsRsvp:e.target.checked})}/>
                    {t("Cette campagne demande une confirmation (ex : présence à un événement)")}
                  </label>

                  <div className="msec">{t("Destinataires")}</div>
                  <div className="field">
                    <label>{t("Sélection")} ({selectedCompanies.length}/{emailingRecipients.length})</label>
                    <div className="libcard" style={{maxHeight:180,overflowY:"auto"}}>
                      {emailingRecipients.map((c)=>(
                        <label key={c.id} className="consentrow" style={{padding:"10px 14px",margin:0}}>
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggleRecipient(c.id)}/>
                          {c.name} <span style={{color:"var(--slate-soft)"}}>· {c.sector}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="msec">{t("Template & tracking")}</div>
                  <div className="field"><label>{t("Message (texte simple)")}</label>
                    <textarea rows={3} value={campaignForm.body} onChange={(e)=>setCampaignForm({...campaignForm,body:e.target.value})} placeholder={t("Votre message aux entreprises abonnées.")}/></div>
                  <div className="field">
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <label style={{margin:0}}>{t("HTML de l'email (facultatif)")}</label>
                      <button type="button" className="btn-ghost sm" onClick={()=>setCampaignForm((f)=>({...f,html:buildEmailSkeleton(f.subject)}))}>{t("Générer le squelette email")}</button>
                    </div>
                    <textarea rows={6} className="mono" style={{fontSize:12.5}} value={campaignForm.html} onChange={(e)=>setCampaignForm({...campaignForm,html:e.target.value})} placeholder="<!DOCTYPE html><html>…"/>
                    <div className="uphint">{t("Placeholders")} : [Prénom] · [VIEW_ONLINE] · {"{{HEADER}}"} ({t("header expéditeur")}) · {"{{FOOTER}}"} ({t("footer + désabo")}) · [REDIRECT_URL] ({t("lien bouton tracké")}). {t("Le pixel d'ouverture est injecté automatiquement.")}</div>
                  </div>

                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <button className="btn-ghost" onClick={()=>setCampaignOpen(false)}>{t("Annuler")}</button>
                    <button className="btn block" disabled={!campaignForm.name.trim()||!campaignForm.subject.trim()||selectedCompanies.length===0} onClick={()=>sendCampaign(selectedCompanies)}>{t("Envoyer la campagne")}</button>
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
            <div><h2 className="ptitle disp">{t("Listes de diffusion")}</h2>
              <p className="psub" style={{marginBottom:0}}>{t("Regroupez vos entreprises abonnées dans des listes réutilisables (ex : « Mail du jeudi matin ») pour ne plus avoir à tout recocher à chaque campagne.")}</p></div>
            <button className="btn sm" disabled={eligible.length===0} onClick={()=>{setListForm({name:"",companyIds:[]});setListOpen(true);}}>{t("Créer une liste")}</button>
          </div>

          {eligible.length===0&&distLists.length===0?(
            <p style={{color:"var(--slate)",fontSize:14,marginTop:26}}>{t("Aucune entreprise n'a encore accepté de recevoir vos campagnes. Le consentement se donne dans l'onglet « Demandes » au moment d'accepter une mise en relation.")}</p>
          ):distLists.length===0?(
            <div className="empty">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h7" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <h3>{t("Aucune liste pour l'instant")}</h3><p>{t("Créez votre première liste de diffusion ci-dessus.")}</p>
            </div>
          ):(
            <div className="libcard" style={{marginTop:26}}>
              {distLists.map((l)=>{const members=companies.filter((c)=>l.companyIds.includes(c.id));const open=expandedListId===l.id;return(
                <div key={l.id}>
                  <div className="libitem" style={{cursor:"pointer",borderBottom:"1px solid var(--line-soft)"}} onClick={()=>setExpandedListId(open?null:l.id)}>
                    <div className="ni"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:600}}>{l.name}</p>
                      <p style={{margin:"4px 0 0",fontSize:12.5,color:"var(--slate)"}}>{members.map((c)=>c.name).join(", ")||t("Aucune entreprise (retirée depuis)")}</p>
                    </div>
                    <span className="nat" style={{display:"flex",alignItems:"center",gap:12}}>
                      {members.length} {members.length>1?t("entreprises"):t("entreprise")}
                      <span className="rm" style={{color:"var(--coral)",cursor:"pointer",fontWeight:600}} onClick={(e)=>{e.stopPropagation();deleteList(l.id);}}>{t("Supprimer")}</span>
                    </span>
                  </div>
                  {open&&(
                    <div style={{background:"var(--paper)",borderBottom:"1px solid var(--line-soft)"}}>
                      {members.length===0?(
                        <p style={{margin:0,padding:"14px 18px",fontSize:13,color:"var(--slate-soft)"}}>{t("Aucune entreprise dans cette liste.")}</p>
                      ):members.map((c)=>(
                        <div key={c.id} className="subgrp">
                          <div className="subhead">
                            <div className="logo" style={{background:c.color,width:28,height:28,fontSize:12,borderRadius:7}}>{logoImg(c)}</div>
                            <b>{c.name}</b>
                          </div>
                          {(c.emailingContacts||[]).length===0?(
                            <div className="subrow"><span className="tree">└</span><span style={{color:"var(--slate-soft)"}}>{t("Aucun contact enregistré")}</span></div>
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
                    <div><h3 className="disp">{t("Nouvelle liste de diffusion")}</h3>
                      <p className="mi">ex : « Mail du jeudi matin »</p></div>
                  </div>
                  <div className="field"><label>{t("Nom de la liste")}</label>
                    <input value={listForm.name} onChange={(e)=>setListForm({...listForm,name:e.target.value})} placeholder="ex : Mail du jeudi matin"/></div>
                  <div className="field">
                    <label>{t("Entreprises")} ({listForm.companyIds.length}/{eligible.length})</label>
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
                    <button className="btn-ghost" onClick={()=>setListOpen(false)}>{t("Annuler")}</button>
                    <button className="btn block" disabled={!listForm.name.trim()||listForm.companyIds.length===0} onClick={createList}>{t("Créer la liste")}</button>
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
            <div><h2 className="ptitle disp">{t("Mur de besoins")}</h2>
              <p className="psub" style={{marginBottom:0}}>{t("Exprimez ce que vous cherchez, ou proposez vos services aux entreprises qui cherchent. La mise en relation vient à vous.")}</p></div>
            <button className="btn sm" onClick={()=>setNeedOpen(true)}>{t("Publier un besoin")}</button>
          </div>

          <div className="filt" style={{margin:"20px 0 18px"}}>
            <button className={"fchip"+(needFilter==="all"?" on":"")} onClick={()=>setNeedFilter("all")}>{t("Tous les besoins")}</button>
            <button className={"fchip"+(needFilter==="match"?" on":"")} onClick={()=>setNeedFilter("match")}>{t("Qui me correspondent")}{matchingNeeds.length>0?` (${matchingNeeds.length})`:""}</button>
          </div>

          <div className="needwrap">
            {(()=>{const shownNeeds=needs.filter((n)=>needFilter==="all"||n.mine||n.sought===me.sector);return shownNeeds.length===0?(
              <div className="empty">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h7" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <h3>{t("Aucun besoin pour l'instant")}</h3><p>{t("Soyez le premier à publier ce que vous recherchez.")}</p>
              </div>
            ):shownNeeds.map((n)=>{
              const a=needAuthor(n);const match=!n.mine&&n.sought===me.sector;
              return(
                <div key={n.id} className="needcard">
                  <div className="needhead">
                    <div className="logo" style={{background:a.color}}>{logoImg(a)}</div>
                    <div style={{minWidth:0}}><b>{a.name}{n.mine?` · ${t("vous")}`:""}</b><small>{a.sector}{a.sector?" · ":""}{n.loc} · {n.date}</small></div>
                    {match&&<span className="needmatch">{t("Correspond à votre activité")}</span>}
                  </div>
                  <h3>{n.title}</h3>
                  <div className="needmeta">
                    <span className="pill seek">↳ {t("Recherche")} : {n.sought}</span>
                    <span className="pill offer">{n.loc}</span>
                  </div>
                  <div className="needfoot">
                    <span className="resp">{n.responses} {n.responses>1?t("réponses"):t("réponse")}</span>
                    {n.mine?(
                      <span className="resp" style={{marginLeft:"auto",color:"var(--emerald)",fontWeight:600}}>{t("Votre besoin")}</span>
                    ):(
                      <button className="btn sm" onClick={()=>respondToNeed(n)}>{t("Proposer mes services")}</button>
                    )}
                  </div>
                </div>
              );
            });})()}
          </div>
        </div></div>
      )}

      {/* PROFILE */}
      {view==="profile"&&(
        <div className="wrap"><div className="page">
          <h2 className="ptitle disp">{t("Ma page entreprise")}</h2>
          <p className="psub">{t("Votre tableau de bord et la fiche que voient les autres entreprises.")}</p>
          <div className="dashsec"><h5 className="dashh">{t("Tableau de bord")}</h5>
            <div className="dash">
              <div className="dtile"><b>{84+connected.length*12+needs.filter((n)=>n.mine).length*6}</b><span>{t("Vues de la fiche (30 j)")}</span></div>
              <div className="dtile"><b>{connected.length}</b><span>{t("Relations actives")}</span></div>
              <div className="dtile"><b>{incoming.length}</b><span>{t("Demandes reçues")}</span></div>
              <div className="dtile"><b>{prospectsUsed}</b><span>{t("Démarchages envoyés")}</span></div>
              <div className="dtile"><b>{needs.filter((n)=>n.mine).length}</b><span>{t("Besoins publiés")}</span></div>
              <div className="dtile"><b>★ {me.rating}</b><span>{t("Note moyenne")}</span></div>
            </div>
          </div>

          {currentUser&&(
            <div className="dashsec"><h5 className="dashh">{t("Mon compte")}</h5>
              <div className="prof"><div className="profbody">
                <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:18}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:me.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bricolage Grotesque'",fontWeight:800,fontSize:24,flex:"0 0 auto"}}>
                    {(currentUser.name||"?").trim().split(/\s+/).map((w)=>w[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div className="profname disp" style={{fontSize:18}}>{currentUser.name}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"6px 0"}}>
                      <span className="pill offer">{t(currentUser.role)}</span>
                      {isAdmin&&<span className="pill seek">{t("Administrateur")}</span>}
                    </div>
                    {session&&session.user&&session.user.last_sign_in_at&&<div className="profmeta">{t("Dernière connexion")} : {new Date(session.user.last_sign_in_at).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>}
                  </div>
                </div>

                <div className="profsec" style={{marginTop:0}}>
                  <h5>{t("Informations personnelles")}</h5>
                  <div className="field"><label>{t("Prénom et nom")}</label>
                    <input value={profileName} onChange={(e)=>setProfileName(e.target.value)}/></div>
                  <div className="field"><label>{t("Email")}</label>
                    <input value={currentUser.email} disabled style={{opacity:.6,cursor:"not-allowed"}}/>
                    <div className="uphint">{t("L'adresse email ne peut pas être modifiée ici.")}</div></div>
                  <button className="btn sm" disabled={profileNameSaving||!profileName.trim()||profileName.trim()===currentUser.name} onClick={saveProfileName}>{profileNameSaving?t("Enregistrement…"):t("Enregistrer")}</button>
                </div>

                <div className="profsec">
                  <h5>{t("Langue")}</h5>
                  <p className="d">{t("La langue utilisée pour vos communications et, à terme, l'interface de Maillon.")}</p>
                  <div className="field" style={{maxWidth:260}}>
                    <select value={currentUser.language} onChange={(e)=>setLanguage(e.target.value)} style={{border:"1px solid var(--line)",borderRadius:10,padding:"9px 11px",fontSize:13.5,fontWeight:600,background:"#fff",color:"var(--ink)",width:"100%"}}>
                      {LANGUAGES.map((l)=><option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="profsec">
                  <h5>{t("Changer le mot de passe")}</h5>
                  <div className="field"><label>{t("Mot de passe actuel")}</label>
                    <input type="password" value={pwdCurrent} onChange={(e)=>setPwdCurrent(e.target.value)}/></div>
                  <div className="grid2">
                    <div className="field"><label>{t("Nouveau mot de passe")}</label>
                      <input type="password" value={pwdNew} onChange={(e)=>setPwdNew(e.target.value)} placeholder={t("Min. 8 caractères")}/></div>
                    <div className="field"><label>{t("Confirmer le nouveau mot de passe")}</label>
                      <input type="password" value={pwdConfirm} onChange={(e)=>setPwdConfirm(e.target.value)} placeholder={t("Identique")}/></div>
                  </div>
                  {pwdError&&<p style={{color:"var(--coral)",fontSize:13,margin:"0 0 12px"}}>{pwdError}</p>}
                  <button className="btn sm" disabled={pwdBusy} onClick={changePassword}>{pwdBusy?t("Un instant…"):t("Modifier le mot de passe")}</button>
                </div>
              </div></div>
            </div>
          )}

          <div className="prof">
            <div className="profban" style={{background:`linear-gradient(120deg, ${me.color}, ${me.color}bb)`}}/>
            <div className="profbody">
              <div className="profident">
                <div className="proflogo" style={{background:me.color}}>{logoImg(me)}</div>
                <div><div className="profname disp">{me.name}<Check className="verif" style={{width:18,height:18}}/></div>
                  <div className="profmeta">{me.sector} · {me.loc} · {me.size}</div>
                  {me.isFounder&&<span className="pill seek" style={{marginTop:6,display:"inline-block"}}>⭐ {t("Entreprise Fondatrice")}</span>}</div>
              </div>
              <div className="pgrid" style={{marginTop:4}}>
                <div className="pcell"><div className="k">{t("Création")}</div><div className="v">{me.founded}</div></div>
                <div className="pcell"><div className="k">{t("Chiffre d'affaires")}</div><div className="v">{me.ca}</div></div>
                <div className="pcell"><div className="k">{t("Effectif")}</div><div className="v">{me.size}</div></div>
                <div className="pcell"><div className="k">{t("Site web")}</div><div className="v">{me.web}</div></div>
                <div className="pcell"><div className="k">{t("SIRET")}</div><div className="v" style={{fontSize:12.5}}>{me.siret||"—"}{me.verifiedSiren&&<Check className="verif" style={{width:13,height:13,marginLeft:5}}/>}</div></div>
                <div className="pcell"><div className="k">{t("Abonnement")}</div><div className="v" style={{color:me.membre?"var(--emerald)":"var(--ink)"}}>{me.planId==="gratuit"?me.plan:`${me.plan} · ${me.billing}`}</div></div>
              </div>
              <div className="profsec"><h5>{t("Pôle de réception des demandes")}</h5><p>{t("Les demandes de mise en relation adressées à votre entreprise arrivent au pôle")} <b>{t(me.receptionPole)}</b>.</p></div>
              <div className="profsec"><h5>{t("Présentation")}</h5><p>{me.desc}</p></div>
              <div className="profsec"><h5>{t("Ce que nous recherchons")}</h5>
                <div className="seek" style={{marginTop:4}}>{me.seek.map((s)=><span key={s} className="pill seek">↳ {s}</span>)}</div></div>
              <div className="profsec"><h5>{t("Ce que nous proposons")}</h5>
                <div className="seek" style={{marginTop:4}}>{me.offer.map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
              {me.certifs.length>0&&<div className="profsec"><h5>{t("Certifications")}</h5>
                <div className="seek" style={{marginTop:4}}>{me.certifs.map((s)=><span key={s} className="pill cert">{s}</span>)}</div></div>}
              <div style={{marginTop:22}}><button className="btn-ghost sm" onClick={()=>{setMe(null);setObStep(0);}}>{t("Recréer / modifier ma page")}</button></div>
            </div>
          </div>

          <h2 className="ptitle disp" style={{marginTop:36}}>{t("Accès & cloisonnement")}</h2>
          {isAdmin?(
            <p className="psub">{t("Vous êtes en Direction : vous seul(e) pouvez gérer les droits d'accès et le cloisonnement de votre entreprise.")}</p>
          ):(
            <p className="psub">{t("Seule la Direction peut gérer les droits d'accès et le cloisonnement. Vous êtes connecté en tant que")} {t(role)} — {t("voici les règles en vigueur (lecture seule).")}</p>
          )}

          <div className="prof"><div className="profbody">
            <div className="accsec">
              <h5>{t("Accès complet (administrateurs)")}</h5>
              <p className="d">{t("Ces services voient la messagerie de tous les pôles.")}</p>
              <div className="svcwrap">
                {(me.services||[]).map((s)=>(
                  <button key={s} type="button" className={"svcchip"+(access.admins.includes(s)?" on":"")}
                    onClick={()=>isAdmin&&toggleAdmin(s)} style={isAdmin?{}:{cursor:"default",opacity:.9}}>{t(s)}</button>
                ))}
              </div>
            </div>

            <div className="accsec">
              <h5>{t("Autorisations supplémentaires")}</h5>
              <p className="d">{t("Par défaut, ce service ne voit que sa messagerie par pôle.")}</p>
              {(me.services||[]).filter((s)=>!access.admins.includes(s)).map((s)=>(
                <div key={s} className="accrow">
                  <div className="rn">{t(s)}<span style={{fontWeight:400,color:"var(--slate)",fontSize:12}}>{t("peut aussi voir :")}</span></div>
                  <div className="svcwrap">
                    {(me.services||[]).filter((o)=>o!==s&&!access.admins.includes(o)).map((o)=>(
                      <button key={o} type="button" className={"svcchip"+((access.grants[s]||[]).includes(o)?" on":"")}
                        onClick={()=>isAdmin&&toggleGrant(s,o)} style={isAdmin?{}:{cursor:"default",opacity:.9}}>{t(o)}</button>
                    ))}
                    {(me.services||[]).filter((o)=>o!==s&&!access.admins.includes(o)).length===0&&<span style={{fontSize:12.5,color:"var(--slate-soft)"}}>{t("Aucun autre service à partager.")}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="accsec">
              <h5>{t("Collaborateurs")}</h5>
              <p className="d">{t("Chaque collaborateur est rattaché à un rôle. Il ne voit que ce que ce rôle autorise — il ne peut pas le changer lui-même.")}</p>
              {team.map((m)=>(
                <div key={m.id} className="accrole">
                  <div><b style={m.status==="disabled"?{color:"var(--slate-soft)"}:{}}>{m.name}</b><small> {m.status==="invited"?t("invitation en attente"):m.status==="disabled"?t("compte désactivé"):(access.admins.includes(m.role)?t("administrateur"):t("accès cloisonné"))}</small></div>
                  <select value={m.role} onChange={(e)=>{
                    if(!isAdmin)return;
                    const r=e.target.value;
                    if(r==="Autre"){
                      setCustomRoleValue("");
                      setCustomRolePrompt({id:m.id,name:m.name});
                      return;
                    }
                    if(r==="Direction"&&m.role!=="Direction"){
                      setDirectionConfirm({message:`${t("Donner le rôle Direction à")} ${m.name} ${t("lui donnera aussi le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?")}`,onConfirm:()=>updateRole(m.id,r)});
                    }else{
                      updateRole(m.id,r);
                    }
                  }} disabled={!isAdmin||m.status==="disabled"}>{[...(me.services||[]),...((me.services||[]).includes("Autre")?[]:["Autre"])].map((s)=><option key={s} value={s}>{t(s)}</option>)}</select>
                  {isAdmin&&m.status!=="invited"&&<button className="linkbtn" style={{fontSize:12,marginLeft:2}} onClick={()=>toggleAccount(m.id)}>{m.status==="disabled"?t("Réactiver"):t("Désactiver")}</button>}
                </div>
              ))}
            </div>

            {isAdmin&&(
              <div className="accsec">
                <h5>{t("Inviter un collaborateur")}</h5>
                <p className="d">{t("Un lien d'invitation est créé et copié dans votre presse-papiers. Envoyez-le vous-même à votre collègue (email, message…) : en l'ouvrant, il/elle rejoint directement votre entreprise avec le rôle choisi.")}</p>
                <div className="invrow">
                  <input placeholder="prenom.nom@entreprise.fr" value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)}/>
                  <select value={inviteRole||(me.services.find((s)=>!access.admins.includes(s))||me.services[0])} onChange={(e)=>setInviteRole(e.target.value)}>{[...(me.services||[]),...((me.services||[]).includes("Autre")?[]:["Autre"])].map((s)=><option key={s} value={s}>{t(s)}</option>)}</select>
                  {inviteRole==="Autre"&&<input value={inviteRoleCustom} onChange={(e)=>setInviteRoleCustom(e.target.value)} placeholder={t("Précisez le service…")}/>}
                  <button className="btn sm" onClick={()=>{
                    const r=inviteRole||(me.services.find((s)=>!access.admins.includes(s))||me.services[0]);
                    const finalRole=r==="Autre"?(inviteRoleCustom.trim()||"Autre"):r;
                    const doInvite=()=>{sendInvite(inviteEmail,finalRole);setInviteEmail("");setInviteRoleCustom("");};
                    if(finalRole==="Direction"){
                      setDirectionConfirm({message:t("La personne invitée avec le rôle Direction aura le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?"),onConfirm:doInvite});
                    }else{
                      doInvite();
                    }
                  }}>{t("Inviter")}</button>
                </div>
                {pendingInvites.length>0&&(
                  <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                    {pendingInvites.map((inv)=>(
                      <div key={inv.id} className="accrole">
                        <div><b>{inv.email}</b><small> {t("invitation en attente")} · {t(inv.role)}</small></div>
                        <button className="linkbtn" style={{fontSize:12}} onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(inviteLink(inv.token)).catch(()=>{});toast(t("Lien copié !"));}}>{t("Copier le lien")}</button>
                        <button className="linkbtn" style={{fontSize:12,marginLeft:8}} onClick={()=>revokeInvite(inv.id)}>{t("Révoquer")}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="accsec">
              <h5>{t("Pôle de réception des demandes")}</h5>
              <p className="d">{t("Le pôle qui reçoit toutes les demandes de mise en relation adressées à votre entreprise.")}</p>
              <select value={me.receptionPole} onChange={(e)=>isAdmin&&setReceptionPole(e.target.value)} disabled={!isAdmin} style={{border:"1px solid var(--line)",borderRadius:10,padding:"8px 11px",fontSize:13.5,fontWeight:600,background:"#fff",color:"var(--ink)"}}>{(me.services||[]).map((s)=><option key={s} value={s}>{t(s)}</option>)}</select>
            </div>

            <div className="accsec">
              <h5>{t("Sécurité & notifications")}</h5>
              <p className="d">{t("La double authentification est propre à votre compte personnel (elle vous protège, vous — pas toute l'entreprise).")}</p>
              <label className="setrow"><span>{t("Double authentification (2FA)")}</span><input type="checkbox" checked={twofa} onChange={()=>{if(mfaBusy)return;twofa?disableMfa():startMfaEnroll();}} disabled={mfaBusy}/></label>
              <label className="setrow"><span>{t("Notifications par e-mail")}</span><input type="checkbox" checked={notifEmail} onChange={toggleNotifEmail}/></label>
              <label className="setrow"><span>{t("Notifications push")}</span><input type="checkbox" checked={notifPush} onChange={()=>notifPush?disablePush():enablePush()}/></label>
              <p style={{fontSize:11.5,color:"var(--slate-soft)",marginTop:6}}>{t("Votre navigateur vous demandera l'autorisation. Fonctionne même si Maillon est en arrière-plan, tant que ce navigateur reste ouvert.")}</p>
            </div>

            <div className="accsec">
              <h5>{t("Journal d'accès")}</h5>
              <p className="d">{t("Historique des actions sensibles sur votre espace.")}</p>
              {auditLog.length===0?<p style={{fontSize:12.5,color:"var(--slate-soft)"}}>{t("Aucune action enregistrée pour l'instant.")}</p>:
                <div className="auditlist">{auditLog.slice(0,8).map((e)=><div key={e.id} className="auditrow"><span className="at">{e.at}</span>{e.text}</div>)}</div>}
            </div>

            <div className="accnote">{t("Le cloisonnement s'applique à votre entreprise uniquement. L'autre entreprise gère ses propres règles de son côté.")}</div>

            {isAdmin&&(
              <div style={{marginTop:20,display:"flex",alignItems:"center",gap:12}}>
                <button className="btn" disabled={!accessDirty||accessSaving} onClick={saveAccess}>{accessSaving?t("Enregistrement…"):t("Sauvegarder")}</button>
                {accessDirty&&<button className="linkbtn" onClick={resetAccessDraft}>{t("Annuler les modifications")}</button>}
              </div>
            )}
          </div></div>

          <h2 className="ptitle disp" style={{marginTop:36}}>{t("Abonnement & facturation")}</h2>
          <p className="psub">{t("Gérez ici votre offre et vos informations de paiement, séparément du reste de votre compte.")}</p>
          <div className="prof"><div className="profbody">
            <div className="profsec" style={{marginTop:0}}>
              <h5>{t("Offre actuelle")}</h5>
              <p className="d">{t("Vous êtes sur l'offre")} <b>{me.planId==="gratuit"?me.plan:`${me.plan} · ${me.billing}`}</b>.</p>
              {me.founderFreeActive&&(
                <p className="d" style={{color:"var(--emerald)",fontWeight:600}}>⭐ {t("Accès Maillon Fort offert jusqu'au")} {new Date(me.founderFreeUntil).toLocaleDateString("fr-FR")} ({t("Entreprise Fondatrice")}).</p>
              )}
              {me.planId!=="gratuit"?(
                <button className="btn-ghost sm" onClick={manageBilling}>{t("Gérer mon abonnement / facturation")}</button>
              ):(
                <p style={{fontSize:12.5,color:"var(--slate-soft)"}}>{t("Aucun abonnement payant à gérer pour le moment.")}</p>
              )}
            </div>
          </div></div>

          <h2 className="ptitle disp" style={{marginTop:36}}>🏆 {t("Offre Fondateur")}</h2>
          <p className="psub">{t("Invitez des entreprises de votre réseau et gagnez 1 mois offert sur Maillon Fort pour chaque entreprise qui rejoint Maillon.")}</p>
          <div className="prof"><div className="profbody">
            <div className="profsec" style={{marginTop:0}}>
              <h5>{t("Votre avantage")}</h5>
              <p className="d" style={{fontSize:20,fontWeight:800,color:"var(--ink)"}}>{me.founderMonthsGranted} {me.founderMonthsGranted>1?t("mois offerts"):t("mois offert")}</p>
              {me.isFounder&&<p className="d">⭐ {t("Entreprise Fondatrice")}</p>}
              {referrals.filter((r)=>r.status==="accepted").length>0&&<p className="d">🤝 {referrals.filter((r)=>r.status==="accepted").length} {t("entreprises ont rejoint Maillon grâce à vous")}</p>}
              <p style={{fontSize:12,color:"var(--slate-soft)",marginTop:6}}>{t("Si vous n'êtes pas encore abonné, ce mois vous donne un accès gratuit à Maillon Fort. Si vous payez déjà Maillon Fort, il est directement déduit de votre prochaine facture.")}</p>
              <button className="btn sm" onClick={()=>setInviteCoOpen(true)} style={{marginTop:8}}>{t("Inviter une entreprise")}</button>
            </div>
            <div className="profsec">
              <h5>{t("Mes invitations")}</h5>
              {referrals.length===0?(
                <p style={{fontSize:12.5,color:"var(--slate-soft)"}}>{t("Aucune invitation envoyée pour l'instant.")}</p>
              ):(<>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:14,fontSize:12.5,color:"var(--slate)"}}>
                  <span>{referrals.length} {t("envoyées")}</span>
                  <span>{referrals.filter((r)=>r.status==="pending"||r.status==="clicked").length} {t("en attente")}</span>
                  <span>{referrals.filter((r)=>r.status==="registered").length} {t("inscrites")}</span>
                  <span>{referrals.filter((r)=>r.status==="accepted").length} {t("acceptées")}</span>
                </div>
                <div className="auditlist">
                  {referrals.map((r)=>(
                    <div key={r.id} className="auditrow">
                      <span className="at">{{pending:t("En attente"),clicked:t("Lien ouvert"),registered:t("Inscription en cours"),accepted:t("Acceptée")}[r.status]||r.status}</span>
                      {r.invited_name?`${r.invited_name} · `:""}{r.invited_email}
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          </div></div>
        </div></div>
      )}

      {/* BLOG CENTRAL */}
      {view==="blog"&&(
        <div className="wrap"><div className="page">
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><h2 className="ptitle disp">{t("Actualités")}</h2>
              <p className="psub" style={{marginBottom:0}}>{t("Le fil commun des entreprises de Maillon. La lecture est ouverte à tous ; publier demande une adhésion.")}</p></div>
            <button className="btn sm" onClick={tryPublish}>{t("Publier une actualité")}</button>
          </div>

          <div className="blog" style={{marginTop:24}}>
            <div>
              {!me.membre&&(
                <div className="memban">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v6H3z" stroke="#7a5305" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  <span>{t("La publication est réservée à l'offre Maillon Fort.")} <b>{t("Passez à Maillon Fort")}</b> {t("pour partager vos news.")}</span>
                  <button className="btn" onClick={openAdhesionUpgrade}>{t("Passer à Maillon Fort")}</button>
                </div>
              )}
              <div className="feed">
                {posts.map((p)=>{const author=postAuthor(p);const reposted=postRepostOf(p);const orig=reposted||author;return(
                  <div key={p.id} className="post">
                    {reposted&&(
                      <div className="repostmeta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 2l4 4-4 4M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 0 1-3 3H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {t("Republié par")} <b>{author.name}</b>
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
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 3h10v8H6l-3 2.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>{t("Commenter")}</span>
                      <button className="like rep" onClick={()=>repost(p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 2l4 4-4 4M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 0 1-3 3H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {t("Republier")}
                      </button>
                      {author.isMe&&<span className="postself">{reposted?t("Republié par vous"):t("Votre publication")}</span>}
                    </div>
                  </div>
                );})}
                {posts.length===0&&(
                  <div className="empty">
                    <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 7l8 6 8-6" stroke="var(--slate-soft)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <h3>{t("Aucune actualité pour l'instant")}</h3><p>{t("Les publications des entreprises du réseau apparaîtront ici.")}</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="bside">
              {me.membre?(
                <div className="memok">
                  <h4><Check/> {t("Offre Pro active")}</h4>
                  <p>{t("Abonnement")} {me.plan} · {me.billing}. {t("Vous pouvez publier vos actualités sur le fil commun.")}</p>
                  <button className="btn block" onClick={tryPublish}>{t("Publier une actualité")}</button>
                </div>
              ):(
                <div className="memcard">
                  <h4>{t("Passez à l'offre Maillon Fort")}</h4>
                  <p>{t("Votre offre")} {me.plan} {t("n'inclut pas la publication. Passez à Maillon Fort pour publier vos news et gagner en visibilité.")}</p>
                  <ul>
                    <li><Check/> {t("Publier sur le fil commun")}</li>
                    <li><Check/> {t("Mise en avant de vos news")}</li>
                    <li><Check/> {t("Statistiques de visibilité")}</li>
                    <li><Check/> {t("Badge Maillon Fort sur votre page")}</li>
                  </ul>
                  <button className="btn-light" onClick={openAdhesionUpgrade}>{t("Voir l'offre Maillon Fort")}</button>
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
                <div className="why"><b>{dAff}% {t("d'affinité avec")} {me.name}.</b> {t("Estimée sur la complémentarité de vos activités, ce que vous cherchez de part et d'autre, et la proximité.")}</div>
              </div>
              <div className="pgrid">
                <div className="pcell"><div className="k">{t("Création")}</div><div className="v">{detail.founded}</div></div>
                <div className="pcell"><div className="k">{t("Effectif")}</div><div className="v">{detail.emp}</div></div>
                <div className="pcell"><div className="k">{t("Chiffre d'affaires")}</div><div className="v">{detail.ca}</div></div>
                <div className="pcell"><div className="k">{t("Disponibilité")}</div><div className="v">{detail.dispo}</div></div>
                <div className="pcell"><div className="k">{t("Note")}</div><div className="v">★ {detail.rating}</div></div>
                <div className="pcell"><div className="k">{t("Références")}</div><div className="v">{detail.refs} {t("clients")}</div></div>
                <div className="pcell"><div className="k">{t("Langues")}</div><div className="v">{detail.langues.join(", ")}</div></div>
                <div className="pcell"><div className="k">{t("SIRET")}</div><div className="v" style={{fontSize:12.5}}>{detail.siret}{detail.verifiedSiren&&<Check className="verif" style={{width:13,height:13,marginLeft:5}}/>}</div></div>
                <div className="pcell"><div className="k">{t("Site web")}</div><div className="v">{detail.web}</div></div>
              </div>
            </div>
            <div className="psec"><h5>{t("À propos")}</h5><p>{detail.desc}</p></div>
            <div className="psec"><h5>{t("Ce qu'elle recherche")}</h5>
              <div className="seek">{detail.seek.map((s)=><span key={s} className="pill seek">↳ {s}</span>)}</div></div>
            <div className="psec"><h5>{t("Ce qu'elle propose")}</h5>
              <div className="seek">{detail.offer.map((s)=><span key={s} className="pill offer">{s}</span>)}</div></div>
            {detail.certifs.length>0&&<div className="psec"><h5>{t("Certifications & labels")}</h5>
              <div className="seek">{detail.certifs.map((s)=><span key={s} className="pill cert">{s}</span>)}</div></div>}
            <div className="psec"><h5>{t("Services / départements")}</h5>
              <div className="seek">{(detail.services||[]).map((s)=><span key={s} className="pill offer">{t(s)}</span>)}</div></div>
            <div className="psec"><h5>{t("Réception des demandes")}</h5>
              <p style={{fontSize:14,color:"var(--slate)"}}>{t("Les demandes de mise en relation arrivent au pôle")} <b style={{color:"var(--ink)"}}>{t(detail.receptionPole)}</b>.</p>
              <button className="linkbtn" style={{marginTop:10,color:"var(--coral)"}} onClick={()=>toast(`${detail.name} ${t("signalée — notre équipe va examiner")}`)}>⚑ {t("Signaler cette entreprise")}</button></div>
            {detail.rel==="connected"&&(
              <div className="psec"><h5>{t("Campagnes d'emailing")}</h5>
                {detail.connFromMe===false?(
                  <label className="consentrow" style={{margin:0}}>
                    <input type="checkbox" checked={!!detail.myEmailingOptIn} onChange={(e)=>setMyEmailingOptIn(detail,e.target.checked)}/>
                    {t("Autoriser")} {detail.name} {t("à vous envoyer des campagnes d'emailing")}
                  </label>
                ):(
                  <p style={{fontSize:13.5,color:"var(--slate)",margin:0}}>
                    {detail.emailingConsent?`${detail.name} ${t("a accepté de recevoir vos campagnes d'emailing.")}`:`${detail.name} ${t("n'a pas souhaité recevoir vos campagnes d'emailing.")}`}
                  </p>
                )}
              </div>
            )}
            <div className="pcta">
              {detail.rel==="none"?(
                <button className="btn block" onClick={()=>openProspect(detail)}>{t("Démarcher")} {detail.name}</button>
              ):detail.rel==="connected"?(
                <>
                  <button className="btn" style={{flex:1}} onClick={()=>{setActiveConv(detail.id);setView("messages");setOpenC(null);}}>{t("Ouvrir la discussion")}</button>
                  <button className="btn-ghost" style={{flex:1,color:"var(--coral)"}} onClick={()=>disconnectCompany(detail)}>{t("Ne plus être connecté")}</button>
                </>
              ):detail.rel==="incoming"?(
                <button className="btn block" onClick={()=>{setView("requests");setOpenC(null);}}>{t("Répondre à sa demande")}</button>
              ):detail.rel==="sent"?(
                <button className="btn-ghost block" disabled style={{opacity:.6}}>{t("Demande en attente")}</button>
              ):(<button className="btn-ghost block" disabled style={{opacity:.6}}>{t("Demande déclinée")}</button>)}
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
                <div><h3 className="disp">{t("Démarcher")} {prospect.name}</h3>
                  <p className="mi">{t("Votre demande part avec votre message.")} {prospect.name} {t("accepte ou refuse la mise en relation.")}</p></div>
              </div>
              <div className="accnote" style={{marginBottom:14}}>{t("Votre demande sera reçue par le pôle")} <b>{t(prospect.receptionPole)}</b> {t("de")} {prospect.name}, {t("qui décidera de l'accepter.")}</div>
              <div className="field"><label>{t("Votre message d'introduction")}</label>
                <textarea rows={4} value={pmsg} onChange={(e)=>setPmsg(e.target.value)}/></div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setProspect(null)}>{t("Annuler")}</button>
                <button className="btn block" onClick={sendProspect}>{t("Envoyer la demande")}</button>
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
            <div className="mbox" style={{width:"min(640px,100%)"}} onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Passer à l'offre Maillon Fort")}</h3>
              <p className="mi" style={{marginBottom:18}}>{t("La publication d'actualités est incluse dans l'offre Maillon Fort. Choisissez votre facturation :")}</p>
              {renderPlanTable(PLANS.filter((pl)=>pl.id!=="gratuit"),upgradeBilling,setUpgradeBilling,upgradePlan,setUpgradePlan)}
              <p className="simnote" style={{marginTop:14}}>{t("Paiement sécurisé via Stripe.")}</p>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setAdhesion(false)}>{t("Annuler")}</button>
                <button className="btn block" onClick={()=>upgradeTo(upgradePlan,upgradeBilling)}>{t("Continuer vers le paiement")}</button>
              </div>
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
                <div><h3 className="disp">{t("Publier une actualité")}</h3>
                  <p className="mi">{t("Elle apparaîtra sur le fil commun au nom de")} {me.name}.</p></div>
              </div>
              <div className="field"><label>{t("Titre")}</label>
                <input value={postForm.title} onChange={(e)=>setPostForm({...postForm,title:e.target.value})} placeholder="ex : Nous recrutons un développeur"/></div>
              <div className="field"><label>{t("Catégorie")}</label>
                <input value={postForm.tag} onChange={(e)=>setPostForm({...postForm,tag:e.target.value})} placeholder="Offre, Recrutement, Certification…"/></div>
              <div className="field"><label>{t("Message")}</label>
                <textarea rows={4} value={postForm.body} onChange={(e)=>setPostForm({...postForm,body:e.target.value})} placeholder={t("Votre actualité en quelques lignes.")}/></div>
              <div className="field"><label>{t("Photo (facultative)")}</label>
                {postForm.photo?(
                  <div className="photopick">
                    <img src={postForm.photo} alt=""/>
                    <span className="rm" onClick={()=>setPostForm((f)=>({...f,photo:null}))}>{t("Retirer la photo")}</span>
                  </div>
                ):(
                  <label className="uplabel btn-ghost sm">{t("Ajouter une photo")}<input type="file" accept="image/*" onChange={onPhotoPick} style={{display:"none"}}/></label>
                )}
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setComposeOpen(false)}>{t("Annuler")}</button>
                <button className="btn block" onClick={publish}>{t("Publier")}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VISIO SETUP */}
      {visioSetup&&(()=>{
        const visioTarget=companies.find((c)=>c.id===visioCompanyId)||null;
        const targetSvcs=visioTarget?(isAdmin?[...new Set([...(me.services||[]),...(visioTarget.services||[])])]:[role,...(access.grants[role]||[])]):[];
        return (
        <>
          <div className="scrim" onClick={()=>setVisioSetup(false)}/>
          <div className="modal" onClick={()=>setVisioSetup(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{visioTarget?`${t("Visio avec")} ${visioTarget.name}`:t("Nouvel événement")}</h3>
              {connected.length>1&&(
                <div className="field" style={{marginBottom:14}}>
                  <label>{t("Entreprise")}</label>
                  <select value={visioCompanyId||""} onChange={(e)=>{setVisioCompanyId(e.target.value||null);setVisioSvcs([]);}}>
                    <option value="">{t("Choisir une entreprise…")}</option>
                    {connected.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {visioTarget?(
                <>
                  <p className="mi" style={{marginBottom:14}}>{t("Choisissez un ou plusieurs services — vous pouvez inviter plusieurs services à la même visio.")}</p>
                  <div className="field"><label>{t("Services concernés")}</label>
                    <div className="svcwrap">
                      {targetSvcs.map((s)=>(
                        <button key={s} type="button" className={"svcchip"+(visioSvcs.includes(s)?" on":"")}
                          onClick={()=>setVisioSvcs((v)=>v.includes(s)?v.filter((x)=>x!==s):[...v,s])}>{t(s)}</button>
                      ))}
                    </div>
                    <div className="uphint">{isAdmin?(visioSvcs.length>1?`${t("Visio de groupe")} · ${visioSvcs.length} ${t("services")}`:t("Sélectionnez un ou plusieurs services")):`${t("En tant que")} ${t(role)}, ${t("vous ne pouvez lancer une visio que pour votre service.")}`}</div>
                  </div>
                  <button className="btn block" onClick={()=>startVisio(visioTarget,visioSvcs)} style={visioSvcs.length?{}:{opacity:.5,pointerEvents:"none"}}>{t("Démarrer la visio maintenant")}</button>
                  <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0",color:"var(--slate-soft)",fontSize:12}}><div style={{flex:1,height:1,background:"var(--line)"}}/>{t("ou planifier")}<div style={{flex:1,height:1,background:"var(--line)"}}/></div>
                  <div className="grid2">
                    <div className="field"><label>{t("Date")}</label><input type="date" value={schedForm.date} onChange={(e)=>setSchedForm({...schedForm,date:e.target.value})}/></div>
                    <div className="field"><label>{t("Heure")}</label><input type="time" value={schedForm.time} onChange={(e)=>setSchedForm({...schedForm,time:e.target.value})}/></div>
                  </div>
                  <button className="btn-ghost" style={{width:"100%",...(visioSvcs.length?{}:{opacity:.5,pointerEvents:"none"})}} onClick={()=>scheduleVisio(visioTarget)}>{t("Planifier la visio")}</button>
                  <p className="simnote">{t("Visio sécurisée, hébergée par notre prestataire Daily.co.")}</p>
                </>
              ):(
                <p className="mi">{t("Sélectionnez une entreprise connectée pour planifier un événement.")}</p>
              )}
            </div>
          </div>
        </>
        );
      })()}

      {/* ÉVÉNEMENT LIBRE */}
      {noteModalOpen&&(
        <>
          <div className="scrim" onClick={()=>setNoteModalOpen(false)}/>
          <div className="modal" onClick={()=>setNoteModalOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Nouvel événement")}</h3>
              <div className="field"><label>{t("Titre")}</label>
                <input value={noteForm.title} onChange={(e)=>setNoteForm({...noteForm,title:e.target.value})} placeholder={t("ex : Renouvellement du SIRET")} autoFocus/>
              </div>
              <div className="grid2">
                <div className="field"><label>{t("Date")}</label><input type="date" value={noteForm.date} onChange={(e)=>setNoteForm({...noteForm,date:e.target.value})}/></div>
                <div className="field"><label>{t("Heure (optionnel)")}</label><input type="time" value={noteForm.time} onChange={(e)=>setNoteForm({...noteForm,time:e.target.value})}/></div>
              </div>
              <div className="field"><label>{t("Note (optionnel)")}</label>
                <textarea rows={3} value={noteForm.note} onChange={(e)=>setNoteForm({...noteForm,note:e.target.value})}/>
              </div>
              <button className="btn block" disabled={noteBusy||!noteForm.title.trim()||!noteForm.date} style={noteBusy||!noteForm.title.trim()||!noteForm.date?{opacity:.5,pointerEvents:"none"}:{}} onClick={addGenericEvent}>{noteBusy?t("Un instant…"):t("Ajouter l'événement")}</button>
            </div>
          </div>
        </>
      )}

      {/* VISIO ROOM */}
      {visio&&(()=>{const c=companies.find((x)=>x.id===visio.companyId);if(!c)return null;return <VisioRoom me={me} company={c} services={visio.services} url={visio.url} onEnd={endVisio} lang={uiLang}/>;})()}

      {/* INVITATION VISIO ENTRANTE */}
      {incomingVisio&&!visio&&(
        <>
          <div className="scrim" onClick={()=>setIncomingVisio(null)}/>
          <div className="modal" onClick={()=>setIncomingVisio(null)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Visio entrante")}</h3>
              <p className="mi" style={{marginBottom:18}}><b>{incomingVisio.fromName}</b> {t("vous invite à une visio")} · {(incomingVisio.services||[]).map((s)=>t(s)).join(", ")}.</p>
              <button className="btn block" onClick={joinIncomingVisio}>{t("Rejoindre la visio")}</button>
              <div style={{textAlign:"center",marginTop:12}}><button className="linkbtn" onClick={()=>setIncomingVisio(null)}>{t("Ignorer")}</button></div>
            </div>
          </div>
        </>
      )}

      {/* CONFIRMATION RÔLE DIRECTION */}
      {directionConfirm&&(
        <>
          <div className="scrim" onClick={()=>setDirectionConfirm(null)}/>
          <div className="modal" onClick={()=>setDirectionConfirm(null)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Attention")}</h3>
              <p className="mi" style={{marginBottom:16}}>{directionConfirm.message}</p>
              <button className="btn block" onClick={()=>{directionConfirm.onConfirm();setDirectionConfirm(null);}}>{t("Confirmer")}</button>
              <div style={{textAlign:"center",marginTop:12}}><button className="linkbtn" onClick={()=>setDirectionConfirm(null)}>{t("Annuler")}</button></div>
            </div>
          </div>
        </>
      )}

      {/* RÔLE PERSONNALISÉ */}
      {customRolePrompt&&(
        <>
          <div className="scrim" onClick={()=>setCustomRolePrompt(null)}/>
          <div className="modal" onClick={()=>setCustomRolePrompt(null)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Préciser le service")}</h3>
              <p className="mi" style={{marginBottom:16}}>{t("Quel service pour")} {customRolePrompt.name} ?</p>
              <div className="field"><label>{t("Service")}</label>
                <input value={customRoleValue} onChange={(e)=>setCustomRoleValue(e.target.value)} placeholder="ex : Support client" onKeyDown={(e)=>e.key==="Enter"&&customRoleValue.trim()&&(()=>{
                  const r=customRoleValue.trim();const id=customRolePrompt.id;
                  setCustomRolePrompt(null);
                  if(r==="Direction")setDirectionConfirm({message:`Donner le rôle Direction à ${customRolePrompt.name} lui donnera aussi le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?`,onConfirm:()=>updateRole(id,r)});
                  else updateRole(id,r);
                })()}/></div>
              <button className="btn block" disabled={!customRoleValue.trim()} onClick={()=>{
                const r=customRoleValue.trim();const id=customRolePrompt.id;
                setCustomRolePrompt(null);
                if(r==="Direction")setDirectionConfirm({message:`Donner le rôle Direction à ${customRolePrompt.name} lui donnera aussi le contrôle total des droits d'accès et du cloisonnement de votre entreprise. Confirmer ?`,onConfirm:()=>updateRole(id,r)});
                else updateRole(id,r);
              }}>{t("Confirmer")}</button>
              <div style={{textAlign:"center",marginTop:12}}><button className="linkbtn" onClick={()=>setCustomRolePrompt(null)}>{t("Annuler")}</button></div>
            </div>
          </div>
        </>
      )}

      {/* ACTIVATION 2FA */}
      {mfaEnrollOpen&&(
        <>
          <div className="scrim" onClick={cancelMfaEnroll}/>
          <div className="modal" onClick={cancelMfaEnroll}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Activer la double authentification")}</h3>
              <p className="mi" style={{marginBottom:16}}>{t("Scannez ce code avec votre application d'authentification (Google Authenticator, Authy…), puis entrez le code à 6 chiffres généré.")}</p>
              {mfaQr&&<div style={{textAlign:"center",margin:"0 0 14px"}}><div style={{display:"inline-block"}} dangerouslySetInnerHTML={{__html:mfaQr}}/></div>}
              {mfaSecret&&<p style={{fontSize:12,color:"var(--slate)",textAlign:"center",wordBreak:"break-all",marginBottom:14}}>{t("Ou entrez la clé manuellement")} : <b>{mfaSecret}</b></p>}
              <div className="field"><label>{t("Code à 6 chiffres")}</label>
                <input value={mfaCode} onChange={(e)=>setMfaCode(e.target.value)} placeholder="123456" maxLength={6} onKeyDown={(e)=>e.key==="Enter"&&confirmMfaEnroll()}/></div>
              {mfaError&&<p style={{color:"var(--coral)",fontSize:13,margin:"0 0 12px"}}>{mfaError}</p>}
              <button className="btn block" disabled={mfaBusy||!mfaCode.trim()} onClick={confirmMfaEnroll}>{mfaBusy?t("Vérification…"):t("Confirmer et activer")}</button>
              <div style={{textAlign:"center",marginTop:12}}><button className="linkbtn" onClick={cancelMfaEnroll}>{t("Annuler")}</button></div>
            </div>
          </div>
        </>
      )}

      {/* LIMITE OFFRE GRATUITE */}
      {limitOpen&&(
        <>
          <div className="scrim" onClick={()=>setLimitOpen(false)}/>
          <div className="modal" onClick={()=>setLimitOpen(false)}>
            <div className="mbox" style={{width:"min(640px,100%)"}} onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Passez à la vitesse supérieure")}</h3>
              <p className="mi" style={{marginBottom:18}}>{t("L'offre Premier Maillon est limitée à 5 démarchages, non renouvelables")}{remaining()===0?` — ${t("vous les avez tous utilisés")}`:""}. {t("Pour continuer à démarcher, passez à une offre payante (démarchages illimités).")}</p>
              {renderPlanTable(PLANS.filter((pl)=>pl.id!=="gratuit"),upgradeBilling,setUpgradeBilling,upgradePlan,setUpgradePlan)}
              <p className="simnote" style={{marginTop:14}}>{t("Paiement sécurisé via Stripe.")}</p>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setLimitOpen(false)}>{t("Annuler")}</button>
                <button className="btn block" onClick={()=>upgradeTo(upgradePlan,upgradeBilling)}>{t("Continuer vers le paiement")}</button>
              </div>
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
              <h3 className="disp">{t("Publier un besoin")}</h3>
              <p className="mi" style={{marginBottom:16}}>{t("Décrivez ce que vous cherchez. Les entreprises concernées pourront vous proposer leurs services.")}</p>
              <div className="field"><label>{t("Votre besoin")}</label>
                <textarea rows={3} value={needForm.title} onChange={(e)=>setNeedForm({...needForm,title:e.target.value})} placeholder="ex : Nous cherchons un prestataire logistique en Bretagne"/></div>
              <div className="grid2">
                <div className="field"><label>{t("Secteur recherché")}</label>
                  <select value={needForm.sought} onChange={(e)=>setNeedForm({...needForm,sought:e.target.value})}>{SECTORS.map((s)=><option key={s}>{s}</option>)}</select></div>
                <div className="field"><label>{t("Localisation")}</label>
                  <input value={needForm.loc} onChange={(e)=>setNeedForm({...needForm,loc:e.target.value})} placeholder={me.loc}/></div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setNeedOpen(false)}>{t("Annuler")}</button>
                <button className="btn block" onClick={publishNeed}>{t("Publier")}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* INVITER UNE ENTREPRISE */}
      {inviteCoOpen&&(
        <>
          <div className="scrim" onClick={()=>setInviteCoOpen(false)}/>
          <div className="modal" onClick={()=>setInviteCoOpen(false)}>
            <div className="mbox" onClick={(e)=>e.stopPropagation()}>
              <h3 className="disp">{t("Inviter une entreprise")}</h3>
              <p className="mi" style={{marginBottom:16}}>{t("Un lien d'invitation personnel est créé — l'entreprise qui l'utilise pour s'inscrire vous fait gagner 1 mois offert.")}</p>
              <div className="field"><label>{t("Nom de l'entreprise")} <span style={{textTransform:"none",letterSpacing:0}}>({t("optionnel")})</span></label>
                <input value={inviteCoForm.name} onChange={(e)=>setInviteCoForm({...inviteCoForm,name:e.target.value})} placeholder="ex : Studio Kavan"/></div>
              <div className="field"><label>{t("Email")}</label>
                <input type="email" value={inviteCoForm.email} onChange={(e)=>setInviteCoForm({...inviteCoForm,email:e.target.value})} placeholder="contact@entreprise.fr" onKeyDown={(e)=>e.key==="Enter"&&sendCompanyInvite()}/></div>
              <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
                <button className="btn-ghost" onClick={()=>setInviteCoOpen(false)}>{t("Annuler")}</button>
                <button className="btn-ghost" style={{flex:1}} disabled={inviteCoBusy||!inviteCoForm.email.trim()} onClick={copyReferralLink}>{t("Copier le lien")}</button>
                <button className="btn" style={{flex:1}} disabled={inviteCoBusy||!inviteCoForm.email.trim()} onClick={sendCompanyInvite}>{inviteCoBusy?t("Un instant…"):t("Envoyer l'invitation")}</button>
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
              <h3 className="disp">{collab==="quote"?t("Demander un devis"):t("Partager un document")}</h3>
              <p className="mi" style={{marginBottom:16}}>{t("Service")} {t(mSvc)} · {active.name}.</p>
              {collab==="quote"?(
                <>
                  <div className="field"><label>{t("Objet de la demande")}</label><input value={collabForm.subject} onChange={(e)=>setCollabForm({...collabForm,subject:e.target.value})} placeholder="ex : Refonte de notre site e-commerce"/></div>
                  <div className="field"><label>{t("Budget indicatif (optionnel)")}</label><input value={collabForm.budget} onChange={(e)=>setCollabForm({...collabForm,budget:e.target.value})} placeholder="ex : 5 000 – 8 000 €"/></div>
                </>
              ):(
                <div className="field">
                  <label>{t("Document")}</label>
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e)=>setCollabFile((e.target.files&&e.target.files[0])||null)}/>
                  {collabFile&&<div className="uphint">{collabFile.name} · {(collabFile.size/1024).toFixed(0)} Ko</div>}
                  <div className="uphint">{t("4 Mo maximum pour l'instant.")}</div>
                </div>
              )}
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setCollab(null)}>{t("Annuler")}</button>
                <button className="btn block" disabled={collabBusy||(collab==="doc"&&!collabFile)} style={collabBusy||(collab==="doc"&&!collabFile)?{opacity:.5,pointerEvents:"none"}:{}} onClick={postCollab}>{collabBusy?t("Un instant…"):collab==="quote"?t("Envoyer la demande"):t("Partager")}</button>
              </div>
              <p className="simnote">{t("Envoyé directement à")} {active.name}.</p>
            </div>
          </div>
        </>
      )}

      <div className="toasts">
        {toasts.map((ts)=><div key={ts.id} className="toast">{ts.t.startsWith("✓")?<span className="tk"><Check/></span>:null}{ts.t.replace("✓ ","")}</div>)}
      </div>

      <div className="foot">© {new Date().getFullYear()} <b>Maillon</b> — <a href="/mentions-legales">{t("Mentions légales")}</a> · <a href="/cgu-cgv">{t("CGU/CGV")}</a> · <a href="/confidentialite">{t("Confidentialité")}</a></div>
    </div>
  );
}
