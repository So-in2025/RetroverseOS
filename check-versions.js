async function check() {
  const versions = ['v1.16.0', 'v1.17.0', 'v1.18.0', 'v1.19.0', 'v1.20.0', 'v1.21.0'];
  for (const v of versions) {
    const url = `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@${v}/retroarch/stella_libretro.zip`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`Stella in ${v}:`, res.status);
      if (res.status === 200) break;
    } catch (e) {}
  }
}
check();
