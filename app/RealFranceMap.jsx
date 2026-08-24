"use client";
import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CITIES = {
  "Rennes":[48.11,-1.68], "Nantes":[47.22,-1.55], "Lille":[50.63,3.06], "Paris":[48.86,2.35],
  "Bordeaux":[44.84,-0.58], "Lyon":[45.76,4.84], "Clermont-Ferrand":[45.78,3.08], "Marseille":[43.30,5.37],
  "Toulouse":[43.60,1.44], "Strasbourg":[48.57,7.75], "Nice":[43.70,7.27], "Montpellier":[43.61,3.88],
  "Grenoble":[45.19,5.72], "Angers":[47.47,-0.55],
};

export default function RealFranceMap({companies,onOpen,onProspect,aff}){
  const points=useMemo(()=>{
    const byCity={};
    companies.forEach((c)=>{if(CITIES[c.loc])(byCity[c.loc]=byCity[c.loc]||[]).push(c);});
    const out=[];
    Object.keys(byCity).forEach((city)=>{
      const grp=byCity[city];const[lat,lng]=CITIES[city];
      grp.forEach((c,i)=>{
        let dlat=0,dlng=0;
        if(grp.length>1){const a=(i/grp.length)*2*Math.PI;dlat=Math.cos(a)*0.035;dlng=Math.sin(a)*0.05;}
        out.push({c,lat:lat+dlat,lng:lng+dlng});
      });
    });
    return out;
  },[companies]);

  return(
    <MapContainer center={[46.6,2.4]} zoom={6} minZoom={5} maxZoom={13} style={{width:"100%",height:"100%",borderRadius:16}} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map(({c,lat,lng})=>(
        <CircleMarker key={c.id} center={[lat,lng]} radius={9} pathOptions={{color:"#fff",weight:2,fillColor:c.color||"#0F846B",fillOpacity:0.92}}>
          <Popup>
            <div style={{minWidth:180}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:28,height:28,borderRadius:8,background:c.color||"#0F846B",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,overflow:"hidden",flex:"0 0 auto"}}>
                  {c.logo?<img src={c.logo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:c.name[0]}
                </div>
                <div style={{minWidth:0}}>
                  <b style={{fontSize:13}}>{c.name}</b>
                  <div style={{fontSize:11.5,color:"#5C6672"}}>{c.sector} · {c.loc}</div>
                </div>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:"#0F846B",marginBottom:8}}>{aff(c)}% d'affinité</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button className="btn sm" onClick={()=>onOpen(c.id)}>Voir la fiche</button>
                {c.rel==="none"&&<button className="btn-ghost sm" onClick={()=>onProspect(c)}>Démarcher</button>}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
