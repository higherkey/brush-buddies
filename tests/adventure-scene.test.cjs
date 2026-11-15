const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('a frame timestamp earlier than animation setup cannot move the buddy before the first stone',()=>{
  class Node {
    constructor(){this.dataset={};this.children=[];this.attributes={};}
    setAttribute(k,v){this.attributes[k]=v;}
    appendChild(child){child.parentNode=this;this.children.push(child);return child;}
    replaceChildren(...children){this.children=[];children.forEach(child=>this.appendChild(child));}
  }
  const host=new Node();let callback;
  const window={matchMedia:()=>({matches:false})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../adventure-scene.js'),'utf8'),{window,document:{getElementById:()=>host,createElementNS:()=>new Node()},performance:{now:()=>100},requestAnimationFrame:fn=>{callback=fn;return 1;},cancelAnimationFrame:()=>{}});
  const destination={id:'creek',scene:'forest',stops:[]};
  window.BB_SCENE.render({progress:0,phase:'running'},destination);
  window.BB_SCENE.render({progress:.2,phase:'running'},destination);
  assert.doesNotThrow(()=>callback(99));
});
