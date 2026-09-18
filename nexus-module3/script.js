const desktopArea=document.getElementById("desktopArea");
const launcher=document.getElementById("launcher");
const nexusButton=document.getElementById("nexusButton");
const contextMenu=document.getElementById("contextMenu");
const appSearch=document.getElementById("appSearch");
const appWindow=document.getElementById("appWindow");
const windowTitle=document.getElementById("windowTitle");
const windowBody=document.getElementById("windowBody");
const closeWindow=document.getElementById("closeWindow");

let selectedIcon=null, drag=null, shortcutCount=0;

const appContent={
 Files:`<h2>Files</h2><p style="margin-top:8px;color:#8f9098">Folders</p><div class="fake-grid"><div class="fake-file"><b>📁</b>Documents</div><div class="fake-file"><b>📁</b>Downloads</div><div class="fake-file"><b>📁</b>Pictures</div><div class="fake-file"><b>📁</b>Projects</div></div>`,
 Notepad:`<h2>Notepad</h2><div style="margin-top:20px;padding:18px;border:1px solid #fff1;border-radius:12px;background:#fff1;line-height:1.9">Project Ideas<br>• Improve UI animations<br>• Add more system apps<br>• Make it responsive</div>`,
 Browser:`<h2>Browser</h2><p style="margin-top:12px;color:#92939b">Nexus Browser is ready.</p>`,
 Settings:`<h2>Settings</h2><p style="margin-top:12px;color:#92939b">Appearance · Wallpaper · Notifications · Privacy · Storage</p>`,
 Calculator:`<h2>Calculator</h2><div style="margin-top:20px;padding:20px;border:1px solid #fff1;border-radius:12px;background:#fff1;font-size:30px;text-align:right">0</div>`,
 "Task Manager":`<h2>Task Manager</h2><p style="margin:10px 0;color:#92939b">Running applications</p><div style="display:grid;gap:7px"><div style="padding:10px;background:#fff1;border-radius:8px">Desktop Shell <span style="float:right">12%</span></div><div style="padding:10px;background:#fff1;border-radius:8px">Browser <span style="float:right">8%</span></div><div style="padding:10px;background:#fff1;border-radius:8px">Terminal <span style="float:right">3%</span></div></div>`,
 Terminal:`<h2>Terminal</h2><p style="margin-top:12px;color:#8fe19b;font-family:monospace">nexus@desktop:~$ _</p>`,
 "project.html":`<h2>project.html</h2><p style="margin-top:12px;color:#92939b">Recent file opened from the Nexus launcher.</p>`,
 Trash:`<h2>Trash</h2><p style="margin-top:12px;color:#92939b">Trash is empty.</p>`
};

function updateClock(){
 const n=new Date();
 const t=n.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
 const d=n.toLocaleDateString([], {weekday:"short",day:"2-digit",month:"short"});
 document.getElementById("topClock").textContent=t;
 document.getElementById("taskClock").innerHTML=t+"<br><small>"+d+"</small>";
}
setInterval(updateClock,1000);updateClock();

function buildCalendar(){
 const box=document.getElementById("calendarDays"),n=new Date(),y=n.getFullYear(),m=n.getMonth();
 document.getElementById("calendarMonth").textContent=n.toLocaleDateString([], {month:"long",year:"numeric"});
 const first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate();
 box.innerHTML="";
 for(let i=0;i<first;i++)box.insertAdjacentHTML("beforeend","<span></span>");
 for(let d=1;d<=total;d++)box.insertAdjacentHTML("beforeend",`<span class="${d===n.getDate()?"today":""}">${d}</span>`);
}
buildCalendar();

function selectIcon(el){document.querySelectorAll(".desktop-icon").forEach(x=>x.classList.remove("selected"));selectedIcon=el;el.classList.add("selected")}
function closeContext(){contextMenu.classList.remove("open")}

function wireIcon(icon){
 icon.addEventListener("click",e=>{e.stopPropagation();selectIcon(icon)});
 icon.addEventListener("dblclick",e=>{e.stopPropagation();openApp(icon.dataset.app)});
 icon.addEventListener("contextmenu",e=>{
   e.preventDefault();e.stopPropagation();selectIcon(icon);
   contextMenu.style.left=Math.min(e.clientX,innerWidth-195)+"px";
   contextMenu.style.top=Math.min(e.clientY,innerHeight-180)+"px";
   contextMenu.classList.add("open");
 });
 icon.addEventListener("pointerdown",startDrag);
}

