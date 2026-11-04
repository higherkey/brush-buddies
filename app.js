(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ANIMALS = {
    cat:{emoji:"🐱",name:"Kitty the Cat",voice:"meow",lines:["Ready, little superstar? Pick up your toothbrush!","Purr-fect brushing! Keep those little circles going.","You're doing paws-itively amazing!"]},
    bunny:{emoji:"🐰",name:"Bubbles the Bunny",voice:"squeak",lines:["Let's hop into brushing!","You're doing an egg-stra good job!","Hop, hop, hooray! Keep brushing!"]},
    koala:{emoji:"🐨",name:"Koko the Koala",voice:"koala",lines:["Let's have a koala-ty brushing adventure!","Slow and steady makes a shiny smile.","You're tree-mendous at brushing!"]},
    dog:{emoji:"🐶",name:"Scout the Puppy",voice:"woof",lines:["Ruff! Ready to brush?","You're a top dog at toothbrushing!","That's a pawsome smile in the making!"]},
    fox:{emoji:"🦊",name:"Finn the Fox",voice:"yip",lines:["Let's get clever about clean teeth!","Fantastic brushing, clever fox!","You're foxy and fantastic!"]},
    bear:{emoji:"🐻",name:"Benny the Bear",voice:"growl",lines:["A big bear hug before we brush!","You're doing a beary good job!","Gr-r-reat brushing!"]},
    panda:{emoji:"🐼",name:"Pippa the Panda",voice:"chirp",lines:["Let's roll into a brushing adventure!","Bamboo-zling how well you're doing!","You're un-bear-ably good at this!"]},
    penguin:{emoji:"🐧",name:"Pebble the Penguin",voice:"squeak",lines:["Waddle we waiting for? Let's brush!","You're one cool brushing buddy!","Ice job! Keep it up!"]},
    owl:{emoji:"🦉",name:"Ollie the Owl",voice:"hoot",lines:["Owl right! Time to brush!","You're wise to brush every day.","Whoo's got a sparkling smile? You do!"]},
    lion:{emoji:"🦁",name:"Leo the Lion",voice:"roar",lines:["Show me your mighty brushing roar!","You're the king or queen of clean teeth!","A ROAR-some job!"]},
    frog:{emoji:"🐸",name:"Freddie the Frog",voice:"ribbit",lines:["Let's leap into a clean smile!","Ribbit! You're doing great!","Hoppy brushing, little friend!"]},
    tiger:{emoji:"🐯",name:"Tilly the Tiger",voice:"growl",lines:["Ready to pounce on those germs?","You're doing grr-eat!","Those teeth are getting tiger-bright!"]},
    elephant:{emoji:"🐘",name:"Ellie the Elephant",voice:"trumpet",lines:["Let's have an ele-fantastic brushing!","You're doing a big, wonderful job!","A little trumpet for your shiny smile!"]},
    unicorn:{emoji:"🦄",name:"Star the Unicorn",voice:"magic",lines:["Let's make some brushing magic!","Your smile is getting more magical!","Sparkles, rainbows and clean teeth!"]}
  };
  const ZONES = [
    {name:"Top teeth",title:"First up: Top teeth!",icon:"🌸",tip:"Reach those top teeth with gentle little circles."},
    {name:"Bottom teeth",title:"Now: Bottom teeth!",icon:"🌷",tip:"Great work! Give those bottom teeth some love."},
    {name:"Front teeth",title:"Next: Front teeth!",icon:"😁",tip:"Brush the front, gently and carefully."},
    {name:"Tongue",title:"Last stop: Tongue!",icon:"👅",tip:"Almost there! Give your tongue a gentle brush."}
  ];
  const DEFAULTS = {theme:"random",duration:120,breakSeconds:3,animalSounds:true,uiSounds:true,animations:true,reducedMotion:false};
  const STORAGE_KEY = "brushBuddiesSettingsV1";
  const CIRCUMFERENCE = 2 * Math.PI * 99;
  const app = $("app"), dialog = $("settings-dialog"), form = $("settings-form");
  const controls = {theme:$("theme-select"),duration:$("duration-select"),breakSeconds:$("break-select"),animalSounds:$("animal-sounds"),uiSounds:$("ui-sounds"),animations:$("animations"),reducedMotion:$("reduced-motion")};
  let settings = loadSettings();
  let selectedTheme = settings.theme === "random" ? randomTheme() : settings.theme;
  let totalRemaining = settings.duration, segmentRemaining = 30, breakRemaining = 0, phase = "ready", pausedFrom = "running", interval = null, zoneIndex = 0, audioContext = null, lastSpokenLine = -1;
  // Camera processing is entirely local: frames are sampled into a tiny canvas and compared in memory.
  let cameraStream = null, motionVideo = $("motion-preview"), motionCanvas = document.createElement("canvas");
  let motionContext = motionCanvas.getContext("2d", {willReadFrequently:true}), previousFrame = null;
  let motionLoop = null, lastMotionAt = 0, motionActive = false, motionModeEnabled = false;
  const MOTION_SAMPLE_WIDTH = 64, MOTION_SAMPLE_HEIGHT = 48, MOTION_GRACE_MS = 1600;
  const MOTION_THRESHOLDS = {low:22, medium:14, high:9};

  function loadSettings(){
    try { return {...DEFAULTS,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}; }
    catch { return {...DEFAULTS}; }
  }
  function saveSettings(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}}
  function randomTheme(){
    const keys=Object.keys(ANIMALS);return keys[Math.floor(Math.random()*keys.length)];
  }
  function formatTime(seconds){return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");}
  function buddy(){return ANIMALS[selectedTheme];}
  function applyTheme(){
    const animal=buddy();app.dataset.theme=selectedTheme;
    $("buddy-emoji").textContent=animal.emoji;$("buddy-name").textContent=animal.name;
    $("buddy").setAttribute("aria-label",animal.name);
    app.classList.toggle("animations-on",settings.animations);
    app.classList.toggle("reduced-motion",settings.reducedMotion);
    if(settings.reducedMotion||!settings.animations)$("buddy").classList.remove("is-dancing");
    else if(motionActive)$("buddy").classList.add("is-dancing");
    document.querySelector('meta[name="theme-color"]').content=getComputedStyle(app).getPropertyValue("--buddy-bg").trim()||"#fff5f7";
  }
  function setMessage(text){$("message").textContent=text;$("announcer").textContent=text;}
  function setMotionStatus(text){$("motion-status").textContent=text;}
  function setDancing(active){
    motionActive=active;
    $("buddy").classList.toggle("is-dancing",active && settings.animations && !settings.reducedMotion);
  }
  function stopMotionLoop(){
    if(motionLoop!==null)cancelAnimationFrame(motionLoop);
    motionLoop=null;previousFrame=null;
  }
  function stopCamera(){
    stopMotionLoop();setDancing(false);
    if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}
    if(motionVideo)motionVideo.srcObject=null;
    motionModeEnabled=false;
    $("motion-enable").disabled=false;$("motion-disable").disabled=true;
    setMotionStatus("Camera is off. Nothing is being watched.");
    if(phase==="motion-wait"||phase==="motion-paused"){
      phase="paused";pausedFrom="running";setMessage("Camera motion mode is off. Press start to continue without it.");render();
    }
  }
  function pauseForNoMotion(){
    if(phase==="running"){
      pausedFrom="running";stopClock();phase="motion-paused";setDancing(false);
      setMessage("I can't see brushing movement. Your timer is paused—let's get brushing again!");
      render();
    }
  }
  function resumeForMotion(){
    if(phase==="motion-wait"||phase==="motion-paused"){
      phase="running";setMessage("There you go! Keep those brushing moves going!");
      if(interval===null)interval=setInterval(tick,1000);
      render();
    }
  }
  function sampleMotion(){
    if(!cameraStream || !motionModeEnabled)return;
    if(motionVideo.readyState>=2){
      motionContext.drawImage(motionVideo,0,0,MOTION_SAMPLE_WIDTH,MOTION_SAMPLE_HEIGHT);
      const pixels=motionContext.getImageData(0,0,MOTION_SAMPLE_WIDTH,MOTION_SAMPLE_HEIGHT).data;
      const current=new Uint8Array(MOTION_SAMPLE_WIDTH*MOTION_SAMPLE_HEIGHT);
      for(let p=0,i=0;p<pixels.length;p+=4,i++)current[i]=(pixels[p]*.299+pixels[p+1]*.587+pixels[p+2]*.114)|0;
      if(previousFrame){
        let difference=0;
        for(let i=0;i<current.length;i++)difference+=Math.abs(current[i]-previousFrame[i]);
        const average=difference/current.length;
        const threshold=MOTION_THRESHOLDS[$("motion-sensitivity").value]||MOTION_THRESHOLDS.medium;
        if(average>threshold){
          lastMotionAt=performance.now();resumeForMotion();setDancing(phase==="running");
          setMotionStatus(phase==="running"?"Movement detected — your buddy is dancing!":"Camera ready — press Start when you're ready to brush.");
        }else if(phase==="running" && performance.now()-lastMotionAt>MOTION_GRACE_MS){
          setDancing(false);pauseForNoMotion();
          setMotionStatus("No brushing movement detected — timer paused.");
        }else if(phase==="running"){
          setDancing(true);
        }
      }
      previousFrame=current;
    }
    motionLoop=requestAnimationFrame(sampleMotion);
  }
  async function startCamera(){
    if(!navigator.mediaDevices?.getUserMedia){setMotionStatus("Camera access is not available in this browser. Use a secure HTTPS page.");return;}
    $("motion-enable").disabled=true;setMotionStatus("Waiting for camera permission…");
    try{
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:320},height:{ideal:240}},audio:false});
      motionVideo.srcObject=cameraStream;await motionVideo.play();
      motionCanvas.width=MOTION_SAMPLE_WIDTH;motionCanvas.height=MOTION_SAMPLE_HEIGHT;
      motionModeEnabled=true;lastMotionAt=0;previousFrame=null;
      $("motion-disable").disabled=false;setMotionStatus("Camera on — waiting for brushing movement.");
      if(phase==="ready"||phase==="paused"){phase="motion-wait";pausedFrom="running";setMessage("Show me your brushing moves to start the timer!");render();}
      motionLoop=requestAnimationFrame(sampleMotion);
    }catch(error){
      stopCamera();
      setMotionStatus(error?.name==="NotAllowedError"?"Camera permission was denied. You can still use the regular timer.":"Couldn't start the camera. Check browser permissions and try again.");
    }
  }
  function playTone(frequency,duration=0.13,type="sine",volume=0.045,slide=0){
    if(!settings.uiSounds)return;
    try{
      audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==="suspended")audioContext.resume();
      const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type=type;osc.frequency.setValueAtTime(frequency,now);
      if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency+slide),now+duration);
      gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration);
    }catch{}
  }
  function playChord(notes=[523,659,784]){
    if(!settings.uiSounds)return;notes.forEach((n,i)=>setTimeout(()=>playTone(n,.22,"sine",.035),i*95));
  }
  function playAnimal(){
    if(!settings.animalSounds)return;
    try{
      audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==="suspended")audioContext.resume();
      const now=audioContext.currentTime,voice=buddy().voice;
      const notes={
        meow:[[650,0],[520,.12],[390,.28]],squeak:[[900,0],[1150,.12],[850,.24]],
        koala:[[180,0],[230,.18],[160,.36]],woof:[[190,0],[125,.11],[205,.23]],
        yip:[[500,0],[780,.09],[590,.19]],growl:[[115,0],[90,.2],[130,.38]],
        chirp:[[800,0],[1050,.1],[930,.2]],hoot:[[360,0],[300,.22],[360,.46]],
        roar:[[125,0],[95,.18],[145,.36]],ribbit:[[240,0],[180,.12],[250,.25]],
        trumpet:[[260,0],[390,.12],[310,.25]],magic:[[660,0],[880,.12],[1100,.24]]
      }[voice]||[[500,0],[700,.15]];
      notes.forEach(([freq,offset],i)=>{
        const osc=audioContext.createOscillator(),gain=audioContext.createGain(),filter=audioContext.createBiquadFilter();
        const start=now+offset,duration=.13;
        osc.type=voice==="woof"||voice==="growl"||voice==="roar"?"sawtooth":"triangle";
        osc.frequency.setValueAtTime(freq,start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(55,freq*(voice==="meow"?.7:1.12)),start+duration);
        filter.type="lowpass";filter.frequency.value=voice==="growl"||voice==="roar"?650:2600;
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.065,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        osc.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);osc.start(start);osc.stop(start+duration+.02);
      });
    }catch{}
  }
  function render(){
    const showingBreak=phase==="break"||(phase==="paused"&&pausedFrom==="break");
    const display=showingBreak?breakRemaining:segmentRemaining;
    $("time").textContent=formatTime(display);
    $("time-caption").textContent=showingBreak?(phase==="paused"?"BREAK PAUSED":"TINY BREAK"):phase==="done"?"ALL DONE!":phase==="ready"?"READY TO BRUSH":phase==="motion-wait"?"WAITING FOR MOVEMENT":phase==="motion-paused"?"PAUSED — NO MOVEMENT":phase==="paused"?"PAUSED":"THIS TURN";
    $("total-time").textContent=formatTime(totalRemaining)+" left";
    $("status-text").textContent="Your adventure is "+formatTime(settings.duration);
    const progress=(settings.duration-totalRemaining)/settings.duration;
    $("progress").style.strokeDasharray=CIRCUMFERENCE;
    $("progress").style.strokeDashoffset=CIRCUMFERENCE*(1-progress);
    const zones=[...document.querySelectorAll(".zone")];
    zones.forEach((el,i)=>{el.classList.toggle("active",i===zoneIndex&&phase!=="done");el.classList.toggle("done",i<zoneIndex||phase==="done");});
    if(showingBreak){$("zone-title").textContent="Paws up! A tiny breather…";}
    else if(phase==="done"){$("zone-title").textContent="You did it! Sparkling smile!";}
    else $("zone-title").textContent=ZONES[zoneIndex].title;
    $("start-button").innerHTML=phase==="running"||phase==="break"?'<span aria-hidden="true">Ⅱ</span> Pause':phase==="paused"||phase==="motion-paused"?'<span aria-hidden="true">▶</span> Keep going':phase==="done"?'<span aria-hidden="true">↻</span> Brush again':phase==="motion-wait"?'<span aria-hidden="true">◉</span> Waiting for movement':'<span aria-hidden="true">▶</span> Start brushing';
    $("start-button").setAttribute("aria-label",phase==="running"||phase==="break"?"Pause brushing":"Start or resume brushing");
  }
  function stopClock(){if(interval!==null)clearInterval(interval);interval=null;}
  function resetTimer(keepMessage=false){
    stopClock();phase="ready";totalRemaining=settings.duration;segmentRemaining=30;breakRemaining=0;zoneIndex=0;lastSpokenLine=-1;
    $("buddy-area")?.classList.remove("celebrate");$("buddy").parentElement.classList.remove("celebrate");
    render();if(!keepMessage)setMessage(buddy().lines[0]);
  }
  function speakZone(){
    setMessage(ZONES[zoneIndex].tip);playAnimal();
    if(settings.uiSounds)playTone(600+zoneIndex*90,.16,"sine",.035,100);
  }
  function finish(){
    stopClock();phase="done";totalRemaining=0;segmentRemaining=0;render();
    setMessage("Hooray! You brushed for "+formatTime(settings.duration)+". High paw, "+buddy().name.split(" ")[0]+"!");
    $("buddy-area").classList.add("celebrate");playAnimal();playChord([523,659,784,1047]);
  }
  function nextSection(){
    if(totalRemaining<=0){finish();return;}
    if(settings.breakSeconds>0){
      phase="break";breakRemaining=settings.breakSeconds;setMessage("Tiny break! Wiggle your fingers, then let's go again.");playTone(520,.12,"sine",.03);
    }else beginNextSection();
    render();
  }
  function beginNextSection(){
    zoneIndex=(zoneIndex+1)%ZONES.length;segmentRemaining=Math.min(30,totalRemaining);phase="running";speakZone();render();
  }
  function tick(){
    if(phase==="running"){
      segmentRemaining--;totalRemaining--;
      if(segmentRemaining<=0){segmentRemaining=0;if(totalRemaining<=0){finish();return;}nextSection();}
      else render();
      if(totalRemaining>0&&totalRemaining%15===0&&phase==="running"){
        const lines=buddy().lines;const idx=(lastSpokenLine+1)%lines.length;lastSpokenLine=idx;setMessage(lines[idx]);
      }
    }else if(phase==="break"){
      breakRemaining--;
      if(breakRemaining<=0){breakRemaining=0;beginNextSection();}
      else render();
    }
  }
  function startClock(){
    if(phase==="done")resetTimer();
    if(phase==="ready"||phase==="paused"||phase==="motion-paused"||phase==="motion-wait"){
      if(motionModeEnabled){
        phase="motion-wait";setMessage("Show me your brushing moves to start or resume the timer!");render();
      }else{
        if(phase==="ready"){phase="running";speakZone();playTone(440,.12,"sine",.03);}
        else {phase=pausedFrom;setMessage("Welcome back! You've got this!");}
        render();interval=setInterval(tick,1000);
      }
    }else if(phase==="running"||phase==="break"){
      pausedFrom=phase;stopClock();phase="paused";setMessage("Taking a tiny break? Press start when you're ready.");render();
    }
  }
  function applySettingsFromForm(){
    const next={theme:controls.theme.value,duration:Number(controls.duration.value),breakSeconds:Number(controls.breakSeconds.value),animalSounds:controls.animalSounds.checked,uiSounds:controls.uiSounds.checked,animations:controls.animations.checked,reducedMotion:controls.reducedMotion.checked};
    const themeChanged=next.theme!==settings.theme;
    settings=next;saveSettings();
    if(themeChanged)selectedTheme=settings.theme==="random"?randomTheme():settings.theme;
    applyTheme();resetTimer();
  }
  function populateSettings(){
    controls.theme.value=settings.theme;controls.duration.value=String(settings.duration);controls.breakSeconds.value=String(settings.breakSeconds);
    controls.animalSounds.checked=settings.animalSounds;controls.uiSounds.checked=settings.uiSounds;
    controls.animations.checked=settings.animations;controls.reducedMotion.checked=settings.reducedMotion;
  }
  $("settings-open").addEventListener("click",()=>{populateSettings();dialog.showModal();});
  form.addEventListener("submit",(event)=>{event.preventDefault();applySettingsFromForm();dialog.close();});
  $("settings-reset").addEventListener("click",()=>{settings={...DEFAULTS};selectedTheme=randomTheme();saveSettings();populateSettings();applyTheme();resetTimer();});
  $("start-button").addEventListener("click",startClock);
  $("reset-button").addEventListener("click",()=>{resetTimer();if(motionModeEnabled){phase="motion-wait";setMessage("Ready! Show me your brushing moves to start.");render();}playTone(440,.09,"sine",.025);});
  $("motion-enable").addEventListener("click",startCamera);
  $("motion-disable").addEventListener("click",stopCamera);
  dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&(phase==="running"||phase==="break")){pausedFrom=phase;stopClock();phase="paused";setDancing(false);render();setMessage("Paused while you were away. Ready when you are!");}});
  window.addEventListener("pagehide",stopCamera);
  // A random buddy is selected at startup whenever Surprise me is the saved preference.
  applyTheme();populateSettings();render();setMessage(buddy().lines[0]);
  if(!navigator.mediaDevices?.getUserMedia)$("motion-enable").disabled=true;
})();