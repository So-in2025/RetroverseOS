async function test() {
  const core = 'fceumm';
  const url = `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/${core}_libretro.zip`;
  console.log('Fetching', url);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Status:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
