// Real extension UI, with only the VS Code host bridge replaced for the website.
import { pickerHtml } from '../src/pickerHtml';
const result = await Bun.build({ entrypoints: ['./src/pickerClient.ts'], target: 'browser', minify: true });
if (!result.success) { throw new Error('Picker demo build failed'); }
const client = (await result.outputs[0]!.text()).replaceAll('</script', '<\\/script');
const bridge = `let saved;
window.acquireVsCodeApi = () => ({
 getState: () => saved, setState: value => { saved = value; },
 postMessage: message => {
  if (message.type === 'ready') setTimeout(() => {
   window.dispatchEvent(new MessageEvent('message', {data:{type:'init',id:'website-demo',source:'oklch(62% 0.35 260 / 80%)'}}));
   document.querySelector('#status').textContent = 'Browser demo of the extension picker. No editor or file is connected.';
  }, 0);
  if (message.type === 'apply') {
   const c = message.color;
   const source = 'oklch(' + Number((c.lightness*100).toFixed(3)) + '% ' + Number(c.chroma.toFixed(4)) + ' ' + Number(c.hueDegrees.toFixed(3)) + ' / ' + Number((c.alpha*100).toFixed(2)) + '%)';
   window.dispatchEvent(new MessageEvent('message', {data:{type:'applied',source}}));
   document.querySelector('#status').textContent = 'Applied to this demo only. No file changed. In VS Code, Apply makes one undoable edit.';
  }
 }
});`;
const html = pickerHtml("'none'", 'demo-client.js', 'site-demo')
 .replace('<title>OKLCH Color</title>', '<title>Visualise OKLCH custom picker — browser demo</title><meta name="robots" content="noindex">')
 .replace('<script nonce="site-demo" src="demo-client.js"></script>', `<script nonce="site-demo">${bridge}</script><script nonce="site-demo">${client}</script>`);
await Bun.write('./docs/picker-demo.html', html);
console.log('Built demo from actual extension picker HTML and client.');
