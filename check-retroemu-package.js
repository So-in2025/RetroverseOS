async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/package.json';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Files:', data.files);
  } catch (e) {
    console.error(e);
  }
}
test();
