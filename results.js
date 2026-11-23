// ILM published-results portal with professional DMC and PDF download.
(function () {
  "use strict";
  const API_URL = "https://script.google.com/macros/s/AKfycbwGvXpTiN2DBwio0NdnSqAgQBdG1SFV3ISkrFet-mO86UUPUXIyfC1AlmrOdxPGaviF/exec";
  const CALLBACK = "ilmResultCallback";
  const form = document.getElementById("resultLookup");
  const message = document.getElementById("resultMessage");
  const output = document.getElementById("resultOutput");
  if (!form || !message || !output) return;

  const val = (r, keys) => {
    for (const k of keys) if (r[k] != null && String(r[k]).trim()) return String(r[k]).trim();
    return "—";
  };
  function showMessage(text, type) {
    message.textContent = text;
    message.className = "form-message " + (type || "");
    message.style.display = "block";
  }
  function downloadDMC(r) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showMessage("PDF service did not load. Refresh the page and try again.", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const d = new jsPDF({ unit:"mm", format:"a4" });
    const navy=[12,43,76], gold=[185,151,79], grey=[104,119,134];
    const student=val(r,["Student Name","Student Full Name","studentName"]);
    const app=val(r,["Application ID","applicationId"]);
    const rows=[
      ["Student Name",student],["Application ID",app],
      ["Class",val(r,["Class","Current Class","Grade"])],
      ["Programme",val(r,["Programme","program"])],
      ["Total Marks",val(r,["Total Marks","Maximum Marks"])],
      ["Marks Obtained",val(r,["Obtained Marks","Marks Obtained"])],
      ["Percentage",val(r,["Percentage","Result Percentage"])],
      ["Position",val(r,["Position","Rank"])],
      ["Result Status",val(r,["Result Status","Remarks","Result"])],
      ["Result Date",val(r,["Result Date","Submitted On","submitteddate","Date"])]
    ];
    d.setFillColor(...navy); d.rect(0,0,210,43,"F");
    d.setFillColor(...gold); d.rect(0,43,210,2,"F");
    d.setTextColor(255,255,255); d.setFont("helvetica","bold");
    d.setFontSize(20); d.text("ILM",18,18);
    d.setFontSize(11); d.text("THE CONTEST CENTER",18,26);
    d.setFont("helvetica","normal"); d.setFontSize(8);
    d.text("OFFICIAL STUDENT ACADEMIC RECORD",18,34);
    d.setFont("helvetica","bold"); d.setFontSize(14);
    d.text("DETAILED MARKS CERTIFICATE",192,21,{align:"right"});
    d.setFont("helvetica","normal"); d.setFontSize(8);
    d.text("PUBLISHED RESULT",192,30,{align:"right"});
    d.setTextColor(...navy); d.setFont("helvetica","bold"); d.setFontSize(10);
    d.text("STUDENT RESULT DETAILS",18,58);
    let y=66;
    rows.forEach((row,i)=>{
      if(i%2===0){d.setFillColor(244,247,250);d.rect(18,y-5,174,13,"F");}
      d.setFont("helvetica","bold");d.setFontSize(8);d.setTextColor(...grey);
      d.text(row[0].toUpperCase(),24,y+3);
      d.setFont("helvetica","normal");d.setFontSize(10);d.setTextColor(39,54,71);
      const valueLines=d.splitTextToSize(row[1],100);
      d.text(valueLines,94,y+3);
      y+=13;
    });
    d.setDrawColor(220,226,233);d.line(18,260,192,260);
    d.setFont("helvetica","bold");d.setFontSize(8);d.setTextColor(...navy);
    d.text("ILM THE CONTEST CENTER",18,269);
    d.setFont("helvetica","normal");d.setFontSize(7);d.setTextColor(...grey);
    d.text("This DMC reflects the result published by ILM The Contest Center.",18,275);
    d.text("Verification: ilmthecontestcenter@gmail.com",18,281);
    d.text("Computer-generated DMC",192,275,{align:"right"});
    d.save("ILM_DMC_"+String(app).replace(/[^a-z0-9_-]/gi,"_")+".pdf");
  }
  function makeRow(parent,label,value) {
    if(value==="—") return;
    const row=document.createElement("div");
    row.style.cssText="display:flex;justify-content:space-between;gap:16px;padding:11px 2px;border-bottom:1px solid #e9eef3;flex-wrap:wrap;";
    const l=document.createElement("span");l.textContent=label;
    l.style.cssText="font-size:12px;color:#718096;font-weight:600;";
    const v=document.createElement("strong");v.textContent=value;
    v.style.cssText="font-size:13px;color:#183653;text-align:right;";
    row.append(l,v);parent.appendChild(row);
  }
  function renderResult(r) {
    const card=document.createElement("article");
    card.style.cssText="max-width:760px;margin:24px auto;background:#fff;border:1px solid #dce5ed;border-radius:12px;overflow:hidden;box-shadow:0 12px 34px rgba(12,43,76,.09);";
    const head=document.createElement("div");
    head.style.cssText="padding:23px 26px;background:#0c2b4c;border-bottom:3px solid #b9974f;color:#fff;";
    const brand=document.createElement("div");brand.textContent="ILM THE CONTEST CENTER";
    brand.style.cssText="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#e5ca85;";
    const title=document.createElement("h3");title.textContent="DETAILED MARKS CERTIFICATE";
    title.style.cssText="margin:9px 0 4px;color:#fff;font-size:21px;";
    const sub=document.createElement("p");sub.textContent="OFFICIAL PUBLISHED STUDENT RESULT";
    sub.style.cssText="margin:0;color:#dce6f0;font-size:10px;letter-spacing:1px;";
    head.append(brand,title,sub);
    const body=document.createElement("div");body.style.cssText="padding:20px 26px;";
    const info=document.createElement("h4");info.textContent="STUDENT INFORMATION";
    info.style.cssText="margin:0 0 6px;color:#0c2b4c;font-size:12px;letter-spacing:.7px;";
    body.appendChild(info);
    makeRow(body,"Student Name",val(r,["Student Name","Student Full Name","studentName"]));
    makeRow(body,"Application ID",val(r,["Application ID","applicationId"]));
    makeRow(body,"Class",val(r,["Class","Current Class","Grade"]));
    makeRow(body,"Programme",val(r,["Programme","program"]));
    const section=document.createElement("h4");section.textContent="ACADEMIC PERFORMANCE";
    section.style.cssText="margin:22px 0 6px;color:#0c2b4c;font-size:12px;letter-spacing:.7px;";
    body.appendChild(section);
    makeRow(body,"Total Marks",val(r,["Total Marks","Maximum Marks"]));
    makeRow(body,"Marks Obtained",val(r,["Obtained Marks","Marks Obtained"]));
    makeRow(body,"Percentage",val(r,["Percentage","Result Percentage"]));
    makeRow(body,"Position",val(r,["Position","Rank"]));
    const status=document.createElement("div");
    status.style.cssText="margin-top:18px;padding:14px 16px;background:#faf8f2;border-left:3px solid #b9974f;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;";
    const label=document.createElement("strong");label.textContent="FINAL RESULT";label.style.cssText="font-size:11px;color:#80652e;";
    const value=document.createElement("strong");value.textContent=val(r,["Result Status","Remarks","Result"]);value.style.cssText="font-size:13px;color:#0c2b4c;";
    status.append(label,value);body.appendChild(status);
    const foot=document.createElement("div");foot.style.cssText="padding:13px 26px;background:#f7f9fb;border-top:1px solid #e6ebf0;color:#657589;font-size:10px;line-height:1.6;";
    foot.textContent="This DMC reflects the result published by ILM The Contest Center. For verification: ilmthecontestcenter@gmail.com";
    const actions=document.createElement("div");actions.style.cssText="padding:0 26px 22px;background:#f7f9fb;";
    const pdf=document.createElement("button");pdf.type="button";pdf.className="btn btn-blue";pdf.textContent="Download DMC PDF";
    pdf.style.cssText="background:#b18e49;border-color:#b18e49;";
    pdf.addEventListener("click",()=>downloadDMC(r));actions.appendChild(pdf);
    card.append(head,body,foot,actions);output.appendChild(card);
  }
  function requestResult(applicationId) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");let finished=false;
      const timeout=window.setTimeout(()=>finish(new Error("The results service did not respond. Please try again later.")),20000);
      function finish(error,data){
        if(finished)return;finished=true;window.clearTimeout(timeout);delete window[CALLBACK];script.remove();
        if(error)reject(error);else resolve(data);
      }
      window[CALLBACK]=data=>finish(null,data);
      script.onerror=()=>finish(new Error("Could not load results. Please try again later."));
      const url=new URL(API_URL);url.searchParams.set("applicationId",applicationId);
      url.searchParams.set("prefix",CALLBACK);url.searchParams.set("_",String(Date.now()));
      script.src=url.toString();document.head.appendChild(script);
    });
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();output.replaceChildren();
    const input=document.getElementById("applicationId");
    const button=document.getElementById("resultButton");
    const applicationId=input.value.trim().toUpperCase();
    if(!applicationId){showMessage("Please enter your Application ID.","error");return;}
    button.disabled=true;showMessage("Searching published results...");
    try{
      const response=await requestResult(applicationId);
      if(!response||response.success!==true)throw new Error((response&&response.message)||"Unable to retrieve the result.");
      const records=Array.isArray(response.results)?response.results:[];
      if(!records.length)showMessage("No published result was found. Check your Application ID or contact ILM.","");
      else{records.forEach(renderResult);showMessage(records.length+(records.length===1?" published result found.":" published results found."),"success");}
    }catch(error){showMessage(error.message||"Result search failed. Please contact ILM.","error");}
    finally{button.disabled=false;}
  });
})();