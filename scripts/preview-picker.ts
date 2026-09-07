// Local UI test harness; excluded from the shipped VSIX.
import { pickerHtml } from '../src/pickerHtml';
const shim = `<script nonce="preview">let saved; const source = 'oklch(62% 0.35 260 / 80%)'; window.acquireVsCodeApi = () => ({ getState: () => saved, setState: value => { saved = value; }, postMessage: message => { if (message.type === 'ready') setTimeout(() => window.postMessage({type:'init',id:'preview',source}, location.origin), 0); if (message.type === 'apply') { document.querySelector('#status').textContent = 'Harness: edit sent to VS Code'; } } });</script>`;
const server = Bun.serve({
  hostname: '127.0.0.1', port: 43124,
  fetch(request) {
    if (new URL(request.url).pathname === '/picker.js') { return new Response(Bun.file('dist/picker.js')); }
    return new Response(pickerHtml("'self'", '/picker.js', 'preview').replace('<script nonce="preview" src=', `${shim}<script nonce="preview" src=`), { headers: { 'Content-Type': 'text/html' } });
  },
});
console.log(`Picker preview at ${server.url}`);
