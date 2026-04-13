async function test() {
  const urls = [
    'https://cdn.jsdelivr.net/gh/Emu-OS/Emu-OS.github.io@master/cores/stella_libretro.js',
    'https://cdn.jsdelivr.net/gh/Emu-OS/Emu-OS.github.io@master/cores/prosystem_libretro.js',
    'https://cdn.jsdelivr.net/gh/kripken/relativty@master/stella_libretro.js',
    'https://cdn.jsdelivr.net/gh/jquesnelle/libretro-stella@master/stella_libretro.js'
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
