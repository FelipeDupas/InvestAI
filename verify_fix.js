
const esc = (s) => (s||'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));

const testCases = [
  { input: '<b>Test</b>', expected: '&lt;b&gt;Test&lt;/b&gt;' },
  { input: '"Quoted"', expected: '&quot;Quoted&quot;' },
  { input: "o'clock", expected: 'o&#39;clock' },
  { input: 'A & B', expected: 'A &amp; B' },
  { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
  { input: 123, expected: '123' }
];

testCases.forEach((tc, i) => {
  const result = esc(tc.input);
  if (result === tc.expected) {
    console.log(`Test ${i} passed: ${tc.input} -> ${result}`);
  } else {
    console.error(`Test ${i} failed: expected ${tc.expected}, got ${result}`);
    process.exit(1);
  }
});