function startDrag(e){
 if(e.button!==0)return;
 const icon=e.currentTarget;
 selectIcon(icon);
 const area=desktopArea.getBoundingClientRect();
 const ir=icon.getBoundingClientRect();
 drag={icon,startX:e.clientX,startY:e.clientY,baseLeft:ir.left-area.left,baseTop:ir.top-area.top,area};
 icon.setPointerCapture(e.pointerId);
 icon.style.zIndex=20;
 icon.style.cursor="grabbing";
 icon.addEventListener("pointermove",moveDrag);
 icon.addEventListener("pointerup",endDrag,{once:true});
 icon.addEventListener("pointercancel",endDrag,{once:true});
}
function moveDrag(e){
 if(!drag)return;
 const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
 const maxX=drag.area.width-drag.icon.offsetWidth-4,maxY=drag.area.height-drag.icon.offsetHeight-4;
 drag.icon.style.left=Math.max(4,Math.min(maxX,drag.baseLeft+dx))+"px";
 drag.icon.style.top=Math.max(4,Math.min(maxY,drag.baseTop+dy))+"px";
}
function endDrag(){
 if(!drag)return;
 drag.icon.style.cursor="default";drag.icon.style.zIndex="";
 drag.icon.removeEventListener("pointermove",moveDrag);drag=null;
}

document.querySelectorAll(".desktop-icon").forEach(wireIcon);

contextMenu.addEventListener("click",e=>{
 const action=e.target.dataset.action;
 if(!action||!selectedIcon)return;
 if(action==="open")openApp(selectedIcon.dataset.app);
 if(action==="rename"){
   const label=selectedIcon.querySelector(":scope > span:last-child");
   const old=label.textContent;
   const name=prompt("Rename item:",old);
   if(name&&name.trim())label.textContent=name.trim();
 }
 if(action==="delete"){
   if(confirm('Delete "'+selectedIcon.querySelector(":scope > span:last-child").textContent+'"?')){
     selectedIcon.remove();selectedIcon=null;
   }
 }
 if(action==="shortcut"){
   const copy=selectedIcon.cloneNode(true);
   shortcutCount++;
   copy.dataset.shortcut="true";
   copy.style.left=Math.min(parseInt(selectedIcon.style.left||"28")+100,desktopArea.clientWidth-95)+"px";
   copy.style.top=Math.min(parseInt(selectedIcon.style.top||"58")+25,desktopArea.clientHeight-95)+"px";
   copy.querySelector(":scope > span:last-child").textContent=selectedIcon.querySelector(":scope > span:last-child").textContent+" shortcut";
   const art=copy.querySelector(".desktop-art");
   art.insertAdjacentHTML("beforeend",'<span class="shortcut-badge">↗</span>');
   desktopArea.appendChild(copy);wireIcon(copy);
 }
 closeContext();
});

function openApp(app){
 launcher.classList.remove("open");
 appWindow.classList.add("open");
 windowTitle.textContent=app;
 windowBody.innerHTML=appContent[app]||`<h2>${app}</h2><p style="margin-top:12px;color:#92939b">Application opened.</p>`;
 document.querySelectorAll(".dock-app").forEach(x=>x.classList.toggle("running",x.dataset.app===app));
}
nexusButton.addEventListener("click",e=>{
 e.stopPropagation();launcher.classList.toggle("open");closeContext();
 if(launcher.classList.contains("open"))setTimeout(()=>appSearch.focus(),80);
});
document.querySelectorAll(".launcher-app,.recent,.dock-app").forEach(x=>x.addEventListener("click",e=>{e.stopPropagation();openApp(x.dataset.app)}));
closeWindow.addEventListener("click",()=>{appWindow.classList.remove("open");document.querySelectorAll(".dock-app").forEach(x=>x.classList.remove("running"))});
appSearch.addEventListener("input",()=>{
 const q=appSearch.value.toLowerCase().trim();
 document.querySelectorAll(".launcher-app").forEach(x=>x.style.display=x.dataset.app.toLowerCase().includes(q)?"flex":"none");
});
document.addEventListener("click",e=>{
 if(!launcher.contains(e.target)&&e.target!==nexusButton)launcher.classList.remove("open");
 if(!contextMenu.contains(e.target))closeContext();
 if(!e.target.closest(".desktop-icon"))document.querySelectorAll(".desktop-icon").forEach(x=>x.classList.remove("selected"));
});
