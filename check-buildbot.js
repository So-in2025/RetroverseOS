async function test() {
  const urls = [
    'https://buildbot.libretro.com/nightly/emscripten/latest/stella_libretro.js.zip',
    'https://buildbot.libretro.com/nightly/emscripten/latest/stella2014_libretro.js.zip',
    'https://buildbot.libretro.com/nightly/emscripten/latest/prosystem_libretro.js.zip',
    'https://buildbot.libretro.com/nightly/emscripten/latest/stella_libretro.js',
    'https://buildbot.libretro.com/nightly/emscripten/latest/prosystem_libretro.js'
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
