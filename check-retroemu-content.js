async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/stella2014_libretro.js';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('First 200 chars:', text.substring(0, 200));
    console.log('Includes export:', text.includes('export '));
  } catch (e) {
    console.error(e);
  }
}
test();
