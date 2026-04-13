async function test() {
  const url = 'https://data.jsdelivr.com/v1/package/npm/retroemu';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Versions:', data.versions);
  } catch (e) {
    console.error(e);
  }
}
test();
