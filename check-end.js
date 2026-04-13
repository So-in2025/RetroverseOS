async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/fceumm_libretro.js';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n');
    console.log('Last 5 lines:');
    console.log(lines.slice(-5).join('\n'));
  } catch (e) {
    console.error(e);
  }
}
test();
