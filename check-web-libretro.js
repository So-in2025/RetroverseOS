async function test() {
  const urls = [
    'https://web.libretro.com/assets/cores/stella_libretro.js.zip',
    'https://web.libretro.com/assets/cores/stella2014_libretro.js.zip',
    'https://web.libretro.com/assets/cores/prosystem_libretro.js.zip'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`${url}: ${res.status}`);
    } catch (e) {
      console.log(`${url}: Error`);
    }
  }
}
test();
