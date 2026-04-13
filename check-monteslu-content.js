async function test() {
  const url = 'https://raw.githubusercontent.com/monteslu/retroemu/master/cores/stella2014_libretro.js';
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
