import { chromium } from "playwright-core"; import { PrismaClient } from "@prisma/client"; import { randomBytes } from "node:crypto"; import fs from "node:fs";
const p=new PrismaClient(); const B="http://localhost:3002"; const R=[]; const ok=(n,c,d="")=>{R.push(`${c?"PASS":"FAIL"} ${n}${c?"":" :: "+d}`); console.log(R.at(-1));};
const fanny=await p.proofItem.findFirst({where:{frontPath:{not:null},backPath:{not:null}},select:{frontPath:true,backPath:true}});
const c=await p.client.create({data:{name:"Files Test",email:"files-test@example.com"}});
const pr=await p.project.create({data:{title:"Files Test job",clientId:c.id,stage:"QUOTED"}});
const q=await p.invoice.create({data:{number:"Q-FT1",type:"QUOTE",status:"SENT",projectId:pr.id,clientId:c.id,taxRate:0,validUntil:new Date(Date.now()+5*864e5),items:{create:[{description:"Test cards",quantity:1,unitPrice:10,position:0}]}}});
const proof=await p.proof.create({data:{token:randomBytes(16).toString("hex"),projectId:pr.id,title:"Files Test proofs",widthIn:2.75,heightIn:4.75,items:{create:[{key:"01",position:0,frontPath:fanny.frontPath,backPath:fanny.backPath}]}}});
fs.writeFileSync("C:/Users/skulb/AppData/Local/Temp/claude/C--Users-skulb/9fc46f46-3737-44dc-a2be-896c405945c8/scratchpad/kw-test-upload.txt","Kulworks upload test, safe to delete.\n");
const b=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const ctx=await b.newContext({viewport:{width:390,height:844},userAgent:"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KulworksAudit"});
await ctx.route("**/api/track/**", r=>r.fulfill({status:200,body:"{}"})); // no fake "client opened" alerts
const pg=await ctx.newPage(); const errs=[]; pg.on("pageerror",e=>errs.push(e.message)); pg.on("console",m=>{ if(m.type()==="error") errs.push(m.text()); });
let folderId=null;
try{
  await pg.goto(`${B}/invoice/${q.token}/`,{waitUntil:"load"});
  const btn=pg.getByRole("button",{name:/Looks good/});
  await btn.click(); await pg.waitForTimeout(300);
  const pending=await pg.getByText("Setting up your upload folder...").count(); ok("button shows the wait text",pending>0);
  await pg.getByText("Send your files").waitFor({timeout:30000}); ok("upload box appears after accepting",true);
  const proj=await p.project.findUnique({where:{id:pr.id}}); folderId=proj.driveFolderId; ok("folder saved on the project",!!proj.driveFolderId&&!!proj.driveFolderUrl,JSON.stringify(proj.driveFolderUrl));
  ok("Drive link on the page", await pg.locator(`a[href="${proj.driveFolderUrl}"]`).count()>0);
  await pg.locator('input[type=file]').setInputFiles("C:/Users/skulb/AppData/Local/Temp/claude/C--Users-skulb/9fc46f46-3737-44dc-a2be-896c405945c8/scratchpad/kw-test-upload.txt");
  await pg.getByText(/Got it|didn't upload/).waitFor({timeout:60000});
  const t=await pg.locator("[role=status]").innerText(); ok("upload finished",/Got it/.test(t),t);
  const note=await p.activity.findFirst({where:{projectId:pr.id,body:{contains:"uploaded 1 file"}}}); ok("upload noted on the project",!!note);
  // proof flip spin
  await pg.goto(`${B}/proof/${proof.token}/`,{waitUntil:"load"}); await pg.waitForTimeout(800);
  ok("payment box absent when nothing billed", await pg.getByText("Payment",{exact:true}).count()===0);
  ok("proof links back to quote", await pg.getByText(/View your quote \(Q-FT1\)/).count()>0);
  await pg.locator("main button, button").filter({has:pg.locator("img")}).first().click(); await pg.waitForTimeout(600);
  const card=pg.locator("div.cursor-crosshair").first();
  await pg.getByRole("button",{name:/Flip to back/}).click(); await pg.waitForTimeout(90);
  const mid=await card.evaluate(e=>getComputedStyle(e).transform); await pg.waitForTimeout(700);
  const end=await card.evaluate(e=>getComputedStyle(e).transform);
  const label=await pg.getByText(/^Back ·/).count();
  ok("card turns mid-flip",mid!=="none"&&mid!=="matrix(1, 0, 0, 1, 0, 0)",mid); ok("card ends flat on the back",label>0&&(end==="none"||/matrix3d\(1, 0, 0, 0, 0, 1/.test(end)||end==="matrix(1, 0, 0, 1, 0, 0)"),end);
  ok("no page errors",errs.length===0,errs.slice(0,3).join(" | "));
}finally{
  await b.close();
  console.log("FOLDER", folderId);
  await p.notification.deleteMany({where:{OR:[{projectId:pr.id},{clientId:c.id}]}}); await p.activity.deleteMany({where:{OR:[{projectId:pr.id},{clientId:c.id}]}});
  await p.proofItem.deleteMany({where:{proofId:proof.id}}); await p.proof.delete({where:{id:proof.id}});
  await p.invoiceItem.deleteMany({where:{invoiceId:q.id}}); await p.invoice.delete({where:{id:q.id}});
  await p.project.delete({where:{id:pr.id}}); await p.client.delete({where:{id:c.id}}); await p.$disconnect();
}
