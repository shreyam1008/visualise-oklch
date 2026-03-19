const codeSamples = [
  {
    code: 'background: oklch(62.8% 0.258 29.23);',
    label: 'Pure red from perceptual coordinates',
  },
  {
    code: 'color: oklch(76% 0.204 154);',
    label: 'Balanced green that stays vivid',
  },
  {
    code: 'border-color: oklch(98% 0.003 247 / 96%);',
    label: 'Near-white UI tint with alpha',
  },
];

const sampleCode = document.querySelector('[data-sample-code]');
const sampleLabel = document.querySelector('[data-sample-label]');
const yearTarget = document.querySelector('[data-current-year]');

if (yearTarget) {
  yearTarget.textContent = String(new Date().getFullYear());
}

if (sampleCode && sampleLabel) {
  let index = 0;
  const render = () => {
    const sample = codeSamples[index];
    sampleCode.textContent = sample.code;
    sampleLabel.textContent = sample.label;
  };

  render();
  window.setInterval(() => {
    index = (index + 1) % codeSamples.length;
    render();
  }, 2800);
}
