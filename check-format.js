async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/fceumm_libretro.js';
  console.log('Checking format of', url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('First 100 chars:', text.substring(0, 100));
    if (text.includes('export ')) {
      console.log('CONFIRMED: Core is using ESM exports.');
    } else {
      console.log('Core is NOT using ESM exports.');
    }
  } catch (e) {
    console.error(e);
  }
}
test();
