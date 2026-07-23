import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { writeFileSync } from "node:fs";
import { construirPrompt } from "./lib/ai/prompts";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { inyectarLogo } from "./lib/maquetas/marca";
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const NS="landing";
async function estr<T=any>(o:any):Promise<T|null>{const ac=new AbortController();let cap:any=null;
  const t=tool(o.toolName,"x",o.shape,async(i:any)=>{cap=i;ac.abort();return{content:[{type:"text" as const,text:"ok"}]};});
  const s=createSdkMcpServer({name:NS,version:"1.0.0",tools:[t]});
  const allow=[`mcp__${NS}__${o.toolName}`];const dis=["Bash","Read","Write","Edit","WebFetch","Glob","Grep","TodoWrite","Task"];
  if(o.web)allow.push("WebSearch");else dis.push("WebSearch");
  const q=query({prompt:o.user,options:{model:o.model,maxTurns:o.web?16:3,permissionMode:"bypassPermissions",mcpServers:{[NS]:s},allowedTools:allow,disallowedTools:dis,systemPrompt:o.system,settingSources:[],abortController:ac} as any});
  for await(const _ of q as any){if(cap)break;} return cap;}
async function fetchLogo(url:string){try{const r=await fetch(url,{redirect:"follow"});if(!r.ok)return null;const tipo=(r.headers.get("content-type")??"").split(";")[0].trim();if(!/^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/.test(tipo))return null;const b=Buffer.from(await r.arrayBuffer());if(!b.length||b.length>120000)return null;return `data:${tipo};base64,${b.toString("base64")}`;}catch{return null;}}

const negocio="Ap Aesthetics Medicina Estética", ciudad="Puebla";
console.log("Reuniendo marca desde la web…");
const mw=await estr<any>({model:"claude-sonnet-5",web:true,toolName:"reportar_marca",
  system:"Investigas la marca de un negocio con WebSearch (Instagram, Facebook, Google Business). logoUrl=URL DIRECTA a imagen del logo/perfil (.png/.jpg/.webp) o null; colores=2-4 hex si los ves; eslogan=tagline/bio textual; NO inventes. Máx 3 búsquedas.",
  user:`Reúne la marca (logo, colores, eslogan) de: ${negocio} en ${ciudad} (México).`,
  shape:{logoUrl:z.string().nullable(),colores:z.array(z.string()),eslogan:z.string().nullable(),instagram:z.string().nullable(),facebook:z.string().nullable()}});
console.log("  logoUrl:",mw?.logoUrl||"—","\n  colores:",mw?.colores?.join(",")||"—","\n  eslogan:",mw?.eslogan||"—","\n  instagram:",mw?.instagram||"—");
let logo=mw?.logoUrl?await fetchLogo(mw.logoUrl):null;
console.log("  logo fetch:",logo?`OK (${logo.length} chars)`:"no se pudo traer imagen");
const e=esquemaDeTarea("maqueta");
const user=construirPrompt({tarea:"maqueta",contexto:{negocio,ciudad,rubro:"Medicina estética",sitioWeb:null,sitioTexto:null,mejoras:[],marca:{colores:mw?.colores||[],eslogan:mw?.eslogan||null,tieneLogo:Boolean(logo)}}});
console.log("Generando maqueta con marca…");
const maq=await estr<any>({model:"claude-opus-4-8",toolName:e.toolName,shape:e.shape,user,system:"Eres director de arte de Ai Landing Pro. Entrega SOLO invocando la tool."});
if(maq?.html){const html=inyectarLogo(maq.html,logo,negocio);writeFileSync("salida/mocks/ap-aesthetics-medicina-estetica.html",html);console.log(`✓ ${html.length} bytes · logo real: ${logo?"incrustado":"wordmark"} · eslogan: ${mw?.eslogan?"usado":"no"}`);}
